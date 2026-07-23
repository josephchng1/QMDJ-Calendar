import { useEffect, useState } from 'react';
import { computeMonthProjection } from '../worker/bridge.ts';
import type { CalendarOptions } from '../calendar/summary.ts';
import type { MonthProjection } from '../calendar/hour.ts';

/** Month of v2 day projections (peak cell + prime/good counts) via the worker. */
export function useMonthProjection(year: number, month: number, opts: CalendarOptions) {
  const [month_, setMonth] = useState<MonthProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const key = `${year}-${month}-${JSON.stringify(opts)}`;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    computeMonthProjection(year, month, opts)
      .then((m) => { if (alive) { setMonth(m); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { month: month_, loading };
}
