// ─────────────────────────────────────────────────────────────────────────────
// palace.ts — the v2 atomic unit: (hour × palace).
//
// This resolves the two biggest v1→v2 contradictions:
//   • the atomic unit is a DIRECTION, not the whole hour (PalaceScore, one per 宫)
//   • the BAND is set by a rule ladder (assignBand, §3.4), NOT a score threshold
//
// The `score` here does ONE job: order cells WITHIN a band when ranking. It never
// decides the band — assignBand walks the classical ladder over structural facts.
// Every scoring weight below is a tuning knob (§8.2); the ladder is not.
//
// Bands: prime 大吉 / good 吉 / plain 不吉. `blocked` is an overlay, not a band.
// ─────────────────────────────────────────────────────────────────────────────
import type { Palace } from '../engine/board.ts';
import type { Chart } from '../engine/index.ts';
import { STEMS } from '../engine/ganzhi.ts';
import {
  GATES, STARS, SPIRITS, GOOD_GATES, TIER_WEIGHTS,
  type Door, type Star, type Spirit, type Quality, type ApplicationTag,
} from './data/patterns.ts';
import {
  isLiuYiJiXing, isSanQiRuMu, isHourStemTomb, isSanQiControlled,
  isWuBuYuShi, palaceOfTianStem, menGongRelation, type MenGong,
} from './data/structural.ts';
import { evaluateChart, type MatchedFormation } from './evaluator.ts';
import { reconcile } from './scoring.ts';
import { ACTIVITY_PRESETS } from './data/presets.ts';
import { purposeProfile, YONGSHEN } from './profiles.ts';
import {
  directionOf, baseFilter, hasEffectiveSanQi, type Direction, type BaseFilterResult,
} from './direction.ts';
import {
  gateVitality, stemVitality, starVitality, seasonElement, amplitude,
  type GateVitality, type StarVitality,
} from './strength.ts';

// ─── public shapes ───────────────────────────────────────────────────────────
export type Band = 'prime' | 'good' | 'plain';   // 大吉 / 吉 / 不吉
export type Rung = '奇门相会' | '得门不得奇' | '逢吉格' | '得奇不得门' | '凶方';

export type ScoreProfile =
  | { kind: 'general' }
  | { kind: 'purpose'; activity: ApplicationTag; role?: 'mover' | 'host'; highStakes?: boolean };

export interface PalaceScore {
  palace: number;
  direction: Direction | null;
  band: Band;
  rung: Rung;
  reasons: string[];
  blocked: boolean;
  score: number;                 // ORDERING ONLY
  matched: MatchedFormation[];
  warnings: string[];
  badges: string[];
  baseFilter: BaseFilterResult;
  strength: {
    gate: GateVitality | null;
    star: StarVitality | null;
    spirit: null;
    stems: Record<string, GateVitality>;
  };
}

// ─── scoring config (tuning knobs — §8.2) ─────────────────────────────────────
const CLASS_WEIGHT = { gate: 1.0, star: 0.6, stem: 0.6, spirit: 0.3 } as const;
const VALENCE: Record<Quality, number> = {
  auspicious: 10, 'minor-auspicious': 5, neutral: 0, inauspicious: -10,
};
const WONDER_VALENCE = 6;   // 三奇 intrinsic positive (no quality table for stems)
const K_SHENG = 0.2, K_ZHI = 0.25, K_PO = 0.3;
const VOID_PENALTY = 12, CONTROLLED_PENALTY = 20, BLOCKED_SCORE = -999;
const WONDERS = ['乙', '丙', '丁'] as const;

const TOP_TIER = new Set([
  'qinglong-fanshou', 'feiniao-diexue', 'tian-dun', 'di-dun', 'ren-dun',
  'sanqi-deshi', 'sanqi-shengdian', 'sanqi-zhiling', 'tianxian-shige',
]);
// The 庚 hard family that IS encoded as patterns (§3.4 step-0b subset).
const HARD_GE_IDS = new Set(['geng-da-ge', 'geng-xing-ge']);
const GOOD_SPIRITS = ['太阴', '六合', '九地', '九天'];

