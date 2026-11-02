# Development Roadmap: Next-Gen Lightweight Football Simulation

## Vision & Architecture Principles
Build an authentic, tactical, and fluid 32-bit football simulation that runs at a locked 60 FPS across all hardware, from desktop workstations down to $50 budget smartphones.
- **Authentic Football Realism (Zero Magic, Zero Superpowers)**: Pure grounded, tactile physical football. No neon forcefields or arcade shields. Spatial ball protection is achieved via body leverage, planted studs, and low center of gravity.
- **Strict 60 FPS Performance on Budget Devices**: Procedural HTML5 Canvas 2D math, pre-allocated vectors, zero-allocation per-frame render loops, and efficient memory management.
- **32-Bit Arcade Console Design Constitution**: Pure late-90s / early-2000s console aesthetic (chiseled metallic bevels, dithered shading, authentic scanlines, rich CRT/VHS filters, and tactile responsive menus).
- **Console-Grade Zero-Scroll Viewport UI**: Strict single-screen layout across all devices (PC, tablet, mobile). No vertical or horizontal page scrolling anywhere in menus or tactical boards.
- **Daily Token Budget Calibration**: Strictly 1 Phase = 1 Day's worth of Google AI Studio tokens (~700k–850k tokens), with each phase terminating in a fully compiled, zero-regression, 100% playable build.

---

# Implemented Roadmaps Archive

Below is the verified historical archive of all completed development roadmaps and engineering milestones.

### Roadmap Archive: Core Gameplay, Engine & Match Architecture (Phases 0.5 – 18)

