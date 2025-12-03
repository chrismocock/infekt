// TypeScript types for database entities

export interface User {
  id: string;
  username: string | null;
  created_at: string;
  current_strain_id: string | null;
  current_variant_id: string | null;
  last_location: string | null; // GEOGRAPHY(Point)
  parent_user_id: string | null;
  root_user_id: string | null;
  generation: number;
  tags_given: number;
  tags_received: number;
  direct_score?: number;
  indirect_score?: number;
}

export interface Strain {
  id: string;
  origin_user_id: string;
  created_at: string;
  direct_infections: number;
  indirect_infections: number;
  total_infections: number;
  countries: string[];
  depth: number;
}

export interface Tag {
  id: string;
  tagger_id: string;
  target_id: string;
  strain_id: string;
  variant_id: string | null;
  parent_tag_id: string | null;
  root_user_id: string;
  origin_user_id: string;
  location: string | null; // GEOGRAPHY(Point)
  generation: number;
  created_at: string;
  description?: string | null;
}

export interface Variant {
  id: string;
  name: string;
  rules: {
    tag_limit: number | null;
    time_restriction: { start: string; end: string } | null;
    radius: number;
    visibility: boolean;
  };
  icon_url: string | null;
  rarity: number;
  created_at: string;
}

export interface UserVariant {
  user_id: string;
  variant_id: string;
  unlocked_at: string;
}

export interface UserTag {
  tag_id: string;
  acquired_at: string;
  generation_depth: number;
  origin_user_id: string;
  origin_user?: {
    id: string;
    username: string | null;
  } | null;
  tag?: {
    id: string;
    description: string | null;
    origin_user_id: string;
    created_at: string;
    generation: number;
  } | null;
}

// Custom types
export interface TagEvent {
  tagger_id: string;
  target_id: string;
  location: { lat: number; lng: number };
  variant_id?: string;
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

export interface VariantRules {
  tag_limit: number | null;
  time_restriction: { start: string; end: string } | null;
  radius: number;
  visibility: boolean;
}

