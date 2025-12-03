-- Regional Modifiers Table
-- Stores spread multipliers and factors for different regions/cities

CREATE TABLE regional_modifiers (
    region_id TEXT PRIMARY KEY,
    density_factor FLOAT DEFAULT 1.0,
    spread_multiplier FLOAT DEFAULT 1.0,
    nightlife_factor FLOAT DEFAULT 1.0,
    airport_factor FLOAT DEFAULT 1.0,
    event_frequency FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on region_id (already primary key, but explicit for clarity)
CREATE INDEX idx_regional_modifiers_region_id ON regional_modifiers(region_id);

-- Seed initial data for major UK cities and regions
INSERT INTO regional_modifiers (region_id, density_factor, spread_multiplier, nightlife_factor, airport_factor, event_frequency) VALUES
('london', 2.0, 2.0, 1.5, 1.8, 2.0),
('manchester', 1.5, 1.8, 1.8, 1.2, 1.5),
('birmingham', 1.3, 1.5, 1.3, 1.1, 1.2),
('edinburgh', 1.2, 1.4, 1.6, 1.0, 1.3),
('glasgow', 1.4, 1.6, 1.7, 1.1, 1.4),
('liverpool', 1.3, 1.5, 1.5, 1.0, 1.3),
('leeds', 1.2, 1.4, 1.4, 1.0, 1.2),
('bristol', 1.1, 1.3, 1.3, 1.0, 1.1),
('newcastle', 1.1, 1.2, 1.2, 1.0, 1.1),
('cambridge', 1.0, 3.0, 1.0, 0.5, 0.8), -- University town
('oxford', 1.0, 3.0, 1.0, 0.5, 0.8), -- University town
('rural', 0.3, 0.5, 0.3, 0.2, 0.3); -- Rural areas

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_regional_modifiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_regional_modifiers_updated_at
    BEFORE UPDATE ON regional_modifiers
    FOR EACH ROW
    EXECUTE FUNCTION update_regional_modifiers_updated_at();