| Phase | Title | Core Technical Accomplishments |
| :---: | :--- | :--- |
| **Phase 0.5** | **Match Rules, Foul Attribution & Modern Pressing** | Symmetrical foul recognition; strict discrimination between attacking penalty box vs. defending box; zero friendly-fire tackles; 2026 pressing triggers (backward-facing, sideline traps, loose-ball contest). |
| **Phase 0.6** | **Driven Through-Balls & Camera Suite** | Driven ground through-balls (`W`) with forward leading space vector; delicate chipped long pass over defensive lines (`E + W`); swerving pass (`Q + W`); 3-mode broadcast camera suite (Pitch auto-framing, Ball lock, Player lock). |
| **Phase 1** | **Ball Out-of-Bounds & Set-Piece Attribution** | Robust previous-vs-current segment raycasting distinguishing touchline exits (throw-ins) from endline exits; strict last-touch attribution (attacking touch $\rightarrow$ goal kick; defending deflection/keeper save $\rightarrow$ corner kick). |
| **Phase 2** | **Passing, Shooting & Skill-Chip Delivery** | 4-button canonical control scheme (Short pass `S`, Lead pass `W`, Box cross `D`, Shot `A`); `E` chip modifier suite for scoop chip shots, floating crosses, and lofted passes. |
| **Phase 3** | **Lowered Set-Piece Camera & Aiming Engine** | Immersive pitch-level lowered camera perspective for free kicks and penalties; target aiming reticle with elevation & bend dials; timing-based shot power meter; defensive wall jump duels. |
| **Phase 4** | **Dynamic Team AI, Pressing & Off-Ball Runs** | 2-man pressing traps (Hunter + Trap Closer + Cover Shadow); intelligent teammate support triangles and blindside runs; offside line tracking; zero-allocation mobile AI loops. |
| **Phase 5** | **Canonical Player Stats Architecture** | 18 outfield stats across 6 pillars (Pace, Stamina, Strength; Ball Control, Retention, Dribbling; Short Pass, Long Pass, Crossing; Shooting, Heading, Long Shots; Tackling, Sliding, Interceptions, Marking; Positioning, Composure, Reactions) + 7 Goalkeeper metrics. |
| **Phase 6** | **Attribute Progression Tiers & Stat Breaks** | 4 canonical tiers (Amateur 40–69, Pro 70–84, Elite 85–94, Pinnacle 95–99) + Stat Break breakthrough traits (>99); duel resolution matrices for speed, dribbling vs. tackling, and aerial battles. |
| **Phase 7** | **Positional Hierarchy & Tactical Playstyles** | 3-tier hierarchy (Primary $\rightarrow$ Sub-Position $\rightarrow$ Playstyle); 16 distinct sub-positions; 28 specialized player playstyles (Poacher, Box-to-Box, Regista, Inverted Fullback, Libero, Sweeper GK, etc.). |
| **Phase 7.5** | **Controls & Ball State Machine Polish** | Progressive charge meter running alongside player cleats; dead-ball collision barriers; touch joystick calibration. |
| **Phase 8** | **Expressive Procedural Animations Suite** | Procedural animation state machine (dribbling cadence, body feints, driven laces strike, trivela, sliding toe poke, bullet header, diving volley, acrobatic GK saves). |
| **Phase 9** | **Scalable 3-Tier Graphics & Retro Filters** | Scalable pipeline (Performance, Balanced, High-End); Quad-Shadow floodlights; zero-lag hardware-accelerated CRT Arcade, VHS 1994, Neo-Geo 16-Bit, and Manga retro filters. |
| **Phase 9.5** | **AI Set-Piece Overhaul & Grounded Realism** | AI throw-in distribution; direct free kick tactical intelligence; subtle anti-magic ball shielding with zero forcefield graphics. |
| **Phase 10** | **Dynamic Stadiums & Match Atmosphere** | 3 stadium tiers (Monumental Grand Arena, Craven Heritage Ground, Ascenso Municipal); rendered city horizon; custom seat color modes; time-of-day lighting. |
| **Phase 11** | **Pitch Dimensions, Weather & Surface Physics** | IFAB pitch dimensions (Compact, Balanced, Expansive, Custom); turf puddles with ball hydroplaning; winter snow with red line markings and orange/yellow balls; Brazilian deep-box nets. |
| **Phase 12** | **Parametric Player Appearance Framework** | Zero-GC 120-byte player appearance contract (skin tones, hairstyles, facial hair, uniform fits, sleeve length, tattoos, physical body scaling 0.92–1.08). |
| **Phase 13** | **Multi-Tier Team Database & Selection Engine** | Drill-down team selection (Clubs, National, Special); randomizer roulette; 4 rating tiers (S, A, B, C); canonical set-piece role specialist assignments. |
| **Phase 13.5** | **Expanded Teams & All-Time Legends** | 2026 World Cup squads, historic South American clubs, Bogotá FC derby, and 7 All-Time Continental Dream Teams. |
| **Phase 14** | **Pre-Match Presentation & Modular Uniforms** | Split-screen presentation layout; 32-bit captain hero sprites; modular kit mixer (shirts, shorts, socks) with automatic anti-clash contrast engine. |
| **Phase 15** | **Dual-Pitch Tactical Game Plan Board** | Side-by-side tactical boards (desktop) and toggleable single pitch (mobile); OVR star ratings; live bench drag-and-drop substitutions; dedicated set-piece role picker. |
| **Phase 16** | **IFAB Linesman Offside Engine & VideoRef (VIR)** | Dual-touchline linesman with Law 6 animated flag signals; IFAB Law 11 2-player raycasting & active involvement; 32-bit CRT VideoRef cut-scene; verified by `phase16LinesmanAndVideoRef.test.ts`. |
| **Phase 16.5** | **Drop-Zone Grid & Overlap Disambiguation** | 3-tier mechanical pitch partition (ATT, MID, DEF, locked GK sanctuary); multi-role overlap popover (ST/SS, CM/CAM, CM/CDM, LM/LWB, CB/LIB); automatic reversion to 'Basic' playstyle on incompatible positions. |
| **Phase 17 (Archived)** | **Unified Pre-Match Hub & Atmosphere Suite** | 5-button bottom navigation bar (Uniform, Stadium, Tactics, Settings, Kick Off); 3 turf quality grades (Poor, Normal, Pristine); 7 lawn mowing designs; streamlined 3-button in-game pause hub. |
| **Phase 18** | **Mobile Optimization & GC Hardening** | Zero per-frame memory allocations; pre-allocated vector and particle pools; spatial collision partitioning; locked 60 FPS verified on budget smartphones. |

---

### Roadmap Archive: Dynamic Stadiums, Geometry & Master Architecture (Phases S1 – S5, ST1 – ST7 & B1 – B7)