// ─── the per-palace facts assignBand reads ───────────────────────────────────
interface PalaceEval {
  palace: number;
  door: string | null;
  hasQi: boolean;
  matched: MatchedFormation[];
  menGong: MenGong;
  kongWang: boolean;
  ruMu: boolean;         // 三奇入墓
  jiXing: boolean;       // 六仪击刑
  shiGanRuMu: boolean;   // 时干入墓 landing in THIS palace
  xing: boolean;         // 刑格
  hardGe: boolean;       // a HARD 庚-格 present
  primaryStar: Star | null;
  spirit: string | null;
  strength: PalaceScore['strength'];
}

const isJiGe = (m: MatchedFormation) =>
  m.tier === 'supreme-auspicious' || m.tier === 'auspicious';
const isXiongGe = (m: MatchedFormation) =>
  m.tier === 'inauspicious' || m.tier === 'supreme-inauspicious';

const demote = (b: Band): Band => (b === 'prime' ? 'good' : 'plain');

// ─── §3.4 assignBand — the rule ladder. Does NOT read the score. ─────────────
interface BandResult { band: Band; rung: Rung; blocked: boolean; reasons: string[]; badges: string[] }

function assignBand(ev: PalaceEval, wuBuYuShi: boolean, profile: ScoreProfile): BandResult {
  const reasons: string[] = [];
  const badges: string[] = [];

  // STEP 0a — 五不遇时 (chart scope) — the whole 时辰 is unusable.
  if (wuBuYuShi) {
    return { band: 'plain', rung: '凶方', blocked: true,
      reasons: ['五不遇时 — 时干剋日干，择时最忌，此时辰不用'], badges: [] };
  }
  // STEP 0b — palace-scope hard exclusions.
  const hard: string[] = [];
  if (ev.jiXing) hard.push('六仪击刑');
  if (ev.ruMu) hard.push('三奇入墓');
  if (ev.shiGanRuMu) hard.push('时干入墓');
  if (ev.hardGe) hard.push('凶格(大/刑格)');
  if (hard.length) {
    return { band: 'plain', rung: '凶方', blocked: true,
      reasons: [`不可用 — ${hard.join('、')}`], badges: [] };
  }

  // STEP 1 — THE LADDER.
  const goodGates: readonly Door[] = profile.kind === 'purpose'
    ? ACTIVITY_PRESETS[profile.activity].goodGates
    : GOOD_GATES;
  const hasGate = ev.door != null && goodGates.includes(ev.door as Door);
  const hasQi = ev.hasQi;
  const hasJiGe = ev.matched.some(isJiGe);
  const hasXiongGe = ev.matched.some(isXiongGe);

  let rung: Rung, band: Band;
  if (hasQi && hasGate) { rung = '奇门相会'; band = 'prime'; reasons.push('三奇与三吉门相会 — 最佳的方位'); badges.push('奇门相会'); }
  else if (hasGate) { rung = '得门不得奇'; band = 'good'; reasons.push('得门不得奇 — 吉利方位，可用'); badges.push('得门不得奇'); }
  else if (hasJiGe && !hasXiongGe) { rung = '逢吉格'; band = 'good'; reasons.push('不得奇门，但逢吉格 — 可用'); }
  else if (hasQi) { rung = '得奇不得门'; band = 'plain'; reasons.push('得奇不得门 — 还不能算吉利方位'); }
  else { rung = '凶方'; band = 'plain'; reasons.push('不得奇又不得吉门'); }

  const vital = ['旺', '相'].includes(ev.strength.gate ?? '');
  const notPo = ev.menGong !== '迫';
  const cleanOfFour = ev.menGong !== '迫' && !ev.ruMu && !ev.jiXing && !ev.xing;

  // STEP 2 — qualify 'prime' (得时得地…才是真正的吉).
  if (band === 'prime') {
    if (!(vital && notPo && !ev.kongWang && !hasXiongGe)) {
      band = 'good';
      if (!vital) reasons.push('吉门失气 — 未得时得地，吉门也就不吉了');
      if (!notPo) reasons.push('门迫 — 吉门剋宫，吉不就');
      if (ev.kongWang) reasons.push('空亡 — 事不落实');
      if (hasXiongGe) reasons.push('同宫见凶格');
    } else {
      badges.push('得时得地');
    }
  }

  // STEP 3 — promotions good → prime.
  const topTier = ev.matched.find((m) => TOP_TIER.has(m.id));
  if (band === 'good' && topTier && cleanOfFour && !hasXiongGe) {
    band = 'prime';
    reasons.push(`${topTier.name} — 上格，且不逢迫墓击刑`);
  }
  if (band === 'good' && rung === '得门不得奇' && vital
      && GOOD_SPIRITS.includes(ev.spirit ?? '')
      && cleanOfFour) {
    band = 'prime';
    reasons.push('吉门得时得地，吉神相助');
  }

  // STEP 4 — demotions (ordered; each drops at most one band).
  if (hasGate && ['休', '囚', '死'].includes(ev.strength.gate ?? '')) {
    band = demote(band); reasons.push('吉门逢休囚 — 无力');
  }
  if (hasGate && ev.menGong === '迫' && band !== 'plain') {
    band = demote(band); reasons.push('门迫');
  }
  if (hasXiongGe) { band = 'plain'; reasons.push('见凶格 — 不可用'); }

  // STEP 6 — 大事看星.
  if (profile.kind === 'purpose' && profile.highStakes && band === 'prime') {
    const star = ev.primaryStar;
    const starOk = star != null && STARS[star].quality !== 'inauspicious'
      && ['旺', '相'].includes(ev.strength.star ?? '');
    if (!starOk) { band = 'good'; reasons.push('大事看星 — 九星无气或为凶星'); }
  }

  return { band, rung, blocked: false, reasons, badges };
}

