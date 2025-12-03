import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { mapboxConfig } from '../../lib/mapbox';

// Conditional import for react-native-maps (native only)
let MapView: any;
let PROVIDER_GOOGLE: any;
let Region: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  Region = maps.Region;
}

interface MapboxMapProps {
  initialRegion?: any;
  region?: any;
  onRegionChange?: (region: any) => void;
  onPress?: (event: any) => void;
  children?: React.ReactNode;
}

export function MapboxMap({
  initialRegion,
  region,
  onRegionChange,
  onPress,
  children,
}: MapboxMapProps) {
  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webPlaceholder}>
          <Text style={styles.webText}>🗺️ Map View</Text>
          <Text style={styles.webSubtext}>
            Map functionality is available on mobile devices
          </Text>
        </View>
      </View>
    );
  }

  const defaultRegion = initialRegion || {
    latitude: mapboxConfig.initialViewport.latitude,
    longitude: mapboxConfig.initialViewport.longitude,
    latitudeDelta: mapboxConfig.initialViewport.latitudeDelta,
    longitudeDelta: mapboxConfig.initialViewport.longitudeDelta,
  };
  const controlledRegion = region || undefined;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={defaultRegion}
        region={controlledRegion}
        onRegionChangeComplete={onRegionChange}
        onPress={onPress}
        showsUserLocation
        showsMyLocationButton
        mapType="satellite"
      >
        {children}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  webText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  webSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

