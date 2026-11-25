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
  GATES, STARS, SPIRITS, GOOD_GATES, TIER_WEIGHTS, gradeOf,
  type Door, type Star, type Spirit, type Quality, type ApplicationTag, type Grade,
} from './data/patterns.ts';
import {
  isLiuYiJiXing, isSanQiRuMu, isHourStemTomb, isSanQiControlled,
  isWuBuYuShi, palaceOfTianStem, menGongRelation, repetition, isTianXianShi,
  type MenGong, type Repetition,
} from './data/structural.ts';
import { evaluateChart, reconcile, type MatchedFormation } from './evaluator.ts';
import { ACTIVITY_PRESETS } from './data/presets.ts';
import { purposeProfile, YONGSHEN } from './profiles.ts';
import {
  directionOf, baseFilter, hasEffectiveSanQi, type Direction, type BaseFilterResult,
} from './direction.ts';
import { displayScore } from './bandsV2.ts';
import { ALL_PATTERNS } from './data/patterns.ts';
import {
  gateVitality, stemVitality, starVitality, seasonElement, amplitude, AMPLITUDE,
  type GateVitality, type StarVitality,
} from './strength.ts';

// ─── public shapes ───────────────────────────────────────────────────────────
export type Band = 'prime' | 'good' | 'plain';   // 大吉 / 吉 / 不吉
export type Rung = '奇门相会' | '得门不得奇' | '逢吉格' | '得奇不得门' | '凶方';

/** A labelled formation: only the extremes (上格 / 下格) ever get one (§2b). */
export interface GradedFormation { text: string; grade: Grade }

export type ScoreProfile = (
  | { kind: 'general' }
  | { kind: 'purpose'; activity: ApplicationTag; role?: 'mover' | 'host'; highStakes?: boolean }
) & { jiXingPlate?: 'di' | 'tian' };   // 六仪击刑 read off 地盘 (default) or 天盘

export interface PalaceScore {
  palace: number;
  direction: Direction | null;
  band: Band;
  rung: Rung;
  reasons: string[];
  blocked: boolean;
  score: number;                 // raw ORDERING score — internal, never shown
  /** 0–100 display score pinned inside the band (bandsV2.displayScore); null when blocked (不用). */
  display: number | null;
  matched: MatchedFormation[];
  warnings: string[];
  badges: string[];
  /** 上格 / 下格 chips — the decisive formations, for the display area (§2b). */
  grades: GradedFormation[];
  baseFilter: BaseFilterResult;
  strength: {
    gate: GateVitality | null;
    star: StarVitality | null;
    spirit: null;
    stems: Record<string, GateVitality>;
  };
}

// ─── scoring config (tuning knobs — §8.2) ─────────────────────────────────────
// One mutable object so the metamorphic tests and the report's perturbation runs can
// scale every knob in place. The score only ORDERS cells within a ladder band.
export const TUNING = {
  CLASS_WEIGHT: { gate: 1.0, star: 0.6, stem: 0.6, spirit: 0.3 },
  VALENCE: { auspicious: 10, 'minor-auspicious': 5, neutral: 0, inauspicious: -10 } as Record<Quality, number>,
  WONDER_VALENCE: 6,   // 三奇 intrinsic positive (no quality table for stems)
  K_SHENG: 0.2, K_ZHI: 0.25,
  // 门迫 on the gate. Practitioner ruling, 2026-11-25; direction per S0(p131):
  // 吉门被迫 → 吉事不吉 (still positive, halved) · 凶门被迫 → 事更凶 (doubled).
  PO_GOOD_GATE: 0.5, PO_BAD_GATE: 2.0,
  // 空亡 scales the palace's own subtotal. Practitioner ruling, 2026-11-25
  // (空亡 is not discussed in S0 pp.123–145).
  VOID_FACTOR: 0.2,
  // 时干入墓 anywhere this hour: the hour's own stem is buried, so the whole hour is
  // dimmed. Hour-wide, so it is applied AFTER the 空亡 multiplier.
  HOUR_TOMB_PENALTY: 30,
  CONDITIONAL_GOOD: 25, CONDITIONAL_BAD: -30,   // 门吉则吉、门凶则凶 formations
};
const BLOCKED_SCORE = -999;
const WONDERS = ['乙', '丙', '丁'] as const;