// ─── ordering score (§3 steps 1–9; NOT the band) ─────────────────────────────
function applyMenGong(v: number, rel: MenGong): number {
  switch (rel) {
    case '和':
    case '义': return v * (1 + K_SHENG);
    case '制': return v * (1 - K_ZHI);
    case '迫': return v > 0 ? v * (1 - K_PO) : v * (1 + K_PO);
    default: return v;
  }
}
function formationContribution(f: MatchedFormation, gate: string | null): number {
  if (f.tier === 'conditional') {
    return gate != null && GOOD_GATES.includes(gate as Door) ? 25 : -30;
  }
  return TIER_WEIGHTS[f.tier];
}
function orderingScore(p: Palace, ev: PalaceEval, profile: ScoreProfile): number {
  // Purpose mode: derive 用神 + class emphasis; general mode leaves all ×1 / no bonus.
  const pp = profile.kind === 'purpose' ? purposeProfile(profile.activity) : null;
  const wGate = CLASS_WEIGHT.gate * (pp?.classEmphasis.gate ?? 1);
  const wStar = CLASS_WEIGHT.star * (pp?.classEmphasis.star ?? 1);
  const wStem = CLASS_WEIGHT.stem * (pp?.classEmphasis.stem ?? 1);
  const wSpirit = CLASS_WEIGHT.spirit * (pp?.classEmphasis.spirit ?? 1);

  let s = 0;
  if (p.gate && GATES[p.gate as Door]) {
    let g = VALENCE[GATES[p.gate as Door].quality] * amplitude(ev.strength.gate) * wGate;
    g = applyMenGong(g, ev.menGong);
    s += g;
  }
  for (const star of p.stars) {
    if (STARS[star as Star]) s += VALENCE[STARS[star as Star].quality] * amplitude(ev.strength.star) * wStar;
  }
  for (const w of WONDERS) {
    if (p.tianPanStems.includes(w)) s += WONDER_VALENCE * amplitude(ev.strength.stems[w] ?? null) * wStem;
  }
  if (p.spirit && SPIRITS[p.spirit as keyof typeof SPIRITS]) {
    s += VALENCE[SPIRITS[p.spirit as keyof typeof SPIRITS].quality] * wSpirit;
  }
  for (const f of ev.matched) s += formationContribution(f, p.gate); // NOT amplitude-scaled
  if (ev.kongWang) s -= VOID_PENALTY;
  if (isSanQiControlled(p)) s -= CONTROLLED_PENALTY;

  // §4.2 step 9 — 用神 boost: reward palaces carrying this activity's 用神.
  if (pp) {
    if (p.gate && pp.yongShen.gates.includes(p.gate as Door)) s += YONGSHEN.gate;
    if (p.spirit && pp.yongShen.spirits.includes(p.spirit as Spirit)) s += YONGSHEN.spirit;
    for (const f of ev.matched) if (pp.boostFormations.has(f.id)) s += YONGSHEN.formation;
  }
  return Math.round(s * 10) / 10;
}

