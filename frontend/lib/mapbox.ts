// Mapbox configuration and utilities

export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const mapboxConfig = {
  accessToken: MAPBOX_ACCESS_TOKEN,
  styleURL: 'mapbox://styles/mapbox/dark-v10', // Dark theme for better visibility
  initialViewport: {
    latitude: 37.7749, // Default: San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
};

// Helper function to create map bounds from coordinates
export function createBounds(coordinates: Array<{ lat: number; lng: number }>) {
  if (coordinates.length === 0) return null;

  const lats = coordinates.map((c) => c.lat);
  const lngs = coordinates.map((c) => c.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

// Helper function to calculate distance between two points (Haversine formula)
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function to check if point is within radius
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number
): boolean {
  return calculateDistance(lat1, lng1, lat2, lng2) <= radiusMeters;
}

