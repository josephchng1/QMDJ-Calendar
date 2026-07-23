// ─────────────────────────────────────────────────────────────────────────────
// strength.ts — 旺相休囚 vitality (§3.1). Mandated by the registry, not optional.
//
// STRENGTH SCALES MAGNITUDE. IT NEVER FLIPS SIGN. (This is the v2 correction: v1
// had a two-column table making a strong 凶 symbol "less bad"; S0(p137) says the
// opposite — a strong 死门 is a genuinely bad 死门.) One AMPLITUDE column, applied
// to |valence|.
//
// Two relation sets, two enums, deliberately NOT merged:
//   八门 / 三奇六仪 — standard 五行, BOTH axes (得时 月令 + 得地 宫位), fifth state 死
//   九星             — non-standard set (S0 p106), ONE axis (月令 only), fifth state 废
//   八神             — no vitality at all (always null)
//
// The DIRECTION of the table is traditional; the CURVE values are a tuning knob
// (§8.2) — tune the numbers, never the monotonicity.
// ─────────────────────────────────────────────────────────────────────────────
import {
  STEM_ELEM, PALACE_ELEM, GATE_ELEM, controls, generates, type Element,
} from './data/structural.ts';
import { STARS, type Door, type Star } from './data/patterns.ts';

// ─── two enums, kept apart ───────────────────────────────────────────────────
export type GateVitality = '旺' | '相' | '休' | '囚' | '死';   // 八门, 三奇六仪
export type StarVitality = '旺' | '相' | '休' | '囚' | '废';   // 九星 — never 死 (S0 p107)
export type Vitality = GateVitality | StarVitality;

// ─── the amplitude curve (tuning knob; monotonicity is the contract) ──────────
export const AMPLITUDE: Record<Vitality, number> = {
  旺: 1.30, 相: 1.15, 休: 0.80, 囚: 0.60, 死: 0.45, 废: 0.45,
};
export const amplitude = (v: Vitality | null): number => (v == null ? 1 : AMPLITUDE[v]);

// ─── 五行 relation of a subject element against a reference element ───────────
export type Relation =
  | 'same'          // 比和
  | 'generates-me'  // 生我 (ref 生 subject)
  | 'I-generate'    // 我生 (subject 生 ref) — 洩
  | 'controls-me'   // 剋我 (ref 克 subject)
  | 'I-control';    // 我剋 (subject 克 ref) — 財/洩
export function relation(subject: Element, ref: Element): Relation {
  if (subject === ref) return 'same';
  if (generates(ref, subject)) return 'generates-me';
  if (generates(subject, ref)) return 'I-generate';
  if (controls(ref, subject)) return 'controls-me';
  return 'I-control';
}

// ─── 九星 vitality — ONE axis (月令), non-standard set. S0(p106) verbatim. ─────
//   我生之月最旺 · 与我相同为相 · 我剋月建为休 · 月建生我为废 · 月建剋我为囚
export const STAR_VITALITY: Record<Relation, StarVitality> = {
  'I-generate': '旺',     // 我生 — most powerful
  'same': '相',
  'I-control': '休',      // 休于财
  'generates-me': '废',   // 废于父母 — inert, NEVER 死
  'controls-me': '囚',    // 囚于鬼
};
const STAR_ELEM = {} as Record<Star, Element>;
for (const s of Object.keys(STARS) as Star[]) STAR_ELEM[s] = STARS[s].element;

export function starVitality(star: Star, monthElem: Element): StarVitality {
  return STAR_VITALITY[relation(STAR_ELEM[star], monthElem)];
}

// ─── 八门 / 三奇六仪 vitality — standard 五行, BOTH axes ───────────────────────
//   得 = 生我 | 比和 ;  剋 = 剋我 ;  洩 = 我生 | 我剋
//   得时+得地 → 旺 · 一轴得 → 相 · 无得且仅洩 → 休 · 一轴剋我 → 囚 · 两轴剋我 → 死
type AxisCat = 'de' | 'ke' | 'xie';
function axisCat(subject: Element, ref: Element): AxisCat {
  const r = relation(subject, ref);
  if (r === 'same' || r === 'generates-me') return 'de';
  if (r === 'controls-me') return 'ke';
  return 'xie';
}
function twoAxisVitality(elem: Element, season: Element, palaceElem: Element): GateVitality {
  const a = axisCat(elem, season);      // 得时 (月令)
  const b = axisCat(elem, palaceElem);  // 得地 (宫位)
  const ke = (a === 'ke' ? 1 : 0) + (b === 'ke' ? 1 : 0);
  if (ke === 2) return '死';
  if (ke === 1) return '囚';             // 剋我 dominates a 得 on the other axis
  const de = (a === 'de' ? 1 : 0) + (b === 'de' ? 1 : 0);
  if (de === 2) return '旺';
  if (de === 1) return '相';
  return '休';                           // both axes 洩
}

export function gateVitality(gate: Door, season: Element, palace: number): GateVitality {
  return twoAxisVitality(GATE_ELEM[gate], season, PALACE_ELEM[palace]);
}
export function stemVitality(stem: string, season: Element, palace: number): GateVitality {
  return twoAxisVitality(STEM_ELEM[stem], season, PALACE_ELEM[palace]);
}

// ─── 月令 season element from the month-pillar branch (當令) ──────────────────
//   寅卯木 · 巳午火 · 申酉金 · 亥子水 · 辰戌丑未土
const BRANCH_SEASON_ELEM: Record<number, Element> = {
  2: '木', 3: '木', 5: '火', 6: '火', 8: '金', 9: '金', 11: '水', 0: '水',
  4: '土', 10: '土', 1: '土', 7: '土',
};
export const seasonElement = (monthBranchIndex: number): Element =>
  BRANCH_SEASON_ELEM[monthBranchIndex];
