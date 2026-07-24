// Calibration + regression gate (§8.1). Computes the real per-(hour×palace) score
// distribution across 2026 and asserts the band frequencies stay tradition-shaped
// (大吉 ≈ 2-5%, 大吉+吉 ≈ 20-30%, blocked ≈ 20-32%). A scoring change that shifts
// these materially fails CI loudly. Also logs a greppable block for re-tuning.
import { describe, it, expect } from 'vitest';
import { buildChart } from '../engine/index.ts';
import { computeHourSummary } from './hour.ts';
import { HOUR_SAMPLE, daysInMonth, type CalendarOptions } from './summary.ts';
import { scoreBand } from './bandsV2.ts';

function pct(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

describe('score calibration', () => {
  it('band distribution over 2026 stays tradition-shaped (zhirun)', () => {
    const opts: CalendarOptions = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true };
    const scores: number[] = [];
    let cells = 0, blocked = 0, prime = 0, good = 0;
    const year = 2026;
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d += 3) {          // sample every 3rd day
        HOUR_SAMPLE.forEach((hh) => {
          const hs = computeHourSummary(buildChart({ y: year, m, d, hh, mm: 0, ...opts }));
          for (const p of hs.palaces) {
            if (p.palace === 5) continue;
            cells++;
            if (p.blocked) { blocked++; continue; }
            scores.push(p.score);
            const b = scoreBand(p.score, p.blocked);
            if (b === 'prime') prime++; else if (b === 'good') good++;
          }
        });
      }
    }
    scores.sort((a, b) => a - b);
    const usable = cells - blocked;
    const primePct = 100 * prime / usable;
    const goodPct = 100 * good / usable;
    const blockedPct = 100 * blocked / cells;

    // eslint-disable-next-line no-console
    console.log('CALIB>>>' + JSON.stringify({
      cells, usable, blockedPct: +blockedPct.toFixed(1),
      primePct: +primePct.toFixed(1), goodPct: +goodPct.toFixed(1),
      primeGoodPct: +(primePct + goodPct).toFixed(1),
      min: scores[0], max: scores[scores.length - 1],
      p: Object.fromEntries([50, 75, 90, 95, 96, 97, 99].map((q) => [q, +pct(scores, q).toFixed(1)])),
    }) + '<<<CALIB');

    // Regression gate — tradition-shaped frequencies (§8.1).
    expect(usable).toBeGreaterThan(1000);
    expect(blockedPct).toBeGreaterThan(18);
    expect(blockedPct).toBeLessThan(34);
    expect(primePct).toBeGreaterThan(2);
    expect(primePct).toBeLessThan(6);
    expect(primePct + goodPct).toBeGreaterThan(18);
    expect(primePct + goodPct).toBeLessThan(32);
  }, 120000);
});
