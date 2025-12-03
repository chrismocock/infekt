import { supabase } from './supabase';
import { UserTag } from '../types/database';

export interface TagRequest {
  tagger_id: string;
  target_id: string;
  location: { lat: number; lng: number };
  variant_id?: string;
}

export interface TagPropagationSummary {
  transmitted: number;
  final_tag_count: number;
  new_tags: Array<{
    tag_id: string;
    origin_user_id: string;
    origin_username: string | null;
    generation_depth: number;
  }>;
  score_summary: Array<{
    origin_user_id: string;
    username: string | null;
    direct_increment: number;
    indirect_increment: number;
    totals: {
      direct_score: number;
      indirect_score: number;
    };
  }>;
}

export interface TagResponse {
  success: boolean;
  tag: any;
  message: string;
  propagation: TagPropagationSummary;
}

export interface StrainAnalytics {
  total_infections: number;
  direct_infections: number;
  indirect_infections: number;
  depth: number;
  countries: string[];
  countries_count: number;
  top_regions: Array<{ name: string; count: number }>;
  tags_count: number;
  infected_users: Array<{
    id: string;
    username: string | null;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  strain_id: string;
  score: number;
  total_infections: number;
  direct_infections: number;
  indirect_infections: number;
  depth: number;
  countries: string[];
  user: {
    id: string;
    username: string | null;
    created_at: string;
  } | null;
}

// Tag a user (uses unified infection engine)
export async function tagUser(
  taggerId: string,
  targetId: string,
  location: { lat: number; lng: number },
  variantId?: string
): Promise<TagResponse> {
  const { data, error } = await supabase.functions.invoke('tag', {
    body: {
      tagger_id: taggerId,
      target_id: targetId,
      location,
      variant_id: variantId,
    } as TagRequest,
  });

  if (error) throw error;
  return data;
}

// Direct infection by username
export async function infectDirect(
  infectorId: string,
  infectedUsername: string,
  location: { lat: number; lng: number },
  tagIds?: string[],
  variantId?: string
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/direct', {
    body: {
      infectorId,
      infectedUsername,
      location,
      tagIds: tagIds || [],
      variantId,
    },
  });

  if (error) throw error;
  return data;
}

// QR code infection
export async function infectQR(
  qrToken: string,
  infectorId: string,
  location: { lat: number; lng: number }
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/qr', {
    body: {
      qrToken,
      infectorId,
      location,
    },
  });

  if (error) throw error;
  return data;
}

// Deep link infection
export async function infectDeepLink(
  linkId: string,
  location: { lat: number; lng: number },
  infectorId?: string
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/link', {
    body: {
      linkId,
      infectorId,
      location,
    },
  });

  if (error) throw error;
  return data;
}

// Create tag drop
export async function createTagDrop(
  creatorId: string,
  tagIds: string[],
  location: { lat: number; lng: number },
  expiresAt?: string
): Promise<any> {
  // Validate location before sending
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    throw new Error('Invalid location. Please ensure location services are enabled.');
  }

  console.log('Creating tag drop with:', {
    creatorId,
    tagIdsCount: tagIds.length,
    location,
    hasExpiresAt: !!expiresAt,
  });

  try {
    // Use fetch directly to get better error handling and access to response body
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Get Supabase URL and key from environment
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const functionUrl = `${supabaseUrl}/functions/v1/tag-drop`;
    
    console.log('Calling tag-drop function:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        action: 'create',
        creatorId,
        tagIds,
        location,
        expiresAt,
      }),
    });

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = text ? { error: text } : { error: 'Unknown error' };
    }

    if (!response.ok) {
      console.error('Tag drop creation error:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });
      
      // Extract error message from response
      let errorMessage = 'Failed to create tag drop';
      if (responseData?.error) {
        errorMessage = typeof responseData.error === 'string' 
          ? responseData.error 
          : responseData.error.message || errorMessage;
        if (responseData.details) {
          const detailsStr = typeof responseData.details === 'string' 
            ? responseData.details 
            : JSON.stringify(responseData.details);
          errorMessage += `: ${detailsStr}`;
        }
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      } else {
        errorMessage = `Server error (${response.status}): ${response.statusText || 'Unknown error'}`;
      }
      
      throw new Error(errorMessage);
    }
    
    if (!responseData) {
      throw new Error('No data returned from tag drop creation');
    }
    
    return responseData;
  } catch (err: any) {
    console.error('Tag drop creation exception:', err);
    // If it's already an Error with a message, re-throw it
    if (err instanceof Error) {
      throw err;
    }
    // Otherwise, try to extract message
    throw new Error(err?.message || err?.error || 'Failed to create tag drop');
  }
}

