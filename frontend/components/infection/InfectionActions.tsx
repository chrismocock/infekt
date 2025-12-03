// Unified Infection Actions Component
// Provides UI for all infection methods

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { useTestMode } from '../../hooks/useTestMode';
import { QRCodeScanner } from '../qr/QRCodeScanner';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  infectDirect,
  infectQR,
  createTagDrop,
  claimTagDrop,
  infectGroup,
  infectProximity,
} from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { notifyInfectionSuccess } from '../../lib/notifications';
import { useTagDrops } from '../../hooks/useTagDrops';

type InfectionMethod = 
  | 'direct'
  | 'qr'
  | 'share'
  | 'drop'
  | 'group'
  | 'proximity'
  | 'hotspot';

interface InfectionActionsProps {
  onInfectionSuccess?: () => void;
}

export function InfectionActions({ onInfectionSuccess }: InfectionActionsProps) {
  const { user } = useAuth();
  const { location, getCurrentLocation } = useLocation();
  const { isTestModeEnabled } = useTestMode();
  const [activeTab, setActiveTab] = useState<InfectionMethod>('direct');
  const [loading, setLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showDropCreator, setShowDropCreator] = useState(false);
  const [showGroupSelector, setShowGroupSelector] = useState(false);

  // Direct infection state
  const [username, setUsername] = useState('');

  // Tag drop state
  const [dropLocation, setDropLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleDirectInfection = async () => {
    if (!user || !username.trim() || !location) {
      Alert.alert('Error', 'Please enter a username and ensure location is available.');
      return;
    }

    try {
      setLoading(true);
      await infectDirect(user.id, username.trim(), location);
      await notifyInfectionSuccess('direct', username.trim());
      Alert.alert('Success', `Infected ${username}!`);
      setUsername('');
      onInfectionSuccess?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to infect user.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (data: string) => {
    if (!user || !location) {
      Alert.alert('Error', 'User or location not available.');
      return;
    }

    try {
      setLoading(true);
      await infectQR(data, user.id, location);
      await notifyInfectionSuccess('qr');
      setShowQRScanner(false);
      Alert.alert('Success', 'Infection successful!');
      onInfectionSuccess?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTagDrop = async (variantId?: string | null, selectedLocation?: { lat: number; lng: number } | null) => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      
      // Get or fetch location first - this is critical
      // Use selected location if provided (from map selection), otherwise use current location
      let currentLocation = selectedLocation || location;
      
      // If location is not available, try to get it
      if (!currentLocation || typeof currentLocation.lat !== 'number' || typeof currentLocation.lng !== 'number') {
        console.log('Location not available, fetching current location...');
        currentLocation = await getCurrentLocation();
        
        if (!currentLocation || typeof currentLocation.lat !== 'number' || typeof currentLocation.lng !== 'number') {
          Alert.alert(
            'Location Required', 
            'Location is required for tag drops. Please enable location services and try again.'
          );
          setLoading(false);
          return;
        }
      }

      console.log('Using location for tag drop:', currentLocation);
      console.log('Selected variant ID:', variantId);
      console.log('Test mode enabled:', isTestModeEnabled);
      
      let tagIds: string[] = [];

      // In test mode with variant selected, create a new tag directly with the variant
      if (isTestModeEnabled && variantId) {
        console.log('Test mode: Creating new tag directly with variant:', variantId);
        
        if (!user.current_strain_id) {
          Alert.alert(
            'Error', 
            'You need a strain to create tag drops. Get infected first or create a strain.'
          );
          setLoading(false);
          return;
        }

        // Create a new tag with the selected variant
        const { data: newTag, error: createTagError } = await supabase
          .from('tags')
          .insert({
            tagger_id: user.id,
            target_id: user.id,
            strain_id: user.current_strain_id,
            variant_id: variantId,
            parent_tag_id: null,
            root_user_id: user.id,
            origin_user_id: user.id,
            location: `POINT(${currentLocation.lng} ${currentLocation.lat})`,
            generation: 0,
            description: `Test mode tag drop with variant ${variantId}`,
          })
          .select('id')
          .single();

        if (createTagError) {
          console.error('Error creating new tag with variant in test mode:', createTagError);
          throw new Error(`Failed to create tag with variant: ${createTagError.message}`);
        }

        if (newTag) {
          tagIds = [newTag.id];
          console.log('Test mode: Created new tag with variant:', newTag.id);
        }
      } else {
        // Normal mode: Get user's tags
        let { data: userTags, error: tagsError } = await supabase
          .from('user_tags')
          .select('tag_id')
          .eq('user_id', user.id)
          .limit(5);

        if (tagsError) {
          console.error('Error fetching user tags:', tagsError);
        }

        tagIds = (userTags || []).map((ut: any) => ut.tag_id);

        // If variant is selected and user has existing tags, create new tags with the selected variant
        if (variantId && tagIds.length > 0) {
          console.log('Variant selected with existing tags, creating new tags with variant:', variantId);
          
          // Fetch full structure of existing tags
          const { data: existingTags, error: existingTagsError } = await supabase
            .from('tags')
            .select('id, strain_id, parent_tag_id, root_user_id, origin_user_id, generation, tagger_id, target_id')
            .in('id', tagIds);

          if (existingTagsError) {
            console.error('Error fetching existing tags structure:', existingTagsError);
            throw new Error(`Failed to fetch existing tags: ${existingTagsError.message}`);
          }

          if (!existingTags || existingTags.length === 0) {
            throw new Error('No existing tags found to base new tags on');
          }

          // Create new tags based on existing tags but with the selected variant
          const newTagIds: string[] = [];
          for (const existingTag of existingTags) {
            const { data: newTag, error: createTagError } = await supabase
              .from('tags')
              .insert({
                tagger_id: existingTag.tagger_id || user.id,
                target_id: existingTag.target_id || user.id,
                strain_id: existingTag.strain_id,
                variant_id: variantId,
                parent_tag_id: existingTag.parent_tag_id,
                root_user_id: existingTag.root_user_id,
                origin_user_id: existingTag.origin_user_id,
                location: `POINT(${currentLocation.lng} ${currentLocation.lat})`,
                generation: existingTag.generation,
                description: `Tag drop with variant`,
              })
              .select('id')
              .single();

            if (createTagError) {
              console.error('Error creating new tag with variant:', createTagError);
              throw new Error(`Failed to create tag with variant: ${createTagError.message}`);
            }

            if (newTag) {
              newTagIds.push(newTag.id);
            }
          }

          tagIds = newTagIds;
          console.log('Created new tags with variant:', newTagIds.length, 'tags');
        }
      }

      // If user has no tags, ensure they have a root tag
      if (tagIds.length === 0) {
        if (!user.current_strain_id) {
          Alert.alert(
            'Error', 
            'You need a strain to create tag drops. Get infected first or create a strain.'
          );
          setLoading(false);
          return;
        }

        // Check if user has a root tag in the tags table
        const { data: rootTag } = await supabase
          .from('tags')
          .select('id')
          .eq('origin_user_id', user.id)
          .eq('tagger_id', user.id)
          .eq('target_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (rootTag) {
          // Add root tag to user_tags if it exists
          await supabase
            .from('user_tags')
            .upsert({
              user_id: user.id,
              tag_id: rootTag.id,
              origin_user_id: user.id,
              generation_depth: 0,
            }, {
              onConflict: 'user_id,tag_id'
            });
          
          tagIds = [rootTag.id];
        } else {
          // Create a root tag for the user
          const { data: newRootTag, error: createError } = await supabase
            .from('tags')
            .insert({
              tagger_id: user.id,
              target_id: user.id,
              strain_id: user.current_strain_id,
              variant_id: variantId || null,
              parent_tag_id: null,
              root_user_id: user.id,
              origin_user_id: user.id,
              location: `POINT(${currentLocation.lng} ${currentLocation.lat})`,
              generation: 0,
              description: 'Root tag',
            })
            .select('id')
            .single();

          if (createError) {
            throw new Error(`Failed to create root tag: ${createError.message}`);
          }

          // Add to user_tags
          await supabase
            .from('user_tags')
            .insert({
              user_id: user.id,
              tag_id: newRootTag.id,
              origin_user_id: user.id,
              generation_depth: 0,
            });

          tagIds = [newRootTag.id];
        }
      }

      if (tagIds.length === 0) {
        Alert.alert('Error', 'Unable to create tags for drop. Please try again.');
        setLoading(false);
        return;
      }

      // Now create the tag drop with the confirmed location
      await createTagDrop(user.id, tagIds, currentLocation);
      
      // In test mode, keep the modal open so user can create multiple drops
      if (!isTestModeEnabled) {
        setShowDropCreator(false);
      }
      
      await notifyInfectionSuccess('tag_drop');
      Alert.alert('Success', 'Tag drop created!');
      onInfectionSuccess?.();
    } catch (error: any) {
      console.error('Tag drop creation failed:', error);
      const errorMessage = error?.message || error?.error || 'Failed to create tag drop. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const tabs: Array<{ id: InfectionMethod; label: string; icon: string }> = [
    { id: 'direct', label: 'Direct', icon: 'person' },
    { id: 'qr', label: 'QR Scan', icon: 'qr-code' },
    { id: 'share', label: 'Share', icon: 'share' },
    { id: 'drop', label: 'Drops', icon: 'location' },
    { id: 'group', label: 'Groups', icon: 'people' },
    { id: 'proximity', label: 'Nearby', icon: 'bluetooth' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.id ? '#00ff88' : '#888'}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Area */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentScroll}
        showsVerticalScrollIndicator={true}
      >
        {loading && <LoadingSpinner />}

        {activeTab === 'direct' && (
          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username to infect"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Button
              title="Infect User"
              onPress={handleDirectInfection}
              disabled={!username.trim() || loading}
            />
          </View>
        )}

        {activeTab === 'qr' && (
          <View style={styles.form}>
            <Button
              title="Scan QR Code"
              onPress={() => setShowQRScanner(true)}
            />
            {showQRScanner && (
              <Modal
                visible={showQRScanner}
                animationType="slide"
                onRequestClose={() => setShowQRScanner(false)}
              >
                <QRCodeScanner
                  onScan={handleQRScan}
                  onCancel={() => setShowQRScanner(false)}
                />
              </Modal>
            )}
          </View>
        )}

        {activeTab === 'share' && (
          <ShareCardTab onInfectionSuccess={onInfectionSuccess} />
        )}

        {activeTab === 'drop' && (
          <TagDropTab
            onCreateDrop={(variantId, selectedLocation) => handleCreateTagDrop(variantId, selectedLocation)}
            onShowCreator={() => setShowDropCreator(true)}
            showCreator={showDropCreator}
            onCloseCreator={() => setShowDropCreator(false)}
            loading={loading}
          />
        )}

        {activeTab === 'group' && (
          <GroupInfectionTab
            onInfectionSuccess={onInfectionSuccess}
            onShowSelector={() => setShowGroupSelector(true)}
            showSelector={showGroupSelector}
            onCloseSelector={() => setShowGroupSelector(false)}
          />
        )}

        {activeTab === 'proximity' && (
          <ProximityTab onInfectionSuccess={onInfectionSuccess} />
        )}
      </ScrollView>
    </View>
  );
}

// Share Card Tab Component
function ShareCardTab({ onInfectionSuccess }: { onInfectionSuccess?: () => void }) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null);

  const handleGenerateShareCard = async () => {
    if (!user || !user.current_strain_id) {
      Alert.alert('Error', 'No strain found.');
      return;
    }

    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('infection/share-card/generate', {
        body: {
          userId: user.id,
          strainId: user.current_strain_id,
          includeStats: true,
        },
      });

      if (error) throw error;

      setShareCardUrl(data.imageUrl);
      Alert.alert('Success', 'Share card generated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate share card.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.form}>
      <Button
        title={generating ? 'Generating...' : 'Generate Share Card'}
        onPress={handleGenerateShareCard}
        disabled={generating}
      />
      {shareCardUrl && (
        <View style={styles.shareCardPreview}>
          <Text style={styles.previewText}>Share card ready!</Text>
          <Text style={styles.previewLink} numberOfLines={1}>
            {shareCardUrl}
          </Text>
        </View>
      )}
    </View>
  );
}

// Tag Drop Tab Component
function TagDropTab({
  onCreateDrop,
  onShowCreator,
  showCreator,
  onCloseCreator,
  loading,
}: {
  onCreateDrop: (variantId?: string | null, selectedLocation?: { lat: number; lng: number } | null) => void;
  onShowCreator: () => void;
  showCreator: boolean;
  onCloseCreator: () => void;
  loading: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { isTestModeEnabled } = useTestMode();
  const { drops, loading: dropsLoading, refresh, error: dropsError } = useTagDrops({ showMyDrops: true });
  const { location: currentLocation } = useLocation();
  const [variants, setVariants] = useState<any[]>([]);
  const [userVariants, setUserVariants] = useState<string[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [dropVariantMap, setDropVariantMap] = useState<Record<string, string>>({}); // drop_id -> variant_name
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('TagDropTab - drops:', drops.length, 'loading:', dropsLoading, 'error:', dropsError);
    if (drops.length > 0) {
      console.log('TagDropTab - Sample drop data:', {
        id: drops[0].id,
        location: drops[0].location,
        locationType: typeof drops[0].location,
        locationStringified: JSON.stringify(drops[0].location),
        expires_at: drops[0].expires_at,
        tag_ids: drops[0].tag_ids,
      });
      
      // Test parsing
      const testParsed = parseLocation(drops[0].location);
      console.log('TagDropTab - Parsed location test:', testParsed);
    }
  }, [drops, dropsLoading, dropsError]);

  // Parse location from PostGIS POINT format
  // Supabase may return GEOGRAPHY as GeoJSON or POINT string
  const parseLocation = (location: any): { lat: number; lng: number } | null => {
    if (!location) {
      console.warn('parseLocation: location is null or undefined');
      return null;
    }
    
    // Handle GeoJSON format (Supabase sometimes returns this)
    if (typeof location === 'object' && location.type === 'Point' && Array.isArray(location.coordinates)) {
      const [lng, lat] = location.coordinates;
      return {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
    }
    
    // Handle POINT string format: "POINT(lng lat)"
    if (typeof location === 'string') {
      const match = location.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
      if (match) {
        const [, lng, lat] = match;
        const parsed = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        };
        
        if (!isNaN(parsed.lat) && !isNaN(parsed.lng)) {
          return parsed;
        }
      }
    }
    
    // Handle object with lat/lng properties directly
    if (typeof location === 'object' && typeof location.lat === 'number' && typeof location.lng === 'number') {
      return { lat: location.lat, lng: location.lng };
    }
    
    console.warn('parseLocation: Unsupported location format:', {
      location,
      type: typeof location,
      stringified: JSON.stringify(location),
    });
    return null;
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
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
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Navigate to map with specific location
  const navigateToMap = async (dropLocation: { lat: number; lng: number }) => {
    try {
      // Store the target location in AsyncStorage for the map screen to read
      const targetRegion = {
        latitude: dropLocation.lat,
        longitude: dropLocation.lng,
        latitudeDelta: 0.01, // Zoom level
        longitudeDelta: 0.01,
      };
      await AsyncStorage.setItem('map:targetRegion', JSON.stringify(targetRegion));
      router.push('/(tabs)/map');
    } catch (error) {
      console.error('Failed to navigate to map:', error);
    }
  };

  // Load variants when modal opens
  useEffect(() => {
    if (showCreator && user) {
      loadVariants();
      // Check for selected location from map
      checkForSelectedLocation();
    }
  }, [showCreator, user]);

  // In test mode, check for location updates when tab is focused (user returns from map)
  useFocusEffect(
    useCallback(() => {
      // Only check if modal is open (or should be open in test mode)
      if (isTestModeEnabled && showCreator) {
        checkForSelectedLocation();
      }
    }, [isTestModeEnabled, showCreator])
  );

  // Also check periodically while modal is open in test mode
  useEffect(() => {
    if (!isTestModeEnabled || !showCreator) return;

    const interval = setInterval(() => {
      checkForSelectedLocation();
    }, 1000); // Check every second while modal is open

    return () => clearInterval(interval);
  }, [isTestModeEnabled, showCreator]);

  // Check for selected location from map
  const checkForSelectedLocation = async () => {
    try {
      const locationStr = await AsyncStorage.getItem('tagDrop:selectedLocation');
      if (locationStr) {
        const location = JSON.parse(locationStr);
        setSelectedLocation(location);
        // Clear the stored location after reading
        await AsyncStorage.removeItem('tagDrop:selectedLocation');
      }
    } catch (error) {
      console.error('Error checking for selected location:', error);
    }
  };

  // Load user variants and all variants
  const loadVariants = async () => {
    if (!user) return;
    
    try {
      setLoadingVariants(true);
      
      // Load user's unlocked variants
      const { data: userVariantData, error: userVariantError } = await supabase
        .from('user_variants')
        .select('variant_id')
        .eq('user_id', user.id);

      if (userVariantError) {
        console.error('Error loading user variants:', userVariantError);
      } else {
        setUserVariants((userVariantData || []).map((uv: any) => uv.variant_id));
      }

      // Load all variants
      const { data: variantsData, error: variantsError } = await supabase
        .from('variants')
        .select('*')
        .order('rarity', { ascending: true });

      if (variantsError) {
        console.error('Error loading variants:', variantsError);
      } else {
        console.log('Loaded variants:', variantsData?.length || 0);
        setVariants(variantsData || []);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Load all variants when component mounts (for variant name lookup)
  useEffect(() => {
    loadAllVariants();
  }, []);

  // Load all variants for name lookup
  const loadAllVariants = async () => {
    try {
      const { data: variantsData, error: variantsError } = await supabase
        .from('variants')
        .select('id, name')
        .order('rarity', { ascending: true });

      if (variantsError) {
        console.error('Error loading variants for name lookup:', variantsError);
      } else {
        setVariants(variantsData || []);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  // Fetch variant information for drops when drops change
  useEffect(() => {
    if (drops.length > 0 && variants.length > 0) {
      fetchVariantInfoForDrops();
    }
  }, [drops, variants]);

  // Fetch variant_id from tags for all drops
  const fetchVariantInfoForDrops = async () => {
    try {
      // Collect all unique tag IDs from all drops
      const allTagIds = new Set<string>();
      drops.forEach((drop) => {
        if (drop.tag_ids && Array.isArray(drop.tag_ids)) {
          drop.tag_ids.forEach((tagId: string) => allTagIds.add(tagId));
        }
      });

      if (allTagIds.size === 0) {
        setDropVariantMap({});
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

      // Create mapping: drop_id -> variant_name
      const newDropVariantMap: Record<string, string> = {};
      drops.forEach((drop) => {
        if (drop.tag_ids && drop.tag_ids.length > 0) {
          // Get variant_id from first tag (assuming all tags in a drop have same variant)
          const firstTagId = drop.tag_ids[0];
          const variantId = tagToVariantMap[firstTagId];
          
          if (variantId) {
            // Find variant name
            const variant = variants.find((v) => v.id === variantId);
            if (variant) {
              newDropVariantMap[drop.id] = variant.name;
            }
          }
        }
      });

      setDropVariantMap(newDropVariantMap);
    } catch (error) {
      console.error('Error fetching variant info for drops:', error);
    }
  };

  // Refresh drops when component mounts
  useEffect(() => {
    console.log('TagDropTab: Component mounted, refreshing drops');
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh drops when modal closes (in case a drop was just created)
  useEffect(() => {
    if (!showCreator) {
      console.log('TagDropTab: Modal closed, refreshing drops');
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreator]);
  
  // Debug: Log drops changes
  useEffect(() => {
    console.log('TagDropTab: Drops changed:', {
      count: drops.length,
      drops: drops.map(d => ({ id: d.id, location: typeof d.location === 'string' ? d.location.substring(0, 50) : d.location }))
    });
  }, [drops]);

  const handleDropPress = (drop: any) => {
    const location = parseLocation(drop.location);
    if (location) {
      navigateToMap(location);
    }
  };

  const renderDropItem = ({ item: drop }: { item: any }) => {
    console.log('renderDropItem called for drop:', drop.id, 'location:', drop.location);
    const dropLocation = parseLocation(drop.location);
    if (!dropLocation) {
      console.warn('renderDropItem: Failed to parse location for drop:', drop.id, 'location:', drop.location);
      // Still render the item, but without location-specific features
      return (
        <TouchableOpacity
          style={styles.dropItem}
          activeOpacity={0.7}
          key={drop.id}
        >
          <View style={styles.dropItemContent}>
            <View style={styles.dropItemHeader}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.dropItemTitle}>
                {dropVariantMap[drop.id] || `${drop.tag_ids?.length || 0} Tag${drop.tag_ids?.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <Text style={styles.dropItemExpiry}>
              Location unavailable
            </Text>
            <Text style={styles.dropItemCoordinates}>
              Drop ID: {drop.id.substring(0, 8)}...
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      );
    }

    // Calculate distance if we have current location
    let distanceText = '';
    if (currentLocation) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        dropLocation.lat,
        dropLocation.lng
      );
      distanceText = formatDistance(distance);
    }

    // Format expiration time
    const expiresAt = new Date(drop.expires_at);
    const timeUntilExpiry = expiresAt.getTime() - Date.now();
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60));
    const minutesUntilExpiry = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60));
    
    let expiryText = '';
    if (hoursUntilExpiry > 0) {
      expiryText = `Expires in ${hoursUntilExpiry}h ${minutesUntilExpiry}m`;
    } else if (minutesUntilExpiry > 0) {
      expiryText = `Expires in ${minutesUntilExpiry}m`;
    } else {
      expiryText = 'Expired';
    }

    return (
      <TouchableOpacity
        style={styles.dropItem}
        onPress={() => handleDropPress(drop)}
        activeOpacity={0.7}
      >
          <View style={styles.dropItemContent}>
            <View style={styles.dropItemHeader}>
              <Ionicons name="location" size={20} color="#4CAF50" />
              <Text style={styles.dropItemTitle}>
                {dropVariantMap[drop.id] || `${drop.tag_ids?.length || 0} Tag${drop.tag_ids?.length !== 1 ? 's' : ''}`}
              </Text>
              {distanceText && (
                <Text style={styles.dropItemDistance}>{distanceText}</Text>
              )}
            </View>
          <Text style={styles.dropItemExpiry}>{expiryText}</Text>
          <Text style={styles.dropItemCoordinates}>
            {dropLocation.lat.toFixed(4)}, {dropLocation.lng.toFixed(4)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.form}>
      <Button
        title="Create Tag Drop"
        onPress={onShowCreator}
      />
      <Text style={styles.helpText}>
        Drop tags at your location for others to claim
      </Text>

      {/* Tag Drops List */}
      <View style={styles.dropsListContainer}>
        <Text style={styles.dropsListTitle}>My Tag Drops</Text>
        {dropsError && (
          <View style={styles.dropsListError}>
            <Text style={styles.dropsListErrorText}>
              Error loading drops: {dropsError.message}
            </Text>
            <Button
              title="Retry"
              onPress={refresh}
              variant="secondary"
            />
          </View>
        )}
        {!dropsError && dropsLoading ? (
          <View style={styles.dropsListLoading}>
            <LoadingSpinner message="Loading drops..." />
          </View>
        ) : !dropsError ? (
          <>
            {drops.length > 0 ? (
              <ScrollView 
                style={styles.dropsList}
                contentContainerStyle={styles.dropsListContent}
                showsVerticalScrollIndicator={true}
              >
                {drops.map((drop, index) => {
                  console.log(`Rendering drop ${index + 1}/${drops.length}:`, drop.id);
                  const rendered = renderDropItem({ item: drop });
                  if (!rendered) {
                    console.warn('renderDropItem returned null for drop:', drop.id);
                    return null;
                  }
                  console.log(`Successfully rendered drop ${index + 1}:`, drop.id);
                  return (
                    <View key={drop.id}>
                      {rendered}
                    </View>
                  );
                }).filter((item) => item !== null)}
              </ScrollView>
            ) : (
              <View style={styles.dropsListEmpty}>
                <Ionicons name="location-outline" size={48} color="#666" />
                <Text style={styles.dropsListEmptyText}>No tag drops created yet</Text>
                <Text style={styles.dropsListEmptySubtext}>
                  Create one to get started!
                </Text>
              </View>
            )}
          </>
        ) : null}
      </View>

      {showCreator && (
        <Modal
          visible={showCreator}
          animationType="slide"
          transparent
          onRequestClose={onCloseCreator}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Tag Drop</Text>
              <Text style={styles.modalText}>
                {selectedLocation 
                  ? `Tag drop will be created at selected location (${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)})`
                  : 'This will create a tag drop at your current location.'}
              </Text>
              
              {/* Map Selection Button (Test Mode Only) */}
              {isTestModeEnabled && (
                <View style={styles.mapSelectionContainer}>
                  <Button
                    title={selectedLocation ? "Change Location on Map" : "Select Location on Map"}
                    onPress={async () => {
                      // Set flag to indicate we're in location selection mode
                      await AsyncStorage.setItem('map:locationSelectionMode', 'true');
                      // In test mode, keep modal open; in normal mode, close it
                      if (!isTestModeEnabled) {
                        onCloseCreator();
                      }
                      router.push('/(tabs)/map');
                    }}
                    variant="outline"
                    style={styles.mapSelectionButton}
                  />
                  {selectedLocation && (
                    <Button
                      title="Use Current Location"
                      onPress={() => setSelectedLocation(null)}
                      variant="secondary"
                      style={styles.mapSelectionButton}
                    />
                  )}
                </View>
              )}
              
              {/* Variant Selector */}
              <View style={styles.variantSelector}>
                <Text style={styles.variantSelectorLabel}>Select Variant (Optional)</Text>
                {loadingVariants ? (
                  <LoadingSpinner message="Loading variants..." />
                ) : (
                  <ScrollView style={styles.variantList} nestedScrollEnabled>
                    <TouchableOpacity
                      style={[
                        styles.variantOption,
                        selectedVariantId === null && styles.variantOptionSelected,
                      ]}
                      onPress={() => setSelectedVariantId(null)}
                    >
                      <Text style={[
                        styles.variantOptionText,
                        selectedVariantId === null && styles.variantOptionTextSelected,
                      ]}>
                        None (Default) - 10m radius
                      </Text>
                    </TouchableOpacity>
                    {variants.map((variant) => {
                      // In test mode, all variants are unlocked
                      const isUnlocked = isTestModeEnabled || userVariants.includes(variant.id);
                      return (
                        <TouchableOpacity
                          key={variant.id}
                          style={[
                            styles.variantOption,
                            selectedVariantId === variant.id && styles.variantOptionSelected,
                            !isUnlocked && styles.variantOptionLocked,
                          ]}
                          onPress={() => {
                            if (isUnlocked) {
                              setSelectedVariantId(variant.id);
                            }
                          }}
                        >
                          <View style={styles.variantOptionContent}>
                            <Text style={[
                              styles.variantOptionText,
                              selectedVariantId === variant.id && styles.variantOptionTextSelected,
                              !isUnlocked && styles.variantOptionTextLocked,
                            ]}>
                              {variant.name} - {variant.rules?.radius || 10}m radius
                            </Text>
                            {!isUnlocked && (
                              <Text style={styles.variantLockedLabel}>Locked</Text>
                            )}
                            {isTestModeEnabled && isUnlocked && (
                              <Text style={styles.variantTestModeLabel}>Test</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title="Create Drop"
                  onPress={() => {
                    onCreateDrop(selectedVariantId, selectedLocation);
                    // In test mode, don't reset selections so user can create multiple drops
                    if (!isTestModeEnabled) {
                      setSelectedVariantId(null);
                      setSelectedLocation(null);
                    } else {
                      // In test mode, only reset location selection, keep variant selected
                      setSelectedLocation(null);
                    }
                  }}
                  disabled={loading}
                />
                <Button
                  title={isTestModeEnabled ? "Close" : "Cancel"}
                  onPress={() => {
                    onCloseCreator();
                    setSelectedVariantId(null); // Reset selection
                    setSelectedLocation(null); // Reset location selection
                  }}
                  variant="secondary"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// Group Infection Tab Component
function GroupInfectionTab({
  onInfectionSuccess,
  onShowSelector,
  showSelector,
  onCloseSelector,
}: {
  onInfectionSuccess?: () => void;
  onShowSelector: () => void;
  showSelector: boolean;
  onCloseSelector: () => void;
}) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (showSelector && user) {
      loadGroups();
    }
  }, [showSelector, user]);

  const loadGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, name, member_count)')
        .eq('user_id', user.id);

      if (error) throw error;
      setGroups((data || []).map((gm: any) => gm.groups));
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleGroupInfection = async (groupId: string) => {
    if (!user || !location) {
      Alert.alert('Error', 'Location required.');
      return;
    }

    try {
      setLoading(true);
      await infectGroup(groupId, user.id, location);
      Alert.alert('Success', 'Group infection successful!');
      onInfectionSuccess?.();
      onCloseSelector();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to infect group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.form}>
      <Button
        title="Select Group to Infect"
        onPress={onShowSelector}
      />
      <Text style={styles.helpText}>
        Infect all members of a group at once
      </Text>

      {showSelector && (
        <Modal
          visible={showSelector}
          animationType="slide"
          transparent
          onRequestClose={onCloseSelector}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Group</Text>
              <ScrollView style={styles.groupList}>
                {groups.length === 0 ? (
                  <Text style={styles.emptyText}>No groups found. Create one first.</Text>
                ) : (
                  groups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.groupItem}
                      onPress={() => handleGroupInfection(group.id)}
                      disabled={loading}
                    >
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMembers}>
                        {group.member_count} members
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <Button
                title="Close"
                onPress={onCloseSelector}
                variant="secondary"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// Proximity Tab Component
function ProximityTab({ onInfectionSuccess }: { onInfectionSuccess?: () => void }) {
  const { user } = useAuth();
  const { location } = useLocation();
  const [nearbyDevices, setNearbyDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  // This would integrate with useBLEProximity hook
  // For now, show placeholder
  return (
    <View style={styles.form}>
      <Text style={styles.label}>BLE Proximity</Text>
      <Text style={styles.helpText}>
        Automatically scan for nearby devices with Infekt app
      </Text>
      <Text style={styles.helpText}>
        Infections happen automatically when devices are detected
      </Text>
      {nearbyDevices.length > 0 && (
        <View style={styles.deviceList}>
          <Text style={styles.sectionTitle}>Nearby Devices</Text>
          {nearbyDevices.map((device) => (
            <View key={device.userId} style={styles.deviceItem}>
              <Text style={styles.deviceText}>
                Signal: {device.signalStrength} dBm
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabContainer: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tabContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#222',
  },
  tabActive: {
    backgroundColor: '#00ff8820',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  tabLabel: {
    marginLeft: 8,
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#00ff88',
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    padding: 20,
  },
  form: {
    flex: 1,
  },
  formContent: {
    gap: 16,
    paddingBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  shareCardPreview: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  previewText: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  previewLink: {
    color: '#888',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  groupList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  groupItem: {
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  deviceList: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  deviceItem: {
    padding: 12,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceText: {
    color: '#fff',
    fontSize: 14,
  },
  dropsListContainer: {
    marginTop: 20,
    flex: 1,
    minHeight: 200,
  },
  dropsListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  dropsList: {
    flex: 1,
    minHeight: 200,
  },
  dropsListContent: {
    paddingBottom: 8,
  },
  dropsListLoading: {
    padding: 20,
    alignItems: 'center',
  },
  dropsListEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  dropsListEmptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
    fontWeight: '500',
  },
  dropsListEmptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dropsListError: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#331111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  dropsListErrorText: {
    fontSize: 14,
    color: '#ff6666',
    marginBottom: 12,
    textAlign: 'center',
  },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dropItemContent: {
    flex: 1,
  },
  dropItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dropItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  dropItemDistance: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
  },
  dropItemExpiry: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  dropItemCoordinates: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  variantSelector: {
    marginTop: 16,
    marginBottom: 16,
  },
  variantSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  variantList: {
    maxHeight: 200,
  },
  variantOption: {
    padding: 12,
    backgroundColor: '#222',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  variantOptionSelected: {
    borderColor: '#00ff88',
    backgroundColor: '#00ff8820',
  },
  variantOptionLocked: {
    opacity: 0.6,
  },
  variantOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantOptionText: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
  variantOptionTextSelected: {
    color: '#00ff88',
    fontWeight: '600',
  },
  variantOptionTextLocked: {
    color: '#666',
  },
  variantLockedLabel: {
    fontSize: 10,
    color: '#ff6b6b',
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  variantTestModeLabel: {
    fontSize: 10,
    color: '#00ff88',
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  mapSelectionContainer: {
    marginBottom: 16,
    gap: 8,
  },
  mapSelectionButton: {
    marginBottom: 0,
  },
});