| Phase | Title | Core Technical Accomplishments & Automated Vitest Verification |
| :---: | :--- | :--- |
| **Phase S1** | **Canonical Pitch Invariance, Stadium Scale & 4-Shape Infill** | Strict IFAB pitch coordinate invariance (105m×68m center); 4 canonical footprint profiles (Square, Rectangular, Round, Oval); apron clearance buffers; verified by `phaseS1_PitchInvarianceAndShapes.test.ts`. |
| **Phase S2** | **Grandstand Density, Stepped Tier Rows & Structural Walls** | Stepped riser geometry with 2/3/4 dense chair tiers; tier divider handrails; outer perimeter load-bearing brick/concrete walls; verified by `phaseS2_GrandstandDensityAndSubstance.test.ts`. |
| **Phase S3** | **Time-of-Day Illumination & Directional Roof Shadows** | Solar azimuth lighting engine (Noon overhead shadows, Golden Hour elongated 45° cast shadows, Night floodlight quad-cones); player sprite directional shadowing; verified by `phaseS3_TimeOfDayAndRoofShadows.test.ts`. |
| **Phase S4** | **32-Bit Fisheye Horizon Skyline Boundary & Spherical Diorama** | 360° circular fisheye panoramic horizon; 8 distinct surroundings; time-of-day sky rim blending; verified by `phaseS4_FisheyeHorizonAndDiorama.test.ts`. |
| **Phase S5** | **Stadium Creator WYSIWYG & Synchronization Suite** | 6-step interactive WYSIWYG creator modal; live 2D canvas inspector with 7 camera presets; verified by `phaseS5_StadiumCreatorWYSIWYG.test.ts`. |
| **Phase ST1** | **360° Grandstand Homogeneity & 32-Bit Pixel Art Texture** | Continuous circular/elliptical grandstand bowl geometry; elimination of disjointed gaps; retro dithered concrete textures; verified by `phaseST1_StandHomogeneity.test.ts`. |
| **Phase ST2** | **Independent 8-Stand Customizer & 45° Corner Miters** | 8 discrete cardinal and diagonal stands (North, East, South, West + 4 Corners); 45° miter-welded corner pavilions; asymmetric multi-tier configurations; verified by `phaseST2_Independent8StandsAndMiters.test.ts`. |
| **Phase ST3** | **Immediate Stadium Grounds & Forecourt Concourse Engine** | 9 immediate ground environments (Parking Lots, Commercial Mall, Classical Plaza, Municipal Street Grid, Dirt Potrero, Modern Architectural, Industrial Depot, Park & Rec, Club Museum); verified by `phaseST3_ImmediateGroundsAndConcourse.test.ts`. |
| **Phase ST4** | **Pitch-View Eaves, Sims-Style Cutaway & 4 Rect/Square Roofs** | 3-state Sims cutaway toggler (Hidden 0%, Eaves 50%, Full 100%); 4 Rectangular/Square roof architectures (Cantilever Box Truss, Barrel Vault Arch, Translucent Tensile, Gable Peak Truss); verified by `phaseST4_PitchViewRoofAndSimsCutaway.test.ts`. |
| **Phase ST5** | **Round & Oval Coliseum Roofs & Atlanta 360° Halo Board** | 4 curved/radial roof architectures (Spoke Tension Ring, Petal Ocular Dome, Continuous Elliptical Ring, Louvered Pergola); 360° continuous glowing LED halo jumbotron; verified by `phaseST5_RoundOvalContinuousRoofsAndHaloBoard.test.ts`. |
| **Phase ST6** | **High-Fidelity Aerial View & Horizon Synchronizer** | Macroscopic bird's-eye projection synchronizing 4 stadium shapes, roof styles vs open-bowl seating, and surrounding fisheye horizon; verified by `phaseST6_AerialViewAndHorizonSync.test.ts`. |
| **Phase ST7** | **Master ST Synchronization & Regression Suite** | Unified master regression testing suite validating full 8-stand independence, miter coordinate geometry, and zero-allocation performance; verified by `phaseST_StadiumMasterOverhaul.test.ts`. |
| **Phase B1** | **Vertical Spatial Hierarchy, Northern Aperture & Zoom Bar** | Correct layering (`bgTop < horizonBaseY < northConcourseTop < northOuterY < pitchTop`), dedicated continuous zoom slider (5% to 160%), aerial free cam; verified by `phaseB1VerticalHierarchyAndZoomBar.test.ts`. |
| **Phase B2** | **Grandstand Typology, "The Wall", No-Stand & Capacity** | "The Wall" (Dortmund single-tier continuous rake with crush barriers) vs multi-tier cantilever decks; 6 no-stand boundary types; 3 seat models; dynamic attendance empty seats; verified by `phaseB2_GrandstandTypologyAndAttendance.test.ts`. |
| **Phase B3** | **32-Bit Architectural Overhaul & Materials** | Pixel art concrete, brick, weathered stone, and structural steel trusses across all 4 shapes; continuous 360° ribbon boards; verified by `phaseB3_ArchitecturalOverhaul.test.ts`. |
| **Phase B4** | **Asymmetric Ground Directionality & Rich Flavor** | Independent North/South/East/West ground directionality; 9 ground typologies with nested ambient props (buses, food trucks, ticket booths, trees); verified by `phaseB4_AsymmetricGroundsAndFlavor.test.ts`. |
| **Phase B5** | **Surroundings Overhaul (Marine, Airport & Mountains)** | Deep ocean platforms (aircraft carrier, oil rig, hex pontoon), Gibraltar airport runway tarmac hugging stadium, Alpine mountain range with alpenglow; verified by `phaseB5_SurroundingsHorizonsOverhaul.test.ts`. |
| **Phase B6** | **Ultra-Wide Macroscopic Intro & 32-Bit UI Polish** | 5% to 100% smooth camera glide intro; 32-bit chiseled metallic console UI menus; zero-GC profiling; verified by `phaseB6_MacroscopicIntroAndArcadeUI.test.ts`. |
| **Phase B6.1** | **Northern Grounds Geometry, Elevated Skyline & Coliseum Homogeneity** | Semicircular concourse shelf for Round/Oval; skyline elevation strictly above grounds; corner stand omission on continuous bowls; verified by `phaseB6_1_SkylineAndRoundOvalGrounds.test.ts`. |
| **Phase B7** | **Master B-Series Synchronization & Vitest Suite** | Full master regression testing across all B-Series features with 580/580 passing tests; verified by `phaseB_MasterVisualSuite.test.ts`. |

