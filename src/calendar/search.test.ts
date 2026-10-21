// searchRange invariants — run against the real deterministic engine over a small
// range (7 days × 12 时辰 = 84 charts). We assert structural guarantees of each
// mode, not specific dates (those depend on the engine's verified output).
import { describe, it, expect } from 'vitest';
import { searchRange, type SearchQuery, type SlotResult } from './search.ts';
import { buildChart } from '../engine/index.ts';
import { computeHourSummary } from './hour.ts';
import { scoreBand } from './bandsV2.ts';
import { HOUR_SAMPLE } from './summary.ts';

const START = { y: 2026, m: 1, d: 1 };
const base = (over: Partial<SearchQuery>): SearchQuery => ({ start: START, days: 7, mode: 'recommended', ...over });

const summaryOf = (s: SlotResult) =>
  computeHourSummary(buildChart({ y: s.y, m: s.m, d: s.d, hh: HOUR_SAMPLE[s.branchIndex], mm: 0 }));
const palaceAt = (s: SlotResult) => summaryOf(s).palaces.find((p) => p.palace !== 5 && p.direction === s.direction)!;
/** 不用 rows are listed but always after every usable one */
const blockedLast = (slots: SlotResult[]) => slots.every((s, i) => !slots[i - 1]?.blocked || s.blocked);

function isSortedDesc(xs: number[]): boolean {
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[i - 1]) return false;
  return true;
}

describe('searchRange — recommended', () => {
  const r = searchRange(base({ mode: 'recommended', activity: 'launch' }));
  it('scans every day × 时辰', () => expect(r.scanned).toBe(7 * 12));
  it('ranks usable results by score, descending', () =>
    expect(isSortedDesc(r.slots.filter((s) => !s.blocked).map((s) => s.score))).toBe(true));
  it('lists 不吉 and 不用 slots too, 不用 ranked last', () => {
    const all = searchRange(base({ mode: 'recommended', activity: 'launch', limit: 999 })).slots;
    expect(all.some((s) => s.band === 'plain' && !s.blocked)).toBe(true);
    expect(all.some((s) => s.blocked)).toBe(true);
    expect(blockedLast(all)).toBe(true);
    expect(all.filter((s) => s.warnings.includes('五不遇时')).every((s) => s.blocked)).toBe(true);
  });
  it('shows the grade the day panel draws for the same 时辰 and 用事', () => {
    for (const s of r.slots.slice(0, 5)) {
      const chart = buildChart({ y: s.y, m: s.m, d: s.d, hh: HOUR_SAMPLE[s.branchIndex], mm: 0 });
      const hs = computeHourSummary(chart, { kind: 'purpose', activity: 'launch' });
      const best = Math.max(...hs.palaces.filter((p) => p.palace !== 5 && !p.blocked).map((p) => p.score));
      expect(s.score).toBe(best);
      expect(s.band).toBe(scoreBand(best, false));
    }
  });
});

describe('searchRange — by-formation', () => {
  it('returns only slots that actually contain the chosen 格局', () => {
    const r = searchRange(base({ mode: 'by-formation', formationId: 'tian-dun' }));
    expect(r.slots.length).toBeGreaterThan(0);
    // the row's direction is the palace that holds it, so the board shows it there
    expect(blockedLast(r.slots)).toBe(true);
    for (const s of r.slots) {
      expect(palaceAt(s).blocked).toBe(s.blocked);
      expect(palaceAt(s).matched.some((m) => m.id === 'tian-dun')).toBe(true);
    }
  });
  it('shows the chips the board shows for that 时辰 and direction', () => {
    const r = searchRange(base({ mode: 'by-formation', formationId: 'tian-dun' }));
    for (const s of r.slots) {
      const hs = summaryOf(s);
      const ps = s.direction ? palaceAt(s) : null;
      expect(s.grades).toEqual([...hs.chartGrades, ...(ps?.grades ?? [])]);
      expect(s.warnings).toEqual([...new Set([...hs.chartWarnings, ...(ps?.warnings ?? [])])]);
    }
  });
});

describe('searchRange — filter', () => {
  it('honours avoid + default 时干入墓 exclusion, 不用 ranked last', () => {
    const r = searchRange(base({
      mode: 'filter',
      filters: { avoid: ['反吟'], minScore: 0, allowWuBuYu: false },
    }));
    expect(r.slots.every((s) => !s.warnings.includes('反吟'))).toBe(true);
    expect(r.slots.every((s) => !s.warnings.includes('时干入墓'))).toBe(true);
    expect(blockedLast(r.slots)).toBe(true);
  });
  it('a minScore threshold drops 不吉 and 不用', () => {
    const r = searchRange(base({ mode: 'filter', filters: { minScore: 16 } }));
    expect(r.slots.every((s) => !s.blocked && s.score >= 16)).toBe(true);
  });
  it('require gate returns only slots holding the required 格局', () => {
    const r = searchRange(base({ mode: 'filter', filters: { require: ['qinglong-fanshou'] } }));
    for (const s of r.slots) expect(palaceAt(s).matched.some((m) => m.id === 'qinglong-fanshou')).toBe(true);
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
