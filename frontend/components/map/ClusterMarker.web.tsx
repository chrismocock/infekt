import React from 'react';

interface ClusterMarkerProps {
  coordinate: { latitude: number; longitude: number };
  count: number;
  strainIds: string[];
  onPress?: () => void;
}

// No-op on web
export function ClusterMarker(_props: ClusterMarkerProps) {
  return null;
}