---

# Active Development Roadmap: Dynamic Grounds Perspective, Forecourt Environments & Stadium Integration (D-Series)

### Engineering Mandate & Daily Token Allocation
- **1 Phase = 1 Day's Quota**: Each phase is strictly calibrated to one full day of Google AI Studio free tier token bandwidth (~700k–850k tokens).
- **Foundational Engine & Physics First**: Dynamic pitch boundaries and configuration routing are resolved in Phase D1 before modifying grounds geometry and perspectives.
- **Console-Grade Zero-Scroll UI**: Every editor, modal, and HUD strictly fits the active viewport with zero vertical or horizontal scrolling across all devices.
- **Budget Hardware Guarantee**: Pure procedural 2D Canvas rendering with pre-allocated vector and particle pools, ensuring a steady, locked 60 FPS on $50 mobile phones.
- **Zero Regression Principle**: Every phase delivers complete, compilable code with automated Vitest test coverage before advancing to the next.

---

## Phase D1: Dynamic Pitch Boundary Invariance & Stadium Creator / Team Editor Venue Architecture [PENDING]
*Priority: Unify Physical Out-of-Bounds with Visual Pitch Lines + Streamline Venue Configuration*  
*Daily Token Budget Profile: Scope: `src/game/pitchBoundary.ts`, `src/game/pitchDimensions.ts`, `src/game/ballPhysics.ts`, `src/game/engine.ts`, `src/game/setPieces.ts`, `src/components/StadiumCreatorModal.tsx`, `src/components/TeamEditorModal.tsx`, `src/types/stadium.ts` | Target: ~700k–800k tokens (Day 1 Quota)*

### D1.1 IFAB Dynamic Playable Boundary Invariance
- **The Core Physics Disconnect**:
  - Currently, when pitch turf dimensions are set to `compact` (100m × 64m) or `expansive` (110m × 72m), visual pitch white lines do not match physical out-of-bounds trigger coordinates.
  - On compact pitches, players can dribble past visible touchlines/endlines without triggering throw-ins or goal kicks; on expansive pitches, out-of-bounds is triggered before reaching the visible boundary lines.
