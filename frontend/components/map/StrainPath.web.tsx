import React from 'react';

interface StrainPathProps {
  coordinates: Array<{ latitude: number; longitude: number }>;
  color?: string;
  width?: number;
}

// No-op on web
export function StrainPath(_props: StrainPathProps) {
  return null;
}
