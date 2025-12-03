# Getting Started with Infekt MVP

This guide will walk you through setting up and running the Infekt MVP from scratch.

## Prerequisites Check

Before starting, make sure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed
- [ ] Expo CLI installed globally (`npm install -g expo-cli`)
- [ ] Supabase CLI installed (see INSTALL_SUPABASE_CLI.md) - Optional, can use Dashboard instead
- [ ] Git installed
- [ ] Accounts for:
  - [ ] Supabase (free tier works)
  - [ ] Upstash Redis (free tier works)
  - [ ] Mapbox (free tier works)

## Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install
```

This will install all React Native and Expo dependencies.

**Expected output:** Dependencies installed successfully.

## Step 2: Set Up Supabase Project

### 2.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `infekt`
   - Database password: (save this!)
   - Region: Choose closest to you
5. Wait for project to be created (2-3 minutes)

### 2.2 Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2.3 Link Your Project (If Using Supabase CLI)

**Note:** You can skip this and use the Dashboard method below if you don't have Supabase CLI set up.

```bash
cd backend
supabase login
supabase link --project-ref your-project-ref
```

To get your project ref:
- Go to Supabase dashboard
- Settings > General
- Copy the "Reference ID"

### 2.4 Run Database Migrations

**IMPORTANT:** Run migrations in this exact order using the Supabase Dashboard:

1. **Go to Supabase Dashboard** > **SQL Editor**
2. **Click "New Query"**
3. **Run each migration file in order:**

   **Migration 1: Initial Schema**
   - Copy entire contents of `backend/supabase/migrations/001_initial_schema.sql`
   - Paste into SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - ✅ Wait for success message
   
   **Migration 2: PostGIS Indexes**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/002_enable_postgis.sql`
   - Paste and run
   - ✅ Wait for success message
   
   **Migration 3: RLS Policies**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/003_rls_policies.sql`
   - Paste and run
   - ✅ Wait for success message
   
   **Migration 4: Seed Variants**
   - Click "New Query"
   - Copy entire contents of `backend/supabase/migrations/004_seed_variants.sql`
   - Paste and run
   - ✅ Wait for success message

**What this creates:**
- All tables (users, strains, tags, variants, user_variants)
- PostGIS extension (enabled in migration 1)
- Spatial indexes for location columns
- Row Level Security policies
- 5 MVP variants seeded

**Verify Success:**
1. Go to **Table Editor** in Supabase dashboard
2. You should see 5 tables: `users`, `strains`, `tags`, `variants`, `user_variants`
3. Click on `variants` table - you should see 5 rows (Love, Flirt, Zombie, Nuke, Invisibility)

**If you get errors:**
- "type geography does not exist" → Make sure you ran 001_initial_schema.sql first (it enables PostGIS)
- "relation already exists" → Tables were partially created. You may need to drop and recreate, or skip that migration

## Step 3: Set Up Upstash Redis

### 3.1 Create Redis Instance

1. Go to [upstash.com](https://upstash.com)
2. Sign up or log in
3. Click "Create Database"
4. Choose:
   - Name: `infekt-redis`
   - Type: Regional
   - Region: Choose closest to you
5. Click "Create"

### 3.2 Get Redis Credentials

1. Click on your database
2. Go to "REST API" tab
3. Copy:
   - **UPSTASH_REDIS_REST_URL** (e.g., `https://xxxxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (starts with `AX...`)

## Step 4: Set Up Mapbox

### 4.1 Create Mapbox Account

