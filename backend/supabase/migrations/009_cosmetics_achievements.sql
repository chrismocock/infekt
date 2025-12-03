-- Cosmetics and Achievements Tables

-- Strain Cosmetics Table
CREATE TABLE strain_cosmetics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cosmetic_type TEXT NOT NULL, -- 'color', 'particle_effect', 'animation', 'variant_badge', 'mutation_badge'
    value TEXT NOT NULL, -- JSON string or simple value
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_strain_cosmetics_user_id ON strain_cosmetics(user_id);
CREATE INDEX idx_strain_cosmetics_type ON strain_cosmetics(cosmetic_type);
CREATE INDEX idx_strain_cosmetics_active ON strain_cosmetics(user_id, is_active) WHERE is_active = true;

-- Strain Achievements Table
CREATE TABLE strain_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL, -- e.g., 'outbreak_master', 'global_dominator', 'lineage_legend'
    data JSONB DEFAULT '{}'::jsonb, -- Additional achievement data
    progress JSONB DEFAULT '{}'::jsonb, -- Progress tracking for incomplete achievements
    completed_at TIMESTAMP WITH TIME ZONE,
    reward_mp INT DEFAULT 0, -- Mutation points awarded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_key)
);

-- Create indexes
CREATE INDEX idx_strain_achievements_user_id ON strain_achievements(user_id);
CREATE INDEX idx_strain_achievements_key ON strain_achievements(achievement_key);
CREATE INDEX idx_strain_achievements_completed ON strain_achievements(user_id, completed_at) WHERE completed_at IS NOT NULL;

-- Seed initial achievement definitions (metadata - actual achievements are user-specific)
-- These are just examples of achievement keys that can be tracked
-- The actual achievement logic will be in Edge Functions

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievement_progress(
    p_user_id UUID,
    p_achievement_key TEXT,
    p_progress_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_achievement RECORD;
    v_completed BOOLEAN := false;
BEGIN
    -- Get or create achievement record
    SELECT * INTO v_achievement
    FROM strain_achievements
    WHERE user_id = p_user_id AND achievement_key = p_achievement_key;
    
    IF NOT FOUND THEN
        -- Create new achievement record
        INSERT INTO strain_achievements (user_id, achievement_key, progress)
        VALUES (p_user_id, p_achievement_key, p_progress_data)
        RETURNING * INTO v_achievement;
    ELSE
        -- Update progress
        UPDATE strain_achievements
        SET progress = p_progress_data
        WHERE user_id = p_user_id AND achievement_key = p_achievement_key
        RETURNING * INTO v_achievement;
    END IF;
    
    -- Check if achievement is completed (logic depends on achievement_key)
    -- This is a placeholder - actual completion logic will be in Edge Functions
    -- based on the achievement_key and progress data
    
    RETURN v_completed;
END;
$$ LANGUAGE plpgsql;

-- Common achievement keys (for reference):
-- 'outbreak_master' - Trigger 3 outbreaks
-- 'city_conqueror' - Infect 5 new cities
-- 'lineage_legend' - Reach generation depth 20
-- 'global_spreader' - Spread to 3 countries in 24 hours
-- 'mutation_master' - Unlock 2 mutation nodes this week
-- 'variant_collector' - Unlock all variants
-- 'speed_demon' - 100 infections in 24 hours
-- 'depth_diver' - Generation depth 50+
-- 'country_hopper' - Spread to 10 countries

