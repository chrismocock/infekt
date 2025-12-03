import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

// Conditional import for react-native-maps (native only)
let Marker: any;
let Callout: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  Marker = maps.Marker;
  Callout = maps.Callout;
}

interface ClusterMarkerProps {
  coordinate: { latitude: number; longitude: number };
  count: number;
  strainIds: string[];
  onPress?: () => void;
}

export function ClusterMarker({
  coordinate,
  count,
  strainIds,
  onPress,
}: ClusterMarkerProps) {
  // Web fallback - return nothing (map won't render on web anyway)
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View style={styles.marker}>
        <View style={styles.markerContent}>
          <Text style={styles.markerText}>{count}</Text>
        </View>
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{count} Infections</Text>
          <Text style={styles.calloutSubtitle}>
            {strainIds.length} unique strain{strainIds.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  callout: {
    padding: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#666',
  },
});

