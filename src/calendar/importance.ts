// ─────────────────────────────────────────────────────────────────────────────
// importance.ts — which 格局 are worth SHOWING.
//
// One palace routinely matches three or four overlapping formations: a 乙 + 开门 +
// 太阴 palace in 巽4 is 风遁 AND 三奇之灵 AND 真诈 at once. Listing them all buries
// the one that decides the reading. reconcile() (scoring.ts) already collapses the
// overlaps that are the SAME claim; what is left is a genuine stack, and the UI has
// to pick.
//
// Rank by tier magnitude — 大吉/大凶 speak loudest — and colour by direction, so a
// 凶格 can never render in the same gold as a 吉格.
// ─────────────────────────────────────────────────────────────────────────────
import { TIER_WEIGHTS, type Tier } from './data/patterns.ts';

/** How loudly a formation speaks — |tier weight|. `conditional` resolves to ±25 at
 *  scoring time, so it ranks just under a plain 吉 / 凶. */
export function formationWeight(tier: Tier): number {
  return tier === 'conditional' ? 25 : Math.abs(TIER_WEIGHTS[tier]);
}

export const isAuspicious = (t: Tier): boolean =>
  t === 'supreme-auspicious' || t === 'auspicious' || t === 'minor-auspicious';
export const isInauspicious = (t: Tier): boolean =>
  t === 'supreme-inauspicious' || t === 'inauspicious' || t === 'minor-inauspicious';

/**
 * The n loudest formations, 大吉 / 大凶 first.
 *
 * Ties keep source order, so the label reconcile() deliberately preferred (三诈 over
 * 三奇之灵) still wins its slot. Replaces the old `slice(0, 3)`, which took whichever
 * formations happened to sit in the lowest-numbered palace.
 *
 * De-duplicated by id: a search row's list spans all nine palaces, so 天遁 in two
 * palaces would otherwise spend both chips on the same name — and collide on the
 * React key.
 */
export function topFormations<T extends { id: string; tier: Tier }>(list: T[], n = 2): T[] {
  const ranked = list
    .map((f, i) => ({ f, i }))
    .sort((a, b) => formationWeight(b.f.tier) - formationWeight(a.f.tier) || a.i - b.i);

  const out: T[] = [];
  const seen = new Set<string>();
  for (const { f } of ranked) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
    if (out.length === n) break;
  }
  return out;
}

/** 吉 gold · 凶 red · unresolved muted. A 凶格 must never render gold. */
export function formationColor(tier: Tier): string {
  if (isInauspicious(tier)) return 'var(--q-bad)';
  if (isAuspicious(tier)) return 'var(--gold)';
  return 'var(--q-caution)'; // neutral / conditional — sign not resolved until scoring
}
