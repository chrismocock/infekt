// Tag Drop Marker Component

import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';

let Marker: any;
let Callout: any;
let Circle: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  Marker = maps.Marker;
  Callout = maps.Callout;
  Circle = maps.Circle;
}

const biohazardPinImage = require('../../assets/biohazard_pin.png');

interface TagDropMarkerProps {
  coordinate: { latitude: number; longitude: number };
  tagCount: number;
  expiresAt: string;
  radius?: number; // Infection radius in meters, default 10m
  onPress?: () => void;
}

export function TagDropMarker({
  coordinate,
  tagCount,
  expiresAt,
  radius = 10, // Default 10m radius
  onPress,
}: TagDropMarkerProps) {
  if (Platform.OS === 'web') {
    return null;
  }

  const isExpired = new Date(expiresAt) < new Date();

  return (
    <>
      <Circle
        center={coordinate}
        radius={radius}
        strokeWidth={2}
        strokeColor="#00ff88"
        fillColor="rgba(0, 255, 136, 0.1)"
      />
      <Marker 
        coordinate={coordinate} 
        onPress={onPress}
        anchor={{ x: 0.5, y: 1.0 }}
      >
      <View style={[styles.marker, isExpired && styles.markerExpired]}>
        <Image 
          source={biohazardPinImage} 
          style={styles.markerImage}
          resizeMode="contain"
        />
      </View>
      <Callout>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>Tag Drop</Text>
          <Text style={styles.calloutSubtitle}>
            {tagCount} tag{tagCount !== 1 ? 's' : ''} available
          </Text>
          <Text style={styles.calloutExpiry}>
            Expires: {new Date(expiresAt).toLocaleTimeString()}
          </Text>
        </View>
      </Callout>
    </Marker>
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 44,
    height: 44,
  },
  markerExpired: {
    opacity: 0.5,
  },
  callout: {
    padding: 12,
    minWidth: 150,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ff88',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  calloutExpiry: {
    fontSize: 12,
    color: '#888',
  },
});

