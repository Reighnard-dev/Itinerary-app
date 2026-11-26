GOAL:    Viewer finishes feeling Roam transforms scattered travel research into a joyful, organized day-by-day adventure — crisp, modern, and distinctly Roam.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    25.0 s x 30 fps = 750 frames | BGM: "Little, happy tune - 22.10.2015" by cabled_mess (CC0 Public Domain, Openverse/Freesound, 120 BPM = 15 frames/beat) | VO: Female neural en-US-AvaNeural (+8%, -16 LUFS) with scripts/swap-elevenlabs-vo.mjs helper

LOOK:    grounds: Warm Parchment #FAF5EA (primary editorial studio), Golden Wash #F8F1DE (mosaic), Deep Roam Charcoal #1A1D18 (planner contrast flip), Pure Editorial White #FFFFFF (Beat 3 staccato), Roam Sunshine Yellow #F5CF43 (final brand flood).
         ink: #262923 on light/yellow fields; #FAF5EA on charcoal; secondary #5E6254 (passes >= 4.5:1).
         accent: Roam Sunshine Yellow #F5CF43 & Gold #B88B0A/#DAB128 rationed for the compass badge, focal words, active pills, route pins, and final brand flood.
         display face: Manrope ExtraBold (weight 800, 96-148 px, tracking -0.04em, leading 0.96).
         ui/body face: DM Sans Medium/Bold (weight 500-700, 28-44 px, tracking -0.015em, leading 1.25).
         medium: Real Roam UI screenshots (2x retina captures) + real destination photographs (Wikimedia CC) + tactile SVG/Canvas props (3D shaded NASA Blue Marble globe, topographic elevation contours from TravelBackground.tsx, golden hero swoop, passport stamp) + Roam's golden-hour misty mountain panorama (`assets/images/places/atmo-mountain.jpg`).
         light & depth: Soft studio contact shadow 0 24px 60px rgba(26,29,24,0.16), frosted parchment blur 18px on scenic widgets (rgba(250,245,234,0.88)), subtle 4% SVG topo contours on editorial canvases.

