// ─────────────────────────────────────────────────────────────────────────────
// 格局 scoring — the real §9 pipeline (replaces the v1 provisional heuristic).
//
// Per palace:  base valence (门/星/神) + Σ TIER_WEIGHTS[matched] + 门迫/宫迫 adjust
//              + 三奇受制 + 空亡.  Supreme stem-pairs (青龙返首/飞鸟跌穴) are voided
//              when the palace carries 迫/墓/击/刑 (吉事变凶).
// Chart:       roll up 值使 · 值符 · board-mean, add chart-scope formations (天显时),
//              apply chart penalties (五不遇时 / 时干入墓 / 伏吟·反吟), set vetoes
//              (六仪击刑 absolute; 三奇入墓 nullifying → blocked).
// Interaction reconciliation runs before scoring: 三奇得使 rescues 奇⇢仪 凶 pairs;
// 奇仪相合(+吉门) rescues 乙庚被刑; 三诈 absorbs 三奇之灵 (count once).
//
// Every weight/threshold below is CONFIG (architecture §5) — tuning never touches
// the algorithm. The output is a superset of the old shape, so scoreHour() stays a
// drop-in for summary.ts (+ blocked/formations for the day panel & search).
// ─────────────────────────────────────────────────────────────────────────────
import type { Chart } from '../engine/index.ts';
import type { Palace } from '../engine/board.ts';
import { STEMS } from '../engine/ganzhi.ts';
import {
  GATES, STARS, SPIRITS, GOOD_GATES, TIER_WEIGHTS,
  type Quality, type Door,
} from './data/patterns.ts';
import {
  isLiuYiJiXing, isSanQiRuMu, isSanQiControlled,
  isWuBuYuShi, isHourStemTomb, isTianXianShi,
  menGongRelation, isMenPo, repetition,
} from './data/structural.ts';
import { evaluateChart, type MatchedFormation } from './evaluator.ts';

export type Band = 'excellent' | 'good' | 'neutral' | 'caution' | 'bad';

// ── config (tune freely) ──
const INTRINSIC: Record<Quality, number> = {
  'auspicious': 10, 'minor-auspicious': 5, 'neutral': 0, 'inauspicious': -10,
};
const VOID_PENALTY = 12;
const SUPREME_COMPROMISED = -30;         // 青龙返首/飞鸟跌穴 in a 迫/墓/击/刑 palace: 吉事变凶
const CONDITIONAL_GOOD = 25;             // conditional pair resolved by a 吉门
const CONDITIONAL_BAD = -30;
const SANQI_CONTROLLED = -20;            // 三奇受制 (per palace)
const PEN = {
  wuBuYu: -40, hourStemTomb: -35, fuYin: -35, fanYin: -35, menPoActing: -10,
};
const ROLLUP = { zhiShi: 0.5, zhiFu: 0.25, board: 0.25 };
const THRESH = { excellent: 40, good: 12, neutralLow: -12, caution: -40 };

export function bandOf(score: number, blocked = false): Band {
  if (blocked) return 'bad';
  if (score >= THRESH.excellent) return 'excellent';
  if (score >= THRESH.good) return 'good';
  if (score > THRESH.neutralLow) return 'neutral';
  if (score > THRESH.caution) return 'caution';
  return 'bad';
}

const RESCUE_QIYI = ['riqi-rumu', 'qinglong-taozou', 'huoru-jinxiang', 'zhuque-toujiang']; // 奇⇢仪 凶 pairs
const SANZHA = ['san-zha-zhen', 'san-zha-zhong', 'san-zha-xiu'];

/** Resolve the interaction rules within a single palace's matched formations. */
export function reconcile(list: MatchedFormation[]): MatchedFormation[] {
  const has = (id: string) => list.some((f) => f.id === id);
  let out = list;
  if (has('qiyi-xianghe')) out = out.filter((f) => f.id !== 'riqi-beixing');   // 吉门 → 和解, not 被刑
  if (has('sanqi-deshi')) out = out.filter((f) => !RESCUE_QIYI.includes(f.id)); // 得使 rescues 奇⇢仪 凶
  if (out.some((f) => SANZHA.includes(f.id))) out = out.filter((f) => f.id !== 'sanqi-zhiling'); // count once
  return out;
}

/** Value contributed by one matched formation in a palace (handles conditional + supreme gating). */
function formationScore(f: MatchedFormation, p: Palace): number {
  if (f.id === 'qinglong-fanshou' || f.id === 'feiniao-diexue') {
    const compromised =
      (p.gate ? isMenPo(p.gate, p.palace) : false) ||
      isLiuYiJiXing(p) || isSanQiRuMu(p) ||
      (f.id === 'qinglong-fanshou' && p.palace === 3); // 子卯相刑
    return compromised ? SUPREME_COMPROMISED : TIER_WEIGHTS[f.tier];
  }
  if (f.tier === 'conditional') {
    const goodGate = p.gate != null && GOOD_GATES.includes(p.gate as Door);
    return goodGate ? CONDITIONAL_GOOD : CONDITIONAL_BAD;
  }
  return TIER_WEIGHTS[f.tier];
}

