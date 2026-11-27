# Technical & Product Specification — Vice VI · 3D Cloth Gallery

This document records the complete product specification, architectural decisions,
visual/audio design constraints, physics math, browser compatibility contracts,
and iterative refinements used to build **Vice VI · 3D Cloth Gallery**.

---

## 1. Product Vision & Scope

Create an interactive virtual gallery set inside a dim, neon-lit Vice City
bathroom where users inspect high-resolution GTA VI–inspired character key art
rendered onto a physically simulated shower curtain. The application bridges
**Three.js** with **Canvas UI's `<Cloth>` component** and Chrome's experimental
**`html-in-canvas`** API so real live HTML/CSS markup can act as a reactive cloth
surface, while degrading gracefully in standard browsers.

### Core User Requirements
1. **3D Neon Bathroom Environment:** Reflective tiled walls and wet floor,
   sculpted bathtub/shower alcove, chrome curtain rod and rings, rainfall
   showerhead, vanity with framed mirror, rising steam particles, and dim
   magenta/cyan neon tube lighting.
2. **Interactive Shower Curtain (`html-in-canvas` + Three.js + Canvas UI `<Cloth>`):**
   - Responds to mouse hover brushing, click-and-drag grabbing, wind gusts,
     mid-air fold locking (`floatMode`), and configurable pin anchors.
   - Displays a simulated **GTA VI** sunset-gradient `VI` lockup paired with
     Vice City cursive **"Powered by Canvas UI"** typography that triggers
     glitch scanlines and classic GTA HUD telemetry on touch.
   - Offers both a **3D Room** stage (live `html-in-canvas` DOM piped into a
     Three.js PBR cloth mesh) and a direct **Canvas UI** stage mounting David
     Haz's official React `<Cloth>` component (`components/Cloth.tsx`).
   - Displays a clear, dismissible browser compatibility notice when
     `html-in-canvas` (Chrome 157+ / `#canvas-draw-element`) is unavailable.
