// BLE Proximity Hook
// Periodic scanning for nearby devices with Infekt app

import { useEffect, useState, useRef } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from './useAuth';
import { useLocation } from './useLocation';
import { infectProximity } from '../lib/api';
import { supabase } from '../lib/supabase';

interface NearbyDevice {
  userId: string;
  deviceId: string;
  signalStrength: number;
  lastSeen: Date;
}

export function useBLEProximity(enabled: boolean = true) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !user || Platform.OS === 'web') {
      return; // BLE not available on web
    }

    // Request Bluetooth permissions
    requestPermissions();

    // Start periodic scanning (every 30-60 seconds)
    startScanning();

    return () => {
      stopScanning();
    };
  }, [enabled, user]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true;
  };

  const startScanning = () => {
    if (isScanning) return;

    setIsScanning(true);
    // Scan every 30 seconds
    scanIntervalRef.current = setInterval(() => {
      scanForNearbyDevices();
    }, 30000);

    // Initial scan
    scanForNearbyDevices();
  };

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  };

  const scanForNearbyDevices = async () => {
    if (!user || !location) return;

    try {
      // In a real implementation, you would use a BLE library like react-native-ble-plx
      // For now, this is a placeholder that would:
      // 1. Scan for BLE devices advertising Infekt service UUID
      // 2. Extract user ID from advertisement data
      // 3. Measure signal strength (RSSI)
      // 4. Update nearby devices list

      // Placeholder: Get nearby users from database based on location
      // In production, use actual BLE scanning
      const { data: nearbyUsers } = await supabase
        .from('users')
        .select('id, last_location')
        .not('id', 'eq', user.id)
        .not('last_location', 'is', null)
        .limit(10);

      if (nearbyUsers) {
        const devices: NearbyDevice[] = nearbyUsers
          .map((nearbyUser) => {
            // Calculate distance (simplified)
            // In production, use actual BLE signal strength
            const signalStrength = -70; // Placeholder
            return {
              userId: nearbyUser.id,
              deviceId: nearbyUser.id, // Placeholder
              signalStrength,
              lastSeen: new Date(),
            };
          })
          .filter((device) => device.signalStrength > -80); // Filter weak signals

        setNearbyDevices(devices);

        // Auto-infect if signal is strong enough
        for (const device of devices) {
          if (device.signalStrength > -75) {
            try {
              await infectProximity(
                user.id,
                device.userId,
                device.signalStrength,
                location
              );
            } catch (error) {
              console.error('Proximity infection failed:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('BLE scan error:', error);
    }
  };

  return {
    nearbyDevices,
    isScanning,
    startScanning,
    stopScanning,
  };
}

