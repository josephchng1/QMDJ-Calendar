import { useEffect, useState } from 'react';
import { computeDayDirections } from '../worker/bridge.ts';
import type { CalendarOptions } from '../calendar/summary.ts';
import type { HourSummary } from '../calendar/hour.ts';
import type { ApplicationTag } from '../calendar/data/patterns.ts';
import type { Chart } from '../engine/index.ts';

export type DirHour = { chart: Chart; summary: HourSummary };

/** A day's 12 时辰, each with its v2 per-palace board + raw chart, via the worker. */
export function useDayDirections(y: number | null, m: number, d: number, opts: CalendarOptions, activity?: ApplicationTag) {
  const [hours, setHours] = useState<DirHour[] | null>(null);
  const [loading, setLoading] = useState(false);
  const key = y == null ? null : `${y}-${m}-${d}-${JSON.stringify(opts)}-${activity ?? ''}`;

  useEffect(() => {
    if (y == null) { setHours(null); return; }
    let alive = true;
    setLoading(true);
    computeDayDirections(y, m, d, opts, activity)
      .then((h) => { if (alive) { setHours(h); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { hours, loading };
}
