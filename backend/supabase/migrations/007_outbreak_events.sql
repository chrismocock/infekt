-- Outbreak Events Table
-- Tracks mass spread moments and outbreak zones

CREATE TABLE outbreak_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id TEXT,
    strain_id UUID REFERENCES strains(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    multiplier FLOAT NOT NULL DEFAULT 1.0,
    type TEXT NOT NULL, -- 'club', 'university', 'airport', 'stadium', 'festival', 'general'
    location GEOGRAPHY(Point),
    tag_count INT DEFAULT 0, -- Number of tags in this outbreak
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_outbreak_events_region_id ON outbreak_events(region_id);
CREATE INDEX idx_outbreak_events_timestamp ON outbreak_events(timestamp DESC);
CREATE INDEX idx_outbreak_events_strain_id ON outbreak_events(strain_id);
CREATE INDEX idx_outbreak_events_type ON outbreak_events(type);
CREATE INDEX idx_outbreak_events_location ON outbreak_events USING GIST(location);

-- Function to detect outbreak zones based on location
-- This is a helper function that can be called from Edge Functions
CREATE OR REPLACE FUNCTION detect_outbreak_zone(
    lat FLOAT,
    lng FLOAT,
    radius_meters FLOAT DEFAULT 1000
)
RETURNS TABLE (
    zone_type TEXT,
    multiplier FLOAT,
    region_id TEXT
) AS $$
DECLARE
    point_geog GEOGRAPHY;
BEGIN
    point_geog := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::GEOGRAPHY;
    
    -- Check for known outbreak zones (clubs, universities, airports, stadiums, festivals)
    -- This is a simplified version - in production, you'd have a table of known POIs
    -- For now, we'll use heuristics based on region_id from regional_modifiers
    
    RETURN QUERY
    SELECT 
        CASE 
            WHEN rm.nightlife_factor > 1.5 THEN 'club'
            WHEN rm.spread_multiplier >= 3.0 THEN 'university'
            WHEN rm.airport_factor > 1.5 THEN 'airport'
            ELSE 'general'
        END as zone_type,
        CASE 
            WHEN rm.nightlife_factor > 1.5 THEN 5.0
            WHEN rm.spread_multiplier >= 3.0 THEN 10.0
            WHEN rm.airport_factor > 1.5 THEN 8.0
            ELSE 2.0
        END as multiplier,
        rm.region_id
    FROM regional_modifiers rm
    WHERE rm.region_id IN (
        SELECT region_id 
        FROM regional_modifiers 
        WHERE spread_multiplier > 1.0
        ORDER BY spread_multiplier DESC
        LIMIT 1
    )
    LIMIT 1;
    
    -- If no match, return default
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'general'::TEXT, 1.0::FLOAT, 'unknown'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create outbreak event
CREATE OR REPLACE FUNCTION create_outbreak_event(
    p_region_id TEXT,
    p_strain_id UUID,
    p_user_id UUID,
    p_multiplier FLOAT,
    p_type TEXT,
    p_lat FLOAT,
    p_lng FLOAT,
    p_tag_count INT DEFAULT 1
)
RETURNS UUID AS $$
DECLARE
    v_outbreak_id UUID;
    v_location GEOGRAPHY;
BEGIN
    v_location := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::GEOGRAPHY;
    
    INSERT INTO outbreak_events (
        region_id,
        strain_id,
        user_id,
        multiplier,
        type,
        location,
        tag_count,
        description
    ) VALUES (
        p_region_id,
        p_strain_id,
        p_user_id,
        p_multiplier,
        p_type,
        v_location,
        p_tag_count,
        'Outbreak event triggered in ' || p_region_id
    )
    RETURNING id INTO v_outbreak_id;
    
    RETURN v_outbreak_id;
END;
$$ LANGUAGE plpgsql;