// Claim tag drop
export async function claimTagDrop(
  dropId: string,
  playerId: string,
  location: { lat: number; lng: number }
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/tag-drop', {
    body: {
      action: 'claim',
      dropId,
      playerId,
      location,
    },
  });

  if (error) throw error;
  return data;
}

// Group infection
export async function infectGroup(
  groupId: string,
  infectorId: string,
  location: { lat: number; lng: number },
  tagIds?: string[]
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/group/infect', {
    body: {
      groupId,
      infectorId,
      location,
      tagIds: tagIds || [],
    },
  });

  if (error) throw error;
  return data;
}

// Proximity infection (BLE)
export async function infectProximity(
  infectorId: string,
  infectedId: string,
  signalStrength: number,
  location: { lat: number; lng: number }
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/proximity', {
    body: {
      infectorId,
      infectedId,
      signalStrength,
      location,
    },
  });

  if (error) throw error;
  return data;
}

// Share card generation
export async function generateShareCard(
  userId: string,
  strainId: string,
  includeStats: boolean = true
): Promise<{
  success: boolean;
  imageUrl: string;
  qrCodeUrl: string;
  infectionLink: string;
  linkId: string;
}> {
  const { data, error } = await supabase.functions.invoke('infection/share-card/generate', {
    body: {
      userId,
      strainId,
      includeStats,
    },
  });

  if (error) throw error;
  return data;
}

// Story QR generation
export async function generateStoryQR(
  userId: string,
  strainId: string
): Promise<{
  success: boolean;
  qrCodeUrl: string;
  deepLink: string;
  webLink: string;
  linkId: string;
}> {
  const { data, error } = await supabase.functions.invoke('infection/story/generate', {
    body: {
      userId,
      strainId,
    },
  });

  if (error) throw error;
  return data;
}

// Event infection
export async function infectEvent(
  eventId: string,
  playerId: string,
  mode: 'mass_infection' | 'chained' | 'drop_based',
  location: { lat: number; lng: number },
  eventRadius?: number,
  dropCount?: number,
  tagIds?: string[]
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/event', {
    body: {
      eventId,
      playerId,
      mode,
      location,
      eventRadius,
      dropCount,
      tagIds,
    },
  });

  if (error) throw error;
  return data;
}

// Get active hotspots
export async function getActiveHotspots(
  location: { lat: number; lng: number },
  radius: number = 1000.0
): Promise<Array<{
  id: string;
  name: string;
  xp_multiplier: number;
  tag_boost_rate: number;
  location: string;
  radius: number;
}>> {
  // First get nearby hotspot IDs
  const { data: nearbyIds, error: rpcError } = await supabase.rpc('check_hotspot_proximity', {
    p_user_location: `POINT(${location.lng} ${location.lat})`,
    p_radius_meters: radius,
  });

  if (rpcError) throw rpcError;
  if (!nearbyIds || nearbyIds.length === 0) return [];

  // Fetch full hotspot data including location
  const hotspotIds = nearbyIds.map((h: any) => h.hotspot_id);
  const { data: hotspots, error } = await supabase
    .from('hotspots')
    .select('id, name, xp_multiplier, tag_boost_rate, location, radius')
    .in('id', hotspotIds)
    .eq('active', true);

  if (error) throw error;
  
  // Convert location from PostGIS format
  return (hotspots || []).map((h: any) => ({
    id: h.id,
    name: h.name || 'Hotspot',
    xp_multiplier: h.xp_multiplier,
    tag_boost_rate: h.tag_boost_rate,
    location: h.location,
    radius: h.radius,
  }));
}

