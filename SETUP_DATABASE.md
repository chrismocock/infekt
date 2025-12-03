# Setting Up Database - Two Options

## Option 1: Push Migrations to Remote (Recommended - No Docker Needed)

Since you've already linked your Supabase project, you can push migrations directly:

```bash
cd C:\Code\Infekt\backend
supabase db push
```

This will apply all migrations to your remote Supabase database.

**Note:** Make sure you're logged in:
```bash
supabase login
```

---

## Option 2: Use Supabase Dashboard (Easiest - No CLI Needed)

You can run the migrations manually in the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of each migration file in order:
   - `001_initial_schema.sql`
   - `002_enable_postgis.sql`
   - `003_rls_policies.sql`
   - `004_seed_variants.sql`
5. Click **Run** for each one

---

## Option 3: Install Docker Desktop (For Local Development)

If you want to run Supabase locally:

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Wait for Docker to fully start (whale icon in system tray)
4. Then run: `supabase db reset`

**Note:** Docker Desktop requires Windows Pro/Enterprise or WSL2 for Windows Home.

---

## Recommended: Use Option 1 or 2

For getting started quickly, use **Option 1** (db push) or **Option 2** (Dashboard). You don't need Docker for remote development.

