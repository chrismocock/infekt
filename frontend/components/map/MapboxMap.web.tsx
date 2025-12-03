import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapboxMapProps {
  initialRegion?: any;
  region?: any;
  onRegionChange?: (region: any) => void;
  children?: React.ReactNode;
}

// Web placeholder to avoid loading native map modules
export function MapboxMap({ children }: MapboxMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.title}>Map unavailable on web</Text>
        <Text style={styles.subtitle}>
          Use the mobile app to view the interactive map.
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#333' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
});