- **Engine Solution**:
  - Dynamically synchronize `PITCH_CONFIG`, ball collision bounds, out-of-bounds ray-casting, linesman patrol boundaries, corner arc anchors, and penalty area geometry to the active match `turfDimensions`.
  - The painted lines on the pitch strictly define the exact physical playable area in all match scenarios.

### D1.2 Stadium Creator Step 1 Architecture Refactor
- Move `apron infill material` to the final/last position on Step 1 of `StadiumCreatorModal` (replacing its current 2nd/3rd placement).
- Remove the pitch turf dimension picker from the Stadium Creator (defaulting to standard 105m × 68m in stadium architecture).

### D1.3 Team Editor Home Venue Turf Dimension Configuration
- Move turf dimensions selection (`compact`, `standard`, `expansive`) into the Team Editor under the Home Venue configuration tab.
- Each club/national team now configures its bespoke home pitch dimensions (e.g., compact high-press potrero vs expansive continental stadium).

### D1.4 Stadium Creator Gateway Modal ("Edit Current" vs "Create New")
- Introduce a pre-creator selection gateway:
  - **"EDIT CURRENT STADIUM"**: Opens the creator pre-populated with the active stadium configuration, with a selector dropdown to choose and modify any registered stadium.
  - **"CREATE NEW STADIUM"**: Starts with a clean, default template from scratch.

---

## Phase D2: High-Oblique Grounds Geometry, Southern Concourse Expansion & Stand Facades [PENDING]
*Priority: Architectural Perspective Overhaul, Southern Grounds Expansion (+50%), Northern Downward Angle (-25%) & Bespoke No-Stand Typologies*  
*Daily Token Budget Profile: Scope: `src/game/environmentRenderer.ts`, `src/game/stadiumRenderer.ts`, `src/types/stadium.ts` | Target: ~750k–850k tokens (Day 2 Quota)*

### D2.1 Southern Grounds & Stand High-Oblique 2.5D Perspective (+50% Scale Expansion)
- Expand southern grounds footprint by **+50%** below the southern stand and respective corners (for rectangular/square grounds).
- Render southern grounds in a high-oblique 2.5D perspective (revealing both front vertical depth and top concourse surfaces half-and-half as the viewport descends southwards).
- Architectural detailing on southern grounds:
  - Grand stadium entrances, public security turnstile portals, ticket booth kiosks, wide pedestrian promenades, exterior staircases, fan plaza lamp posts, and banners.
- Southern stand exterior facade:
  - Detailed external structural buttresses, exterior brickwork/concrete cladding, gate numerals, and team entrance portals.
- Bespoke southern ground footprints across all 4 shapes:
  - Rectangular, Square, Round (semicircular bowl apron), and Oval (wide elliptical forecourt).

### D2.2 Northern Grounds & Stand Downward Perspective (-25% Scale Adjustment)
- Scale down northern grounds footprint by **-25%** to emphasize pitch proximity and provide clear sightlines to the northern aperture.
- Northern stands perspective:
  - Downward oblique angle showing intricate seating tier rows, concrete steps, yellow vomitories, crowd safety barriers, and railings across all tiered and wall-tier grandstands.
  - Unique northern perimeter curves for Round and Oval coliseums.

### D2.3 Complete Overhaul of All 6 No-Stand Perimeter Typologies
- Transform no-stand boundary types from simple flat walls into rich, bespoke architectural structures matching their designations:
  - `chainlink_fence`: Galvanized steel chain-link diamond mesh, top angled barbed-wire outriggers, tubular tension posts, spectator leaning handrail.
  - `turnstile_brick_wall`: Weathered Flemish bond red/brown brick masonry, cast-iron mechanical turnstile bars, barred ticket seller booths, arched wooden exit gates.
  - `concrete_wall`: Precast modular brutalist concrete slabs with expansion seams, recessed drainage weeping holes, industrial safety handrails.
  - `glass_balustrade`: Frameless laminated tempered safety glass panels, polished stainless steel floor spigots, top handrail caps, reflective glass sheen.
  - `potrero_berm`: Earthy natural grass and dirt embankment slope, wild weed patches, trampled dirt footpaths, rustic wooden barrier posts, field rocks.
  - `stone_seawall`: Dressed maritime granite blocks, mortar courses, wave-deflecting curved copestone, cast-iron mooring bollards, waterline moss.

