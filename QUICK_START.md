# Quick Start Checklist

Follow these steps in order to get Infekt MVP running:

## ✅ Step 1: Install Frontend Dependencies (2 minutes)

```bash
cd frontend
npm install
```

**What this does:** Installs all React Native, Expo, and other frontend dependencies.

**Success indicator:** No errors, `node_modules` folder created.

---

## ✅ Step 2: Create Supabase Project (5 minutes)

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in:
   - Name: `infekt` (or any name)
   - Database Password: **SAVE THIS!**
   - Region: Choose closest
4. Wait 2-3 minutes for project creation

**What you'll need:**
- Project URL (e.g., `https://xxxxx.supabase.co`)
- Anon key (starts with `eyJ...`)

**Where to find:** Settings > API in Supabase dashboard

---

## ✅ Step 3: Run Database Migrations (2 minutes)

```bash
cd backend

# Option A: Using Supabase CLI (recommended)
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Option B: Using Supabase Dashboard
# Go to SQL Editor > New Query
# Copy and paste contents of:
# - backend/supabase/migrations/001_initial_schema.sql
# - backend/supabase/migrations/002_enable_postgis.sql
# - backend/supabase/migrations/003_rls_policies.sql
# - backend/supabase/migrations/004_seed_variants.sql
# Run each one
```

**What this does:** Creates all tables, enables PostGIS, sets up security, seeds variants.

**Verify:** Go to Supabase dashboard > Table Editor, you should see 5 tables.

---

## ✅ Step 4: Create Upstash Redis (3 minutes)

1. Go to https://upstash.com and sign up/login
2. Click "Create Database"
3. Choose:
   - Name: `infekt-redis`
   - Type: Regional
   - Region: Choose closest
4. Click "Create"

**What you'll need:**
- REST URL (e.g., `https://xxxxx.upstash.io`)
- REST Token (starts with `AX...`)

**Where to find:** Click on database > REST API tab

---

## ✅ Step 5: Get Mapbox Token (2 minutes)

1. Go to https://mapbox.com and sign up/login
2. Go to https://account.mapbox.com/access-tokens/
3. Click "Create a token"
4. Name: `Infekt App`
5. Copy the token (starts with `pk.`)

**Note:** Free tier includes 50,000 map loads/month (plenty for testing)

---

## ✅ Step 6: Configure Environment Variables (3 minutes)

### Frontend (.env file)

```bash
cd frontend
# Create .env file (copy from .env.example if it exists)
```

Create `frontend/.env` with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE
```

**Replace:**
- `YOUR_PROJECT` with your Supabase project subdomain
- `YOUR_ANON_KEY_HERE` with your Supabase anon key
- `pk.YOUR_TOKEN_HERE` with your Mapbox token

### Supabase Edge Functions Secrets

1. Go to Supabase dashboard
2. Navigate to **Edge Functions** > **Secrets**
3. Click "Add new secret" for each:

```
Name: UPSTASH_REDIS_REST_URL
Value: https://YOUR_REDIS.upstash.io

Name: UPSTASH_REDIS_REST_TOKEN
Value: YOUR_REDIS_TOKEN_HERE
```

---

## ✅ Step 7: Deploy Edge Functions (5 minutes)

```bash
cd backend

# Make sure you're logged in
supabase login

# Link your project (get project ref from Supabase dashboard > Settings > General)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy each function
supabase functions deploy tag
supabase functions deploy strain
supabase functions deploy leaderboard
supabase functions deploy map
supabase functions deploy notify
```

**What this does:** Uploads all Edge Functions to Supabase.

**Verify:** Go to Supabase dashboard > Edge Functions, you should see 5 functions.

---

## ✅ Step 8: Start the App (1 minute)

```bash
cd frontend
npm start
```

**Then:**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Or scan QR code with Expo Go app on your phone

**Expected:** Expo dev server starts, QR code appears.

---

## ✅ Step 9: Test Basic Flow

1. **Onboarding:**
   - App opens to onboarding screen
   - Enter username (optional)
   - Click "Create Account"
   - Should navigate to home screen

2. **Home Screen:**
   - Should show stats (all zeros initially)
   - "Tag Someone" button visible

3. **Create Second Account (for testing):**
   - Logout or use different device
   - Create another account
   - Note the QR code or strain ID

4. **Test Tagging:**
   - From first account, click "Tag Someone"
   - Scan QR code from second account
   - Should create tag successfully

---

## 🎉 You're Done!

If all steps completed successfully, you should have:
- ✅ Frontend app running
- ✅ Database with all tables
- ✅ Edge Functions deployed
- ✅ Redis connected
- ✅ Mapbox configured
- ✅ Basic tagging working

---

## Troubleshooting

### "Module not found" errors
```bash
cd frontend
rm -rf node_modules
npm install
expo start -c
```

### Supabase connection errors
- Check `.env` file exists and has correct values
- Verify Supabase project is active (not paused)
- Check network connection

### Edge Functions not working
- Verify secrets are set in Supabase dashboard
- Check function logs in Supabase dashboard
- Ensure Redis credentials are correct

### Map not showing
- Verify Mapbox token in `.env`
- Check Mapbox account has credits
- Ensure token hasn't expired

---

## Next: Test Full Features

Once basic flow works, test:
1. **Lineage:** Tag A → B → C, verify A gets indirect credit
2. **Variants:** Reach 10 infections, unlock Flirt Variant
3. **Leaderboard:** Create several tags, check rankings
4. **Map:** View heatmap of infections
5. **Notifications:** Test push notifications (requires device)

---

## Need Help?

Check the detailed guide: `GETTING_STARTED.md`

