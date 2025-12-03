import { useCallback, useEffect, useState } from 'react';
import { getUserTags, UserTagList } from '../lib/api';
import { UserTag } from '../types/database';

export function useUserTags(userId: string | null) {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTags = useCallback(async () => {
    if (!userId) {
      setTags([]);
      setTotal(0);
      return;
    }

    try {
      setLoading(true);
      const response: UserTagList = await getUserTags(userId);
      setTags(response.tags || []);
      setTotal(response.total || response.tags.length);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    total,
    loading,
    error,
    refetch: fetchTags,
  };
}
