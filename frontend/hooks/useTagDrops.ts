// Hook for managing tag drops

import { useState, useEffect } from 'react';
import { useLocation } from './useLocation';
import { useAuth } from './useAuth';
import { getUserTagDrops, getNearbyTagDrops, createTagDrop, claimTagDrop } from '../lib/api';
import { supabase } from '../lib/supabase';

export interface TagDrop {
  id: string;
  tag_ids: string[];
  location: string;
  expires_at: string;
  creator_id: string;
  claimed_by: string[];
  created_at: string;
}

export function useTagDrops(options?: { showMyDrops?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { location } = useLocation();
  const showMyDrops = options?.showMyDrops ?? true; // Default to showing user's drops
  const [drops, setDrops] = useState<TagDrop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if we've successfully loaded drops at least once
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const loadDrops = async () => {
    if (showMyDrops) {
      // Wait for auth to finish loading before checking user
      if (authLoading) {
        console.log('useTagDrops: Auth still loading, waiting...');
        return;
      }
      
      if (!user) {
        console.log('useTagDrops: No user available after auth loaded, skipping load. Has loaded once:', hasLoadedOnce, 'Current drops:', drops.length);
        // Don't clear drops if user is temporarily unavailable - preserve existing drops
        // The user might just be loading or there's a brief auth state change
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('useTagDrops: Loading drops for user:', user.id);
        const userDrops = await getUserTagDrops(user.id);
        console.log('useTagDrops: Loaded', userDrops.length, 'drops');
        setDrops(userDrops);
        setHasLoadedOnce(true);
      } catch (err: any) {
        console.error('useTagDrops: Failed to load drops:', err);
        setError(err);
        // Don't clear drops on error - keep existing ones
      } finally {
        setLoading(false);
      }
    } else {
      // For nearby drops, we still need location
      if (!location) {
        console.log('useTagDrops: No location available, skipping load');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('useTagDrops: Loading nearby drops for location:', location);
        const nearbyDrops = await getNearbyTagDrops(location);
        console.log('useTagDrops: Loaded', nearbyDrops.length, 'drops');
        setDrops(nearbyDrops);
      } catch (err: any) {
        console.error('useTagDrops: Failed to load drops:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDrops();
    // Refresh every 30 seconds
    const interval = setInterval(loadDrops, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMyDrops ? user?.id : location]);

  const createDrop = async (creatorId: string, tagIds: string[], expiresAt?: string) => {
    if (!location) {
      throw new Error('Location required');
    }

    try {
      const result = await createTagDrop(creatorId, tagIds, location, expiresAt);
      await loadDrops(); // Refresh list
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  const claimDrop = async (dropId: string, playerId: string) => {
    if (!location) {
      throw new Error('Location required');
    }

    try {
      const result = await claimTagDrop(dropId, playerId, location);
      await loadDrops(); // Refresh list
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    drops,
    loading,
    error,
    createDrop,
    claimDrop,
    refresh: loadDrops,
  };
}

