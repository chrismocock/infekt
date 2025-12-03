import { useState, useEffect } from 'react';
import { getStrainTimeline, TimelinePoint } from '../lib/api';

export function useTimeline(strainId: string | null, window: '24h' | '7d' | '30d' = '24h') {
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [cached, setCached] = useState(false);

  const loadTimeline = async () => {
    if (!strainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getStrainTimeline(strainId, window);
      setPoints(data.points);
      setCached(data.cached);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [strainId, window]);

  return {
    points,
    loading,
    error,
    cached,
    refresh: loadTimeline,
  };
}

