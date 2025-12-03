# Running Migrations in Supabase Dashboard

## Important: Run migrations in this exact order

### Step 1: Run 001_initial_schema.sql
1. Go to Supabase Dashboard > SQL Editor
2. Click "New Query"
3. Copy and paste the ENTIRE contents of `001_initial_schema.sql`
4. Click "Run" (or press Ctrl+Enter)
5. Wait for success message

### Step 2: Run 002_enable_postgis.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `002_enable_postgis.sql`
3. Click "Run"
4. Wait for success message

### Step 3: Run 003_rls_policies.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `003_rls_policies.sql`
3. Click "Run"
4. Wait for success message

### Step 4: Run 004_seed_variants.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `004_seed_variants.sql`
3. Click "Run"
4. Wait for success message

## Phase 2 Migrations (Run after MVP migrations above)

### Step 5: Run 005_regional_modifiers.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `005_regional_modifiers.sql`
3. Click "Run"
4. Wait for success message
5. This creates the `regional_modifiers` table and seeds city data

### Step 6: Run 006_mutation_system.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `006_mutation_system.sql`
3. Click "Run"
4. Wait for success message
5. This creates `mutation_tree_nodes` and `user_mutation_unlocks` tables

### Step 7: Run 007_outbreak_events.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `007_outbreak_events.sql`
3. Click "Run"
4. Wait for success message
5. This creates the `outbreak_events` table and helper functions

### Step 8: Run 008_timeline_analytics.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `008_timeline_analytics.sql`
3. Click "Run"
4. Wait for success message
5. This creates the `strain_timeline_cache` table and calculation functions

### Step 9: Run 009_cosmetics_achievements.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `009_cosmetics_achievements.sql`
3. Click "Run"
4. Wait for success message
5. This creates `strain_cosmetics` and `strain_achievements` tables

### Step 10: Run 010_scoring_enhancements.sql
1. Click "New Query" again
2. Copy and paste the ENTIRE contents of `010_scoring_enhancements.sql`
3. Click "Run"
4. Wait for success message
5. This adds new columns to `strains` and `tags` tables for Phase 2 scoring

## Verify Success

After running all migrations:
1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - **MVP Tables:**
     - `users`
     - `strains`
     - `tags`
     - `variants`
     - `user_variants`
   - **Phase 2 Tables:**
     - `regional_modifiers`
     - `mutation_tree_nodes`
     - `user_mutation_unlocks`
     - `outbreak_events`
     - `strain_timeline_cache`
     - `strain_cosmetics`
     - `strain_achievements`
3. Click on `variants` table - should see 5 rows
4. Click on `mutation_tree_nodes` table - should see mutation tree nodes
5. Click on `regional_modifiers` table - should see city data

## If You Get Errors

- **"type geography does not exist"**: Make sure you ran 001_initial_schema.sql first (it now enables PostGIS)
- **"relation already exists"**: Tables were already created. You can either:
  - Drop and recreate (be careful - this deletes data!)
  - Or skip the migration that's failing
- **"permission denied"**: Make sure you're using the correct database user

## Troubleshooting

If a migration fails partway through:
1. Check the error message
2. Fix any issues in the SQL
3. You may need to manually clean up partial changes
4. Re-run the migration

