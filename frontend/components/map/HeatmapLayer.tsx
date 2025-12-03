import React from 'react';
import { Platform } from 'react-native';

// Conditional import for react-native-maps (native only)
let Circle: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  Circle = maps.Circle;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
}

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  maxCount?: number;
}

export function HeatmapLayer({ points, maxCount }: HeatmapLayerProps) {
  // Web fallback - return nothing (map won't render on web anyway)
  if (Platform.OS === 'web') {
    return null;
  }

  const max = maxCount || Math.max(...points.map((p) => p.count), 1);

  return (
    <>
      {points.map((point, index) => {
        const intensity = point.count / max;
        const radius = Math.sqrt(point.count) * 50; // Scale radius based on count
        const opacity = Math.min(0.6, intensity);

        // Color gradient: blue (low) -> green -> yellow -> red (high)
        let color = '#007AFF';
        if (intensity > 0.75) color = '#FF3B30';
        else if (intensity > 0.5) color = '#FF9500';
        else if (intensity > 0.25) color = '#34C759';

        return (
          <Circle
            key={`heatmap-${index}`}
            center={{
              latitude: point.lat,
              longitude: point.lng,
            }}
            radius={radius}
            fillColor={color}
            strokeColor={color}
            strokeWidth={1}
            opacity={opacity}
          />
        );
      })}
    </>
  );
}

