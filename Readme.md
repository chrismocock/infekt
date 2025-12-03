# Infekt MVP

A viral tagging game where users "infect" each other via QR, GPS, or proximity. Each user has a unique strain that mutates as they tag others, creating recursive lineage tracking.

## Tech Stack

- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: Supabase (Postgres + Edge Functions)
- **Cache/Leaderboards**: Upstash Redis
- **Maps**: Mapbox
- **Notifications**: Expo Notifications

## Project Structure

```
infekt/
├── frontend/              # React Native Expo app
│   ├── app/               # Expo Router screens
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   └── types/            # TypeScript types
├── backend/              # Supabase backend
│   └── supabase/
│       ├── migrations/   # Database migrations
│       └── functions/    # Edge Functions
└── docs/                 # Documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Supabase CLI
- Upstash Redis account
- Mapbox account

### 1. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cp .env.example .env
# Add your environment variables:
# EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 2. Backend Setup

```bash
cd backend

# Initialize Supabase (if not already done)
supabase init

# Start local Supabase
supabase start

# Run migrations
supabase db reset

# Deploy Edge Functions
supabase functions deploy tag
supabase functions deploy strain
supabase functions deploy leaderboard
supabase functions deploy map
supabase functions deploy notify
```

### 3. Environment Variables

#### Supabase Edge Functions

Set these in your Supabase dashboard under Edge Functions > Secrets:

- `UPSTASH_REDIS_REST_URL`: Your Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN`: Your Upstash Redis REST token
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### 4. Run the App

```bash
cd frontend
npm start

# Then press:
# - i for iOS simulator
# - a for Android emulator
# - w for web
```

## Database Schema

### Tables

- **users**: User accounts with lineage tracking
- **strains**: Infection strains with statistics
- **tags**: Tag events with location and lineage
- **variants**: Variant abilities with rules
- **user_variants**: Junction table for unlocked variants

### Key Features

- PostGIS for geospatial queries
- Row Level Security (RLS) policies
- Recursive lineage tracking
- Redis leaderboards

## Core Features

### Tagging System

- **QR Code Scanning**: Scan QR codes to tag users
- **GPS Proximity**: Tag users within a certain radius
- **Shareable Links**: Use deep links to tag users

### Lineage Tracking

- Each tag creates a parent-child relationship
- Recursive scoring: `0.5 ^ generation_depth`
- Tracks root user and generation depth

### Variants

5 MVP variants with different rules:
- **Love Variant**: Default, 50m radius
- **Flirt Variant**: 10 tag limit, evening only, 100m radius
- **Zombie Variant**: 200m radius, invisible
- **Nuke Variant**: 1 tag limit, 500m radius
- **Invisibility Variant**: 50m radius, invisible

### Leaderboards

- Global leaderboard
- City-based leaderboards
- Strain-based rankings
- Variant-based rankings

### Map

- Heatmap visualization of infections
- Clustered markers for performance
- Strain spread visualization

## API Endpoints

### POST /tag

Tag a user with your strain.

**Request:**
```json
{
  "tagger_id": "uuid",
  "target_id": "uuid",
  "location": { "lat": 0, "lng": 0 },
  "variant_id": "uuid" // optional
}
```

### GET /strain/[id]

Get strain analytics.

### GET /leaderboard/global

Get global leaderboard.

### GET /map/heatmap

Get heatmap data for map bounds.

## Development

### Running Migrations

```bash
supabase db reset  # Resets and runs all migrations
supabase migration new migration_name  # Create new migration
```

### Testing Edge Functions Locally

```bash
supabase functions serve tag
```

### Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Security

- Rate limiting via Redis (5-minute cooldown)
- GPS proximity validation
- Self-tag prevention
- Row Level Security on all tables
- Input validation on all endpoints

## Performance

- Redis caching for leaderboards
- PostGIS spatial indexing
- Map clustering for large datasets
- Lazy loading of screens
- React.memo for expensive components

## Next Steps

1. Set up environment variables
2. Run database migrations
3. Deploy Edge Functions
4. Test on iOS/Android simulators
5. Build with EAS for production

## License

MIT
