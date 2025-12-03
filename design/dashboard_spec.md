# INFECT Dashboard UI Spec (Based on Design Mockup)

Reference image located at: /design/dashboard_reference.png

Overall style:
- Deep navy background (#08121D)
- Soft glowing neon cards
- Cyan/blue gradient accents
- Rounded corners (20–28 radius)
- Semi-transparent glass cards (rgba(255,255,255,0.05))
- Soft shadow on all elements
- Animated hero virus orb at top

Layout structure:
1. Hero Header
   - Large glowing virus orb at center top
   - Status pill on right: Dormant / Active
   - Stat row under orb: Total Cases, Countries Infected, Duration

2. Primary CTA
   - Large neon blue button (+ Tag Player)
   - Gradient: #027BFF → #4BC6FF
   - White '+' icon
   - Shadow + subtle pulse animation

3. Stats Grid (2x2)
   - Total Cases card
   - % per Player card
   - Countries Affected card
   - Spread Rate card
   - Each card uses translucent glass style

4. Evolution Points Section
   - Purple Evolution Points icon (circle)
   - “EVOLUTION POINTS” label
   - Numeric value on right (24)
   - Horizontal neon purple bar

5. Outbreak Section
   - “ACTIVE OUTBREAKS” header text
   - Default card: “No activity yet”

Component requirements:
- Use reusable components:
  - <GlassCard />
  - <StatBlock />
  - <NeonButton />
  - <ProgressBar />
  - <HeaderOrb />
  - <OutbreakList />

Animation:
- Orb: scale animation (100–103%)
- Button: glow on press
- Cards fade in on mount

Tech:
- React Native (Expo, TypeScript)
- React Native Reanimated
- React Native Linear Gradient
- React Native SVG (for icons)
- StyleSheet or styled-components
