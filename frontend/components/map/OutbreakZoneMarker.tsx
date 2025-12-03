// Outbreak Zone Marker Component

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

interface OutbreakZoneMarkerProps {
  coordinate: { latitude: number; longitude: number };
  radius: number;
  severity: number;
  onPress?: () => void;
}

export function OutbreakZoneMarker({
  coordinate,
  radius,
  severity,
  onPress,
}: OutbreakZoneMarkerProps) {
  if (Platform.OS === 'web') {
    return null;
  }

  // Severity determines color: 1-3 = yellow, 4-6 = orange, 7-10 = red
  const getColor = () => {
    if (severity <= 3) return '#ffd93d';
    if (severity <= 6) return '#ff6b6b';
    return '#ff0000';
  };

  const color = getColor();

  return (
    <>
      <Circle
        center={coordinate}
        radius={radius}
        strokeWidth={3}
        strokeColor={color}
        fillColor={`${color}20`}
      />
      <Marker coordinate={coordinate} onPress={onPress}>
        <View style={[styles.marker, { borderColor: color }]}>
          <View style={styles.markerContent}>
            <Text style={styles.markerIcon}>⚠️</Text>
            <Text style={[styles.markerText, { color }]}>{severity}</Text>
          </View>
        </View>
        <Callout>
          <View style={styles.callout}>
            <Text style={[styles.calloutTitle, { color }]}>
              Outbreak Zone
            </Text>
            <Text style={styles.calloutSubtitle}>
              Severity: {severity}/10
            </Text>
            <Text style={styles.calloutWarning}>
              High infection risk area
            </Text>
          </View>
        </Callout>
      </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff0000',
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
    fontSize: 18,
  },
  markerText: {
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: -4,
  },
  callout: {
    padding: 12,
    minWidth: 180,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  calloutWarning: {
    fontSize: 12,
    color: '#ff6b6b',
    fontStyle: 'italic',
  },
});

