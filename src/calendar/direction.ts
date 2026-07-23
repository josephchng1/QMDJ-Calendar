// ─────────────────────────────────────────────────────────────────────────────
// direction.ts — the per-DIRECTION layer of the v2 model.
//
//   §2   PALACE_DIRECTION       — 九宫 → compass direction (中5 has none)
//   §4.3 baseFilter             — the TIGHTENED usability ladder (strict reading)
//   §4.6 emergencyDirections    — 急则从神 (bypass the pipeline in a hurry)
//   §4.7 三奇 nullification      — the one structural condition that feeds the filter
//
// Source of truth: qmdj-palace-direction-model-v2.md. Tokens are the engine's
// SIMPLIFIED forms (开门 not 開門), matching board.ts / patterns.ts.
// ─────────────────────────────────────────────────────────────────────────────
import type { Palace } from '../engine/board.ts';
import type { Chart } from '../engine/index.ts';
import { GOOD_GATES, type Door } from './data/patterns.ts';
import {
  PALACE_ELEM, STEM_ELEM, GATE_ELEM, SANQI_RUMU, controls,
} from './data/structural.ts';
import type { MatchedFormation } from './evaluator.ts';

// ─── §2 direction map ────────────────────────────────────────────────────────
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const PALACE_DIRECTION: Record<number, Direction | null> = {
  1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 5: null, 6: 'NW', 7: 'W', 8: 'NE', 9: 'S',
};
/** Chinese label for a direction, for UI copy. */
export const DIRECTION_LABEL: Record<Direction, string> = {
  N: '北', NE: '东北', E: '东', SE: '东南', S: '南', SW: '西南', W: '西', NW: '西北',
};
export const directionOf = (palace: number): Direction | null =>
  PALACE_DIRECTION[palace] ?? null;

// ─── §4.7 三奇受制 → nullification ("奇也就不奇了") ────────────────────────────
// Three control axes: palace element · 地盘干 · GATE element (the gate axis is the
// v2 extension). Compounding rule: 入墓 + 受剋(≥1 axis), OR 剋 on ≥2 axes → nullified.
// A nullified wonder does NOT count as 得奇 in baseFilter — the one place a
// structural condition feeds the filter rather than the score.
const WONDERS = ['乙', '丙', '丁'] as const;

function wonderControlAxes(wonder: string, p: Palace): number {
  const we = STEM_ELEM[wonder];
  let n = 0;
  if (controls(PALACE_ELEM[p.palace], we)) n++;               // 宫剋奇
  if (p.diPanStem && controls(STEM_ELEM[p.diPanStem], we)) n++; // 地盘干剋奇
  if (p.gate && GATE_ELEM[p.gate] && controls(GATE_ELEM[p.gate], we)) n++; // 门剋奇 (NEW)
  return n;
}

/** Is this specific wonder nullified in this palace? */
export function wonderNullified(wonder: string, p: Palace): boolean {
  if (!p.tianPanStems.includes(wonder)) return false;
  const ke = wonderControlAxes(wonder, p);
  const tomb = SANQI_RUMU[wonder]?.includes(p.palace) ?? false;
  return (tomb && ke >= 1) || ke >= 2;
}

/** Wonders present on the 天盘 that are NOT nullified — the ones that count. */
export function effectiveSanQi(p: Palace): string[] {
  return WONDERS.filter((w) => p.tianPanStems.includes(w) && !wonderNullified(w, p));
}
export const hasEffectiveSanQi = (p: Palace): boolean => effectiveSanQi(p).length > 0;

// ─── §4.3 the usability ladder (strict reading) ──────────────────────────────
export type BaseFilterResult = '吉方' | 'usable' | 'not-auspicious' | '凶方';

/**
 * S0(p136), selection chapter, in full:
 *   三奇 + 三吉门相会    → 吉方  (最佳的方位)
 *   得门不得奇          → usable (也算吉利方位，可用)
 *   得奇不得门          → not-auspicious (还不能算吉利方位) — the strict R1 reading
 *   逢吉格 (无奇无门)    → usable (NEW fourth rung)
 *   otherwise           → 凶方
 * `goodGates` defaults to the 三吉门; purpose mode passes the preset's gates.
 */
export function baseFilter(
  p: Palace,
  matched: MatchedFormation[],
  goodGates: readonly Door[] = GOOD_GATES,
): BaseFilterResult {
  const hasQi = hasEffectiveSanQi(p);
  const hasGate = p.gate != null && goodGates.includes(p.gate as Door);
  const hasJiGe = matched.some(
    (m) => m.tier === 'supreme-auspicious' || m.tier === 'auspicious',
  );
  if (hasQi && hasGate) return '吉方';
  if (hasGate) return 'usable';
  if (hasQi) return 'not-auspicious';
  if (hasJiGe) return 'usable';
  return '凶方';
}

// ─── §4.6 急则从神 ────────────────────────────────────────────────────────────
// 如逢急难，宜从值符方下而行 — the 天盘值符宫 and the 地盘值符宫 (where the 旬首仪
// sits). Bypasses the whole pipeline. 中5 is dropped (no direction).
export function emergencyDirections(chart: Chart): number[] {
  const b = chart.board;
  const tian = b.zhiFuDisplayPalace;                          // 天盘值符宫
  const di = b.palaces.find((p) => p.diPanStem === b.xunShouYi)?.palace ?? tian; // 地盘值符宫
  return Array.from(new Set([tian, di])).filter((pal) => pal !== 5);
}