3. **Character Texture Gallery (`VC-01` – `VC-05`):**
   - Five 3:4 high-resolution GTA VI–styled character portraits:
     - `VC-01` Lucia Caminos (`vice_lucia.jpg`)
     - `VC-02` Jason Duval (`vice_jason.jpg`)
     - `VC-03` Valerie Vance (`vice_valerie.jpg`)
     - `VC-04` Mateo Solis (`vice_mateo.jpg`)
     - `VC-05` David Haz — Creator Edition (`vice_david.jpg`, styled from
       David Haz's portrait in matching Vice City twilight aesthetics)
   - Dedicated **4K Texture Inspector** modal with zoom/pan, RGB / Normal /
     Luminance / Weave inspection views, and PBR material specifications.
4. **Procedural Web Audio Feedback:** Subtle, reactive **fabric swishing** and
   **neon tube humming** driven by real-time pointer/cloth velocity via the Web
   Audio API (no external audio assets).
5. **Attribution & Open Source:** Visible footer-right attribution badge
   crediting Iván Olivares R. and David Haz / Canvas UI, full MIT licensing for
   original app code, and preserved MIT + Commons Clause v1.0 notice for
   `components/Cloth.tsx`.

---

## 2. Visual, Spatial & Aesthetic Specification

### Color System (Vice City Twilight Palette)
| Token | Hex | Role |
| --- | --- | --- |
| Deep Midnight Base | `#090612` / `#0b0718` | Room fog, HUD panels, dark grout |
| Hot Vice Magenta | `#ff4fd8` / `#ff28ae` | Left neon alcove tube, active borders, script logo |
| Electric Tropical Cyan | `#2ee7ff` / `#0ce5ff` | Right neon alcove tube, telemetry accents, HUD bars |
| Sunset Amber | `#ffca6b` / `#ff9d3b` | `VI` sunset gradient top, wanted stars, notice accents |
| Chrome Specular | `#e6edf7` | Shower rod, curtain rings, fixtures, faucet |

### Typography
- **Display / HUD Headings:** `Oswald` (`--font-display`, uppercase tracked)
- **Vice City Script Overlay:** `Yellowtail` (`--font-vice`, rotated cursive `"Powered by Canvas UI"`)
- **Body / Controls / Telemetry:** `Inter` (`--font-sans`) + monospace tabular numerals (`tabular-nums`)

### Layout & Viewport Discipline
- Full-viewport 3D canvas (`100vw × 100vh`) with unobstructed center stage for
  the shower alcove and curtain.
- **Top-Left:** App title lockup (`GTA VI CLOTH GALLERY`) + left-wall
  `HtmlInCanvasNotice` card (`top-[84px]` / `top-[92px]`, never overlapping the
  chrome curtain rod).
- **Top-Right:** Classic GTA HUD (wanted stars, bounty readout, active character
  file chip, reactive glitch intensity meter).
- **Bottom-Center:** Single-row desktop collapsible `ControlDock` (5 character
  thumbnails + `Canvas UI`/`3D Room` toggle, `Inspect 4K`, `Gust`, `Fold`,
  `Reset`, `Mute`, `Scene` drawer, `Hide`).
- **Bottom-Right:** Persistent attribution badge.
- **No `backdrop-blur` over WebGL:** All overlays use crisp high-contrast
  opaque/semi-opaque backgrounds (`bg-[#0b0718]/92`) to keep WebGL frame pacing
  smooth and avoid compositor blur artifacts.

---

## 3. Dual-Stage Rendering Architecture

### Stage A — `3D Room` (`components/BathroomScene.tsx`)
1. **3D Bathroom Architecture (World Units in Meters):**
   - Room bounds: `5.4m (W) × 3.55m (H) × 6.2m (D)`.
   - Shower alcove framed by dark marble side jambs at `x = ±1.32m` (`width 0.32m`,
     inner clear span `±1.16m`) and an overhead lintel beam at `y = 3.38m`.
   - Sculpted bathtub recessed behind the curtain hanging plane at `z = -0.52m`
     (front ceramic lip at `z = -0.43m`, top surface at `y = 0.52m`).
   - Chrome shower rod mounted at `y = 2.86m, z = -0.26m` with 13 individual
     torus rings aligned to the top grommets.
   - Left floating walnut/marble vanity, vessel sink, framed mirror, and neon
     tubes at `x = -2.06m`; right heated chrome towel rail at `x = +2.34m`.
   - Lighting: `PMREMGenerator` + `RoomEnvironment` IBL, hemisphere fill, shadow-casting
     directional key light, dual magenta/cyan alcove point lights, vanity accent,
     and shower backlight with 3 switchable moods (`vice-dusk`, `neon-midnight`,
     `steam-glow`) and 4 smoothly damped camera presets (`hero`, `wide`, `mirror`,
     `macro`).
2. **Live `html-in-canvas` → Three.js Texture Pipeline:**
   - Mounts `<canvas ref={htmlSourceCanvasRef} layoutsubtree="true">` **in-viewport**
     at `(0, 0)` (`512px × 682px`, `zIndex: 0`), cleanly occluded behind the
     Three.js WebGL `<div ref={mountRef} className="relative z-10 bg-[#0b0816]" />`.
     Keeping the source canvas in-viewport (never `opacity: 0` or `top: -9999px`)
     ensures Chrome 157's Blink paint lifecycle reliably triggers `onpaint`.
   - `prepareHtmlInCanvasSource()` supports both newer `content="drawable"` and
     original `layoutsubtree` attribute variants.
   - Inside `htmlSource.onpaint`:
     1. Calls `sourceCtx.reset()` and `paintHtmlInCanvasElement(htmlSource, htmlContent)`
        (`ctx.drawElementImage(content, 0, 0)` + `updateElementGeometry`).
     2. Synchronously blits `htmlSource` into a persistent `htmlSnapshotCanvas`
        (`texW × texH`) and calls `sourceCtx.reset()` (matching Canvas UI's
        `capture()` pattern so Three.js uploads complete pixel buffers).
     3. Samples center pixels (`alpha > 0`) to verify real DOM pixels were
        painted before upgrading `clothMat.map` and `clothMat.emissiveMap` from
        the guaranteed initial `curtainTexture` (Canvas 2D) to
        `htmlInCanvasTexture`.
   - Repaints automatically via `requestHtmlInCanvasPaint()` on portrait
     `img.onLoad`, `document.fonts.ready`, character switch, and glitch toggle.

### Stage B — Direct `Canvas UI` (`components/CanvasUiClothStage.tsx` + `components/Cloth.tsx`)
- Renders David Haz's verbatim React/WebGL `<Cloth>` component directly over
  `<CurtainDomContent />` inside a neon-lit tiled alcove frame with synced
  `pin`, `wind`, `stiffness`, `float`, and `drag` props, plus Web Audio swish/hum
  and GTA HUD telemetry.
- On Chrome 157+, `<Cloth>` executes its native WebGL shader directly over live
  DOM; on unsupported browsers, `<Cloth>` cleanly displays its built-in live
  HTML fallback.

---

## 4. Cloth Physics & Collision Specification (`lib/clothPhysics.ts`)

- **Solver:** Pure TypeScript Verlet particle-spring grid (`30 × 36` on GPU;
  `22 × 28` on software WebGL), decoupled from Three.js for deterministic
  Node unit testing.
- **Constraints:** Structural (horizontal/vertical), diagonal shear, and
  2-hop bend constraints solved over multiple relaxation iterations per frame,
  scaled by configurable `stiffness` (`0.35` – `1.0`).
- **Pin Modes:** `'top'` (all 13 grommets), `'corners'`, `'left'`, `'none'`.
- **Float / Fold Mode (`floatMode`):** Disables gravity and dampens velocity so
  user-sculpted pleats and folds hold cleanly in mid-air.
- **Solid Architecture Collision Constraints (Added to eliminate tub/wall clipping):**
  - **Bathtub AABB (`tubCollider`):** Converts the tub lip bounds (`y <= 0.56`,
    `z ∈ [-0.65, -0.39]`) into cloth-local coordinates. Any node entering the
    solid tub volume is projected along the minimum-penetration axis (front lip
    or top rim) with slight tangential friction so the curtain drapes naturally
    in front of or over the rim without ever slicing through the ceramic apron.
  - **Alcove Side Jambs (`jambHalfWidth = 1.09m`):** Clamps horizontal excursion
    when `z <= jambFrontZ` so wind gusts or aggressive drags never push fabric
    through the marble alcove walls.
- **Glitch Energy:** Pointer speed, grabs, character switches, and wind gusts
  inject scalar `glitchEnergy ∈ [0, 1.2]` and touch UV coordinates `(u, v)`
  which decay exponentially and drive both shader/canvas chromatic slices and
  HUD telemetry.

---

## 5. Procedural Web Audio Specification (`lib/audioEngine.ts`)

- **Pure Telemetry Mapper (`computeAudioParams`):** Maps `{ pointerSpeed, isHovering, isDragging, glitchEnergy, touchU, displacement, muted }` into finite, clamped DSP targets:
  - `swishGain`, `swishFreq` (420 Hz – 2600 Hz bandpass sweep), `swishQ`, `pan` (`[-0.75, +0.75]` stereo position tracking horizontal curtain touch `touchU`).
  - `neonHumGain` (subtle ambient bathroom floor when idle, ramping with glitch energy), `neonBuzzGain` (higher harmonic electrical crackle on touch/glitch).
- **Audio Graph (`ViceAudioEngine`):**
  - Lazily unlocks `AudioContext` on the first user gesture (`pointerdown` / `keydown`).
  - **Fabric Swish Branch:** Looping 2-second white-noise `AudioBufferSourceNode` → `BiquadFilterNode` (`bandpass`) → `GainNode` → `StereoPannerNode`.
  - **Neon Hum Branch:** Multi-oscillator ballast bank (`60 Hz` sine + `120 Hz` triangle + `180 Hz` sawtooth through low-pass filter) → `GainNode`.
  - **One-Shot Cues:** `triggerGrabCue(touchU)` (short tactile cloth snap) and `triggerGustWhoosh()` (swept wind burst).

---

## 6. Browser Compatibility Contract (`lib/htmlInCanvasBridge.ts`)

Matches Canvas UI's runtime detection contract:
```ts
supported = !isAndroid && typeof ctx.drawElementImage === 'function' && typeof canvas.requestPaint === 'function'
```
- Pure `evaluateHtmlInCanvasSupport()` returns one of four explicit reasons:
  `'supported' | 'ssr' | 'android-fallback' | 'api-unavailable'`.
- `app/page.tsx` subscribes via React's `useSyncExternalStore` (SSR-safe,
  hydration-clean) and renders `components/HtmlInCanvasNotice.tsx` explaining
  how to enable Chrome 157+ / `chrome://flags/#canvas-draw-element` when
  unavailable.

