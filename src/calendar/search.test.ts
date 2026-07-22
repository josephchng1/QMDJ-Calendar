// searchRange invariants — run against the real deterministic engine over a small
// range (7 days × 12 时辰 = 84 charts). We assert structural guarantees of each
// mode, not specific dates (those depend on the engine's verified output).
import { describe, it, expect } from 'vitest';
import { searchRange, type SearchQuery } from './search.ts';

const START = { y: 2026, m: 1, d: 1 };
const base = (over: Partial<SearchQuery>): SearchQuery => ({ start: START, days: 7, mode: 'recommended', ...over });

function isSortedDesc(xs: number[]): boolean {
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[i - 1]) return false;
  return true;
}

describe('searchRange — recommended', () => {
  const r = searchRange(base({ mode: 'recommended', activity: 'launch' }));
  it('scans every day × 时辰', () => expect(r.scanned).toBe(7 * 12));
  it('ranks results by score, descending', () => expect(isSortedDesc(r.slots.map((s) => s.score))).toBe(true));
  it('never surfaces a vetoed (blocked) slot', () => expect(r.slots.every((s) => !s.blocked)).toBe(true));
  it('never surfaces a 五不遇时 slot below the good cutoff', () =>
    expect(r.slots.every((s) => !s.warnings.includes('五不遇时') || s.score >= 12)).toBe(true));
  it('produces one day-score per day for the calendar overlay', () =>
    expect(Object.keys(r.dayScores)).toHaveLength(7));
});

describe('searchRange — by-formation', () => {
  it('returns only slots that actually contain the chosen 格局', () => {
    const r = searchRange(base({ mode: 'by-formation', formationId: 'tian-dun' }));
    expect(r.slots.every((s) => s.formations.some((f) => f.id === 'tian-dun'))).toBe(true);
  });
});

describe('searchRange — filter', () => {
  it('honours avoid + minScore + default 五不遇时 exclusion, no blocked', () => {
    const r = searchRange(base({
      mode: 'filter',
      filters: { avoid: ['反吟'], minScore: 0, allowWuBuYu: false },
    }));
    expect(r.slots.every((s) => !s.blocked)).toBe(true);
    expect(r.slots.every((s) => !s.warnings.includes('反吟'))).toBe(true);
    expect(r.slots.every((s) => !s.warnings.includes('五不遇时'))).toBe(true);
    expect(r.slots.every((s) => s.score >= 0)).toBe(true);
  });
  it('require gate returns only slots holding the required 格局', () => {
    const r = searchRange(base({ mode: 'filter', filters: { require: ['qinglong-fanshou'] } }));
    expect(r.slots.every((s) => s.formations.some((f) => f.id === 'qinglong-fanshou'))).toBe(true);
  });
});

describe('searchRange — hours restriction & limit', () => {
  it('restricts to the requested 时辰', () => {
    const r = searchRange(base({ hours: [0], activity: 'launch' }));
    expect(r.scanned).toBe(7);
    expect(r.slots.every((s) => s.branchIndex === 0)).toBe(true);
  });
  it('caps results at the limit', () => {
    const r = searchRange(base({ days: 30, activity: 'wealth', limit: 10 }));
    expect(r.slots.length).toBeLessThanOrEqual(10);
  });
});
