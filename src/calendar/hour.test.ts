import { describe, it, expect } from 'vitest';
import { buildChart } from '../engine/index.ts';
import { computeHourSummary, computeDayProjection, hourRoleFavour } from './hour.ts';
import type { Band } from './palace.ts';

const BANDS: Band[] = ['prime', 'good', 'plain'];

describe('hourRoleFavour — 五阳时利客 / 五阴时利主', () => {
  it('splits the ten stems into mover / host', () => {
    expect(hourRoleFavour('甲')).toBe('mover');
    expect(hourRoleFavour('戊')).toBe('mover');
    expect(hourRoleFavour('己')).toBe('host');
    expect(hourRoleFavour('癸')).toBe('host');
  });
});

describe('computeHourSummary — the hour is DESCRIBED, not scored', () => {
  const chart = buildChart({ y: 2026, m: 7, d: 6, hh: 10, mm: 0 });
  const hs = computeHourSummary(chart);

  it('produces nine index-ordered palaces with valid bands', () => {
    expect(hs.palaces).toHaveLength(9);
    hs.palaces.forEach((p, i) => {
      expect(p.palace).toBe(i + 1);
      expect(BANDS).toContain(p.band);
    });
  });
  it('carries counts, a role favour, and emergency directions — never one score', () => {
    expect(hs).not.toHaveProperty('score');
    expect(typeof hs.counts.prime).toBe('number');
    expect(typeof hs.counts.good).toBe('number');
    expect(['mover', 'host']).toContain(hs.hourRoleFavour);
    expect(hs.emergencyDirections.length).toBeGreaterThanOrEqual(1);
    expect(hs.emergencyDirections).not.toContain(5);
  });
  it('中5 and blocked cells are excluded from the counts', () => {
    const counted = hs.palaces.filter((p) => p.palace !== 5 && !p.blocked);
    const prime = counted.filter((p) => p.band === 'prime').length;
    const good = counted.filter((p) => p.band === 'good').length;
    expect(hs.counts.prime).toBe(prime);
    expect(hs.counts.good).toBe(good);
  });
  it('every non-plain cell carries at least one reason (reason-trace)', () => {
    for (const p of hs.palaces) {
      if (p.palace !== 5 && p.band !== 'plain') expect(p.reasons.length).toBeGreaterThan(0);
    }
  });
});

describe('computeDayProjection — the day is a PROJECTION, not a mean', () => {
  const proj = computeDayProjection(2026, 7, 6);
  it('reports a peak cell + cell counts, not an averaged score', () => {
    expect(proj).not.toHaveProperty('dayScore');
    expect(typeof proj.primeCells).toBe('number');
    expect(typeof proj.goodCells).toBe('number');
    if (proj.peak) {
      expect(BANDS).toContain(proj.peak.band);
      expect(proj.peak.palace).toBeGreaterThanOrEqual(1);
    }
  });
});
