# INFECT – Product Requirements Document (Cursor Version)
Platform: iOS + Android  
Stack: React Native (Expo), Supabase (Postgres + Edge Functions), Upstash Redis, Mapbox  

---

# 1. Product Summary

Infekt is a viral tagging game where users “infect” each other via QR, GPS, or proximity.  
Each user has a unique **strain**, which mutates as they tag others.  
Every infection creates a **recursive lineage**, so the original user receives credit for all downstream infections across generations.

Core game loop:
1. User tags someone  
2. Strain spreads  
3. Mutation recorded  
4. Lineage and global spread updated  
5. Leaderboards and map update  
6. Push notifications for growth  

---

# 2. Core MVP Features

## 2.1 Onboarding
- Anonymous user creation (UUID)
- Auto-generate:
  - user_id
  - strain_id
  - QR code
- Optional username
- Request location permission

## 2.2 Tagging System
Methods:
- QR scan
- GPS proximity
- Shareable link: `/tag/{strain_id}`

Tag event stores:
- tagger_id  
- target_id  
- strain_id  
- variant_id  
- location  
- parent_tag_id  
- root_user_id  
- generation (depth)  
- timestamp  

## 2.3 Strains & Mutations
- Each user has a strain  
- Each infection creates a mutation entry  
- Strain tracks:
  - direct infections  
  - indirect infections  
  - total infections  
  - depth (max generation)  
  - countries reached  

## 2.4 Variants (Abilities)
MVP variants:
- Love Variant  
- Flirt Variant  
- Zombie Variant  
- Nuke Variant  
- Invisibility Variant  

Each variant has JSON rules:
```
{
  "tag_limit": null | number,
  "time_restriction": null | { start, end },
  "radius": number,
  "visibility": boolean
}
```

## 2.5 Map (Global Heatmap)
- Mapbox map  
- Clustered infection heatmap  
- User strain spread  
- Mutation hotspots  

## 2.6 Leaderboards
Types:
- Global
- City-based
- Strain-based
- Variant-based

Stored in Redis Sorted Sets:
```
leaderboard:global
leaderboard:city:{city}
leaderboard:strain:{strain_id}
```

## 2.7 My Strain Screen
Displays:
- total infections (direct + indirect)
- generation depth
- countries reached
- top outbreak regions
- strain mutation preview

---

# 3. User Flows

## 3.1 Create → Tag → Spread
- User installs app  
- User auto-registered  
- Sees “Tag Someone”  
- QR scan → infection event  
- Map + leaderboards update  

## 3.2 Variants
- Variants screen lists unlocked and locked variants  
- Selecting a variant modifies tagging rules  

---

# 4. Architecture

## 4.1 Frontend (React Native + Expo)
Screens:
- Onboarding
- Home
- ScanTag
- Map
- Leaderboard
- Strain
- Variants
- Profile

## 4.2 Backend (Supabase)
Components:
- Postgres DB
- Edge Functions
- RLS
- Storage (QR codes)

## 4.3 Redis
- Leaderboards
- Tag cooldowns
- Recent tag cache

## 4.4 Geo
- PostGIS  
- Location clustering  

---

# 5. Database Schema

## 5.1 users
```sql
id UUID PRIMARY KEY
username TEXT
created_at TIMESTAMP
current_strain_id UUID
current_variant_id UUID
last_location GEOGRAPHY(Point)
parent_user_id UUID
root_user_id UUID
generation INT
tags_given INT
tags_received INT
```

## 5.2 strains
```sql
id UUID PRIMARY KEY
origin_user_id UUID
created_at TIMESTAMP
direct_infections BIGINT
indirect_infections BIGINT
total_infections BIGINT
countries JSONB
depth INT
```

## 5.3 tags
```sql
id UUID PRIMARY KEY
tagger_id UUID
target_id UUID
strain_id UUID
variant_id UUID
parent_tag_id UUID
root_user_id UUID
location GEOGRAPHY(Point)
generation INT
timestamp TIMESTAMP
```

## 5.4 variants
```sql
id UUID PRIMARY KEY
name TEXT
rules JSONB
icon_url TEXT
rarity INT
```

## 5.5 user_variants
```sql
user_id UUID
variant_id UUID
unlocked_at TIMESTAMP
```

---

# 6. Backend Endpoints (Supabase Edge Functions)

## POST /tag
Input:
```json
{
  "tagger_id": "",
  "target_id": "",
  "location": { "lat": 0, "lng": 0 },
  "variant_id": ""
}
```

Output:
- mutation created  
- lineage updated  
- scores updated  

## GET /strain/{id}
Returns strain analytics.

## GET /leaderboard/global
Returns top 100 (Redis).

## GET /map/heatmap
Returns cluster points.

---

# 7. Scoring Logic

Direct infections:
```
+1 point
```

Recursive lineage:
```
ancestor_score += (0.5 ^ generation_depth)
```

Example:
- A infects B → A +1  
- B infects C → B +1, A +0.5  
- C infects D → C +1, B +0.5, A +0.25  

Scores stored in:
- `strains.total_infections`
- Redis leaderboard

---

# 8. Push Notifications

Triggered on:
- You get tagged
- Your strain spreads to a new region
- Variant unlocked
- Descendant tag event

---

# 9. Security & Anti-Cheat

- Rate limit tags (Redis)
- Validate GPS proximity
- Prevent self-tag
- Detect GPS spoofing
- Supabase RLS on all tables

---

# 10. Analytics

Track:
- DAU/MAU  
- infections/day  
- K-factor  
- map activity  
- variant usage  
- strain growth curve  

---

# 11. Non-Functional Requirements

- Supports 1M+ users  
- < 200ms API latency  
- 10k tag events/min peak  
- Supabase Functions horizontally scalable  
- PostGIS indexing for geo performance  

---

# 12. Acceptance Criteria

MVP complete when:
- Tagging fully functional  
- Lineage system implemented  
- Map heatmap live  
- Leaderboards live  
- Variants functional  
- Push notifications working  
- Expo iOS + Android builds successful  

---

# 13. Cursor Planner Instruction (copy/paste)

Use this instruction with the PRD:

```
You have the full PRD in /docs/PRD.md.
Create a complete build plan for the MVP using React Native (Expo), Supabase, Edge Functions, Redis, and Mapbox. 
Generate tasks only for the MVP features and architecture described in the PRD.
Output: a structured multi-step plan with folders, files, components, functions, endpoints, schema migrations, and integration steps.
```
