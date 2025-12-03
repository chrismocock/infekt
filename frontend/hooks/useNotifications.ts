import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotifications } from '../lib/notifications';

export function useNotifications() {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();

    // Handle notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
        const data = notification.request.content.data;
        
        // Handle different notification types
        if (data?.type === 'outbreak_alert') {
          // Could show in-app banner
        } else if (data?.type === 'tag_drop_available') {
          // Could show in-app banner
        } else if (data?.type === 'hotspot_detected') {
          // Could show in-app banner
        }
      });

    // Handle notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type
        if (data?.type === 'infection_success') {
          // Navigate to infection history or dashboard
          router.push('/(tabs)');
        } else if (data?.type === 'outbreak_alert') {
          // Navigate to map
          router.push('/(tabs)/map');
        } else if (data?.type === 'tag_drop_available') {
          // Navigate to map
          router.push('/(tabs)/map');
        } else if (data?.type === 'hotspot_detected') {
          // Navigate to map
          router.push('/(tabs)/map');
        } else if (data?.type === 'chain_reaction') {
          // Navigate to dashboard
          router.push('/(tabs)');
        } else if (data?.type === 'mutation_unlock') {
          // Navigate to mutations screen
          router.push('/mutations');
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}

