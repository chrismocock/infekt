import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(new Error('Location permission denied'));
        setLoading(false);
        return;
      }

      setPermissionGranted(true);
      await getCurrentLocation();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    try {
      const locationData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const loc: LocationData = {
        lat: locationData.coords.latitude,
        lng: locationData.coords.longitude,
        accuracy: locationData.coords.accuracy,
      };

      setLocation(loc);

      // Update user's last_location in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const point = `POINT(${loc.lng} ${loc.lat})`;
        await supabase
          .from('users')
          .update({ last_location: point })
          .eq('id', user.id);
      }

      return loc;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  const startLocationUpdates = () => {
    if (!permissionGranted) return;

    const subscription = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 50, // Update every 50 meters
      },
      (locationData) => {
        const loc: LocationData = {
          lat: locationData.coords.latitude,
          lng: locationData.coords.longitude,
          accuracy: locationData.coords.accuracy,
        };
        setLocation(loc);
      }
    );

    return subscription;
  };

  return {
    location,
    loading,
    error,
    permissionGranted,
    getCurrentLocation,
    startLocationUpdates,
    requestPermission,
  };
}

