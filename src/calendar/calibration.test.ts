// Display score + calibration table (spec §1.2, §5.1). The old SCORE_PRIME/SCORE_GOOD
// threshold gate is retired: the band is the ladder's, and the number is pinned inside it.
import { describe, it, expect } from 'vitest';
import { buildChart } from '../engine/index.ts';
import { computeHourSummary } from './hour.ts';
import { HOUR_SAMPLE, daysInMonth, type CalendarOptions } from './summary.ts';
import { scoringHash, TUNING, type Band } from './palace.ts';
import { displayScore, percentileOf, DISPLAY_RANGE } from './bandsV2.ts';
import CALIBRATION from './data/scoreCalibration.json' with { type: 'json' };
import { TIER_WEIGHTS } from './data/patterns.ts';

describe('calibration table', () => {
  it('hash matches the current scoring constants (rebuild: npm run calibrate)', () => {
    expect(CALIBRATION.hash).toBe(scoringHash());
  });
  it('the hash moves when any tuning constant changes', () => {
    const h = scoringHash();
    TUNING.K_SHENG += 0.01;
    try { expect(scoringHash()).not.toBe(h); } finally { TUNING.K_SHENG -= 0.01; }
    (TIER_WEIGHTS as Record<string, number>).auspicious += 1;
    try { expect(scoringHash()).not.toBe(h); } finally { (TIER_WEIGHTS as Record<string, number>).auspicious -= 1; }
    expect(scoringHash()).toBe(h);
  });
  it('every bucket has 101 non-decreasing quantiles', () => {
    for (const q of Object.values(CALIBRATION.buckets) as number[][]) {
      expect(q).toHaveLength(101);
      for (let i = 1; i < q.length; i++) expect(q[i]).toBeGreaterThanOrEqual(q[i - 1]);
    }
  });
});

describe('display score', () => {
  it('percentileOf is monotone and clamped', () => {
    const q = [0, 0, 0, 10, 20, 20, 30];
    let last = -1;
    for (let x = -5; x <= 35; x += 0.5) {
      const p = percentileOf(q, x);
      expect(p).toBeGreaterThanOrEqual(last);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      last = p;
    }
  });
  const bands: Band[] = ['prime', 'good', 'plain'];
  for (const method of ['zhirun', 'chaibu']) for (const profile of ['general', 'launch']) {
    it(`monotone in raw within each band, and pinned to its range — ${method}/${profile}`, () => {
      for (const b of bands) {
        let last = -Infinity;
        for (let raw = -300; raw <= 500; raw += 0.7) {
          const d = displayScore(raw, b, method, profile);
          expect(d).toBeGreaterThanOrEqual(last);
          expect(d).toBeGreaterThanOrEqual(DISPLAY_RANGE[b][0]);
          expect(d).toBeLessThanOrEqual(DISPLAY_RANGE[b][1]);
          last = d;
        }
      }
    });
  }
  it('every 大吉 > every 吉 > every 不吉', () => {
    expect(DISPLAY_RANGE.prime[0]).toBeGreaterThan(DISPLAY_RANGE.good[1]);
    expect(DISPLAY_RANGE.good[0]).toBeGreaterThan(DISPLAY_RANGE.plain[1]);
  });
  it('deterministic', () => {
    expect(displayScore(37.3, 'good', 'zhirun', 'general')).toBe(displayScore(37.3, 'good', 'zhirun', 'general'));
  });
});

// Distribution report over 2026 (no shape gate: the band is the ladder's, and §8.1 is
// checked in validation-plan/report). Logged, greppable.
describe('2026 band distribution (zhirun, general)', () => {
  it('logs the ladder distribution', () => {
    const opts: CalendarOptions = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true };
    let cells = 0, blocked = 0, prime = 0, good = 0;
    for (let m = 1; m <= 12; m++) for (let d = 1; d <= daysInMonth(2026, m); d += 3) {
      for (const hh of HOUR_SAMPLE) {
        const hs = computeHourSummary(buildChart({ y: 2026, m, d, hh, mm: 0, ...opts }));
        for (const p of hs.palaces) {
          if (p.palace === 5) continue;
          cells++;
          if (p.blocked) blocked++; else if (p.band === 'prime') prime++; else if (p.band === 'good') good++;
        }
      }
    }
    const pc = (n: number) => +(100 * n / cells).toFixed(1);
    // eslint-disable-next-line no-console
    console.log('CALIB>>>' + JSON.stringify({ cells, prime: pc(prime), good: pc(good), blocked: pc(blocked) }) + '<<<CALIB');
    expect(cells).toBeGreaterThan(1000);
  }, 120000);
});
