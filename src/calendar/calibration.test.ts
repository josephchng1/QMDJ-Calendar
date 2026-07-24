// Calibration harness (§8.1). Computes the real per-(hour×palace) score
// distribution across a year, so SCORE_PRIME / SCORE_GOOD (bandsV2) can be set
// from data rather than guessed. Logs a greppable block; run in CI, read the log.
// Not a correctness gate — it asserts only that data was produced.
import { describe, it, expect } from 'vitest';
import { buildChart } from '../engine/index.ts';
import { computeHourSummary } from './hour.ts';
import { HOUR_SAMPLE, daysInMonth, type CalendarOptions } from './summary.ts';

function pct(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

describe('score calibration', () => {
  it('distribution over 2026 (zhirun)', () => {
    const opts: CalendarOptions = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true };
    const scores: number[] = [];
    let cells = 0, blocked = 0, blockedHours = 0, hours = 0;
    const year = 2026;
    for (let m = 1; m <= 12; m++) {
      const dim = daysInMonth(year, m);
      for (let d = 1; d <= dim; d += 3) {          // sample every 3rd day
        HOUR_SAMPLE.forEach((hh) => {
          const chart = buildChart({ y: year, m, d, hh, mm: 0, ...opts });
          const hs = computeHourSummary(chart);
          hours++;
          if (hs.chartBlocked) { blockedHours++; }
          for (const ps of hs.palaces) {
            if (ps.palace === 5) continue;
            cells++;
            if (ps.blocked) { blocked++; continue; }
            scores.push(ps.score);
          }
        });
      }
    }
    scores.sort((a, b) => a - b);
    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const ps = [50, 60, 70, 75, 80, 85, 90, 92.5, 95, 96, 97, 98, 99].map((p) => [p, pct(scores, p)] as const);

    const bandsAt = (tp: number, tg: number) => {
      let prime = 0, good = 0;
      for (const s of scores) { if (s >= tp) prime++; else if (s >= tg) good++; }
      const usable = cells - blocked;
      return { tp, tg,
        prime: (100 * prime / usable).toFixed(1),
        good: (100 * good / usable).toFixed(1),
        primeGood: (100 * (prime + good) / usable).toFixed(1) };
    };

    const out = {
      cells, usable: cells - blocked,
      blockedPct: (100 * blocked / cells).toFixed(1),
      blockedHourPct: (100 * blockedHours / hours).toFixed(1),
      min: scores[0], max: scores[n - 1], mean: +mean.toFixed(1),
      percentiles: Object.fromEntries(ps.map(([p, v]) => [p, +v.toFixed(1)])),
      candidates: [
        bandsAt(25, 8),   // current
        bandsAt(30, 10), bandsAt(35, 12), bandsAt(40, 12),
        bandsAt(pct(scores, 96), pct(scores, 75)),
        bandsAt(pct(scores, 97), pct(scores, 78)),
      ],
    };
    // eslint-disable-next-line no-console
    console.log('CALIB>>>' + JSON.stringify(out) + '<<<CALIB');
    expect(n).toBeGreaterThan(1000);
  }, 120000);
});