OBJECTS:
         - Real Roam `R` rounded-squircle app icon (`assets/images/roam-icon.svg`, #F5CD3C fill, #262923 stroke)
         - Real Roam header lockup: #F5CF43 circular Compass badge + `roam.` wordmark with #DAB128 period
         - 3D Canvas spinning Earth globe textured from `assets/images/earth-equirectangular.jpg` (NASA Blue Marble) with limb shading, specular sunlight, and ground shadow
         - Large agency cursor SVG (58px tall, #262923 fill, crisp white stroke, soft drop shadow)
         - 1:1 Roam Search Bar (1.8x video scale: Choose your destination Japan / Pick your city Kyoto / Set your stay 5 days / Find my adventure CTA)
         - Real Roam Discover, Interactive Map, and Day-by-Day Planner 2x screenshots (`screen-discover-cards.png`, `screen-map.png`, `screen-planner.png`)
         - 1:1 Roam Kyoto Place Cards (`Fushimi Inari Shrine`, `Arashiyama Bamboo Grove`, `Otagi Nenbutsu-ji`) with real Wikimedia photos
         - 16-photo real Wikimedia travel mosaic + Roam golden `hero-swoop` curve
         - Roam golden-hour misty mountain panorama (`assets/images/places/atmo-mountain.jpg`) + frosted floating widgets + `"TAKE THE SCENIC ROUTE"` stamp

MOTION:  enter: expo.out / power4.out (0.30-0.55 s) with horizontal/blur arrival (8-12px -> 0)
         move: power2.inOut (0.35-0.60 s)
         exit: power3.in (0.18-0.30 s, 40-50% shorter than entrance)
         spring (UI pops, globe, cards): elastic.out(1, 0.72) / back.out(1.4) (damping ~0.72-0.80, never cartoonish)
         stagger: 60-90 ms words, 40-60 ms tiles/cards
         rule: Landed reading titles hold dead still while read. Real UI moves fast, payoff moves calmly.

SHOTS:   (Exact split timestamps synced to measured VO lines + 120 BPM CC0 beat grid)
         S1 [0.00s - 5.50s | f0-f165]    s1-hook-globe: Rich Frame 0 "The world is everywhere." whip + gold bar -> "So why does planning still feel like chaos?" + scattered tab pills -> "One place for the world." + Canvas 3D NASA Blue Marble Earth -> centers & morphs into #F5CF43 sun sphere.
         S2 [5.50s - 9.20s | f165-f276]  s2-brand-morph: Centered #F5CF43 sun blooms with Compass + `roam.` sliding out -> cursor arcs in & clicks compass -> morphs into 1:1 Roam Search Bar (Japan / Kyoto / 5 days / Find my adventure) -> cursor clicks CTA -> zooms through into Scene 3.
         S3 [9.20s - 12.30s | f276-f369] s3-discover-showcase: Real Roam Discover screen (`screen-discover-cards.jpg`) lands -> recedes as 3 real Kyoto Place Cards pop forward in Ref-3 depth-of-field parallax -> cursor clicks `+ Add to trip` -> snaps to `✓ Added` + `Day 1 · 3 stops` pill pops -> whips out.
         S4 [12.30s - 14.80s | f369-f444] s4-photo-mosaic: 16 real Wikimedia destination photos explode outward into 2-ring mosaic around open center -> `See your whole adventure.` lands crisply + golden `hero-swoop` draws underneath -> exits cleanly.
         S5 [14.80s - 17.80s | f444-f534] s5-planner-map: Hard cut to Deep Charcoal #1A1D18 -> Real Day-by-Day Planner (`screen-planner.jpg`) glides in -> Interactive Route Map card (`screen-map.jpg` + Transit/Drive/Walk pills + animated dashed golden route + pulsing pins) -> dark toast `Share link copied!` -> iris opens from golden pin.
         S6 [17.80s - 20.20s | f534-f606] s6-scenic-parallax: Full-bleed `atmo-mountain.jpg` slow 35mm dolly -> multi-plane 3D parallax entry of centered Roam `R` icon (`roam-icon.svg`) + 3 frosted parchment Roam trip widgets (`DAY 01 · KYOTO`, `250 Countries / 34,240 cities`, `JR Nara Line · 12 min`).
         S7 [20.20s - 22.65s | f606-f680] s7-staccato-trio: Staccato contrast cuts synced to `vo-7` pauses: #FAF5EA `Discover it.` -> #1A1D18 `Plan it.` -> #FFFFFF `Roam it.` whose #F5CF43 period expands scale 1->135 to flood frame.
         S8 [22.65s - 25.00s | f680-f750] s8-endcard: Full-bleed #F5CF43 ground + topo contours -> Roam `R` icon springs center & slides left as `roam.` wipes beside it -> `A little less ordinary.` + `"TAKE THE SCENIC ROUTE"` stamp -> >= 2.05 s hold.

BANNED:  - black/dark void with tiny floating UI; neon glow, bloom, lens flares, glowing orbs, decorative particles;
         - purple/blue/mesh gradients; cream serif + monospace "01/02" corner HUD template look;
         - everything fading & sliding up identically; moving titles while read; docked corner watermark logo;
         - three identical cards in a flat row; invented fake UI controls not present in Roam.

QA:      - Frame 0 (0.0s): Must be visually rich (not blank/black), readable headline + topo contours.
         - 4.8s - 6.2s: Canvas 3D Earth -> #F5CF43 sphere -> Compass `roam.` bloom -> Search Bar morph continuity.
         - 9.6s - 11.4s: Real Discover screenshot crispness + 3 Kyoto Place Cards depth-of-field + click->Added state.
         - 13.0s: 16-photo mosaic (0 broken images) + `See your whole adventure.` + golden swoop legibility at 1080p & 360px phone.
         - 16.0s: Charcoal contrast world + Real Planner screenshot + Route Map + Toast contrast.
         - 18.8s: Scenic Kyoto vista + floating frosted cards contrast & alignment.
         - 21.0s & 24.0s: Staccato trio & clean #F5CF43 endcard hold.
