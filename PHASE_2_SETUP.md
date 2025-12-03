# Phase 2 Setup Instructions

## Quick Start

After completing the MVP setup, run the Phase 2 database migrations to enable all new features.

## Step 1: Run Database Migrations

You need to run 6 new SQL migration files in order. You can do this via:

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order (005-010):

   **Migration 005: Regional Modifiers**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/005_regional_modifiers.sql`
   - Paste and click "Run"
   - ✅ Wait for success

   **Migration 006: Mutation System**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/006_mutation_system.sql`
   - Paste and click "Run"
   - ✅ Wait for success

   **Migration 007: Outbreak Events**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/007_outbreak_events.sql`
   - Paste and click "Run"
   - ✅ Wait for success

   **Migration 008: Timeline Analytics**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/008_timeline_analytics.sql`
   - Paste and click "Run"
   - ✅ Wait for success

   **Migration 009: Cosmetics & Achievements**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/009_cosmetics_achievements.sql`
   - Paste and click "Run"
   - ✅ Wait for success

   **Migration 010: Scoring Enhancements**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/010_scoring_enhancements.sql`
   - Paste and click "Run"
   - ✅ Wait for success

### Option B: Supabase CLI (If you have it set up)

```bash
cd backend
supabase db reset  # This runs ALL migrations in order
```

Or run individually:
```bash
supabase migration up 005_regional_modifiers
supabase migration up 006_mutation_system
supabase migration up 007_outbreak_events
supabase migration up 008_timeline_analytics
supabase migration up 009_cosmetics_achievements
supabase migration up 010_scoring_enhancements
```

## Step 2: Deploy Edge Functions

Deploy the new Phase 2 Edge Functions:

```bash
cd backend
supabase functions deploy mutation
supabase functions deploy events
supabase functions deploy cosmetic
supabase functions deploy wars

# Also update existing functions
supabase functions deploy strain
supabase functions deploy tag
supabase functions deploy leaderboard
```

## Step 3: Verify Setup

1. **Check Tables Created:**
   - Go to Supabase Dashboard > Table Editor
   - Verify you see the new Phase 2 tables:
     - `regional_modifiers` (should have city data)
     - `mutation_tree_nodes` (should have mutation tree)
     - `user_mutation_unlocks` (empty initially)
     - `outbreak_events` (empty initially)
     - `strain_timeline_cache` (empty initially)
     - `strain_cosmetics` (empty initially)
     - `strain_achievements` (empty initially)

2. **Check Functions Deployed:**
   - Go to Supabase Dashboard > Edge Functions
   - Verify you see:
     - `mutation`
     - `events`
     - `cosmetic`
     - `wars`
     - Updated: `strain`, `tag`, `leaderboard`

3. **Check Enhanced Columns:**
   - Go to Table Editor > `strains` table
   - Verify new columns exist:
     - `mutation_points`
     - `outbreak_count`
     - `variant_chain_depth`
   - Go to Table Editor > `tags` table
   - Verify new columns exist:
     - `outbreak_multiplier`
     - `region_multiplier`
     - `mutation_boost`
     - `variant_chain_bonus`
     - `final_score`

## Step 4: Test the App

1. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

2. Test Phase 2 features:
   - Tag someone (should see multipliers in response)
   - Check mutation tree (new tab/screen)
   - View outbreak events
   - Check timeline analytics
   - View enhanced leaderboards

## Troubleshooting

### Migration Errors

**"relation already exists"**
- Some tables might already exist if you ran migrations before
- You can skip that migration or drop the table first (be careful!)

**"function already exists"**
- Functions might already be created
- You can drop and recreate, or modify to use `CREATE OR REPLACE`

**"column already exists"**
- If columns already exist in `strains` or `tags`, the migration will fail
- Modify migration 010 to use `ADD COLUMN IF NOT EXISTS` (already done)

### Function Deployment Errors

**"Function not found"**
- Make sure you're in the `backend` directory
- Check that function folders exist in `backend/supabase/functions/`

**"Permission denied"**
- Make sure you're logged in: `supabase login`
- Check your project is linked: `supabase link --project-ref your-ref`

## What's New in Phase 2

After setup, you'll have:
- ✅ Mutation system with unlockable boosts
- ✅ Outbreak zone detection and events
- ✅ Regional multipliers (cities have different spread rates)
- ✅ Timeline analytics with caching
- ✅ Enhanced scoring with multiple multipliers
- ✅ Leaderboards 2.0 (growth, countries, lineage, outbreaks, variants)
- ✅ Cosmetics system for strain customization
- ✅ Achievements tracking
- ✅ Region wars for competition
- ✅ Social sharing features

## Next Steps

Once migrations are complete:
1. The app will automatically use Phase 2 features
2. Users will earn mutation points (MP) as they play
3. Outbreak events will trigger automatically
4. Enhanced scoring will apply to all new tags

Enjoy Phase 2! 🦠

