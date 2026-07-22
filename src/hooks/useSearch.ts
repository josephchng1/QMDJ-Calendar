import { useEffect, useState } from 'react';
import { computeSearch } from '../worker/bridge.ts';
import type { SearchQuery, SearchResult } from '../calendar/search.ts';

/** Run a range search via the worker. Pass null until the user submits a query;
 *  re-runs whenever the (serialised) query changes. */
export function useSearch(query: SearchQuery | null) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = query ? JSON.stringify(query) : null;

  useEffect(() => {
    if (!query) { setResult(null); return; }
    let alive = true;
    setLoading(true);
    computeSearch(query)
      .then((r) => { if (alive) { setResult(r); setError(null); setLoading(false); } })
      .catch((e) => { if (alive) { setError(String(e)); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { result, loading, error };
}
