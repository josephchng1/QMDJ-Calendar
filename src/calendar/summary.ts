// Day / month summaries — pure functions over the vendored engine (blueprint §4.1).
// A summary is a batch of scored 时辰. Ratings are LIGHT (no full charts) so they
// pass cheaply through the worker bridge; the day panel recomputes the single
// selected chart on demand via computeChart().
import { buildChart } from '../engine/index.ts';
import { BRANCHES } from '../engine/ganzhi.ts';
import { scoreHour, dayBand, meanScore, type Band } from './scoring.ts';

export interface CalendarOptions {
  method?: 'zhirun' | 'chaibu';
  spiritVariant?: boolean;
  lateZiNextDay?: boolean;
  tzHours?: number;
}

/** Representative sample hour per 时辰 — the midpoint, to stay clear of the
 *  2-hour boundaries where pillars/局 can flip. Index = branch (0=子 … 11=亥). */
export const HOUR_SAMPLE: number[] = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

export interface HourRating {
  branchIndex: number; // 0..11
  branch: string;      // 子 …
  hh: number;          // sample hour used
  ganzhi: string;      // 丙子
  score: number;
  band: Band;
  warnings: string[];
  formations: string[]; // matched 格局 names (deduped, capped) — for badges/search
  blocked: boolean;     // a veto fired (六仪击刑 / 三奇入墓)
}

export interface DaySummary {
  y: number; m: number; d: number;
  hours: HourRating[]; // 12
  dayScore: number;   // mean of the 12 hour scores (raw)
  dayBand: Band;
  bestIndex: number;   // index into hours of the best 时辰
}

export interface MonthSummary {
  year: number;  // civil year
  month: number; // 1..12
  days: DaySummary[]; // one per day of the month
}

export function computeDaySummary(y: number, m: number, d: number, opts: CalendarOptions = {}): DaySummary {
  const hours: HourRating[] = HOUR_SAMPLE.map((hh, branchIndex) => {
    const chart = buildChart({ y, m, d, hh, mm: 0, ...opts });
    const { score, band, warnings, blocked, formations } = scoreHour(chart);
    const names = Array.from(new Set(formations.map((f) => f.name))).slice(0, 6);
    return {
      branchIndex,
      branch: BRANCHES[branchIndex],
      hh,
      ganzhi: chart.pillars.hour.name,
      score,
      band,
      warnings,
      formations: names,
      blocked,
    };
  });

  // Best 时辰: the highest-scoring non-blocked hour; fall back to highest overall
  // if every hour is vetoed.
  const rank = (h: HourRating) => (h.blocked ? h.score - 1000 : h.score);
  let bestIndex = 0;
  for (let i = 1; i < hours.length; i++) if (rank(hours[i]) > rank(hours[bestIndex])) bestIndex = i;

  const scores = hours.map((h) => h.score);
  return {
    y, m, d,
    hours,
    dayScore: meanScore(scores),
    dayBand: dayBand(scores),
    bestIndex,
  };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function computeMonthSummary(year: number, month: number, opts: CalendarOptions = {}): MonthSummary {
  const n = daysInMonth(year, month);
  const days: DaySummary[] = [];
  for (let d = 1; d <= n; d++) days.push(computeDaySummary(year, month, d, opts));
  return { year, month, days };
}
