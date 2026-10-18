// Web Worker: runs the pure engine off the main thread (blueprint §3/§6).
// Two request kinds — a day's 12 时辰 with per-palace grading, and a range
// search — both deterministic functions of (instant, method, options).
import { buildChart, type Chart } from '../engine/index.ts';
import { HOUR_SAMPLE, type CalendarOptions } from '../calendar/summary.ts';
import { computeHourSummary, type HourSummary } from '../calendar/hour.ts';
import { searchRange, type SearchQuery, type SearchResult } from '../calendar/search.ts';
import type { ScoreProfile } from '../calendar/palace.ts';
import type { ApplicationTag } from '../calendar/data/patterns.ts';

export type WorkerRequest =
  | { id: number; kind: 'search'; query: SearchQuery }
  | { id: number; kind: 'daydir'; y: number; m: number; d: number; opts: CalendarOptions; activity?: ApplicationTag };

export type WorkerResponse = {
  id: number;
  search?: SearchResult;
  dayDir?: { chart: Chart; summary: HourSummary }[];
  error?: string;
};

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    switch (req.kind) {
      case 'search':
        ctx.postMessage({ id: req.id, search: searchRange(req.query) } satisfies WorkerResponse);
        break;
      case 'daydir': {
        // 12 时辰 of a day, each with the v2 per-palace HourSummary + its raw chart
        // (the board needs the chart's glyphs; the summary carries bands/reasons).
        const profile: ScoreProfile = req.activity
          ? { kind: 'purpose', activity: req.activity }
          : { kind: 'general' };
        const dayDir = HOUR_SAMPLE.map((hh) => {
          const chart = buildChart({ y: req.y, m: req.m, d: req.d, hh, mm: 0, ...req.opts });
          return { chart, summary: computeHourSummary(chart, profile) };
        });
        ctx.postMessage({ id: req.id, dayDir } satisfies WorkerResponse);
        break;
      }
    }
  } catch (err) {
    ctx.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse);
  }
};
