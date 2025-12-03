-- Scoring Enhancements
-- Add columns to support Phase 2 scoring multipliers

-- Add columns to strains table
ALTER TABLE strains 
ADD COLUMN IF NOT EXISTS mutation_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS outbreak_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS variant_chain_depth INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mp_earned INT DEFAULT 0;

-- Add columns to tags table for multipliers
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS outbreak_multiplier FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS region_multiplier FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS mutation_boost FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS variant_chain_bonus FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS final_score FLOAT DEFAULT 0.0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_strains_mutation_points ON strains(mutation_points DESC);
CREATE INDEX IF NOT EXISTS idx_strains_outbreak_count ON strains(outbreak_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_outbreak_multiplier ON tags(outbreak_multiplier);
CREATE INDEX IF NOT EXISTS idx_tags_region_multiplier ON tags(region_multiplier);
CREATE INDEX IF NOT EXISTS idx_tags_final_score ON tags(final_score DESC);

-- Function to calculate enhanced score for a tag
-- Formula: base_score * outbreak_multiplier * region_multiplier * mutation_boost + variant_chain_bonus
CREATE OR REPLACE FUNCTION calculate_enhanced_tag_score(
    p_base_score FLOAT,
    p_outbreak_multiplier FLOAT DEFAULT 1.0,
    p_region_multiplier FLOAT DEFAULT 1.0,
    p_mutation_boost FLOAT DEFAULT 1.0,
    p_variant_chain_bonus FLOAT DEFAULT 0.0
)
RETURNS FLOAT AS $$
BEGIN
    RETURN (p_base_score * p_outbreak_multiplier * p_region_multiplier * p_mutation_boost) + p_variant_chain_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to update strain mutation points
CREATE OR REPLACE FUNCTION award_mutation_points(
    p_strain_id UUID,
    p_points INT,
    p_reason TEXT DEFAULT 'infection'
)
RETURNS VOID AS $$
BEGIN
    UPDATE strains
    SET 
        mutation_points = mutation_points + p_points,
        total_mp_earned = total_mp_earned + p_points
    WHERE id = p_strain_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment outbreak count
CREATE OR REPLACE FUNCTION increment_outbreak_count(
    p_strain_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE strains
    SET outbreak_count = outbreak_count + 1
    WHERE id = p_strain_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update variant chain depth
CREATE OR REPLACE FUNCTION update_variant_chain_depth(
    p_strain_id UUID,
    p_depth INT
)
RETURNS VOID AS $$
BEGIN
    UPDATE strains
    SET variant_chain_depth = GREATEST(variant_chain_depth, p_depth)
    WHERE id = p_strain_id;
END;
$$ LANGUAGE plpgsql;

-- View for enhanced strain scores (for leaderboards)
CREATE OR REPLACE VIEW strain_scores_enhanced AS
SELECT 
    s.id,
    s.origin_user_id,
    s.direct_infections,
    s.indirect_infections,
    s.total_infections,
    s.mutation_points,
    s.outbreak_count,
    s.variant_chain_depth,
    s.depth,
    -- Enhanced total score calculation
    (
        s.direct_infections + 
        s.indirect_infections + 
        (s.outbreak_count * 10) + -- Outbreak bonus
        (s.variant_chain_depth * 5) + -- Variant chain bonus
        (s.mutation_points * 0.1) -- MP contribution
    ) as enhanced_score
FROM strains s;

