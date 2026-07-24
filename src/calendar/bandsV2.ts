// Presentation for the v2 three-band model. Kept out of the engine so scoring
// stays free of UI concerns; shared by every v2 component so labels and colours
// never drift.
//
// COLOUR FOLLOWS SCORE (Joe, 2026-07-24). The visible band — palace tint, corner
// score colour, hour direction counts, legend — is derived from the ordering
// SCORE via `scoreBand`, so colour and number can never disagree. The classical
// rule-ladder band (PalaceScore.band / rung / reasons) is retained only for the
// click-popup "why" trace, not for colour.
//
// One shared auspicious scale (§6.7): 大吉 = gold, 吉 = teal, 不吉 = no tint.
import type { Band } from './palace.ts';

export const V2_BAND_LABEL: Record<Band, string> = { prime: '大吉', good: '吉', plain: '不吉' };
export const V2_BAND_COLOR: Record<Band, string> = {
  prime: 'var(--gold)', good: 'var(--q-excellent)', plain: 'var(--text-dim)',
};

// Score thresholds (tuning knobs — §8.2). Formations dominate the score
// (±30/60/100), symbols are ±5–15, so: a strong 奇门相会 / 吉格 lands 'prime',
// a plain 吉门 lands 'good', neutral/negative stays 'plain'.
export const SCORE_PRIME = 25;
export const SCORE_GOOD = 8;

/** The DISPLAY band for a palace — colour follows score (§6.6). Blocked cells are
 *  never tinted (they carry the hatch overlay instead). */
export function scoreBand(score: number, blocked: boolean): Band {
  if (blocked) return 'plain';
  if (score >= SCORE_PRIME) return 'prime';
  if (score >= SCORE_GOOD) return 'good';
  return 'plain';
}

/** Tint fill for a display band — one color-mix over the neutral cell base, from
 *  the shared band token, so every shaded surface stays in sync (§6.7). */
export function bandTint(band: Band): string {
  if (band === 'plain') return 'var(--bg-cell)';
  return `color-mix(in srgb, ${V2_BAND_COLOR[band]} 14%, var(--bg-cell))`;
}

/** Direction counts for an hour, from the SCORE band. 中5宫 and blocked excluded. */
export function scoreCounts(
  palaces: { palace: number; score: number; blocked: boolean }[],
): { prime: number; good: number } {
  let prime = 0, good = 0;
  for (const p of palaces) {
    if (p.palace === 5 || p.blocked) continue;
    const b = scoreBand(p.score, p.blocked);
    if (b === 'prime') prime++;
    else if (b === 'good') good++;
  }
  return { prime, good };
}