/** 门迫/宫迫/和义 adjustment, applied on top of the gate's base valence. */
function menGongAdjust(p: Palace): number {
  if (p.palace === 5 || !p.gate) return 0;
  const rel = menGongRelation(p.gate, p.palace);
  const good = GOOD_GATES.includes(p.gate as Door);
  const gq = GATES[p.gate as Door]?.quality;
  const base = gq ? INTRINSIC[gq] : 0;
  switch (rel) {
    case '迫': return good ? -base : -10;   // 门克宫: strip 吉门's + / deepen 凶门
    case '制': return good ? -base : +8;    // 宫克门: strip 吉门's + / 凶不起 (mitigate 凶门)
    case '和':
    case '义': return good ? +5 : +4;       // 生 relations: quietly favourable
    default: return 0;                      // 比和 / 中5
  }
}

function palaceScore(p: Palace, here: MatchedFormation[]): number {
  let s = 0;
  if (p.gate && GATES[p.gate as Door]) s += INTRINSIC[GATES[p.gate as Door].quality];
  for (const star of p.stars) if (STARS[star as keyof typeof STARS]) s += INTRINSIC[STARS[star as keyof typeof STARS].quality];
  if (p.spirit && SPIRITS[p.spirit as keyof typeof SPIRITS]) s += INTRINSIC[SPIRITS[p.spirit as keyof typeof SPIRITS].quality];
  for (const f of here) s += formationScore(f, p);
  s += menGongAdjust(p);
  if (isSanQiControlled(p)) s += SANQI_CONTROLLED;
  if (p.isHourKong) s -= VOID_PENALTY;
  return s;
}

const palaceByNumber = (chart: Chart, n: number): Palace => chart.board.palaces[n - 1];

export interface HourScore {
  score: number;
  band: Band;
  blocked: boolean;
  warnings: string[];
  formations: MatchedFormation[]; // reconciled matches (for badges / search)
}

export function scoreHour(chart: Chart): HourScore {
  const b = chart.board;
  const warnings: string[] = [];

  // ── evaluate + reconcile per palace ──
  const all = evaluateChart(chart);
  const byPalace = new Map<number, MatchedFormation[]>();
  const chartScoped: MatchedFormation[] = [];
  for (const f of all) {
    if (f.palace == null) { chartScoped.push(f); continue; }
    (byPalace.get(f.palace) ?? byPalace.set(f.palace, []).get(f.palace)!).push(f);
  }
  const reconciledByPalace = new Map<number, MatchedFormation[]>();
  for (const [pal, list] of byPalace) reconciledByPalace.set(pal, reconcile(list));

  // ── per-palace scores ──
  const scoreOf = (n: number) => palaceScore(palaceByNumber(chart, n), reconciledByPalace.get(n) ?? []);
  const shiN = b.zhiShiDisplayPalace;
  const fuN = b.zhiFuDisplayPalace;
  const outer = b.palaces.filter((p) => p.palace !== 5);
  const boardMean = outer.reduce((a, p) => a + scoreOf(p.palace), 0) / outer.length;

  let score = scoreOf(shiN) * ROLLUP.zhiShi + scoreOf(fuN) * ROLLUP.zhiFu + boardMean * ROLLUP.board;

  // ── chart-scope formations (天显时) ──
  for (const f of chartScoped) score += TIER_WEIGHTS[f.tier];

  // ── vetoes ──
  let blocked = false;
  if (b.palaces.some((p) => p.palace !== 5 && isLiuYiJiXing(p))) { blocked = true; warnings.push('六仪击刑'); }
  if (b.palaces.some((p) => p.palace !== 5 && isSanQiRuMu(p))) { blocked = true; warnings.push('三奇入墓'); }

  // ── chart penalties ──
  const dayStem = STEMS[chart.pillars.day.stem];
  const hourStem = STEMS[chart.pillars.hour.stem];
  if (isWuBuYuShi(dayStem, hourStem)) { score += PEN.wuBuYu; warnings.push('五不遇时'); }
  if (isHourStemTomb(chart)) { score += PEN.hourStemTomb; warnings.push('时干入墓'); }
  const rep = repetition(b);
  const tianxian = isTianXianShi(chart);
  if (rep.anyFuYin && !tianxian) { score += PEN.fuYin; warnings.push('伏吟'); }
  if (rep.anyFanYin) { score += PEN.fanYin; warnings.push('反吟'); }

  // ── acting-palace notes ──
  const shi = palaceByNumber(chart, shiN);
  if (shi.isHourKong) warnings.push('值使门临空');
  if (shi.gate && GOOD_GATES.includes(shi.gate as Door) && isMenPo(shi.gate, shi.palace)) {
    score += PEN.menPoActing; warnings.push('门迫');
  }

  const formations = [...chartScoped, ...[...reconciledByPalace.values()].flat()];
  return { score, band: bandOf(score, blocked), blocked, warnings, formations };
}

/** Aggregate a day's hour-scores into a single band (mean-based). */
export function dayBand(hourScores: number[]): Band {
  if (!hourScores.length) return 'neutral';
  return bandOf(hourScores.reduce((a, s) => a + s, 0) / hourScores.length);
}

/** Mean of a set of hour-scores — the day-level aggregate for the calendar. */
export function meanScore(scores: number[]): number {
  if (!scores.length) return 0;
  return scores.reduce((a, s) => a + s, 0) / scores.length;
}
