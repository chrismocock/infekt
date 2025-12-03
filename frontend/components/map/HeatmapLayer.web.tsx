import React from 'react';

interface HeatmapLayerProps {
  points: any[];
  maxCount?: number;
}

// No-op on web
export function HeatmapLayer(_props: HeatmapLayerProps) {
  return null;
}
