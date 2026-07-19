import { useEffect, useState } from 'react';
import { computeMonth } from '../worker/bridge.ts';
import type { CalendarOptions, MonthSummary } from '../calendar/summary.ts';

/** Month summary via the worker. Recomputes when month or engine options change. */
export function useMonth(year: number, month: number, opts: CalendarOptions) {
  const [month_, setMonth] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = `${year}-${month}-${JSON.stringify(opts)}`;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    computeMonth(year, month, opts)
      .then((m) => { if (alive) { setMonth(m); setError(null); setLoading(false); } })
      .catch((e) => { if (alive) { setError(String(e)); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { month: month_, loading, error };
}
