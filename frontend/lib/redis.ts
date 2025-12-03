// Note: Redis operations from frontend go through Supabase Edge Functions
// This file contains helper functions for Redis-related operations

import { supabase } from './supabase';

// Leaderboard operations (called via Edge Functions)
export async function getLeaderboard(
  type: 'global' | 'city' | 'strain' | 'variant',
  filters?: { city?: string; strainId?: string; variantId?: string },
  limit = 100,
  offset = 0
) {
  const { data, error } = await supabase.functions.invoke('leaderboard/global', {
    body: { type, filters, limit, offset },
  });

  if (error) throw error;
  return data;
}

// Cache operations (handled server-side via Edge Functions)
export async function invalidateCache(userId: string) {
  // Cache invalidation is handled server-side
  // This is a placeholder for future client-side cache management
  return true;
}

