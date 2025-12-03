-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension (required for GEOGRAPHY type)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_strain_id UUID,
    current_variant_id UUID,
    last_location GEOGRAPHY(Point),
    parent_user_id UUID REFERENCES users(id),
    root_user_id UUID REFERENCES users(id),
    generation INT DEFAULT 0,
    tags_given INT DEFAULT 0,
    tags_received INT DEFAULT 0
);

-- Variants table (created before tags since tags references it)
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    rules JSONB NOT NULL,
    icon_url TEXT,
    rarity INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strains table
CREATE TABLE strains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_user_id UUID REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    direct_infections BIGINT DEFAULT 0,
    indirect_infections BIGINT DEFAULT 0,
    total_infections BIGINT DEFAULT 0,
    countries JSONB DEFAULT '[]'::jsonb,
    depth INT DEFAULT 0
);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tagger_id UUID REFERENCES users(id) NOT NULL,
    target_id UUID REFERENCES users(id) NOT NULL,
    strain_id UUID REFERENCES strains(id) NOT NULL,
    variant_id UUID REFERENCES variants(id),
    parent_tag_id UUID REFERENCES tags(id),
    root_user_id UUID REFERENCES users(id) NOT NULL,
    location GEOGRAPHY(Point),
    generation INT DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User variants junction table
CREATE TABLE user_variants (
    user_id UUID REFERENCES users(id) NOT NULL,
    variant_id UUID REFERENCES variants(id) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, variant_id)
);

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_current_strain FOREIGN KEY (current_strain_id) REFERENCES strains(id);
ALTER TABLE users ADD CONSTRAINT fk_current_variant FOREIGN KEY (current_variant_id) REFERENCES variants(id);

-- Create indexes
CREATE INDEX idx_users_current_strain_id ON users(current_strain_id);
CREATE INDEX idx_users_root_user_id ON users(root_user_id);
CREATE INDEX idx_users_parent_user_id ON users(parent_user_id);

CREATE INDEX idx_tags_tagger_id ON tags(tagger_id);
CREATE INDEX idx_tags_target_id ON tags(target_id);
CREATE INDEX idx_tags_strain_id ON tags(strain_id);
CREATE INDEX idx_tags_root_user_id ON tags(root_user_id);
CREATE INDEX idx_tags_timestamp ON tags(timestamp DESC);

CREATE INDEX idx_strains_origin_user_id ON strains(origin_user_id);

-- Note: Spatial index for location will be created in 002_enable_postgis.sql

