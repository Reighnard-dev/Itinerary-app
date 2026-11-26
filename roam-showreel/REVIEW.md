# Roam Showreel — Review & Production Notes

## Built Storyline & Creative Choices

**Selected Option A — "An Entire World, Organized"** (`25.0 s`, `1920×1080`, `30 fps`, 750 frames).

- **Form & rhythm**: Object-to-object morph chain + scenic parallax world shift across eight cuts (`s1` through `s8`), modeled on crisp cream parchment editorial typography (`#FAF5EA`), Charcoal contrast flips (`#141311`), and Sunshine Yellow (`#F5CF43`) focal accents using Roam's real `Manrope` and `DM Sans` fonts and SVG logo (`assets/images/roam-icon.svg`).
- **Real product showcase**: All Roam UI captures (`screen-discover-cards.jpg`, `screen-planner.jpg`, `screen-map.jpg`), 48 destination & atmosphere images, and UI components are sourced directly from the Roam codebase (`c:\Users\MM\Desktop\Projects\Itinerary App`). NASA's Public Domain Blue Marble texture (`assets/images/earth-equirectangular.jpg`) drives the 3D spinning globe in `s1`, and Roam's bundled `atmo-mountain.jpg` anchors the golden-hour parallax world shift in `s6`.

### Unbuilt Storylines (from `STORYLINES.md`)
- **Option B — "Is It Possible?"**: High-contrast charcoal/parchment typography showreel driven by a morphing pill (`"47 open tabs"` → `"1 trip."`) and rapid cut-on-the-beat punch-ins across `Suggest Day 1` and drag-to-reorder flows.
- **Option C — "The Scenic Route"**: Continuous gliding camera flight along Roam's dashed golden explorer trail over topographic `#FAF5EA` contours and sage ridges (`#ACC1A7`), opening waypoint pins directly into app screens and travel postcards.

## Verification Summary (What Was Checked & What Was Not Heard)

- **Structural, layout, contrast, craft, and timing audit**:
  - `hyperframes check --json` passed with `0` errors and `0` warnings across all modules (`lint`, `runtime`, `layout`, `motion`, `contrast` `11/11`, `craft` `200/200`, `audio`).
- **Visual inspection**:
  - Verified full 16-beat review sheets (`review-beats.jpg`, `review-phone.jpg`) and all 7 cut seams (`review-seam-01.jpg` through `review-seam-07.jpg`), plus dedicated dense seam captures for S5→S6 (`17.35–17.95s` map-pin iris) and S7→S8 (`22.35–22.95s` yellow dot flood).
  - Extracted and visually inspected a 4×4 decoded contact sheet from the final rendered `out/roam-showreel.mp4` via FFmpeg (`final_render_sheet.jpg`).
- **Render & audio measurements (measured via tools, NOT listened to by ear)**:
  - `ffprobe` on `out/roam-showreel.mp4`: `h264` `1920×1080` at `30/1` fps + `aac` `48000` Hz stereo, duration `25.000000` s, size `19,312,287` bytes (`18.4` MB), bitrate `6,179,931` bps.
  - `hyperframes audio out/roam-showreel.mp4 --json`: `lufsIntegrated: -12.8` LUFS, `lufsShortTermMax: -11.4` LUFS, `samplePeakDb: -1.1` dB, `truePeakDb: -1.1` dBTP, `clipping.count: 0`, `warnings: []`, `onset: 0.148s`, `peak: 7.63s`, `tailEnd: 24.774s`, trailing silence only at `24.79–25.0s`.
  - Audio mix balance, pronunciation cadence, and ducking transitions were **not heard by ear** — they were verified through waveform onset alignment (`peakAt`), FFmpeg `silencedetect`, `loudnorm`, `hyperframes check`, and `hyperframes audio` signal metrics.

## Audio & Asset Sourcing

- **Female voiceover (`vo-1.wav` – `vo-7.wav`)**: Generated with `msedge-tts` (`en-US-AvaNeural`, rate `+8%`, silence-trimmed and loudnormed to `-16 LUFS / -1.5 dBTP` in `scripts/generate-vo.mjs`) because no `ELEVENLABS_API_KEY` was configured. Run `ELEVENLABS_API_KEY=... node scripts/swap-elevenlabs-vo.mjs` in `roam-showreel/` to regenerate and re-normalize `vo-1..vo-7.wav` with ElevenLabs.
- **Background music (`assets/audio/bgm.mp3`)**: `"Little, happy tune - 22.10.2015"` by `cabled_mess` (CC0 Public Domain via Openverse / Freesound, 120 BPM beat grid), normalized to `-16 LUFS / -1.5 dBTP` and dynamically ducked under voiceover segments via `data-automation` in `index.html`.
- **Sound effects (`assets/audio/sfx/`)**: 13 HyperFrames bundled SFX placed on non-overlapping Tracks 4 and 5, synced to visual motion peaks and hard cuts.

## Weakest Shot & Potential Refinement

- **Scene 3 → Scene 4 seam (`12.3s`, `s3-discover-showcase` → `s4-photo-mosaic`)**: Hard-cuts from the depth-of-field Kyoto Place Cards onto the pale center tile card of `s4` right before the 16 destination photos radiate outward. Starting the outer photo ring slightly earlier (`t=0`) or matching scale directly from the center Fushimi Inari card would tighten visual momentum across that cut.
