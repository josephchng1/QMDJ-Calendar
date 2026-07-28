// ─────────────────────────────────────────────────────────────────────────────
// Pattern evaluator — interprets each PatternRule.when against a chart.
//
// Palace-scope rules are matched per outer palace (中5 skipped — it carries no
// gate/spirit/天盘 wonder). Chart-scope rules (天显时) read the pillars once.
// A `when` clause is an AND of the fields present; `any` is an OR of sub-clauses
// ANDed with the sibling scalar fields. Conditional-tier SIGN is NOT resolved
// here — the evaluator only reports matches; scoring.ts resolves valence.
// ─────────────────────────────────────────────────────────────────────────────
import { STEMS } from '../engine/ganzhi.ts';
import type { Palace } from '../engine/board.ts';
import type { Chart } from '../engine/index.ts';
import {
  ALL_PATTERNS,
  type PatternRule, type WhenClause,
  type Tier, type ApplicationTag, type Confidence,
} from './data/patterns.ts';

export interface MatchedFormation {
  id: string;
  name: string;
  nameEn: string;
  tier: Tier;
  scope: 'palace' | 'chart';
  palace?: number;
  favours: ApplicationTag[];
  avoid: ApplicationTag[];
  confidence: Confidence;
}

const PALACE_RULES = ALL_PATTERNS.filter((r) => r.scope === 'palace');
const CHART_RULES = ALL_PATTERNS.filter((r) => r.scope === 'chart');

const asArr = <T,>(x: T | T[] | undefined): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

// 合 pairs (either orientation on the plate): 乙庚·丙辛·丁壬 (奇合) · 戊癸·甲己 (仪合).
const HE_SET = new Set(['乙庚', '庚乙', '丙辛', '辛丙', '丁壬', '壬丁', '戊癸', '癸戊', '甲己', '己甲']);
function palaceHasHePair(p: Palace): boolean {
  for (const tp of p.tianPanStems) if (HE_SET.has(tp + p.diPanStem)) return true;
  return false;
}

/** Match a when-clause against one palace (palace-scope semantics). */
export function matchPalace(c: WhenClause, p: Palace): boolean {
  if (c.tianPanStem && !p.tianPanStems.includes(c.tianPanStem)) return false;
  if (c.diPanStem && p.diPanStem !== c.diPanStem) return false;
  if (c.anyStem && !c.anyStem.some((s) => p.tianPanStems.includes(s))) return false;
  if (c.door) { const ds = asArr(c.door); if (!p.gate || !ds.includes(p.gate as any)) return false; }
  if (c.star) { const ss = asArr(c.star); if (!ss.some((s) => p.stars.includes(s))) return false; }
  if (c.spirit) { const gs = asArr(c.spirit); if (!p.spirit || !gs.includes(p.spirit as any)) return false; }
  if (c.palaceIndex) { const pis = asArr(c.palaceIndex); if (!pis.includes(p.palace as any)) return false; }
  if (c.isZhiFu && !p.isZhiFu) return false;
  if (c.isZhiShiGate && !p.isZhiShi) return false;
  if (c.sanqiInPalace) {
    const hit = Object.entries(c.sanqiInPalace)
      .some(([w, pal]) => p.palace === pal && p.tianPanStems.includes(w));
    if (!hit) return false;
  }
  if (c.stemPairIsHe && !palaceHasHePair(p)) return false;
  if (c.any && !c.any.some((sub) => matchPalace(sub, p))) return false;
  return true;
}

/** Match a chart-scope when-clause (reads the pillars). */
export function matchChart(c: WhenClause, chart: Chart): boolean {
  if (c.hourStemIs && STEMS[chart.pillars.hour.stem] !== c.hourStemIs) return false;
  return true;
}

function toMatched(r: PatternRule, palace?: number): MatchedFormation {
  return {
    id: r.id, name: r.name, nameEn: r.nameEn, tier: r.tier, scope: r.scope,
    palace, favours: r.guidance.favours, avoid: r.guidance.avoid, confidence: r.confidence,
  };
}

/** All formations present in a chart — palace-scope (per outer palace) + chart-scope. */
export function evaluateChart(chart: Chart): MatchedFormation[] {
  const out: MatchedFormation[] = [];
  for (const p of chart.board.palaces) {
    if (p.palace === 5) continue; // centre carries no gate/spirit/天盘 wonder
    for (const r of PALACE_RULES) if (matchPalace(r.when, p)) out.push(toMatched(r, p.palace));
  }
  for (const r of CHART_RULES) if (matchChart(r.when, chart)) out.push(toMatched(r));
  return out;
}
