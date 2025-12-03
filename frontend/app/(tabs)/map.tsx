import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, Alert } from 'react-native';
import { MapboxMap } from '../../components/map/MapboxMap';
import { HeatmapLayer } from '../../components/map/HeatmapLayer';
import { ClusterMarker } from '../../components/map/ClusterMarker';
import { TagDropMarker } from '../../components/map/TagDropMarker';
import { HotspotMarker } from '../../components/map/HotspotMarker';
import { OutbreakZoneMarker } from '../../components/map/OutbreakZoneMarker';
import { getHeatmapData } from '../../lib/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { mapboxConfig } from '../../lib/mapbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useTagDrops } from '../../hooks/useTagDrops';
import { useHotspots } from '../../hooks/useHotspots';
import { useOutbreakZones } from '../../hooks/useOutbreakZones';
import { useLocation } from '../../hooks/useLocation';
import { useTestMode } from '../../hooks/useTestMode';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

// Conditional import for react-native-maps (native only)
let Marker: any;
let Circle: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  Marker = maps.Marker;
  Circle = maps.Circle;
}

type RegionType = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

// Selected Location Marker Component (for location selection mode)
function SelectedLocationMarker({ coordinate }: { coordinate: { latitude: number; longitude: number } }) {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <>
      <Circle
        center={coordinate}
        radius={10}
        strokeWidth={3}
        strokeColor="#00ff88"
        fillColor="rgba(0, 255, 136, 0.2)"
      />
      <Marker coordinate={coordinate} pinColor="#00ff88" />
    </>
  );
}

