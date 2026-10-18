import { useEffect, useState } from 'react';
import { computeDayDirections } from '../worker/bridge.ts';
import type { CalendarOptions } from '../calendar/summary.ts';
import type { HourSummary } from '../calendar/hour.ts';
import type { ApplicationTag } from '../calendar/data/patterns.ts';
import type { Chart } from '../engine/index.ts';

export type DirHour = { chart: Chart; summary: HourSummary };
type Day = { y: number; m: number; d: number };

/** A day's 12 时辰, each with its v2 per-palace board + raw chart, via the worker.
 *  While a new day computes, the last loaded day's hours stay up WITH their own
 *  `day`, so a caller never pairs one day's label with another day's hours;
 *  `fresh` says whether they belong to the requested day yet. */
export function useDayDirections(y: number | null, m: number, d: number, opts: CalendarOptions, activity?: ApplicationTag) {
  const [loaded, setLoaded] = useState<{ key: string; day: Day; hours: DirHour[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = y == null ? null : `${y}-${m}-${d}-${JSON.stringify(opts)}-${activity ?? ''}`;

  useEffect(() => {
    if (y == null || key == null) { setLoaded(null); setError(null); return; }
    let alive = true;
    setError(null);
    computeDayDirections(y, m, d, opts, activity)
      .then((hours) => { if (alive) setLoaded({ key, day: { y, m, d }, hours }); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    hours: loaded?.hours ?? null,
    day: loaded?.day ?? null,
    fresh: loaded != null && loaded.key === key,
    error,
  };
}
