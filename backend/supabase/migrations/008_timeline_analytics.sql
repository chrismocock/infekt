-- Timeline Analytics Cache
-- Stores pre-calculated timeline data for performance

CREATE TABLE strain_timeline_cache (
    strain_id UUID REFERENCES strains(id) ON DELETE CASCADE,
    time_window TEXT NOT NULL, -- '24h', '7d', '30d'
    points JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {timestamp, count} points
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (strain_id, time_window)
);

-- Create indexes
CREATE INDEX idx_strain_timeline_cache_strain_id ON strain_timeline_cache(strain_id);
CREATE INDEX idx_strain_timeline_cache_time_window ON strain_timeline_cache(time_window);
CREATE INDEX idx_strain_timeline_cache_updated_at ON strain_timeline_cache(updated_at);

-- Function to calculate timeline points for a strain
CREATE OR REPLACE FUNCTION calculate_timeline_points(
    p_strain_id UUID,
    p_window TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_points JSONB := '[]'::jsonb;
    v_point JSONB;
    v_interval INTERVAL;
BEGIN
    -- Determine start time based on window
    CASE p_window
        WHEN '24h' THEN
            v_start_time := NOW() - INTERVAL '24 hours';
            v_interval := INTERVAL '1 hour';
        WHEN '7d' THEN
            v_start_time := NOW() - INTERVAL '7 days';
            v_interval := INTERVAL '1 day';
        WHEN '30d' THEN
            v_start_time := NOW() - INTERVAL '30 days';
            v_interval := INTERVAL '1 day';
        ELSE
            RAISE EXCEPTION 'Invalid window: %', p_window;
    END CASE;
    
    -- Calculate infection counts per interval
    WITH time_buckets AS (
        SELECT 
            date_bin(v_interval, timestamp, v_start_time) as bucket_start,
            COUNT(*) as infection_count
        FROM tags
        WHERE strain_id = p_strain_id
            AND timestamp >= v_start_time
        GROUP BY bucket_start
        ORDER BY bucket_start
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'timestamp', bucket_start,
            'count', infection_count
        )
    )
    INTO v_points
    FROM time_buckets;
    
    -- If no points, return empty array
    IF v_points IS NULL THEN
        v_points := '[]'::jsonb;
    END IF;
    
    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- Function to update timeline cache
CREATE OR REPLACE FUNCTION update_timeline_cache(
    p_strain_id UUID,
    p_window TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO strain_timeline_cache (strain_id, time_window, points, updated_at)
    VALUES (
        p_strain_id,
        p_window,
        calculate_timeline_points(p_strain_id, p_window),
        NOW()
    )
    ON CONFLICT (strain_id, time_window)
    DO UPDATE SET
        points = EXCLUDED.points,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Trigger to invalidate cache when new tags are created
-- Note: This is a simplified version - in production, you might want to use a queue/job system
CREATE OR REPLACE FUNCTION invalidate_timeline_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete cache entries for the affected strain
    DELETE FROM strain_timeline_cache
    WHERE strain_id = NEW.strain_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: We'll create the trigger in a separate migration or handle it in Edge Functions
-- to avoid performance issues on every tag insert