---

## Phase D3: Surroundings-Synchronized Ground Forecourts (Carrier Flight Deck, Oil Rig, Floaters, Alpine, Airport) [PENDING]
*Priority: Deep Contextual Harmony Between Surroundings and Immediate Forecourts*  
*Daily Token Budget Profile: Scope: `src/game/environmentRenderer.ts`, `src/game/stadiumRenderer.ts`, `src/types/stadium.ts` | Target: ~750k–850k tokens (Day 3 Quota)*

### D3.1 Marine & Oceanic Forecourt Architecture
- Contextually transform the immediate stadium grounds to reflect oceanic surroundings:
  - **Aircraft Carrier (`carrier`)**: Grounds render as an authentic naval flight deck (dark non-skid deck surfacing, yellow catapult launch tracks, jet blast deflector trench, tie-down star deck grid, arresting gear wire housing, carrier island superstructure edge, safety perimeter netting over the ocean).
  - **Offshore Oil Rig (`oil_rig`)**: Heavy industrial platform forecourt (steel bar grating with ocean visible beneath, hazard yellow safety coamings, tubular steel caisson legs descending into ocean swells, illuminated helipad with 'H' marking, piping manifolds, survival capsule stations).
  - **Floating Hex Pontoons (`hex_pontoon`)**: Modular interlocking buoyant pontoon blocks, flexible rubber expansion seams, heavy marine mooring bollards, perimeter navigational buoys, water splash highlights.

### D3.2 Terrestrial Forecourts (Airport, Alpine, Urban)
- **Gibraltar Airport (`airport`)**: Concourse grounds integrate directly with runway tarmac, runway threshold piano keys, yellow taxiway centerlines, blast fence deflectors, perimeter tarmac lighting.
- **Alpine Valley (`alpine`)**: Terraced pine-timber concourse, crushed granite paths, alpine dry-stone retention walls, mountain stream drainage culverts.

### D3.3 Curvilinear Forecourt Envelopes for Round & Oval Stadiums
- Seamless radial and elliptical concourse shells for Round and Oval stadiums in all specialized environments, eliminating angular clipping artifacts.

---

## Phase D4: Circular Skyview Engine, Weather Atmospheric Filters & Clean Center Turf Reticle [PENDING]
*Priority: Macroscopic SkyCam Preview Fidelity, Atmospheric FX & Pitch Center Circle Polish*  
*Daily Token Budget Profile: Scope: `src/game/skyCamRenderer.ts`, `src/components/StadiumSelectorModal.tsx`, `src/components/StadiumCreatorModal.tsx` | Target: ~700k–800k tokens (Day 4 Quota)*

### D4.1 Circular Skyview Preview Window
- Convert the rectangular preview frame in `StadiumSelectorModal` and `StadiumCreatorModal` into an authentic circular porthole frame matching the 360° spherical fisheye projection geometry.

### D4.2 High-Fidelity Skyview Horizon & Mountain Chains
- Replace low-detail polygon mountains with continuous detailed Alpine mountain chains featuring snow-capped ridgelines, dithered crags, and warm alpenglow.
- Accurately project stand tiers, custom roofs, surroundings-synchronized forecourts, and perimeter walls in macroscopic skycam.

### D4.3 Dynamic Skycam Weather Atmospheric Overlays
- Layer dynamic weather particles and retro atmospheric filters directly over the macroscopic skycam view:
  - Rainfall streaks with wet specular stadium bowl sheen.
  - Swirling snow flurries with snow-dusted roof edges and perimeter aprons.
  - Morning/coastal fog banks softening the horizon rim.
  - Night floodlight bloom and lens flares.

### D4.4 Clean Pitch Center Circle Reticle
- Remove the awkward star artifact at the center of the pitch in skyview.
- Replace with an authentic high-resolution concentric grass mowing emblem and clean center spot markings.

---