// Parse PostGIS WKB hex format to POINT string
function parseWKBHex(wkbHex: string): string {
  // WKB format: 0101000020[SRID][LONGITUDE][LATITUDE]
  // 0101000020 = Point type, WKB format, SRID present (10 hex chars = 5 bytes)
  // E6100000 = SRID 4326 (little-endian) (8 hex chars = 4 bytes)
  // Next 16 hex chars (8 bytes) = Longitude (double, little-endian)
  // Next 16 hex chars (8 bytes) = Latitude (double, little-endian)
  
  if (!wkbHex || wkbHex.length < 50) {
    console.error('parseWKBHex: Invalid WKB hex string length:', wkbHex?.length, 'expected at least 50');
    throw new Error(`Invalid WKB hex string: length ${wkbHex?.length}, expected at least 50`);
  }
  
  // Skip header (0101000020 = 10 hex chars) and SRID (8 hex chars = 4 bytes)
  // Start reading coordinates at offset 18 (9 bytes = 18 hex chars)
  const lngHex = wkbHex.substring(18, 34); // 8 bytes = 16 hex chars for longitude
  const latHex = wkbHex.substring(34, 50); // 8 bytes = 16 hex chars for latitude
  
  if (!lngHex || !latHex || lngHex.length !== 16 || latHex.length !== 16) {
    console.error('parseWKBHex: Invalid coordinate hex strings:', { lngHex, latHex, wkbHex: wkbHex.substring(0, 60) });
    throw new Error('Invalid coordinate hex strings');
  }
  
  // Convert hex to bytes (little-endian)
  const lngBytes = [];
  const latBytes = [];
  
  for (let i = 0; i < 16; i += 2) {
    const lngByte = parseInt(lngHex.substring(i, i + 2), 16);
    const latByte = parseInt(latHex.substring(i, i + 2), 16);
    if (isNaN(lngByte) || isNaN(latByte)) {
      throw new Error(`Invalid hex byte at position ${i}`);
    }
    lngBytes.push(lngByte);
    latBytes.push(latByte);
  }
  
  // Convert bytes to double (little-endian)
  const lngBuffer = new ArrayBuffer(8);
  const lngView = new DataView(lngBuffer);
  lngBytes.forEach((byte, i) => lngView.setUint8(i, byte));
  const lng = lngView.getFloat64(0, true); // true = little-endian
  
  const latBuffer = new ArrayBuffer(8);
  const latView = new DataView(latBuffer);
  latBytes.forEach((byte, i) => latView.setUint8(i, byte));
  const lat = latView.getFloat64(0, true); // true = little-endian
  
  if (isNaN(lng) || isNaN(lat) || !isFinite(lng) || !isFinite(lat)) {
    console.error('parseWKBHex: Invalid coordinates:', { lng, lat, lngHex, latHex });
    throw new Error(`Invalid coordinates: lng=${lng}, lat=${lat}`);
  }
  
  const pointString = `POINT(${lng} ${lat})`;
  console.log('parseWKBHex: Successfully parsed:', { wkbHex: wkbHex.substring(0, 50) + '...', pointString });
  return pointString;
}

