-- Mutation Tree System
-- Allows users to unlock mutations that boost their strain

-- Mutation tree nodes table
CREATE TABLE mutation_tree_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch TEXT NOT NULL, -- 'aggressive', 'stealth', 'social', 'geo'
    name TEXT NOT NULL,
    description TEXT,
    mp_cost INT NOT NULL DEFAULT 0,
    prerequisite_node UUID REFERENCES mutation_tree_nodes(id),
    boost JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g., {"spread_multiplier": 1.2, "radius_boost": 50}
    tier INT DEFAULT 1, -- 1 = basic, 2 = intermediate, 3 = advanced
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User mutation unlocks table
CREATE TABLE user_mutation_unlocks (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES mutation_tree_nodes(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, node_id)
);

-- Create indexes
CREATE INDEX idx_mutation_tree_nodes_branch ON mutation_tree_nodes(branch);
CREATE INDEX idx_mutation_tree_nodes_prerequisite ON mutation_tree_nodes(prerequisite_node);
CREATE INDEX idx_user_mutation_unlocks_user_id ON user_mutation_unlocks(user_id);
CREATE INDEX idx_user_mutation_unlocks_node_id ON user_mutation_unlocks(node_id);

-- Seed mutation tree nodes using DO block to handle prerequisites
DO $$
DECLARE
    v_super_spreader_id UUID;
    v_chain_amplifier_id UUID;
    v_ghost_tagging_id UUID;
    v_invisibility_upgrade_id UUID;
    v_love_evolution_id UUID;
    v_flirt_master_id UUID;
    v_airport_boost_id UUID;
    v_nightlife_surge_id UUID;
    v_beach_boost_id UUID;
BEGIN
    -- Aggressive Branch
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('aggressive', 'Super Spreader', 'Increases spread multiplier by 20%', 10, NULL, '{"spread_multiplier": 1.2}'::jsonb, 1)
    RETURNING id INTO v_super_spreader_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('aggressive', 'Chain Amplifier', 'Increases indirect infection bonus by 15%', 15, v_super_spreader_id, '{"indirect_bonus": 1.15}'::jsonb, 2)
    RETURNING id INTO v_chain_amplifier_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('aggressive', 'Viral Explosion', 'Outbreak events trigger 2x more frequently', 25, v_chain_amplifier_id, '{"outbreak_frequency": 2.0}'::jsonb, 3);
    
    -- Stealth Branch
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('stealth', 'Ghost Tagging', 'Tagging radius increased by 50m while invisible', 10, NULL, '{"radius_boost": 50, "stealth_boost": 1.0}'::jsonb, 1)
    RETURNING id INTO v_ghost_tagging_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('stealth', 'Invisibility Upgrade', 'Stay invisible for 2x longer', 15, v_ghost_tagging_id, '{"invisibility_duration": 2.0}'::jsonb, 2)
    RETURNING id INTO v_invisibility_upgrade_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('stealth', 'Shadow Master', 'All tags are invisible by default', 25, v_invisibility_upgrade_id, '{"always_invisible": true}'::jsonb, 3);
    
    -- Social Branch
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('social', 'Love Evolution', 'Love variant gets 2x spread in social settings', 10, NULL, '{"social_multiplier": 2.0}'::jsonb, 1)
    RETURNING id INTO v_love_evolution_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('social', 'Flirt Master', 'Flirt variant tag limit increased to 20', 15, v_love_evolution_id, '{"tag_limit_boost": 20}'::jsonb, 2)
    RETURNING id INTO v_flirt_master_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('social', 'Social Charm', 'All variants get +30% spread in nightlife zones', 25, v_flirt_master_id, '{"nightlife_boost": 1.3}'::jsonb, 3);
    
    -- Geo Branch
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('geo', 'Airport Boost', 'Airport zones give 3x multiplier', 10, NULL, '{"airport_multiplier": 3.0}'::jsonb, 1)
    RETURNING id INTO v_airport_boost_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('geo', 'Nightlife Surge', 'Nightlife zones give 2x multiplier', 15, v_airport_boost_id, '{"nightlife_multiplier": 2.0}'::jsonb, 2)
    RETURNING id INTO v_nightlife_surge_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('geo', 'Beach Boost', 'Coastal areas give 1.5x multiplier', 20, v_nightlife_surge_id, '{"coastal_multiplier": 1.5}'::jsonb, 2)
    RETURNING id INTO v_beach_boost_id;
    
    INSERT INTO mutation_tree_nodes (branch, name, description, mp_cost, prerequisite_node, boost, tier)
    VALUES ('geo', 'Global Dominance', 'All region multipliers increased by 50%', 30, v_beach_boost_id, '{"region_multiplier_boost": 1.5}'::jsonb, 3);
END $$;