---

## 7. Performance & Software-WebGL Engineering

- **Zero WebGL Teardown on UI Changes:** `BathroomScene.tsx` mounts the Three.js
  renderer once (`useEffect(..., [])`) and syncs all React props through refs
  and targeted lightweight effects.
- **Software-WebGL Detection & Pacing:** Detects SwiftShader / llvmpipe via
  `WEBGL_debug_renderer_info` and adapts pixel ratio (`1x`), shadow maps, mesh
  subdivisions (`22×28`), steam particle count (`36`), `preserveDrawingBuffer: true`,
  and WebGL2 `fenceSync` (`afterDraw`) frame pacing so headless browsers and
  low-GPU environments never stall.
- **Memory Discipline:** Disposes all geometries, materials, textures, PMREM
  targets, `OrbitControls`, `ViceAudioEngine`, DOM listeners, and `onpaint`
  handlers on unmount.

---

## 8. Verification & Quality Gates

1. **Automated Unit Tests (`npm test` — 14 passing tests):**
   - `lib/clothPhysics.test.ts` (6 tests): Initialization, pin stability, wind
     sway, drag/glitch energy, `floatMode` + reset, finite unit normals, and
     bathtub/jamb collision non-penetration under gust & drag.
   - `lib/audioEngine.test.ts` (4 tests): Mute silence, idle neon hum floor,
     brush/drag swish/filter/pan/buzz ramping, and NaN/extreme clamping.
   - `lib/htmlInCanvasBridge.test.ts` (4 tests): Chrome 157 desktop support,
     Android fallback, unavailable API fallback, and SSR safety.
