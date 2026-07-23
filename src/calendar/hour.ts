// ─────────────────────────────────────────────────────────────────────────────
// hour.ts — roll-ups the v2 way (§5).
//
//   HOUR is DESCRIBED, not scored.  An average across directions that disagree is
//   meaningless, so the hour carries counts (how many prime / good directions) +
//   context (role favour, emergency directions, chart warnings) — never one number.
//
//   DAY is a PROJECTION, not a mean.  A day with one superb 时辰 and eleven
//   mediocre ones is excellent for someone who can act at that hour; a mean buries
//   it. So the day reports its PEAK cell + prime/good cell counts.
// ─────────────────────────────────────────────────────────────────────────────
import { buildChart } from '../engine/index.ts';
import { STEMS } from '../engine/ganzhi.ts';
import {
  isWuBuYuShi, repetition, isTianXianShi, isHourStemTomb,
} from './data/structural.ts';
import { evaluatePalaces, type PalaceScore, type ScoreProfile, type Band } from './palace.ts';
import { emergencyDirections, type Direction } from './direction.ts';
import { HOUR_SAMPLE, daysInMonth, type CalendarOptions } from './summary.ts';
import type { Chart } from '../engine/index.ts';

/** 五阳时 (甲乙丙丁戊) 利客 · 五阴时 (己庚辛壬癸) 利主. (§4.4) */
export function hourRoleFavour(hourStem: string): 'mover' | 'host' {
  return ['甲', '乙', '丙', '丁', '戊'].includes(hourStem) ? 'mover' : 'host';
}

export interface HourSummary {
  palaces: PalaceScore[];        // length 9, index-ordered
  counts: { prime: number; good: number };
  chartWarnings: string[];
  chartBlocked: boolean;         // 五不遇时 → every palace blocked; excluded from search
  hourRoleFavour: 'mover' | 'host';
  emergencyDirections: number[];
}

export function computeHourSummary(chart: Chart, profile: ScoreProfile = { kind: 'general' }): HourSummary {
  const palaces = evaluatePalaces(chart, profile);
  const dayStem = STEMS[chart.pillars.day.stem];
  const hourStem = STEMS[chart.pillars.hour.stem];

  const chartBlocked = isWuBuYuShi(dayStem, hourStem);

  const chartWarnings: string[] = [];
  if (chartBlocked) chartWarnings.push('五不遇时');
  const rep = repetition(chart.board);
  if (rep.anyFuYin && !isTianXianShi(chart)) chartWarnings.push('伏吟');
  if (rep.anyFanYin) chartWarnings.push('反吟');
  if (isHourStemTomb(chart)) chartWarnings.push('时干入墓');

  // 中5 excluded from direction counts (§9-R2). Blocked cells never count.
  let prime = 0, good = 0;
  for (const ps of palaces) {
    if (ps.palace === 5 || ps.blocked) continue;
    if (ps.band === 'prime') prime++;
    else if (ps.band === 'good') good++;
  }

  return {
    palaces,
    counts: { prime, good },
    chartWarnings,
    chartBlocked,
    hourRoleFavour: hourRoleFavour(hourStem),
    emergencyDirections: emergencyDirections(chart),
  };
}

// ─── day projection ───────────────────────────────────────────────────────────
export interface PeakCell {
  branchIndex: number;
  branch: string;
  palace: number;
  direction: Direction | null;
  score: number;
  band: Band;
}
/** Lightweight per-时辰 line for the calendar sparkline — the hour's best band
 *  (prime > good > plain) and its direction counts. Not a score. */
export interface HourBar {
  branchIndex: number;
  bestBand: Band;
  blocked: boolean;
  prime: number;
  good: number;
}
export interface DayProjection {
  y: number; m: number; d: number;
  peak: PeakCell | null;         // null only if the whole day is blocked
  primeCells: number;            // prime (hour × palace) cells across the day
  goodCells: number;
  blockedHours: number;          // 时辰 fully excluded (五不遇时)
  hours: HourBar[];              // 12, index-ordered — for the day cell's mini bar
}

const BRANCHES_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const rankBand = (b: Band): number => (b === 'prime' ? 2 : b === 'good' ? 1 : 0);

export function computeDayProjection(
  y: number, m: number, d: number,
  opts: CalendarOptions = {}, profile: ScoreProfile = { kind: 'general' },
): DayProjection {
  let peak: PeakCell | null = null;
  const hours: HourBar[] = HOUR_SAMPLE.map((hh, branchIndex) => {
    const chart = buildChart({ y, m, d, hh, mm: 0, ...opts });
    const hs = computeHourSummary(chart, profile);
    let prime = 0, good = 0, bestBand: Band = 'plain';
    if (!hs.chartBlocked) {
      for (const ps of hs.palaces) {
        if (ps.palace === 5 || ps.blocked) continue;
        if (ps.band === 'prime') { prime++; bestBand = 'prime'; }
        else if (ps.band === 'good') { good++; if (bestBand !== 'prime') bestBand = 'good'; }
        if (peak == null
          || rankBand(ps.band) > rankBand(peak.band)
          || (rankBand(ps.band) === rankBand(peak.band) && ps.score > peak.score)) {
          peak = {
            branchIndex, branch: BRANCHES_CN[branchIndex],
            palace: ps.palace, direction: ps.direction, score: ps.score, band: ps.band,
          };
        }
      }
    }
    return { branchIndex, bestBand, blocked: hs.chartBlocked, prime, good };
  });

  return {
    y, m, d, peak,
    primeCells: hours.reduce((a, h) => a + h.prime, 0),
    goodCells: hours.reduce((a, h) => a + h.good, 0),
    blockedHours: hours.filter((h) => h.blocked).length,
    hours,
  };
}

// ─── month projection ─────────────────────────────────────────────────────────
export interface MonthProjection {
  year: number;
  month: number;
  days: DayProjection[];
}
export function computeMonthProjection(
  year: number, month: number,
  opts: CalendarOptions = {}, profile: ScoreProfile = { kind: 'general' },
): MonthProjection {
  const n = daysInMonth(year, month);
  const days: DayProjection[] = [];
  for (let d = 1; d <= n; d++) days.push(computeDayProjection(year, month, d, opts, profile));
  return { year, month, days };
}
