// Web Worker: runs the pure engine off the main thread (blueprint §3/§6).
// Handles three request kinds — a single chart, a day's 12-时辰 summary, and a
// month summary — all deterministic functions of (instant, method, options).
import { buildChart, type ChartInput, type Chart } from '../engine/index.ts';
import {
  computeDaySummary, computeMonthSummary,
  type CalendarOptions, type DaySummary, type MonthSummary,
} from '../calendar/summary.ts';
import { searchRange, type SearchQuery, type SearchResult } from '../calendar/search.ts';

export type WorkerRequest =
  | { id: number; kind: 'chart'; input: ChartInput }
  | { id: number; kind: 'day'; y: number; m: number; d: number; opts: CalendarOptions }
  | { id: number; kind: 'month'; year: number; month: number; opts: CalendarOptions }
  | { id: number; kind: 'search'; query: SearchQuery };

export type WorkerResponse = {
  id: number;
  chart?: Chart;
  day?: DaySummary;
  month?: MonthSummary;
  search?: SearchResult;
  error?: string;
};

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    switch (req.kind) {
      case 'chart':
        ctx.postMessage({ id: req.id, chart: buildChart(req.input) } satisfies WorkerResponse);
        break;
      case 'day':
        ctx.postMessage({ id: req.id, day: computeDaySummary(req.y, req.m, req.d, req.opts) } satisfies WorkerResponse);
        break;
      case 'month':
        ctx.postMessage({ id: req.id, month: computeMonthSummary(req.year, req.month, req.opts) } satisfies WorkerResponse);
        break;
      case 'search':
        ctx.postMessage({ id: req.id, search: searchRange(req.query) } satisfies WorkerResponse);
        break;
    }
  } catch (err) {
    ctx.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse);
  }
};
