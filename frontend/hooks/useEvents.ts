// Hook for managing events

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Event {
  id: string;
  name: string;
  location: string;
  radius: number;
  start_time: string;
  end_time: string;
  mode: 'mass_infection' | 'chained' | 'drop_based';
  active: boolean;
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if events table exists, otherwise return empty
      const { data, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (eventsError) {
        // Table might not exist yet
        if (eventsError.message.includes('does not exist')) {
          setEvents([]);
          return;
        }
        throw eventsError;
      }

      setEvents(data || []);
    } catch (err: any) {
      setError(err);
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // Refresh every 5 minutes
    const interval = setInterval(loadEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    events,
    loading,
    error,
    refresh: loadEvents,
  };
}