1. Go to [mapbox.com](https://mapbox.com)
2. Sign up (free tier includes 50,000 map loads/month)
3. Verify your email

### 4.2 Get Access Token

1. Go to [Account > Tokens](https://account.mapbox.com/access-tokens/)
2. Click "Create a token"
3. Name it: `Infekt App`
4. Copy the token (starts with `pk.`)

## Step 5: Configure Environment Variables

### 5.1 Frontend Environment

```bash
cd frontend
# Create .env file
```

Create `frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-token-here
```

**Important:** 
- Replace `your-project` with your actual Supabase project URL
- Replace `your-anon-key-here` with your actual anon key
- Replace `pk.your-mapbox-token-here` with your actual Mapbox token

### 5.2 Supabase Edge Functions Secrets

1. Go to Supabase dashboard
2. Navigate to **Edge Functions** > **Secrets**
3. Add these secrets:

```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token-here
```

**Note:** Edge Functions automatically have access to `SUPABASE_URL` and `SUPABASE_ANON_KEY`, so you don't need to set those.

## Step 6: Deploy Edge Functions

**Note:** You need Supabase CLI installed for this step. See `INSTALL_SUPABASE_CLI.md` if you haven't installed it yet.

### 6.1 Login to Supabase

```bash
supabase login
```

### 6.2 Link Your Project (if not already linked)

```bash
cd backend
supabase link --project-ref your-project-ref
```

**To get your project ref:**
- Go to Supabase dashboard > Settings > General
- Copy the "Reference ID"

### 6.3 Deploy Functions

```bash
# Deploy all functions
supabase functions deploy tag
supabase functions deploy strain
supabase functions deploy leaderboard
supabase functions deploy map
supabase functions deploy notify
```

**Expected output:** Each function should show "Deployed successfully"

**Verify:** 
- Go to Supabase dashboard > Edge Functions
- You should see all 5 functions listed

**Alternative:** If you can't deploy via CLI, you can upload functions manually through the Supabase dashboard, but CLI is recommended.

## Step 7: Install Frontend Dependencies

**Do this after setting up your database:**

```bash
cd frontend
npm install
```

This will install all React Native and Expo dependencies.

**Expected output:** Dependencies installed successfully (may take a few minutes).

**If you get errors:**
- Make sure Node.js is installed: `node --version`
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

## Step 8: Test the Setup

### 8.1 Start Expo Development Server

```bash
cd frontend
npm start
```

**Expected output:**
```
› Metro waiting on expo://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### 8.2 Run on Simulator/Emulator

**iOS:**
- Press `i` in the terminal
- Or open iOS Simulator and scan QR code

**Android:**
- Press `a` in the terminal
- Or open Android Emulator and scan QR code

**Web (for testing):**
- Press `w` in the terminal

### 8.3 Test Basic Flow

1. **Onboarding:**
   - App should show onboarding screen
   - Enter optional username
   - Click "Create Account"
   - Should create user and navigate to home

2. **Home Screen:**
   - Should show your stats (all zeros initially)
   - "Tag Someone" button should be visible

3. **Tag Flow:**
   - Click "Tag Someone"
   - Should show scan screen
   - Test QR scanner (you'll need another device/user to test full flow)

## Step 9: Verify Database

### 9.1 Check Tables Created

1. Go to Supabase dashboard > Table Editor
2. You should see:
   - `users`
   - `strains`
   - `tags`
   - `variants`
   - `user_variants`

### 9.2 Check Variants Seeded

1. Go to `variants` table
2. You should see 5 rows:
   - Love Variant
   - Flirt Variant
   - Zombie Variant
   - Nuke Variant
   - Invisibility Variant

### 9.3 Test Edge Functions

1. Go to Supabase dashboard > Edge Functions
2. Click on any function (e.g., `tag`)
3. Click "Invoke" tab
4. Try a test invocation (you'll need proper auth headers)

## Common Issues & Solutions

### Issue: "Cannot find module" errors

**Solution:**
```bash
cd frontend
rm -rf node_modules
npm install
expo start -c  # Clear cache
```

### Issue: Supabase connection errors

**Check:**
- Environment variables are set correctly
- Supabase project is active (not paused)
- Network connectivity

**Solution:**
```bash
# Verify .env file exists and has correct values
cat frontend/.env
```

### Issue: Edge Functions not deploying

**Check:**
- Supabase CLI is installed (see INSTALL_SUPABASE_CLI.md)
- You're logged in: `supabase login`
- Project is linked: `supabase link --project-ref your-ref`
- You have correct permissions

**Solution:**
```bash
# Make sure CLI is installed and in PATH
supabase --version

# Re-login and link
supabase logout
supabase login
supabase link --project-ref your-project-ref
```

### Issue: "type geography does not exist" when running migrations

**Solution:**
- Make sure you run migrations in order: 001, 002, 003, 004
- Migration 001 now includes PostGIS extension at the top
- If you get this error, run: `CREATE EXTENSION IF NOT EXISTS postgis;` first

### Issue: Redis connection errors

**Check:**
- Redis credentials are set in Supabase Edge Function secrets
- Redis instance is active (not deleted)
- Credentials are correct

**Solution:**
- Re-check credentials in Upstash dashboard
- Re-add secrets in Supabase dashboard

### Issue: Map not displaying

**Check:**
- Mapbox token is set in `.env`
- Mapbox account has credits
- Token has correct permissions

**Solution:**
- Verify token in Mapbox account dashboard
- Check token hasn't expired
- Ensure token has "Downloads:Read" scope

## ✅ You're Here: After Running SQL Migrations

**If you just finished running the SQL migrations, here's what to do next:**

### ✅ Completed:
- [x] Database migrations run
- [x] Tables created
- [x] Variants seeded

### 🔄 Next Steps:

1. **Verify Database Setup:**
   - Go to Supabase Dashboard > Table Editor
   - Confirm you see 5 tables
   - Check `variants` table has 5 rows

2. **Set Up Upstash Redis** (Step 3 below)
   - Create Redis instance
   - Get credentials

3. **Set Up Mapbox** (Step 4 below)
   - Create account
   - Get access token

4. **Configure Environment Variables** (Step 5 below)
   - Create `frontend/.env` file
   - Add Supabase and Mapbox credentials
   - Add Redis secrets to Supabase Edge Functions

5. **Deploy Edge Functions** (Step 6 below)
   - Use Supabase CLI to deploy functions

6. **Install Frontend Dependencies** (Step 7 below)
   - Run `npm install` in frontend folder

7. **Start the App** (Step 8 below)
   - Run `npm start` and test the app

---

## Next Steps After Full Setup

1. **Test Tagging Flow:**
   - Create two test accounts
   - Generate QR code from one
   - Scan with the other
   - Verify tag is created

2. **Test Lineage:**
   - Tag user A → user B
   - Tag user B → user C
   - Check that user A gets indirect infection credit

3. **Test Variants:**
   - Reach 10 infections to unlock Flirt Variant
   - Activate a variant
   - Test variant rules (radius, time restrictions)

4. **Test Leaderboard:**
   - Create several tags
   - Check leaderboard updates
   - Verify rankings

5. **Test Map:**
   - Create tags with different locations
   - View map heatmap
   - Verify clustering works

## Production Deployment

When ready for production:

1. **Build iOS App:**
   ```bash
   cd frontend
   eas build --platform ios
   ```

2. **Build Android App:**
   ```bash
   eas build --platform android
   ```

3. **Update Environment Variables:**
   - Use production Supabase project
   - Use production Redis instance
   - Update Mapbox token if needed

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify all environment variables
3. Check Supabase logs (Dashboard > Logs)
4. Check Edge Function logs (Dashboard > Edge Functions > Logs)

Good luck! 🦠

