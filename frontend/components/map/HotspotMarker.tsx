// Hotspot Marker Component

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

let Marker: any;
let Callout: any;
let Circle: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  Marker = maps.Marker;
  Callout = maps.Callout;
  Circle = maps.Circle;
}

interface HotspotMarkerProps {
  coordinate: { latitude: number; longitude: number };
  radius: number;
  name: string;
  xpMultiplier: number;
  tagBoostRate: number;
  onPress?: () => void;
}

export function HotspotMarker({
  coordinate,
  radius,
  name,
  xpMultiplier,
  tagBoostRate,
  onPress,
}: HotspotMarkerProps) {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <>
      <Circle
        center={coordinate}
        radius={radius}
        strokeWidth={2}
        strokeColor="#ffd93d"
        fillColor="rgba(255, 217, 61, 0.1)"
      />
      <Marker coordinate={coordinate} onPress={onPress}>
        <View style={styles.marker}>
          <View style={styles.markerContent}>
            <Text style={styles.markerIcon}>🔥</Text>
          </View>
        </View>
        <Callout>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{name}</Text>
            <Text style={styles.calloutSubtitle}>
              XP Multiplier: {xpMultiplier}x
            </Text>
            <Text style={styles.calloutSubtitle}>
              Tag Boost: {tagBoostRate}%
            </Text>
          </View>
        </Callout>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffd93d',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffd93d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  markerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    fontSize: 20,
  },
  callout: {
    padding: 12,
    minWidth: 180,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffd93d',
    marginBottom: 8,
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
});

