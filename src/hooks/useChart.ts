import { useEffect, useState } from 'react';
import { computeChart } from '../worker/bridge.ts';
import type { Chart, ChartInput } from '../types.ts';

/** Async chart computation via the worker. Re-runs when any input field changes. */
export function useChart(input: ChartInput) {
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(input);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    computeChart(input)
      .then((c) => { if (alive) { setChart(c); setError(null); setLoading(false); } })
      .catch((e) => { if (alive) { setError(String(e)); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { chart, error, loading };
}
