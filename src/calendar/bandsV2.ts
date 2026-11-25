// Presentation for the v2 three-band model. Kept out of the engine so scoring
// stays free of UI concerns; shared by every v2 component so labels and colours
// never drift.
//
// ONE VERDICT (Joe, 2026-11-25). The visible band — tint, hour counts, search band,
// legend — is the rule-ladder band, PalaceScore.band. The number shown beside it is
// a DISPLAY score pinned inside that band's range (大吉 70–100 · 吉 40–69 · 不吉 0–39;
// blocked shows 不用), so number and colour can never disagree. Within a band the
// value is the cell's percentile among that band's cells over a reference period
// (data/scoreCalibration.json, built by tooling/build-score-calibration.ts).
// (Supersedes 2026-07-24 "colour follows score": SCORE_PRIME/SCORE_GOOD are retired.)
//
// One shared auspicious scale (§6.7): 大吉 = gold, 吉 = teal, 不吉 = no tint.
import type { Band } from './palace.ts';
import CALIBRATION from './data/scoreCalibration.json' with { type: 'json' };

export const V2_BAND_LABEL: Record<Band, string> = { prime: '大吉', good: '吉', plain: '不吉' };
export const V2_BAND_COLOR: Record<Band, string> = {
  prime: 'var(--gold)', good: 'var(--q-excellent)', plain: 'var(--text-dim)',
};

/** Fixed display range per band (spec §1.2). */
export const DISPLAY_RANGE: Record<Band, [number, number]> = {
  prime: [70, 100], good: [40, 69], plain: [0, 39],
};

export interface ScoreCalibration { hash: string; buckets: Record<string, number[]> }
export const calibrationKey = (method: string, profile: string, band: Band) => `${method}|${profile}|${band}`;

/** Fraction of reference cells with raw ≤ x, interpolated between 101 stored
 *  quantiles (q[k] = k-th percentile). Monotone non-decreasing, clamped to 0..1. */
export function percentileOf(q: readonly number[], x: number): number {
  if (!q.length || x < q[0]) return 0;
  if (x >= q[q.length - 1]) return 1;
  let k = 0;
  while (q[k + 1] <= x) k++;            // largest k with q[k] ≤ x (q[k+1] > x ≥ q[k])
  return (k + (x - q[k]) / (q[k + 1] - q[k])) / (q.length - 1);
}

/** The 0–100 display score for an unblocked cell: its band's floor plus its
 *  within-band percentile. Falls back to the method's `general` table for a missing
 *  (thin) bucket — the build script logs those. */
export function displayScore(
  raw: number, band: Band, method: string, profile: string,
  cal: ScoreCalibration = CALIBRATION as ScoreCalibration,
): number {
  const q = cal.buckets[calibrationKey(method, profile, band)]
    ?? cal.buckets[calibrationKey(method, 'general', band)] ?? [];
  const [lo, hi] = DISPLAY_RANGE[band];
  return lo + Math.round((hi - lo) * percentileOf(q, raw));
}

/** Tint fill for a band — one color-mix over the neutral cell base, from the shared
 *  band token, so every shaded surface stays in sync (§6.7). */
export function bandTint(band: Band): string {
  if (band === 'plain') return 'var(--bg-cell)';
  return `color-mix(in srgb, ${V2_BAND_COLOR[band]} 14%, var(--bg-cell))`;
}