// ─── build a PalaceScore for one outer palace ─────────────────────────────────
function buildEval(chart: Chart, p: Palace, matched: MatchedFormation[]): PalaceEval {
  const season = seasonElement(chart.pillars.month.branch);
  const hourStem = STEMS[chart.pillars.hour.stem];
  const stems: Record<string, GateVitality> = {};
  for (const st of new Set(p.tianPanStems)) stems[st] = stemVitality(st, season, p.palace);
  const primaryStar = (p.stars[0] as Star) ?? null;
  return {
    palace: p.palace,
    door: p.gate,
    hasQi: hasEffectiveSanQi(p),
    matched,
    menGong: p.gate ? menGongRelation(p.gate, p.palace) : null,
    kongWang: p.isHourKong,
    ruMu: isSanQiRuMu(p),
    jiXing: isLiuYiJiXing(p),
    shiGanRuMu: isHourStemTomb(chart) && palaceOfTianStem(chart.board, hourStem) === p.palace,
    xing: matched.some((m) => m.id === 'geng-xing-ge'),
    hardGe: matched.some((m) => HARD_GE_IDS.has(m.id)),
    primaryStar,
    spirit: p.spirit,
    strength: {
      gate: p.gate ? gateVitality(p.gate as Door, season, p.palace) : null,
      star: primaryStar ? starVitality(primaryStar, season) : null,
      spirit: null,
      stems,
    },
  };
}

export function evaluatePalace(
  chart: Chart, p: Palace, matched: MatchedFormation[], profile: ScoreProfile,
): PalaceScore {
  if (p.palace === 5) {
    return {
      palace: 5, direction: null, band: 'plain', rung: '凶方', reasons: [], blocked: false,
      score: 0, matched: [], warnings: [], badges: [], baseFilter: '凶方',
      strength: { gate: null, star: null, spirit: null, stems: {} },
    };
  }
  const ev = buildEval(chart, p, matched);
  const wuBuYuShi = isWuBuYuShi(STEMS[chart.pillars.day.stem], STEMS[chart.pillars.hour.stem]);
  const goodGates: readonly Door[] = profile.kind === 'purpose'
    ? ACTIVITY_PRESETS[profile.activity].goodGates : GOOD_GATES;

  const { band, rung, blocked, reasons, badges } = assignBand(ev, wuBuYuShi, profile);

  const warnings: string[] = [];
  if (ev.kongWang) warnings.push('空亡');
  if (ev.menGong === '迫') warnings.push('门迫');
  if (ev.ruMu) warnings.push('三奇入墓');
  if (ev.jiXing) warnings.push('六仪击刑');
  if (ev.shiGanRuMu) warnings.push('时干入墓');
  if (isSanQiControlled(p)) warnings.push('三奇受制');

  // positive badges beyond the ladder's own (§6.4)
  if (ev.menGong === '制' && p.gate && !GOOD_GATES.includes(p.gate as Door)) badges.push('凶不起');
  if (matched.some((m) => m.id === 'qinglong-taozou' || m.id === 'zhuque-toujiang')) badges.push('为主不害');

  const score = blocked ? BLOCKED_SCORE : orderingScore(p, ev, profile);

  return {
    palace: p.palace,
    direction: directionOf(p.palace),
    band, rung, reasons, blocked, score, matched, warnings, badges,
    baseFilter: baseFilter(p, matched, goodGates),
    strength: ev.strength,
  };
}

// ─── evaluate all 9 palaces of a chart ───────────────────────────────────────
export function evaluatePalaces(chart: Chart, profile: ScoreProfile = { kind: 'general' }): PalaceScore[] {
  // Only PALACE-scope formations decide a direction's band. Chart-scope ones
  // (天显时格 …) are a whole-chart modifier handled in hour.ts, not a per-direction 吉格.
  const byPalace = new Map<number, MatchedFormation[]>();
  for (const f of evaluateChart(chart)) {
    if (f.palace == null) continue;
    const list = byPalace.get(f.palace) ?? [];
    list.push(f);
    byPalace.set(f.palace, list);
  }
  return chart.board.palaces.map((p) =>
    evaluatePalace(chart, p, reconcile(byPalace.get(p.palace) ?? []), profile),
  );
}