// Get user's created tag drops
export async function getUserTagDrops(userId: string): Promise<any[]> {
  console.log('getUserTagDrops: Querying tag_drops for user:', userId);
  const { data, error } = await supabase
    .from('tag_drops')
    .select('id, tag_ids, expires_at, creator_id, claimed_by, created_at, location')
    .eq('creator_id', userId)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('getUserTagDrops: Database error:', error);
    throw error;
  }

  // Convert WKB hex to POINT string format
  const convertedData = (data || []).map((drop: any) => {
    const originalLocation = drop.location;
    let convertedLocation = originalLocation;
    
    if (drop.location && typeof drop.location === 'string' && drop.location.startsWith('01010000')) {
      try {
        convertedLocation = parseWKBHex(drop.location);
        console.log('getUserTagDrops: Converted WKB to POINT:', {
          original: originalLocation.substring(0, 50) + '...',
          converted: convertedLocation,
          dropId: drop.id
        });
      } catch (err) {
        console.error('getUserTagDrops: Failed to parse WKB:', err, 'for drop:', drop.id, 'location:', originalLocation?.substring(0, 50));
        // Keep original location if parsing fails
        convertedLocation = originalLocation;
      }
    } else if (drop.location) {
      console.log('getUserTagDrops: Location not in WKB format:', {
        dropId: drop.id,
        locationType: typeof drop.location,
        locationValue: typeof drop.location === 'string' ? drop.location.substring(0, 100) : JSON.stringify(drop.location).substring(0, 100)
      });
    }
    
    // Return a new object with the converted location
    return {
      ...drop,
      location: convertedLocation
    };
  });

  console.log('getUserTagDrops: Raw data from database:', data?.length || 0, 'drops');
  if (convertedData && convertedData.length > 0) {
    console.log('getUserTagDrops: Sample drop after conversion:', {
      id: convertedData[0].id,
      location: convertedData[0].location,
      locationType: typeof convertedData[0].location,
      expires_at: convertedData[0].expires_at,
      tag_ids: convertedData[0].tag_ids,
      creator_id: convertedData[0].creator_id,
    });
  }

  console.log('getUserTagDrops: Returning', convertedData.length, 'drops');
  if (convertedData.length > 0) {
    console.log('getUserTagDrops: First drop location after conversion:', {
      id: convertedData[0].id,
      location: convertedData[0].location,
      locationType: typeof convertedData[0].location,
      isPOINT: typeof convertedData[0].location === 'string' && convertedData[0].location.startsWith('POINT(')
    });
  }
  return convertedData;
}

// Get nearby tag drops
export async function getNearbyTagDrops(
  location: { lat: number; lng: number },
  radius: number = 1000.0
): Promise<any[]> {
  const locationPoint = `POINT(${location.lng} ${location.lat})`;
  
  console.log('getNearbyTagDrops: Querying tag_drops table...');
  const { data, error } = await supabase
    .from('tag_drops')
    .select('*')
    .gte('expires_at', new Date().toISOString())
    .limit(50);

  if (error) {
    console.error('getNearbyTagDrops: Database error:', error);
    throw error;
  }

  // Convert WKB hex to POINT string format
  const convertedData = (data || []).map((drop: any) => {
    if (drop.location && typeof drop.location === 'string' && drop.location.startsWith('01010000')) {
      try {
        drop.location = parseWKBHex(drop.location);
      } catch (err) {
        console.error('getNearbyTagDrops: Failed to parse WKB:', err, 'for drop:', drop.id);
      }
    }
    return drop;
  });

  console.log('getNearbyTagDrops: Raw data from database:', data?.length || 0, 'drops');
  if (convertedData && convertedData.length > 0) {
    console.log('getNearbyTagDrops: Sample drop after conversion:', {
      id: convertedData[0].id,
      location: convertedData[0].location,
      locationType: typeof convertedData[0].location,
      expires_at: convertedData[0].expires_at,
      tag_ids: convertedData[0].tag_ids,
    });
  }

  // Filter by distance (simplified - in production use PostGIS ST_DWithin)
  const filtered = convertedData.filter((drop) => {
    // Basic distance check would go here
    return true;
  });

  console.log('getNearbyTagDrops: Returning', filtered.length, 'drops');
  return filtered;
}

