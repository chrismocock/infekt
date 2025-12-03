// Hook for managing outbreak zones

import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';
import { getActiveOutbreakZones } from '../lib/api';

export interface OutbreakZone {
  id: string;
  severity: number;
  strain_id: string | null;
  location: string;
  radius: number;
}

export function useOutbreakZones() {
  const { location } = useLocation();
  const [zones, setZones] = useState<OutbreakZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadZones = async () => {
    if (!location) return;

    try {
      setLoading(true);
      setError(null);
      const activeZones = await getActiveOutbreakZones(location);
      setZones(activeZones);
    } catch (err: any) {
      setError(err);
      console.error('Failed to load outbreak zones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
    // Refresh every 60 seconds
    const interval = setInterval(loadZones, 60000);
    return () => clearInterval(interval);
  }, [location]);

  return {
    zones,
    loading,
    error,
    refresh: loadZones,
  };
}