export default function MapScreen() {
  const router = useRouter();
  const { isTestModeEnabled } = useTestMode();
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initializingRegion, setInitializingRegion] = useState(true);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLocationSelectionMode, setIsLocationSelectionMode] = useState(false);
  const [selectedLocationMarker, setSelectedLocationMarker] = useState<{ lat: number; lng: number } | null>(null);
  const HOME_REGION_STORAGE_KEY = 'map:homeRegion';
  const defaultRegion: RegionType = {
    latitude: mapboxConfig.initialViewport.latitude,
    longitude: mapboxConfig.initialViewport.longitude,
    latitudeDelta: mapboxConfig.initialViewport.latitudeDelta,
    longitudeDelta: mapboxConfig.initialViewport.longitudeDelta,
  };
  const [region, setRegion] = useState<RegionType>(defaultRegion);
  const loadTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastLoadedRegionRef = React.useRef<RegionType | null>(null);

  // Enhanced map data hooks
  const { location } = useLocation();
  const { drops: tagDrops } = useTagDrops({ showMyDrops: false }); // Show nearby drops on map
  const { hotspots } = useHotspots();
  const { zones: outbreakZones } = useOutbreakZones();

  // Variant radius mapping for tag drops
  const [variants, setVariants] = useState<any[]>([]);
  const [dropRadiusMap, setDropRadiusMap] = useState<Record<string, number>>({}); // drop_id -> radius

  const checkForTargetRegion = async () => {
    try {
      const targetRegionJson = await AsyncStorage.getItem('map:targetRegion');
      if (targetRegionJson) {
        const targetRegion = JSON.parse(targetRegionJson) as RegionType;
        setRegion(targetRegion);
        setLocationMessage('Showing tag drop location');
        // Clear the target region after using it
        await AsyncStorage.removeItem('map:targetRegion');
        // Clear message after 3 seconds
        setTimeout(() => setLocationMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to load target region:', error);
    }
  };

  useEffect(() => {
    initializeRegion();
    checkForTargetRegion();
    checkForLocationSelectionMode();
    loadAllVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check location selection mode when test mode changes
  useEffect(() => {
    checkForLocationSelectionMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTestModeEnabled]);

  // Check if we're in location selection mode (only in test mode)
  const checkForLocationSelectionMode = async () => {
    try {
      // Only allow location selection mode if test mode is enabled
      if (!isTestModeEnabled) {
        setIsLocationSelectionMode(false);
        setSelectedLocationMarker(null);
        setLocationMessage(null);
        return;
      }

      const mode = await AsyncStorage.getItem('map:locationSelectionMode');
      if (mode === 'true') {
        setIsLocationSelectionMode(true);
        setLocationMessage('Tap anywhere on the map to select a location for your tag drop');
        // Clear the flag after reading
        await AsyncStorage.removeItem('map:locationSelectionMode');
      }
    } catch (error) {
      console.error('Error checking location selection mode:', error);
    }
  };

  // Clear location selection mode when test mode is disabled
  useEffect(() => {
    if (!isTestModeEnabled) {
      setIsLocationSelectionMode(false);
      setSelectedLocationMarker(null);
      setLocationMessage(null);
    }
  }, [isTestModeEnabled]);

  // Handle map press for location selection (test mode only)
  const handleMapPress = async (event: any) => {
    if (!isTestModeEnabled || !isLocationSelectionMode) return;

    // Extract coordinates from the event
    // react-native-maps onPress event structure: event.nativeEvent.coordinate
    const coordinate = event.nativeEvent?.coordinate;
    
    if (!coordinate || !coordinate.latitude || !coordinate.longitude) {
      console.warn('Invalid coordinate in map press event:', event.nativeEvent);
      return;
    }

    const selectedLoc = { lat: coordinate.latitude, lng: coordinate.longitude };
    setSelectedLocationMarker({ latitude: coordinate.latitude, longitude: coordinate.longitude });
    
    // Store selected location
    try {
      await AsyncStorage.setItem('tagDrop:selectedLocation', JSON.stringify(selectedLoc));
      setLocationMessage(`Location selected: ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`);
      
      // Navigate to infect tab where the modal is (instead of going back)
      setTimeout(() => {
        router.push('/(tabs)/infect');
      }, 1500);
    } catch (error) {
      console.error('Error saving selected location:', error);
      Alert.alert('Error', 'Failed to save selected location');
    }
  };

  // Load all variants for radius lookup
  const loadAllVariants = async () => {
    try {
      const { data: variantsData, error: variantsError } = await supabase
        .from('variants')
        .select('id, name, rules')
        .order('rarity', { ascending: true });

      if (variantsError) {
        console.error('Error loading variants for radius lookup:', variantsError);
      } else {
        setVariants(variantsData || []);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  // Fetch variant radius for drops when drops or variants change
  useEffect(() => {
    if (tagDrops.length > 0 && variants.length > 0) {
      fetchVariantRadiusForDrops();
    }
  }, [tagDrops, variants]);

  // Fetch variant_id from tags and get radius for all drops
  const fetchVariantRadiusForDrops = async () => {
    try {
      // Collect all unique tag IDs from all drops
      const allTagIds = new Set<string>();
      tagDrops.forEach((drop) => {
        if (drop.tag_ids && Array.isArray(drop.tag_ids)) {
          drop.tag_ids.forEach((tagId: string) => allTagIds.add(tagId));
        }
      });

      if (allTagIds.size === 0) {
        setDropRadiusMap({});
        return;
      }

      // Fetch variant_id from tags
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, variant_id')
        .in('id', Array.from(allTagIds));

      if (tagsError) {
        console.error('Error fetching tag variant info:', tagsError);
        return;
      }

      // Create mapping: tag_id -> variant_id
      const tagToVariantMap: Record<string, string | null> = {};
      (tagsData || []).forEach((tag: any) => {
        tagToVariantMap[tag.id] = tag.variant_id;
      });

      // Create mapping: drop_id -> radius
      const newDropRadiusMap: Record<string, number> = {};
      tagDrops.forEach((drop) => {
        if (drop.tag_ids && drop.tag_ids.length > 0) {
          // Get variant_id from first tag (assuming all tags in a drop have same variant)
          const firstTagId = drop.tag_ids[0];
          const variantId = tagToVariantMap[firstTagId];
          
          if (variantId) {
            // Find variant and get radius from rules
            const variant = variants.find((v) => v.id === variantId);
            if (variant && variant.rules?.radius) {
              newDropRadiusMap[drop.id] = variant.rules.radius;
            } else {
              // Default to 10m if variant not found or no radius in rules
              newDropRadiusMap[drop.id] = 10;
            }
          } else {
            // Default to 10m if no variant
            newDropRadiusMap[drop.id] = 10;
          }
        } else {
          // Default to 10m if no tags
          newDropRadiusMap[drop.id] = 10;
        }
      });

      setDropRadiusMap(newDropRadiusMap);
    } catch (error) {
      console.error('Error fetching variant radius for drops:', error);
    }
  };

  useEffect(() => {
    // Only load heatmap data after initial region is set
    if (initializingRegion) return;
    
    // Debounce region changes to prevent flickering
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Check if region change is significant enough to reload
    const shouldReload = !lastLoadedRegionRef.current || 
      Math.abs(region.latitude - lastLoadedRegionRef.current.latitude) > region.latitudeDelta * 0.3 ||
      Math.abs(region.longitude - lastLoadedRegionRef.current.longitude) > region.longitudeDelta * 0.3 ||
      Math.abs(region.latitudeDelta - lastLoadedRegionRef.current.latitudeDelta) > region.latitudeDelta * 0.2 ||
      Math.abs(region.longitudeDelta - lastLoadedRegionRef.current.longitudeDelta) > region.longitudeDelta * 0.2;

    if (!shouldReload) return;

    // Only show loading spinner on the very first load
    if (isInitialLoad && !heatmapData.length) {
      setHeatmapLoading(true);
    }

    loadTimeoutRef.current = setTimeout(() => {
      loadHeatmapData(region);
      lastLoadedRegionRef.current = region;
      setIsInitialLoad(false);
    }, 500); // 500ms debounce to reduce flickering

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [region, initializingRegion]);

  const initializeRegion = async () => {
    if (Platform.OS === 'web') {
      setInitializingRegion(false);
      return;
    }

    let hasStoredRegion = false;
    try {
      const storedRegion = await AsyncStorage.getItem(HOME_REGION_STORAGE_KEY);
      if (storedRegion) {
        const parsed = JSON.parse(storedRegion);
        if (isValidRegion(parsed)) {
          setRegion(parsed);
          hasStoredRegion = true;
        }
      }
    } catch (storageError) {
      console.warn('Failed to load saved home region', storageError);
    }

    if (hasStoredRegion) {
      setInitializingRegion(false);
      fetchCurrentLocationAsHome().catch((err) =>
        console.warn('Failed to refresh GPS location', err)
      );
    } else {
      await fetchCurrentLocationAsHome();
    }
  };

  const isValidRegion = (value: any): value is RegionType => {
    return (
      value &&
      typeof value.latitude === 'number' &&
      typeof value.longitude === 'number' &&
      typeof value.latitudeDelta === 'number' &&
      typeof value.longitudeDelta === 'number'
    );
  };

  const fetchCurrentLocationAsHome = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationMessage('Location permission denied. Showing default view.');
        setInitializingRegion(false);
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const nextRegion: RegionType = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        latitudeDelta: mapboxConfig.initialViewport.latitudeDelta,
        longitudeDelta: mapboxConfig.initialViewport.longitudeDelta,
      };

      setLocationMessage(null);
      setRegion(nextRegion);
      await AsyncStorage.setItem(HOME_REGION_STORAGE_KEY, JSON.stringify(nextRegion));
    } catch (locationError) {
      console.warn('Failed to resolve current location', locationError);
      setLocationMessage('Unable to fetch GPS location. Showing default view.');
    } finally {
      setInitializingRegion(false);
    }
  };

  const loadHeatmapData = async (targetRegion: RegionType = region) => {
    if (!targetRegion) return;
    try {
      const bounds = {
        minLat: targetRegion.latitude - targetRegion.latitudeDelta / 2,
        maxLat: targetRegion.latitude + targetRegion.latitudeDelta / 2,
        minLng: targetRegion.longitude - targetRegion.longitudeDelta / 2,
        maxLng: targetRegion.longitude + targetRegion.longitudeDelta / 2,
      };

      const data = await getHeatmapData(bounds);
      setHeatmapData(data.clusters || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
      setError(err as Error);
      setHeatmapData([]);
    } finally {
      setHeatmapLoading(false);
    }
  };

  const handleRegionChange = (newRegion: RegionType) => {
    setRegion(newRegion);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error.message} onRetry={() => loadHeatmapData(region)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {locationMessage && (
        <View pointerEvents="none" style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>{locationMessage}</Text>
        </View>
      )}
      <MapboxMap
        initialRegion={region}
        region={region}
        onRegionChange={handleRegionChange}
        onPress={isTestModeEnabled && isLocationSelectionMode ? handleMapPress : undefined}
      >
        <HeatmapLayer points={heatmapData} />
        {heatmapData.map((cluster, index) => (
          <ClusterMarker
            key={`cluster-${index}`}
            coordinate={{
              latitude: cluster.lat,
              longitude: cluster.lng,
            }}
            count={cluster.count}
            strainIds={cluster.strain_ids || []}
          />
        ))}
        {/* Tag Drops */}
        {tagDrops.map((drop) => {
          // Parse location from PostGIS POINT format
          const match = drop.location?.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (!match) return null;
          const [, lng, lat] = match;
          // Get radius from variant mapping, default to 10m if not found
          const radius = dropRadiusMap[drop.id] || 10;
          return (
            <TagDropMarker
              key={`drop-${drop.id}`}
              coordinate={{
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
              }}
              tagCount={drop.tag_ids?.length || 0}
              expiresAt={drop.expires_at}
              radius={radius}
            />
          );
        })}
        {/* Hotspots */}
        {hotspots.map((hotspot) => {
          const match = hotspot.location?.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (!match) return null;
          const [, lng, lat] = match;
          return (
            <HotspotMarker
              key={`hotspot-${hotspot.id}`}
              coordinate={{
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
              }}
              radius={hotspot.radius}
              name={hotspot.name}
              xpMultiplier={hotspot.xp_multiplier}
              tagBoostRate={hotspot.tag_boost_rate}
            />
          );
        })}
        {/* Outbreak Zones */}
        {outbreakZones.map((zone) => {
          const match = zone.location?.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (!match) return null;
          const [, lng, lat] = match;
          return (
            <OutbreakZoneMarker
              key={`zone-${zone.id}`}
              coordinate={{
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
              }}
              radius={zone.radius}
              severity={zone.severity}
            />
          );
        })}
        {/* Selected Location Marker (for location selection mode - test mode only) */}
        {isTestModeEnabled && isLocationSelectionMode && selectedLocationMarker && (
          <SelectedLocationMarker coordinate={selectedLocationMarker} />
        )}
      </MapboxMap>
      {initializingRegion && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Finding your location..." />
        </View>
      )}
      {heatmapLoading && !initializingRegion && !heatmapData.length && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Loading heatmap..." />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBanner: {
    position: 'absolute',
    top: Platform.select({ ios: 60, android: 30, default: 10 }),
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(8, 18, 29, 0.85)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
});

