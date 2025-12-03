-- Multi-Tag Propagation System
-- Adds user_tags ledger, enriches tags metadata, and introduces score tracking

-- Rename timestamp column for clarity
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tags' AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE tags RENAME COLUMN "timestamp" TO created_at;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already renamed
        NULL;
END $$;

-- Rename index tied to timestamp column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'idx_tags_timestamp'
    ) THEN
        ALTER INDEX idx_tags_timestamp RENAME TO idx_tags_created_at;
    END IF;
END $$;

-- Enrich tags table for lineage tracking
ALTER TABLE tags
    ADD COLUMN IF NOT EXISTS origin_user_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ALTER COLUMN generation SET DEFAULT 0,
    ALTER COLUMN created_at SET DEFAULT NOW();

-- Backfill origin metadata using existing root_user_id
UPDATE tags
SET origin_user_id = COALESCE(origin_user_id, root_user_id)
WHERE origin_user_id IS NULL;

-- Recreate index to prioritize fresh infections
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_origin_user_id ON tags(origin_user_id);

-- User tag ledger with generation depth tracking
CREATE TABLE IF NOT EXISTS user_tags (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    origin_user_id UUID NOT NULL REFERENCES users(id),
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generation_depth INT NOT NULL DEFAULT 0 CHECK (generation_depth >= 0),
    PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_origin ON user_tags(origin_user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_acquired_at ON user_tags(acquired_at DESC);

-- Score aggregation columns for tag lineage
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS direct_score BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS indirect_score DOUBLE PRECISION DEFAULT 0;

-- Refresh timeline helper to use created_at column
CREATE OR REPLACE FUNCTION calculate_timeline_points(
    p_strain_id UUID,
    p_window TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_points JSONB := '[]'::jsonb;
    v_interval INTERVAL;
BEGIN
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

    WITH time_buckets AS (
        SELECT 
            date_bin(v_interval, created_at, v_start_time) AS bucket_start,
            COUNT(*) AS infection_count
        FROM tags
        WHERE strain_id = p_strain_id
            AND created_at >= v_start_time
        GROUP BY bucket_start
        ORDER BY bucket_start
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'timestamp', bucket_start,
                'count', infection_count
            )
        ),
        '[]'::jsonb
    )
    INTO v_points
    FROM time_buckets;

    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

