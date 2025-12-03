-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE strains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_variants ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Users can read all users
CREATE POLICY "Users can read all users" ON users
    FOR SELECT
    USING (true);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Users can insert their own record
CREATE POLICY "Users can insert own record" ON users
    FOR INSERT
    WITH CHECK (auth.uid()::text = id::text OR auth.uid() IS NULL);

-- Strains policies
-- Public read access
CREATE POLICY "Public read access to strains" ON strains
    FOR SELECT
    USING (true);

-- Users can update their own origin strain
CREATE POLICY "Users can update own origin strain" ON strains
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = strains.origin_user_id
            AND users.id::text = auth.uid()::text
        )
    );

-- Tags policies
-- Public read access
CREATE POLICY "Public read access to tags" ON tags
    FOR SELECT
    USING (true);

-- Authenticated users can insert tags
CREATE POLICY "Authenticated users can insert tags" ON tags
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Variants policies
-- Public read access
CREATE POLICY "Public read access to variants" ON variants
    FOR SELECT
    USING (true);

-- User variants policies
-- Users can read their own variants
CREATE POLICY "Users can read own variants" ON user_variants
    FOR SELECT
    USING (user_id::text = auth.uid()::text OR auth.uid() IS NULL);

-- Users can insert their own variants
CREATE POLICY "Users can insert own variants" ON user_variants
    FOR INSERT
    WITH CHECK (user_id::text = auth.uid()::text OR auth.uid() IS NULL);

