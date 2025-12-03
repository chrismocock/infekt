import { useState, useEffect } from 'react';
import { getLeaderboard } from '../lib/api';
import { LeaderboardEntry } from '../types/database';

export type LeaderboardType = 'global' | 'city' | 'strain' | 'variant';

export function useLeaderboard(
  type: LeaderboardType = 'global',
  filters?: { city?: string; strainId?: string; variantId?: string }
) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadLeaderboard();
  }, [type, filters]);

  const loadLeaderboard = async (limit = 100, offset = 0) => {
    try {
      setLoading(true);
      const data = await getLeaderboard(type, filters, limit, offset);
      setEntries(data.entries);
      setTotal(data.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadLeaderboard();
  };

  return {
    entries,
    loading,
    error,
    total,
    refresh,
  };
}

