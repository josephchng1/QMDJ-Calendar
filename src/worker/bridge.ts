// Typed message bridge to the engine worker. Same call signatures a tRPC/server
// layer would expose, so swapping worker<->server later is a one-line change (§6.2).
import type { ChartInput, Chart } from '../engine/index.ts';
import type { CalendarOptions, DaySummary, MonthSummary } from '../calendar/summary.ts';
import type { SearchQuery, SearchResult } from '../calendar/search.ts';
import type { HourSummary } from '../calendar/hour.ts';
import type { WorkerRequest, WorkerResponse } from './engine.worker.ts';

// Omit is NOT distributive over a union: keyof (A|B|C) is only the *common*
// keys, so Omit<WorkerRequest, 'id'> would collapse to just { kind }. Distribute
// it so each variant keeps its own payload (input / y,m,d / year,month...).
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, error, ...payload } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(payload);
    };
  }
  return worker;
}

function send<T>(req: DistributiveOmit<WorkerRequest, 'id'>, pick: (r: WorkerResponse) => T): Promise<T> {
  const w = getWorker();
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: (r) => resolve(pick(r as WorkerResponse)), reject });
    w.postMessage({ id, ...req } as WorkerRequest);
  });
}

export function computeChart(input: ChartInput): Promise<Chart> {
  return send({ kind: 'chart', input }, (r) => r.chart!);
}
export function computeDay(y: number, m: number, d: number, opts: CalendarOptions): Promise<DaySummary> {
  return send({ kind: 'day', y, m, d, opts }, (r) => r.day!);
}
export function computeMonth(year: number, month: number, opts: CalendarOptions): Promise<MonthSummary> {
  return send({ kind: 'month', year, month, opts }, (r) => r.month!);
}
export function computeSearch(query: SearchQuery): Promise<SearchResult> {
  return send({ kind: 'search', query }, (r) => r.search!);
}
export function computeDayDirections(
  y: number, m: number, d: number, opts: CalendarOptions,
): Promise<{ chart: Chart; summary: HourSummary }[]> {
  return send({ kind: 'daydir', y, m, d, opts }, (r) => r.dayDir!);
}
