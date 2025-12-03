import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEST_MODE_STORAGE_KEY = 'testMode:enabled';

export function useTestMode() {
  const [isTestModeEnabled, setIsTestModeEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadTestModeState = async () => {
    try {
      const value = await AsyncStorage.getItem(TEST_MODE_STORAGE_KEY);
      const enabled = value === 'true';
      setIsTestModeEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error('Error loading test mode state:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load initial state
    loadTestModeState();

    // Set up periodic check to sync with AsyncStorage changes
    // This ensures all components stay in sync when test mode is toggled
    intervalRef.current = setInterval(() => {
      loadTestModeState();
    }, 1000); // Check every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const toggleTestMode = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(TEST_MODE_STORAGE_KEY, enabled.toString());
      setIsTestModeEnabled(enabled);
      // Immediately update state - the interval will also catch it, but this is faster
    } catch (error) {
      console.error('Error saving test mode state:', error);
    }
  };

  return {
    isTestModeEnabled,
    toggleTestMode,
    loading,
  };
}

