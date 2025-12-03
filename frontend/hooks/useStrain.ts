import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getStrain } from '../lib/api';
import { Strain, StrainAnalytics } from '../types/database';

export function useStrain(strainId: string | null) {
  const [strain, setStrain] = useState<Strain | null>(null);
  const [analytics, setAnalytics] = useState<StrainAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!strainId) {
      setLoading(false);
      return;
    }

    loadStrainData();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`strain:${strainId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'strains',
          filter: `id=eq.${strainId}`,
        },
        (payload) => {
          setStrain(payload.new as Strain);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [strainId]);

  const loadStrainData = async () => {
    try {
      setLoading(true);
      const data = await getStrain(strainId!);
      setStrain(data.strain);
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    strain,
    analytics,
    loading,
    error,
    refetch: loadStrainData,
  };
}

