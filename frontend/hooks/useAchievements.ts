import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  data: Record<string, any>;
  progress: Record<string, any>;
  completed_at: string | null;
  reward_mp: number;
}

export function useAchievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAchievements = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('strain_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false, nullsFirst: false });

      if (err) throw err;
      setAchievements(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, [user]);

  const checkProgress = (achievementKey: string) => {
    const achievement = achievements.find((a) => a.achievement_key === achievementKey);
    return achievement?.progress || {};
  };

  const isCompleted = (achievementKey: string) => {
    const achievement = achievements.find((a) => a.achievement_key === achievementKey);
    return achievement?.completed_at !== null;
  };

  return {
    achievements,
    loading,
    error,
    checkProgress,
    isCompleted,
    refresh: loadAchievements,
  };
}

