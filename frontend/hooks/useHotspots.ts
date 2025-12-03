// Hook for managing hotspots

import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';
import { getActiveHotspots } from '../lib/api';

export interface Hotspot {
  id: string;
  name: string;
  xp_multiplier: number;
  tag_boost_rate: number;
  location: string;
  radius: number;
}

export function useHotspots() {
  const { location } = useLocation();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadHotspots = async () => {
    if (!location) return;

    try {
      setLoading(true);
      setError(null);
      const activeHotspots = await getActiveHotspots(location);
      setHotspots(activeHotspots);
    } catch (err: any) {
      setError(err);
      console.error('Failed to load hotspots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotspots();
    // Refresh every 60 seconds
    const interval = setInterval(loadHotspots, 60000);
    return () => clearInterval(interval);
  }, [location]);

  return {
    hotspots,
    loading,
    error,
    refresh: loadHotspots,
  };
}