2. **Static Verification:** `npm run lint` (ESLint — 0 errors, 0 warnings) and
   `npm run build` (TypeScript strict + Next.js production compile).
3. **Browser Verification (Playwright Headless Chromium at `1440×900`):**
   - Confirmed clean 3D bathroom rendering, zero bathtub/curtain clipping,
     single-row bottom dock with all 5 characters (`VC-01` – `VC-05`),
     unobstructed shower rod & compatibility banner, interactive `<Cloth>` stage
     glitch feedback, and zero browser console errors.

---

## 9. Iterative Engineering Changelog

1. **v0.1 — Initial 3D Bathroom & Curtain Gallery:** Built Three.js PBR neon
   bathroom, 4 GTA VI–inspired portraits (`VC-01`–`VC-04`), Verlet cloth
   simulation, reactive Vice HUD, 4K Texture Inspector, and collapsible dock.
2. **v0.2 — Tub & Jamb Collision Fix:** Recessed bathtub behind rod plane and
   added solid AABB `tubCollider` + `jambHalfWidth` constraints to eliminate
   bottom curtain clipping through the tub apron.
3. **v0.3 — Procedural Web Audio Engine:** Added real-time Web Audio API fabric
   swishing and neon tube humming with stereo panning, mute control, and unit
   tests.
4. **v0.4 — Official Canvas UI `<Cloth>` & Chrome 157 `html-in-canvas` Bridge:**
   Vendored David Haz's official React `<Cloth>` component (`components/Cloth.tsx`),
   added live `html-in-canvas` → `THREE.CanvasTexture` bridge, added the
   `Canvas UI` ↔ `3D Room` stage toggle, and added `HtmlInCanvasNotice`.
5. **v0.5 — Chrome 157 `onpaint` Reliability Fix & `VC-05 David Haz`:** Moved
   the `<canvas layoutsubtree="true">` source in-viewport behind WebGL, added
   persistent snapshot blitting + non-blank pixel verification + `img.onLoad`
   repaints, renamed the stage button to `"Canvas UI"`, and added `VC-05 · David Haz`.
6. **v1.0 — Open-Source Release Packaging:** Added MIT `LICENSE`, verbatim
   `THIRD_PARTY_NOTICES.md` (`MIT + Commons Clause v1.0` for `components/Cloth.tsx`),
   `README.md`, `SPEC.md`, `CONTRIBUTING.md`, and `CODE_OF_CONDUCT.md`.