// Get active outbreak zones
export async function getActiveOutbreakZones(
  location: { lat: number; lng: number },
  radius: number = 1000.0
): Promise<Array<{
  id: string;
  severity: number;
  strain_id: string | null;
  location: string;
  radius: number;
}>> {
  // First get nearby zone IDs
  const { data: nearbyIds, error: rpcError } = await supabase.rpc('check_outbreak_zone_proximity', {
    p_user_location: `POINT(${location.lng} ${location.lat})`,
    p_radius_meters: radius,
  });

  if (rpcError) throw rpcError;
  if (!nearbyIds || nearbyIds.length === 0) return [];

  // Fetch full zone data including location
  const zoneIds = nearbyIds.map((z: any) => z.zone_id);
  const { data: zones, error } = await supabase
    .from('outbreak_zones')
    .select('id, severity, strain_id, location, radius')
    .in('id', zoneIds)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  if (error) throw error;
  
  // Convert location from PostGIS format
  return (zones || []).map((z: any) => ({
    id: z.id,
    severity: z.severity,
    strain_id: z.strain_id,
    location: z.location,
    radius: z.radius,
  }));
}

// Mutant tag infection
export async function infectMutant(
  infectorId: string,
  infectedId: string,
  tagId: string,
  location: { lat: number; lng: number }
): Promise<any> {
  const { data, error } = await supabase.functions.invoke('infection/mutant', {
    body: {
      infectorId,
      infectedId,
      tagId,
      location,
    },
  });

  if (error) throw error;
  return data;
}

