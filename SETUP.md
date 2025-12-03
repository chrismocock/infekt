# Infekt MVP Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Set Up Environment Variables**
   - Copy `.env.example` to `.env` in the frontend directory
   - Add your Supabase and Mapbox credentials

3. **Initialize Supabase**
   ```bash
   cd backend
   supabase start
   supabase db reset
   ```

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy tag
   supabase functions deploy strain
   supabase functions deploy leaderboard
   supabase functions deploy map
   ```

5. **Configure Redis**
   - Create Upstash Redis instance
   - Add credentials to Supabase Edge Function secrets

6. **Run the App**
   ```bash
   cd frontend
   npm start
   ```

## Environment Variables

### Frontend (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

### Supabase Edge Functions (Set in Dashboard)
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## Database Migrations

The migrations are in `backend/supabase/migrations/`:

1. `001_initial_schema.sql` - Creates all tables
2. `002_enable_postgis.sql` - Enables PostGIS extension
3. `003_rls_policies.sql` - Sets up Row Level Security
4. `004_seed_variants.sql` - Seeds the 5 MVP variants

Run with: `supabase db reset`

## Testing Checklist

- [ ] User can create anonymous account
- [ ] QR code generation works
- [ ] QR code scanning works
- [ ] Tagging via QR code works
- [ ] Tagging via GPS proximity works
- [ ] Tagging via shareable link works
- [ ] Lineage tracking updates correctly
- [ ] Leaderboard displays correctly
- [ ] Map heatmap displays correctly
- [ ] Variants unlock at correct thresholds
- [ ] Push notifications work
- [ ] Rate limiting prevents spam
- [ ] Self-tag prevention works

## Common Issues

### "Cannot find module" errors
- Run `npm install` in the frontend directory
- Clear Expo cache: `expo start -c`

### Supabase connection errors
- Check environment variables
- Verify Supabase project is running
- Check network connectivity

### Redis errors
- Verify Upstash credentials
- Check Edge Function secrets are set
- Ensure Redis instance is active

### Map not displaying
- Verify Mapbox token is set
- Check Mapbox account has credits
- Verify token has correct permissions

