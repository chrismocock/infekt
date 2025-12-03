# INFECT – Phase 2 PRD (Cursor-Optimised)

This document builds on the existing MVP PRD (Phase 1) and introduces deeper game systems inspired by **Plague Inc**, enhancing progression, virality, global simulation, and long-term engagement.

---

# 1. Purpose of Phase 2
Phase 2 evolves Infekt from a simple viral tagging app into a **strategic, evolving, map-driven outbreak ecosystem**. It adds:
- Mutation progression systems
- Global spread modifiers
- Outbreak events
- Time-based analytics
- Leaderboards 2.0
- Customisation
- Challenges and achievements
- TikTok-ready visualisations

This builds long-term retention, social virality, and monetisation.

---

# 2. Phase 2 Feature Groups

## 2.1 Dynamic World Simulation
Introduce world behaviour similar to Plague Inc.

### Regional Spread Modifiers
Add a `regional_modifiers` table with fields:
- region_id
- density_factor
- spread_multiplier
- nightlife_factor
- airport_factor
- event_frequency

Cities can have unique behaviours:
- London: 2x spread
- Universities: 3x spread
- Rural zones: 0.5x spread

### Real-Time World Reaction Events
Triggered by thresholds:
- "Your strain is trending in Manchester"
- "Edinburgh nightlife surge: +200% spread tonight"
- "Airport outbreak: multiple countries unlocked"

Events modify spread multipliers temporarily.

---

## 2.2 Mutation & Evolution System
Introduce a full mutation tree.

### Mutation Tree
Branches:
- **Aggressive:** Super-spreader boosts, chain amplifiers
- **Stealth:** Ghost tagging, invisibility upgrades
- **Social:** Love/Flirt evolutions, social charm
- **Geo:** Airport boost, nightlife boost, beach boost

### Mutation Points (MP)
Earned via:
- daily infections
- generational depth milestones
- new country unlocks
- outbreak events

Use MP to unlock mutation nodes.

Add tables:
- `mutation_tree_nodes`
- `user_mutation_unlocks`

---

## 2.3 Outbreak Events
Mass spread moments.

### Real-World Outbreak Detection
Outbreak zones:
- clubs
- universities
- airports
- stadiums
- festivals

When a user tags in these zones, apply a multiplier:
- Zone multipliers: x5 to x50

Add table `outbreak_events`.

### Strain-Specific Outbreaks
Triggered by:
- mutation tier
- chain length
- variant stacking

Effects:
- Explosion of infections
- Rapid cross-region spread

---

## 2.4 Global Timeline Visualisation
Introduce analytics:
- 24h infection curve
- 7-day rolling spread
- 30-day peaks & troughs
- Timeline of variant usage
- Geo expansion timeline

Requires new endpoint:
- **GET /strain/timeline**

---

## 2.5 Leaderboards 2.0
Add new competitive categories:
- Fastest growing strain (24h)
- Most countries reached
- Deepest lineage tree
- Most outbreak events triggered
- Most powerful variant chain

Add Redis keys:
```
leaderboard:growth
leaderboard:countries
leaderboard:lineage
leaderboard:outbreaks
leaderboard:variants
```

---

## 2.6 Customisation System
Users can customise strain appearance:
- colours
- particle effects
- animations
- variant badges
- mutation badges

Unlock via:
- MP
- achievements
- IAP

Add table: `strain_cosmetics`.

---

## 2.7 Achievements & Challenges
Daily / weekly tasks:
- Trigger 3 outbreaks
- Infect 5 new cities
- Reach generation depth 20
- Spread to 3 countries in 24 hours
- Unlock 2 mutation nodes this week

Add table: `strain_achievements`.

---

## 2.8 Social Virality Enhancements
### TikTok Auto-Share Modes
Auto-generate:
- infection curve videos
- global map time-lapse
- variant heatmap
- lineage tree animations

### Strain Share Pages
Public links:
`infekt.app/strain/{id}`

Shows:
- map
- mutations
- outbreak events
- lineage depth

### Region Wars / School Wars
Leaderboards per region:
- city vs city
- school vs school
- university vs university

---

# 3. Phase 2 Database Additions

## regional_modifiers
```
region_id TEXT PK
density_factor FLOAT
spread_multiplier FLOAT
nightlife_factor FLOAT
airport_factor FLOAT
event_frequency FLOAT
```

## mutation_tree_nodes
```
id UUID PK
branch TEXT
mp_cost INT
prerequisite_node UUID
boost JSONB
```

## user_mutation_unlocks
```
user_id UUID
node_id UUID
unlocked_at TIMESTAMP
```

## outbreak_events
```
id UUID PK
region_id TEXT
timestamp TIMESTAMP
multiplier FLOAT
type TEXT
```

## strain_timeline_cache
```
strain_id UUID
window TEXT
points JSONB
updated_at TIMESTAMP
```

## strain_cosmetics
```
id UUID PK
user_id UUID
cosmetic_type TEXT
value TEXT
unlocked_at TIMESTAMP
```

## strain_achievements
```
id UUID PK
user_id UUID
achievement_key TEXT
data JSONB
completed_at TIMESTAMP
```

---

# 4. Phase 2 API Endpoints

## GET /mutation/tree
Return full mutation tree.

## POST /mutation/unlock
Unlock a mutation using MP.

## GET /global/events
Return active world events.

## GET /strain/outbreaks
Return outbreak history.

## GET /strain/timeline
Return infection curves.

## POST /strain/cosmetic
Set cosmetic values.

## GET /wars/region
Return region competition status.

---

# 5. Phase 2 Scoring Enhancements
Add the following multipliers:
- outbreak_bonus
- variant_chain_bonus
- region_multiplier
- mutation_boosts

Final score:
```
score = direct
      + Σ(indirect * 0.5^depth)
      + Σ(outbreak_bonus)
      + Σ(variant_bonus)
      + Σ(region_multiplier)
      + Σ(mutation_boost)
```

---

# 6. Phase 2 UI Additions
- Mutation Tree Screen
- Outbreak Feed
- Timeline Analytics
- Strain Customisation
- Achievements & Challenges
- Region Wars

---

# 7. Acceptance Criteria
Phase 2 complete when:
- Mutation system functional
- Outbreak zones active
- Region multipliers applied
- Timeline analytics live
- Leaderboards 2.0 active
- Cosmetics system works
- Challenges operational
- Social share modes working

---

# 8. Cursor Planner Instructions
Use this PRD for Phase 2 builds:
```
You have the Phase 2 PRD in /docs/phase2.md.
Create a detailed task plan to implement all Phase 2 systems on top of the existing MVP architecture.
Focus on new:
- mutation tree
- outbreak zones
- world simulation");}