// Get groups for user
export async function getUserGroups(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      group_id,
      role,
      joined_at,
      groups!inner (
        id,
        name,
        description,
        member_count,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((gm: any) => ({
    ...gm.groups,
    role: gm.role,
    joined_at: gm.joined_at,
  }));
}

// Get strain analytics
export async function getStrain(strainId: string): Promise<{
  strain: any;
  analytics: StrainAnalytics;
}> {
  // Call strain function with ID as query parameter
  const { data, error } = await supabase.functions.invoke('strain', {
    body: { id: strainId },
  });

  if (error) throw error;
  return data;
}

// Get leaderboard
export async function getLeaderboard(
  type: 'global' | 'city' | 'strain' | 'variant' = 'global',
  filters?: { city?: string; strainId?: string; variantId?: string },
  limit = 100,
  offset = 0
): Promise<{
  entries: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}> {
  const { data, error } = await supabase.functions.invoke('leaderboard', {
    body: { type, filters, limit, offset },
  });

  if (error) throw error;
  return data;
}

// Get heatmap data
export async function getHeatmapData(bounds: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): Promise<{
  clusters: Array<{
    lat: number;
    lng: number;
    count: number;
    strain_ids: string[];
  }>;
}> {
  const { data, error } = await supabase.functions.invoke('map', {
    body: bounds,
  });

  if (error) throw error;
  return data;
}

// Phase 2: Mutation endpoints
export interface MutationNode {
  id: string;
  branch: string;
  name: string;
  description: string;
  mp_cost: number;
  prerequisite_node: string | null;
  boost: Record<string, any>;
  tier: number;
  is_unlocked: boolean;
  can_unlock: boolean;
  prerequisite_unlocked: boolean;
}

export async function getMutationTree(branch?: string): Promise<{
  nodes: MutationNode[];
  mutation_points: number;
}> {
  const url = branch
    ? `mutation/tree?branch=${branch}`
    : 'mutation/tree';
  const { data, error } = await supabase.functions.invoke('mutation', {
    body: { action: 'tree', branch },
  });

  if (error) throw error;
  return data;
}

export async function unlockMutation(nodeId: string): Promise<{
  success: boolean;
  node: MutationNode;
  nodes: MutationNode[];
  mutation_points: number;
}> {
  const { data, error } = await supabase.functions.invoke('mutation', {
    body: { action: 'unlock', node_id: nodeId },
  });

  if (error) throw error;
  return data;
}

// Phase 2: Outbreak endpoints
export interface OutbreakEvent {
  id: string;
  region_id: string;
  strain_id: string;
  user_id: string;
  username: string;
  timestamp: string;
  multiplier: number;
  type: string;
  tag_count: number;
  description: string;
}

export async function getGlobalEvents(region?: string, hours = 24): Promise<{
  events: OutbreakEvent[];
  count: number;
}> {
  const { data, error } = await supabase.functions.invoke('events', {
    body: { action: 'events', region, hours },
  });

  if (error) throw error;
  return data;
}

export async function getStrainOutbreaks(strainId: string): Promise<{
  outbreaks: OutbreakEvent[];
  grouped_by_region: Record<string, OutbreakEvent[]>;
  total: number;
}> {
  const { data, error } = await supabase.functions.invoke('strain', {
    body: { action: 'outbreaks', strain_id: strainId },
  });

  if (error) throw error;
  return data;
}

// Phase 2: Timeline endpoints
export interface TimelinePoint {
  timestamp: string;
  count: number;
}

export interface UserTagList {
  user_id: string;
  total: number;
  tags: UserTag[];
}

export interface TagLineageCarrier {
  user_id: string;
  generation_depth: number;
  acquired_at: string;
  user?: {
    id: string;
    username: string | null;
  } | null;
}

export interface TagLineageResponse {
  tag: {
    id: string;
    origin_user_id: string;
    description: string | null;
    created_at: string;
    generation: number;
    origin?: {
      id: string;
      username: string | null;
    } | null;
  };
  total_carriers: number;
  depth: number;
  carriers: TagLineageCarrier[];
}

export async function getStrainTimeline(
  strainId: string,
  window: '24h' | '7d' | '30d' = '24h'
): Promise<{
  strain_id: string;
  window: string;
  points: TimelinePoint[];
  cached: boolean;
}> {
  const { data, error } = await supabase.functions.invoke('strain', {
    body: { action: 'timeline', strain_id: strainId, window },
  });

  if (error) throw error;
  return data;
}

export async function getUserTags(userId: string): Promise<UserTagList> {
  const { data, error } = await supabase.functions.invoke('tag/user/tags', {
    body: { user_id: userId },
  });

  if (error) throw error;
  return data as UserTagList;
}

export async function getTagLineage(tagId: string): Promise<TagLineageResponse> {
  const { data, error } = await supabase.functions.invoke('tag/lineage', {
    body: { tag_id: tagId },
  });

  if (error) throw error;
  return data as TagLineageResponse;
}

// Phase 2: Cosmetic endpoints
export interface Cosmetic {
  id: string;
  user_id: string;
  cosmetic_type: string;
  value: string;
  is_active: boolean;
  unlocked_at: string;
}

export async function getCosmetics(): Promise<{ cosmetics: Cosmetic[] }> {
  const { data, error } = await supabase.functions.invoke('cosmetic', {
    body: { action: 'get' },
  });

  if (error) throw error;
  return data;
}

export async function setCosmetic(
  cosmeticType: string,
  value: string,
  isActive = true
): Promise<{ success: boolean; cosmetic: Cosmetic }> {
  const { data, error } = await supabase.functions.invoke('cosmetic', {
    body: {
      action: 'set',
      cosmetic_type: cosmeticType,
      value,
      is_active: isActive,
    },
  });

  if (error) throw error;
  return data;
}

// Phase 2: Wars endpoints
export interface RegionWarRanking {
  rank: number;
  strain_id: string;
  user: { id: string; username: string | null } | null;
  outbreak_count: number;
  total_multiplier: number;
  total_tags: number;
  score: number;
  strain: {
    total_infections: number;
    depth: number;
  };
}

export async function getRegionWars(
  region: string,
  type: 'city' | 'school' | 'university' = 'city'
): Promise<{
  region: string;
  type: string;
  rankings: RegionWarRanking[];
  stats: any;
}> {
  const { data, error } = await supabase.functions.invoke('wars', {
    body: { region, type },
  });

  if (error) throw error;
  return data;
}

// Phase 2: Leaderboards 2.0
export async function getLeaderboard2(
  type: 'global' | 'growth' | 'countries' | 'lineage' | 'outbreaks' | 'variants' = 'global',
  limit = 100,
  offset = 0
): Promise<{
  type: string;
  entries: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}> {
  const { data, error } = await supabase.functions.invoke(`leaderboard/${type}`, {
    body: { limit, offset },
  });

  if (error) throw error;
  return data;
}

