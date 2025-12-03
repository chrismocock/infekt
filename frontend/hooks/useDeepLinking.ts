// Deep Link Handler Hook
// Handles infekt:// links for auto-infection

import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { useLocation } from './useLocation';
import { infectDeepLink, infectQR } from '../lib/api';

export function useDeepLinking() {
  const router = useRouter();
  const { user } = useAuth();
  const { location, getCurrentLocation } = useLocation();

  useEffect(() => {
    if (!user) return; // Wait for user to be available

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    }).catch(console.error);

    // Handle deep links while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const handleDeepLink = async (url: string) => {
    if (!user) {
      return;
    }

    // Get location if not available
    let currentLocation = location;
    if (!currentLocation) {
      try {
        currentLocation = await getCurrentLocation();
      } catch (error) {
        console.error('Failed to get location for deep link:', error);
        return;
      }
    }

    try {
      const parsed = Linking.parse(url);
      const { hostname, path, queryParams } = parsed;

      if (hostname !== 'tag' && hostname !== 'i') {
        return; // Not an infection link
      }

      // infekt://tag/{strainId}
      if (hostname === 'tag' && path) {
        const strainId = path;
        if (currentLocation) {
          await infectQR(strainId, user.id, currentLocation);
          router.push('/(tabs)/strain');
        }
      }

      // infekt://i/{code}
      if (hostname === 'i' && path) {
        const linkCode = path;
        if (currentLocation) {
          await infectDeepLink(linkCode, currentLocation, user.id);
          router.push('/(tabs)/strain');
        }
      }
    } catch (error) {
      console.error('Deep link error:', error);
    }
  };

  return { handleDeepLink };
}

