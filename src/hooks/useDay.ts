import { useEffect, useState } from 'react';
import { computeDay } from '../worker/bridge.ts';
import type { CalendarOptions, DaySummary } from '../calendar/summary.ts';

/** Single day's 12-时辰 summary via the worker. */
export function useDay(y: number | null, m: number, d: number, opts: CalendarOptions) {
  const [day, setDay] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const key = y == null ? null : `${y}-${m}-${d}-${JSON.stringify(opts)}`;

  useEffect(() => {
    if (y == null) { setDay(null); return; }
    let alive = true;
    setLoading(true);
    computeDay(y, m, d, opts)
      .then((s) => { if (alive) { setDay(s); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { day, loading };
}