const TOP_TIER = new Set([
  'qinglong-fanshou', 'feiniao-diexue', 'tian-dun', 'di-dun', 'ren-dun',
  'sanqi-deshi', 'sanqi-shengdian', 'sanqi-zhiling', 'tianxian-shige',
]);
// Palace-scope pattern blocks: the full S0(p136) 庚 avoid list (年/月/日/时格, 大/小/
// 刑格, 飞干/伏宫/飞宫格; p129) + 天网四张 (癸加癸, S0 p132 不可举事).
export const HARD_GE_IDS: ReadonlySet<string> = new Set([
  'geng-da-ge', 'geng-xing-ge', 'geng-xiao-ge',
  'sui-ge', 'yue-ge', 'ri-ge', 'shi-ge',
  'fugong-ge', 'feigan-ge', 'feigong-ge',
  'tianwang-sizhang',
]);
const GOOD_SPIRITS = ['太阴', '六合', '九地', '九天'];

// ─── the per-palace facts assignBand reads ───────────────────────────────────
/** The per-palace facts assignBand reads (exported for the ladder tests). */
export interface PalaceEval {
  palace: number;
  door: string | null;
  hasQi: boolean;
  matched: MatchedFormation[];
  menGong: MenGong;
  kongWang: boolean;
  ruMu: boolean;         // 三奇入墓
  jiXing: boolean;       // 六仪击刑
  shiGanRuMu: boolean;   // 时干入墓 landing in THIS palace
  hourTomb: boolean;     // 时干入墓 anywhere this hour (hour-wide penalty)
  xing: boolean;         // 刑格
  controlled: boolean;   // 三奇受制 (S0 p130 definition)
  hardGe: string[];      // names of the HARD 庚-格 / 天网四张 present
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

/** Hour-wide facts the ladder reads. */
export interface HourCtx { wuBuYuShi: boolean; rep: Repetition; tianXian: boolean; xunShouYi: string }

const BLOCK = (reason: string): BandResult =>
  ({ band: 'plain', rung: '凶方', blocked: true, reasons: [`不可用 — ${reason}`], badges: [] });

/** §3.3 伏吟/反吟 for one palace: 'block', a number of bands to drop, or 0. S0(p131). */
function repetitionVerdict(
  p: Palace, hour: HourCtx, rescue: { gate: boolean; qi: boolean; jiGe: boolean },
): { block: string | null; drop: number; reason: string | null } {
  const { rep } = hour;
  const out = { block: null as string | null, drop: 0, reason: null as string | null };
  const harsher = (block: string | null, drop: number, reason: string) => {
    if (out.block) return;
    if (block) { out.block = block; return; }
    if (drop > out.drop) { out.drop = drop; out.reason = reason; }
  };
  if (rep.fuYin && !hour.tianXian) {            // 天显时: 伏吟一般不凶 (p125, p131)
    // 最凶 — default reading: the palaces where these sit (p131). 死门加死门 needs the gates
    // at home too, so it applies only in a star-伏吟 hour that is also 门伏吟.
    const worst = (rep.starFuYin && p.palace === 1 && p.stars.includes('天蓬'))
      || (rep.gateFuYin && p.palace === 2 && p.gate === '死门')
      || (hour.xunShouYi === '辛' && p.tianPanStems.includes('辛') && p.diPanStem === '辛');
    if (worst) harsher('伏吟最凶', 0, '');
    else if (rescue.gate || rescue.jiGe) harsher(null, 1, '伏吟 — 遇吉门吉格为有救，降一等');
    else harsher('伏吟无救', 0, '');
  }
  if (rep.fanYin) {                              // star ring; 门反吟 ignored (2026-11-26)
    if (rescue.qi || rescue.gate) harsher(null, 1, '反吟 — 遇三奇或吉门为有救，降一等');
    else harsher('反吟无救', 0, '');
  }
  return out;
}

export function assignBand(ev: PalaceEval, p: Palace, hour: HourCtx, profile: ScoreProfile): BandResult {
  const reasons: string[] = [];
  const badges: string[] = [];

  // STEP 0a — 五不遇时 (chart scope) — the whole 时辰 is unusable.
  if (hour.wuBuYuShi) {
    return { band: 'plain', rung: '凶方', blocked: true,
      reasons: ['五不遇时 — 时干剋日干，择时最忌，此时辰不用'], badges: [] };
  }
  // STEP 0b — palace-scope blocks. Nothing rescues these (S0 p129, p130, p132, p135, p136).
  const hard: string[] = [];
  if (ev.jiXing) hard.push('六仪击刑');
  if (ev.ruMu) hard.push('三奇入墓');
  if (ev.controlled) hard.push('三奇受制');
  if (ev.shiGanRuMu) hard.push('时干入墓');
  hard.push(...ev.hardGe);
  const goodGates: readonly Door[] = profile.kind === 'purpose'
    ? ACTIVITY_PRESETS[profile.activity].goodGates
    : GOOD_GATES;
  // 凶门被迫 — 事更凶，不可用 (S0 p131 direction; block is a practitioner ruling, 2026-11-25).
  // 凶门 = an inauspicious gate that is not one of this profile's good gates.
  if (ev.menGong === '迫' && ev.door != null && GATES[ev.door as Door]?.quality === 'inauspicious'
      && !goodGates.includes(ev.door as Door)) hard.push('凶门被迫');
  if (hard.length) return BLOCK(hard.join('、'));

  // STEP 1 — THE LADDER.
  const hasGate = ev.door != null && goodGates.includes(ev.door as Door);
  const hasQi = ev.hasQi;
  const hasJiGe = ev.matched.some(isJiGe);
  const hasXiongGe = ev.matched.some(isXiongGe);

  // STEP 0c — 伏吟/反吟, per palace (needs the step-1 rescuers, so it sits here).
  const fy = repetitionVerdict(p, hour, { gate: hasGate, qi: hasQi, jiGe: hasJiGe });
  if (fy.block) return BLOCK(fy.block);

  let rung: Rung, band: Band;
  if (hasQi && hasGate) { rung = '奇门相会'; band = 'prime'; reasons.push('三奇与三吉门相会 — 最佳的方位'); badges.push('奇门相会'); }
  else if (hasGate) { rung = '得门不得奇'; band = 'good'; reasons.push('得门不得奇 — 吉利方位，可用'); badges.push('得门不得奇'); }
  else if (hasJiGe && !hasXiongGe) { rung = '逢吉格'; band = 'good'; reasons.push('不得奇门，但逢吉格 — 可用'); }
  else if (hasQi) { rung = '得奇不得门'; band = 'plain'; reasons.push('得奇不得门 — 还不能算吉利方位'); }
  else { rung = '凶方'; band = 'plain'; reasons.push('不得奇又不得吉门'); }

  const vital = ['旺', '相'].includes(ev.strength.gate ?? '');
  const cleanOfFour = ev.menGong !== '迫' && !ev.ruMu && !ev.jiXing && !ev.xing;

  // STEP 2 — qualify 'prime' (得时得地…才是真正的吉). 门迫 and 空亡 are NOT checked
  // here: each demotes once, at step 4 (2026-11-25 — they used to drop twice).
  if (band === 'prime') {
    if (!(vital && !hasXiongGe)) {
      band = 'good';
      if (!vital) reasons.push('吉门失气 — 未得时得地，吉门也就不吉了');
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

  // STEP 4 — demotions; each cause drops one band, once. They stack (default reading,
  // 2026-11-25): a 大吉 rung with both 门迫 and 空亡 ends at 不吉.
  if (hasGate && ['休', '囚', '死'].includes(ev.strength.gate ?? '')) {
    band = demote(band); reasons.push('吉门逢休囚 — 无力');
  }
  // S0(p131) 吉门被迫吉不就. Still usable, just weaker: 大吉 → 吉, never below 吉
  // (practitioner ruling, 2026-11-25).
  if (hasGate && ev.menGong === '迫') {
    if (band === 'prime') band = 'good';
    reasons.push('门迫 — 吉门剋宫，吉不就（仍可用）');
  }
  if (ev.kongWang) {                      // practitioner ruling, 2026-11-25
    band = demote(band); reasons.push('空亡 — 事不落实');
  }
  if (fy.drop) {                          // 伏吟/反吟 有救 (S0 p131)
    for (let i = 0; i < fy.drop; i++) band = demote(band);
    reasons.push(fy.reason!);
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
    case '义': return v * (1 + TUNING.K_SHENG);
    case '制': return v * (1 - TUNING.K_ZHI);
    case '迫': return v > 0 ? v * TUNING.PO_GOOD_GATE : v * TUNING.PO_BAD_GATE;   // 0 stays 0
    default: return v;
  }
}
function formationContribution(f: MatchedFormation, gate: string | null): number {
  if (f.tier === 'conditional') {
    return gate != null && GOOD_GATES.includes(gate as Door) ? TUNING.CONDITIONAL_GOOD : TUNING.CONDITIONAL_BAD;
  }
  return TIER_WEIGHTS[f.tier];
}
export function orderingScore(p: Palace, ev: PalaceEval, profile: ScoreProfile): number {
  // Purpose mode: derive 用神 + class emphasis; general mode leaves all ×1 / no bonus.
  const pp = profile.kind === 'purpose' ? purposeProfile(profile.activity) : null;
  const { CLASS_WEIGHT, VALENCE, WONDER_VALENCE } = TUNING;
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

  // §4.2 step 9 — 用神 boost: reward palaces carrying this activity's 用神.
  if (pp) {
    if (p.gate && pp.yongShen.gates.includes(p.gate as Door)) s += YONGSHEN.gate;
    if (p.spirit && pp.yongShen.spirits.includes(p.spirit as Spirit)) s += YONGSHEN.spirit;
    for (const f of ev.matched) if (pp.boostFormations.has(f.id)) s += YONGSHEN.formation;
  }
  if (ev.kongWang) s *= TUNING.VOID_FACTOR;          // the palace's own subtotal only
  if (ev.hourTomb) s -= TUNING.HOUR_TOMB_PENALTY;    // hour-wide: not scaled by 空亡
  return Math.round(s * 10) / 10;
}

// ─── build a PalaceScore for one outer palace ─────────────────────────────────
function buildEval(chart: Chart, p: Palace, matched: MatchedFormation[], profile: ScoreProfile): PalaceEval {
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
    jiXing: isLiuYiJiXing(p, profile.jiXingPlate),
    shiGanRuMu: isHourStemTomb(chart) && palaceOfTianStem(chart.board, hourStem) === p.palace,
    hourTomb: isHourStemTomb(chart),
    xing: matched.some((m) => m.id === 'geng-xing-ge'),
    controlled: isSanQiControlled(p),
    hardGe: [...new Set(matched.filter((m) => HARD_GE_IDS.has(m.id)).map((m) => m.name))],
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

// ─── §2b display grades — 上格 (green) / 下格 (red); nothing in between ──────
// Two entries are not formations in the registry but are graded 下格 all the same:
// 六仪击刑 (a step-0b hard exclusion) and 凶门克宫 (凶门 剋 its palace, 门迫 on a
// 凶门 — the gate's harm lands with full force).
function gradesFor(p: Palace, ev: PalaceEval, matched: MatchedFormation[]): GradedFormation[] {
  const top: GradedFormation[] = [];
  const bottom: GradedFormation[] = [];
  const seen = new Set<string>();
  for (const m of matched) {
    const grade = gradeOf(m.id);
    if (!grade || seen.has(m.name)) continue;
    seen.add(m.name);
    (grade === '上格' ? top : bottom).push({ text: m.name, grade });
  }
  if (ev.jiXing && !seen.has('六仪击刑')) bottom.push({ text: '六仪击刑', grade: '下格' });
  if (ev.menGong === '迫' && p.gate && !GOOD_GATES.includes(p.gate as Door)) {
    bottom.push({ text: '凶门克宫', grade: '下格' });
  }
  return [...top, ...bottom];
}

export function evaluatePalace(
  chart: Chart, p: Palace, matched: MatchedFormation[], profile: ScoreProfile,
): PalaceScore {
  if (p.palace === 5) {
    return {
      palace: 5, direction: null, band: 'plain', rung: '凶方', reasons: [], blocked: false,
      score: 0, display: null, matched: [], warnings: [], badges: [], grades: [], baseFilter: '凶方',
      strength: { gate: null, star: null, spirit: null, stems: {} },
    };
  }
  const ev = buildEval(chart, p, matched, profile);
  const hour = hourCtx(chart);
  const goodGates: readonly Door[] = profile.kind === 'purpose'
    ? ACTIVITY_PRESETS[profile.activity].goodGates : GOOD_GATES;

  const { band, rung, blocked, reasons, badges } = assignBand(ev, p, hour, profile);

  const warnings: string[] = [];
  if (ev.kongWang) warnings.push('空亡');
  if (ev.menGong === '迫') warnings.push('门迫');
  if (ev.ruMu) warnings.push('三奇入墓');
  if (ev.jiXing) warnings.push('六仪击刑');
  if (ev.shiGanRuMu) warnings.push('时干入墓');
  if (ev.controlled) warnings.push('三奇受制');

  // positive badges beyond the ladder's own (§6.4)
  if (ev.menGong === '制' && p.gate && !GOOD_GATES.includes(p.gate as Door)) badges.push('凶不起');
  if (matched.some((m) => m.id === 'qinglong-taozou' || m.id === 'zhuque-toujiang')) badges.push('为主不害');

  const score = blocked ? BLOCKED_SCORE : orderingScore(p, ev, profile);
  const display = blocked ? null
    : displayScore(score, band, chart.input?.method ?? 'zhirun', profileKey(profile));

  return {
    palace: p.palace,
    direction: directionOf(p.palace),
    band, rung, reasons, blocked, score, display, matched, warnings, badges,
    grades: gradesFor(p, ev, matched),
    baseFilter: baseFilter(p, matched, goodGates),
    strength: ev.strength,
  };
}

/** Calibration profile key: 'general' or the 用事 id. */
export const profileKey = (profile: ScoreProfile): string =>
  profile.kind === 'purpose' ? profile.activity : 'general';

/** Hash of every constant that moves a band or a raw score. scoreCalibration.json
 *  stores it; a test fails when they differ, so the table cannot go stale silently. */
export function scoringHash(): string {
  const text = JSON.stringify({
    TUNING, TOP_TIER: [...TOP_TIER], HARD_GE_IDS: [...HARD_GE_IDS], GOOD_SPIRITS,
    AMPLITUDE, YONGSHEN, TIER_WEIGHTS, GATES, STARS, SPIRITS,
    PATTERNS: ALL_PATTERNS.map((r) => [r.id, r.tier, r.scope, r.when]),
    PRESETS: ACTIVITY_PRESETS,
    EMPHASIS: Object.keys(ACTIVITY_PRESETS).map((a) => purposeProfile(a as ApplicationTag).classEmphasis),
  });
  let h = 0x811c9dc5;                                   // FNV-1a, 32-bit
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function hourCtx(chart: Chart): HourCtx {
  return {
    wuBuYuShi: isWuBuYuShi(STEMS[chart.pillars.day.stem], chart.pillars.hour.name),
    rep: repetition(chart.board),
    tianXian: isTianXianShi(chart),
    xunShouYi: chart.board.xunShouYi,
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
