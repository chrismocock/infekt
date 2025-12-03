-- Full Infection System Migration
-- Adds unified infection tracking, multiple infection methods, and supporting tables

-- Create infection method enum
CREATE TYPE infection_method_enum AS ENUM (
    'direct',
    'qr',
    'deep_link',
    'chat_link',
    'share_card',
    'story_qr',
    'tag_drop',
    'group_infection',
    'proximity',
    'hotspot',
    'event',
    'chain_reaction',
    'ambient',
    'outbreak_zone',
    'mutant_tag',
    'npc'
);

-- Infection Events table - tracks all infections with method type
CREATE TABLE IF NOT EXISTS infection_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    infector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    infected_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tag_ids JSONB DEFAULT '[]'::jsonb, -- Array of tag UUIDs
    method infection_method_enum NOT NULL,
    location GEOGRAPHY(Point),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tier INT DEFAULT 0, -- 0 = direct, 1 = downline, etc.
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional method-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_infection_events_infector ON infection_events(infector_id);
CREATE INDEX IF NOT EXISTS idx_infection_events_infected ON infection_events(infected_id);
CREATE INDEX IF NOT EXISTS idx_infection_events_method ON infection_events(method);
CREATE INDEX IF NOT EXISTS idx_infection_events_timestamp ON infection_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_infection_events_location ON infection_events USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_infection_events_tier ON infection_events(tier);

-- Tag Drops table - location-based virtual drops
CREATE TABLE IF NOT EXISTS tag_drops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_ids JSONB DEFAULT '[]'::jsonb, -- Array of tag UUIDs to drop
    location GEOGRAPHY(Point) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    claimed_by JSONB DEFAULT '[]'::jsonb, -- Array of user IDs who claimed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tag_drops_location ON tag_drops USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_tag_drops_creator ON tag_drops(creator_id);
CREATE INDEX IF NOT EXISTS idx_tag_drops_expires ON tag_drops(expires_at);
-- Note: Query for active drops using WHERE expires_at > NOW() - index will still be used efficiently

-- Hotspots table - admin-defined infection zones
CREATE TABLE IF NOT EXISTS hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(Point) NOT NULL,
    radius FLOAT NOT NULL DEFAULT 100.0, -- meters
    xp_multiplier FLOAT DEFAULT 1.0,
    tag_boost_rate FLOAT DEFAULT 0.1, -- Probability of infection per check (0.0-1.0)
    active BOOLEAN DEFAULT true,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotspots_location ON hotspots USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_hotspots_active ON hotspots(active) WHERE active = true;

-- Outbreak Zones table - active outbreak areas (different from outbreak_events)
CREATE TABLE IF NOT EXISTS outbreak_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location GEOGRAPHY(Point) NOT NULL,
    radius FLOAT NOT NULL DEFAULT 500.0, -- meters
    severity FLOAT DEFAULT 1.0, -- 1.0 = normal, higher = more severe
    tag_families JSONB DEFAULT '[]'::jsonb, -- Array of strain IDs or tag origin IDs
    expires_at TIMESTAMP WITH TIME ZONE,
    strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbreak_zones_location ON outbreak_zones USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_outbreak_zones_expires ON outbreak_zones(expires_at);
-- Note: Query for active zones using WHERE (expires_at IS NULL OR expires_at > NOW()) - index will still be used efficiently
CREATE INDEX IF NOT EXISTS idx_outbreak_zones_strain ON outbreak_zones(strain_id);

-- Groups table - user-created groups/clans
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    member_count INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- Group Members table - group membership
CREATE TABLE IF NOT EXISTS group_members (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- Infection Links table - deep link tracking
CREATE TABLE IF NOT EXISTS infection_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- Short code for URL
    infector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    strain_id UUID REFERENCES strains(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INT, -- NULL = unlimited
    use_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_infection_links_code ON infection_links(code);
CREATE INDEX IF NOT EXISTS idx_infection_links_infector ON infection_links(infector_id);
CREATE INDEX IF NOT EXISTS idx_infection_links_expires ON infection_links(expires_at);
-- Note: Query for active links using WHERE (expires_at IS NULL OR expires_at > NOW()) - index will still be used efficiently

-- User Settings table - user preferences
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    proximity_enabled BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,
    ble_enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb, -- Additional settings
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS host_score DOUBLE PRECISION DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS streak INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS friends JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_host_score ON users(host_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);

-- Add columns to tags table
ALTER TABLE tags
    ADD COLUMN IF NOT EXISTS infection_method TEXT,
    ADD COLUMN IF NOT EXISTS infection_event_id UUID REFERENCES infection_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tags_infection_method ON tags(infection_method);
CREATE INDEX IF NOT EXISTS idx_tags_infection_event ON tags(infection_event_id);

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE groups
        SET member_count = member_count + 1,
            updated_at = NOW()
        WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE groups
        SET member_count = GREATEST(0, member_count - 1),
            updated_at = NOW()
        WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain group member count
DROP TRIGGER IF EXISTS trigger_update_group_member_count ON group_members;
CREATE TRIGGER trigger_update_group_member_count
    AFTER INSERT OR DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_group_member_count();

-- Function to generate unique infection link code
CREATE OR REPLACE FUNCTION generate_infection_link_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM infection_links WHERE code = v_code) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is in hotspot
CREATE OR REPLACE FUNCTION check_hotspot_proximity(
    p_user_location GEOGRAPHY,
    p_radius_meters FLOAT DEFAULT 100.0
)
RETURNS TABLE (
    hotspot_id UUID,
    name TEXT,
    xp_multiplier FLOAT,
    tag_boost_rate FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.name,
        h.xp_multiplier,
        h.tag_boost_rate
    FROM hotspots h
    WHERE h.active = true
        AND ST_DWithin(
            h.location,
            p_user_location,
            GREATEST(h.radius, p_radius_meters)
        );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is in outbreak zone
CREATE OR REPLACE FUNCTION check_outbreak_zone_proximity(
    p_user_location GEOGRAPHY,
    p_radius_meters FLOAT DEFAULT 500.0
)
RETURNS TABLE (
    zone_id UUID,
    severity FLOAT,
    strain_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        oz.id,
        oz.severity,
        oz.strain_id
    FROM outbreak_zones oz
    WHERE (oz.expires_at IS NULL OR oz.expires_at > NOW())
        AND ST_DWithin(
            oz.location,
            p_user_location,
            GREATEST(oz.radius, p_radius_meters)
        );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tag drops
CREATE OR REPLACE FUNCTION cleanup_expired_tag_drops()
RETURNS INT AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM tag_drops
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

