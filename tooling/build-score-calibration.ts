// Builds src/calendar/data/scoreCalibration.json — the within-band percentile tables
// behind the 0–100 display score (spec §1.2).
//   node --experimental-strip-types tooling/build-score-calibration.ts
// Reference period 2025-01-01 … 2027-12-31, every day, 12 时辰 at HOUR_SAMPLE, the 8
// outer palaces, blocked cells excluded. One 101-point quantile array per
// method × profile × band. A bucket under 200 cells is left out (the runtime falls
// back to that band's `general` table) and logged.
import { writeFileSync } from 'node:fs';
import { buildChart } from '../src/engine/index.ts';
import { evaluatePalaces, scoringHash, type ScoreProfile, type Band } from '../src/calendar/palace.ts';
import { calibrationKey } from '../src/calendar/bandsV2.ts';
import { HOUR_SAMPLE } from '../src/calendar/summary.ts';
import { ACTIVITY_ORDER } from '../src/calendar/data/presets.ts';

const OUT = new URL('../src/calendar/data/scoreCalibration.json', import.meta.url);
const MIN_CELLS = 200;
const profiles: [string, ScoreProfile][] = [
  ['general', { kind: 'general' }],
  ...ACTIVITY_ORDER.map((a): [string, ScoreProfile] => [a, { kind: 'purpose', activity: a }]),
];

const raw = new Map<string, number[]>();
for (const method of ['zhirun', 'chaibu'] as const) {
  for (let dt = new Date(2025, 0, 1); dt.getFullYear() <= 2027; dt.setDate(dt.getDate() + 1)) {
    for (const hh of HOUR_SAMPLE) {
      const chart = buildChart({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate(), hh, mm: 0,
        method, spiritVariant: false, lateZiNextDay: true });
      for (const [key, profile] of profiles) {
        for (const p of evaluatePalaces(chart, profile)) {
          if (p.palace === 5 || p.blocked) continue;
          const k = calibrationKey(method, key, p.band);
          (raw.get(k) ?? raw.set(k, []).get(k)!).push(p.score);
        }
      }
    }
  }
}

const buckets: Record<string, number[]> = {};
const counts: Record<string, number> = {};
for (const method of ['zhirun', 'chaibu']) for (const [key] of profiles) for (const band of ['prime', 'good', 'plain'] as Band[]) {
  const k = calibrationKey(method, key, band);
  const xs = (raw.get(k) ?? []).sort((a, b) => a - b);
  counts[k] = xs.length;
  if (xs.length < MIN_CELLS) { console.warn(`WARN ${k}: ${xs.length} cells < ${MIN_CELLS} — falls back to general`); continue; }
  buckets[k] = Array.from({ length: 101 }, (_, i) => xs[Math.round((i / 100) * (xs.length - 1))]);
}

writeFileSync(OUT, JSON.stringify({
  hash: scoringHash(),
  period: '2025-01-01..2027-12-31, HOUR_SAMPLE, outer palaces, unblocked',
  counts, buckets,
}) + '\n');
console.log(`wrote ${Object.keys(buckets).length} buckets, hash ${scoringHash()}`);
