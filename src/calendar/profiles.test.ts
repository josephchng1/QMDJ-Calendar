// Purpose mode (§4.2 step 9) — a palace carrying the activity's 用神 gate must
// score higher under that purpose than under general mode. Proves profiles.ts is
// wired into orderingScore.
import { describe, it, expect } from 'vitest';
import { buildChart } from '../engine/index.ts';
import { evaluatePalaces } from './palace.ts';
import { HOUR_SAMPLE, type CalendarOptions } from './summary.ts';

describe('purpose mode 用神 scoring', () => {
  it('boosts a 开门/生门 palace under 开业 (launch) vs general', () => {
    const opts: CalendarOptions = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true };
    const launchGates = new Set(['开门', '生门']);   // ACTIVITY_PRESETS.launch.goodGates
    let checked = 0;

    for (let d = 1; d <= 28 && checked < 5; d++) {
      for (const hh of HOUR_SAMPLE) {
        const chart = buildChart({ y: 2026, m: 6, d, hh, mm: 0, ...opts });
        const gen = evaluatePalaces(chart, { kind: 'general' });
        const pur = evaluatePalaces(chart, { kind: 'purpose', activity: 'launch' });
        for (let i = 0; i < 9; i++) {
          if (gen[i].blocked || pur[i].blocked) continue;
          const gate = chart.board.palaces[i].gate;
          if (gate && launchGates.has(gate)) {
            expect(pur[i].score).toBeGreaterThan(gen[i].score);
            checked++;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);   // found at least one 用神 palace to verify
  });

  it('general mode is unchanged by purpose wiring (deterministic)', () => {
    const opts: CalendarOptions = { method: 'zhirun', spiritVariant: false, lateZiNextDay: true };
    const chart = buildChart({ y: 2026, m: 8, d: 14, hh: 8, mm: 0, ...opts });
    const a = evaluatePalaces(chart, { kind: 'general' }).map((p) => p.score);
    const b = evaluatePalaces(chart, { kind: 'general' }).map((p) => p.score);
    expect(a).toEqual(b);
  });
});