## Phase D5: Cinematic Southern Entrance-to-Skyline Intro & Master D-Series Vitest Suite [PENDING]
*Priority: Stadium Presentation Cinematic Build-Up, Master Vitest Regression Suite & 60 FPS Profiling*  
*Daily Token Budget Profile: Scope: `src/game/camera.ts`, `src/game/engine.ts`, `src/components/PitchCanvas.tsx`, `src/game/__tests__/phaseD_MasterSuite.test.ts` | Target: ~700k–800k tokens (Day 5 Quota)*

### D5.1 Southern Concourse Pan-to-Skyline Cinematic Intro
- Dynamic 3-stage pre-match camera intro sequence celebrating the venue architecture:
  1. **Stage 1 (Southern Grounds)**: Low-altitude establishing camera positioned over the newly detailed Southern grounds, grand entrances, and fan concourse.
  2. **Stage 2 (Skyline Pan & Tilt)**: Smooth upward cinematic pan and tilt rising across the southern stand, skimming over the pitch, and looking up at the majestic northern skyline and distant horizon.
  3. **Stage 3 (Kickoff Descent)**: Dynamic swoop down to center circle ready for kickoff.
  4. Fully skippable on any keypress or touch tap.

### D5.2 Master D-Series Automated Vitest Regression Suite & Zero-GC Profiling
- Comprehensive unit and integration test coverage:
  - Dynamic pitch boundary invariance across all turf dimensions.
  - High-oblique ground scale and perspective calculations.
  - Surroundings-synchronized forecourt renderers (carrier, oil rig, hex pontoon, airport).
  - Circular skyview framing and weather filter application.
  - Stadium Creator gateway routing and Team Editor pitch dimension persistence.
- Zero-allocation memory profiling maintaining locked 60 FPS performance on budget devices.

---

## Preserved Future Roadmap

### Phase 17: Lightweight Cinematics Suite & Slow-Mo Replay Buffer [PENDING]
*Priority: Presentation Polish Without Performance Cost*  
*Daily Token Budget Profile: Scope: circular frame buffer, simple cut-scene triggers | Target: ~700k tokens*

#### 17.1 Zero-Allocation Replay Ring Buffer
- 300-frame circular buffer of essential state (player positions, ball, camera).
- Automatic slow-mo on goals, penalties, red cards, tight offsides.
- Instant any-key skip.

#### 17.2 Entrance Walkout Cinematic Hook
- Integrates the dugout bench camera and entrance tunnel camera hooks established in earlier phases for an authentic player walkout sequence.

---

## Master Development Execution Order (D-Series & Pending Roadmap)

| Phase | Title | Primary Focus | Daily Budget Status |
| :---: | :--- | :--- | :--- |
| **D1** | **Dynamic Pitch Boundaries & Venue Architecture** | Dynamic Out-of-Bounds Invariance, Creator Step 1 & Team Editor Dimensions | **Pending (Day 1)** |
| **D2** | **High-Oblique Grounds Geometry & Stand Facades** | Southern Expansion (+50%), Northern Angle (-25%), 6 Bespoke No-Stand Types | **Pending (Day 2)** |
| **D3** | **Surroundings-Synchronized Ground Forecourts** | Carrier Flight Deck, Oil Rig, Hex Pontoons, Airport Tarmac & Coliseum Envelopes | **Pending (Day 3)** |
| **D4** | **Circular Skyview Engine & Weather Filters** | Circular Preview, Detailed Mountain Chains, Clean Center Turf & Skycam FX | **Pending (Day 4)** |
| **D5** | **Cinematic Southern-to-Skyline Intro & Test Suite** | 3-Stage Venue Intro Pan, Master Vitest Regression Suite & 60 FPS Profiling | **Pending (Day 5)** |
| **17** | **Lightweight Cinematics Suite & Slow-Mo Replay Buffer** | Replay Ring Buffer, Slow-Mo Highlights & Walkout Hook | **Pending** |

---

**Token Discipline Reminder**  
1 Phase = strictly 1 Day's worth of Google AI Studio tokens (~700k–850k tokens). Every phase terminates in a fully compiled, zero-regression build. Zero-scroll console UI invariant across all viewports. Zero per-frame memory allocation for sustained 60 FPS on budget devices.
