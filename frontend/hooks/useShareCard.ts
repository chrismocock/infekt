// Hook for share card generation

import { useState } from 'react';
import { useAuth } from './useAuth';
import { generateShareCard } from '../lib/api';
import * as Sharing from 'expo-sharing';

export function useShareCard() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (includeStats: boolean = true) => {
    if (!user || !user.current_strain_id) {
      throw new Error('User or strain not found');
    }

    try {
      setGenerating(true);
      setError(null);
      const result = await generateShareCard(user.id, user.current_strain_id, includeStats);
      setShareCardUrl(result.imageUrl);
      return result;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const share = async () => {
    if (!shareCardUrl) {
      throw new Error('No share card generated');
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(shareCardUrl);
      } else {
        // Fallback: copy link to clipboard
        // Would need Clipboard API
        console.log('Sharing not available, URL:', shareCardUrl);
      }
    } catch (err: any) {
      throw err;
    }
  };

  return {
    generate,
    share,
    shareCardUrl,
    generating,
    error,
  };
}

