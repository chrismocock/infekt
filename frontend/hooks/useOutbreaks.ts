import { useState, useEffect } from 'react';
import { getGlobalEvents, getStrainOutbreaks, OutbreakEvent } from '../lib/api';
import { supabase } from '../lib/supabase';

export function useOutbreaks(region?: string, hours = 24) {
  const [events, setEvents] = useState<OutbreakEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGlobalEvents(region, hours);
      setEvents(data.events);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();

    // Subscribe to real-time outbreak updates
    const subscription = supabase
      .channel('outbreak-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'outbreak_events',
        },
        () => {
          loadEvents(); // Reload on new outbreak
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [region, hours]);

  return {
    events,
    loading,
    error,
    refresh: loadEvents,
  };
}

export function useStrainOutbreaks(strainId: string | null) {
  const [outbreaks, setOutbreaks] = useState<OutbreakEvent[]>([]);
  const [grouped, setGrouped] = useState<Record<string, OutbreakEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOutbreaks = async () => {
    if (!strainId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getStrainOutbreaks(strainId);
      setOutbreaks(data.outbreaks);
      setGrouped(data.grouped_by_region);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutbreaks();
  }, [strainId]);

  return {
    outbreaks,
    grouped,
    loading,
    error,
    refresh: loadOutbreaks,
  };
}

