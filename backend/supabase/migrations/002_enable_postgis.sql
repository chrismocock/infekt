-- Create spatial indexes on location columns
-- Note: PostGIS is already enabled in 001_initial_schema.sql
CREATE INDEX idx_users_last_location ON users USING GIST (last_location);
CREATE INDEX idx_tags_location ON tags USING GIST (location);

-- Add helper function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    point1 GEOGRAPHY(Point),
    point2 GEOGRAPHY(Point)
) RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(point1, point2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helper function to check if point is within radius
CREATE OR REPLACE FUNCTION is_within_radius(
    point1 GEOGRAPHY(Point),
    point2 GEOGRAPHY(Point),
    radius_meters DOUBLE PRECISION
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN ST_DWithin(point1, point2, radius_meters);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

