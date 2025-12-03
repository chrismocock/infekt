import React from 'react';
import { Platform } from 'react-native';

// Only load react-native-maps on native platforms
let Polyline: any;
if (Platform.OS !== 'web') {
  Polyline = require('react-native-maps').Polyline;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface StrainPathProps {
  coordinates: Coordinate[];
  color?: string;
  width?: number;
}

export function StrainPath({
  coordinates,
  color = '#007AFF',
  width = 3,
}: StrainPathProps) {
  // Web fallback
  if (Platform.OS === 'web' || coordinates.length < 2) return null;

  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={color}
      strokeWidth={width}
      lineDashPattern={[5, 5]}
    />
  );
}

