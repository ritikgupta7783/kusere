import { useCallback, useEffect, useState } from 'react';

/** Counts down from `start` seconds to 0. `restart(n)` begins again. */
export default function useCountdown(start = 0) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const restart = useCallback((n = 60) => setLeft(n), []);
  return [left, restart];
}
