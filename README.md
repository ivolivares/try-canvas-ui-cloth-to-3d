# Vice VI · 3D Cloth Gallery

An interactive, neon-lit 3D bathroom virtual gallery built with **Next.js 15**, **Three.js**, **Chrome's `html-in-canvas` API**, **Canvas UI's `<Cloth>` component by David Haz**, and procedural **Web Audio API** sound synthesis.

Users can grab, drag, and brush a physically simulated shower curtain printed with high-resolution GTA VI–inspired character key art (`VC-01` through `VC-05 · David Haz`), trigger reactive Vice City HUD glitches, hear spatial fabric swishing and neon tube humming, inspect 4K character textures up close, and switch seamlessly between the **3D Room** and the native **Canvas UI `<Cloth>`** stage.

> **Built by [Iván Olivares R.](https://x.com/ivolivares)** · **Powered by & inspired by [Canvas UI `<Cloth>`](https://canvasui.dev/docs/components/cloth) by [David Haz](https://github.com/DavidHDev/canvas-ui)**

---

## Highlights

- **Dual-Stage Architecture (`3D Room` ↔ `Canvas UI`)**
  - **3D Room (`components/BathroomScene.tsx`):** Full PBR Three.js neon bathroom with glossy wet floor tiles, recessed tiled shower alcove, sculpted ceramic bathtub, chrome rainfall showerhead, vanity + framed mirror, rising humid steam particles, vertical magenta/cyan neon tubes, and a real-time Verlet cloth shower curtain with bathtub & side-jamb collision constraints.
  - **Live `html-in-canvas` → Three.js Bridge (`lib/htmlInCanvasBridge.ts`):** On **Chrome 157+** (or with `chrome://flags/#canvas-draw-element`), live React HTML/CSS (`components/CurtainDomContent.tsx`) is painted via `drawElementImage` / `requestPaint` / `onpaint` into a synchronized snapshot canvas and bound directly to Three.js as a `THREE.CanvasTexture`. On browsers without `html-in-canvas`, an honest compatibility banner explains how to enable it while a high-resolution Canvas 2D fallback keeps the 3D scene fully interactive.
  - **Direct Canvas UI Stage (`components/CanvasUiClothStage.tsx`):** Mounts David Haz's official React `<Cloth>` component (`components/Cloth.tsx`) directly over live GTA VI HTML curtain markup.
- **5 High-Resolution Character Textures (`VC-01` – `VC-05`)**
  - `VC-01` Lucia Caminos · `VC-02` Jason Duval · `VC-03` Valerie Vance · `VC-04` Mateo Solis · `VC-05` **David Haz (Creator Edition)**
- **Interactive Vice City HUD & Glitch System (`components/ViceHud.tsx`)**
  - Touching, brushing, or dragging the curtain triggers chromatic scanline glitches, a Vice City `"VI · Powered by Canvas UI"` lockup animation, wanted-star pulses, and live UV telemetry.
- **4K Texture Inspector (`components/TextureInspectorModal.tsx`)**
  - Inspect every character artwork with pan/zoom, RGB / Normal-map / Luminance / Weave channel views, and PBR material readouts.
- **Procedural Web Audio Engine (`lib/audioEngine.ts`)**
  - Zero external audio files — synthesizes velocity-sensitive filtered white-noise **fabric swishing** with stereo panning, continuous **60Hz / 120Hz / 180Hz neon tube hum** that crackles during touch glitches, grab transients, and steam gust whooshes.

---

## How We Built It (Tech Stack & Techniques)

| Layer | Technology / Technique |
| --- | --- |
| **Framework** | Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS v4 |
| **3D Graphics** | Three.js (`WebGLRenderer`, ACES Filmic tone mapping, PMREM `RoomEnvironment`, procedural PBR tile albedo/bump/roughness maps, `OrbitControls`) |
| **Live DOM-on-GPU** | Chrome 157 `html-in-canvas` (`layoutsubtree` / `content="drawable"`, `ctx.drawElementImage`, `canvas.requestPaint`, `canvas.onpaint`) + David Haz's official React `<Cloth>` (`components/Cloth.tsx`) |
| **Cloth Physics** | Custom Verlet integration solver (`lib/clothPhysics.ts`) with structural/shear/bend springs, pin presets (`top`, `corners`, `left`, `none`), mid-air `floatMode` folding, and solid bathtub AABB + alcove side-jamb collision projection |
| **Audio** | Native Web Audio API (`AudioContext`, bandpass-filtered noise buffer for cloth rustle, multi-harmonic oscillator bank for neon ballast hum, `StereoPannerNode`) |
| **UI & Motion** | `motion/react` transitions, `lucide-react` icons, `Oswald` / `Inter` / `Yellowtail` typography |
| **Testing & QA** | Native `node:test` + `tsx` unit tests (14 deterministic tests covering physics, collisions, audio telemetry, and `html-in-canvas` detection), ESLint, TypeScript strict build, and headless Playwright visual verification |

For the complete engineering & design blueprint of how every subsystem was specified and iterated, see **[`SPEC.md`](./SPEC.md)**.

---

## Browser Support (`html-in-canvas`)

The live DOM-to-GPU pipeline relies on Chrome's experimental **`html-in-canvas`** API:

- **Full Native `html-in-canvas` Mode:** Chrome **157+** on desktop, or Chrome Canary/Dev with `chrome://flags/#canvas-draw-element` enabled.
- **Other Browsers (Chrome < 157, Firefox, Safari, Android):** Detected automatically at runtime via `detectHtmlInCanvasSupport()`. An informational banner explains the Chrome 157+ requirement, **3D Room** automatically runs the interactive Three.js Canvas 2D curtain pipeline, and **Canvas UI** runs `<Cloth>`'s native HTML fallback.

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** (or pnpm / bun)

### Installation & Local Development

```bash
git clone <your-repo-url>
cd vice-vi-cloth-gallery
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server on port 3000 |
| `npm run build` | Run TypeScript type-checking and create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint across the repository |
| `npm test` | Run all 14 deterministic unit tests (`clothPhysics`, `audioEngine`, `htmlInCanvasBridge`) |

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `1` – `5` | Switch character curtain (`VC-01` through `VC-05 David Haz`) |
| `G` | Trigger a neon steam wind gust across the curtain |
| `R` | Reset cloth geometry to its resting drape |
| `I` | Open / close the 4K Texture Inspector modal |
| `M` | Mute / unmute procedural fabric & neon audio |
| `H` | Collapse / expand the bottom control dock |

---

## Project Structure

```text
app/
  layout.tsx                  # Root layout, Google Fonts (Oswald, Inter, Yellowtail), metadata
  page.tsx                    # Main gallery page wiring 3D Room, Canvas UI stage, HUD & shortcuts
  globals.css                 # Tailwind v4 global styles & font theme variables
components/
  BathroomScene.tsx           # Three.js 3D neon bathroom + live html-in-canvas THREE.CanvasTexture bridge
  CanvasUiClothStage.tsx      # Direct stage mounting David Haz's official <Cloth> component
  Cloth.tsx                   # Official Canvas UI React/WebGL <Cloth> component (© 2026 David Haz)
  CurtainDomContent.tsx       # Live HTML/CSS shower curtain DOM painted by html-in-canvas
  ControlDock.tsx             # Collapsible bottom gallery dock, lighting/camera/physics tuning & footer badge
  HtmlInCanvasNotice.tsx      # Runtime Chrome 157+ html-in-canvas compatibility notice
  TextureInspectorModal.tsx   # 4K pan/zoom texture inspector with channel views & PBR specs
  ViceHud.tsx                 # Reactive GTA VI Vice City HUD overlay
lib/
  clothPhysics.ts             # Pure Verlet cloth simulation + bathtub/jamb collision constraints
  audioEngine.ts              # Pure Web Audio telemetry math + procedural fabric/neon synthesizer
  htmlInCanvasBridge.ts       # Pure capability evaluator + Chrome 157 html-in-canvas paint helpers
  bathroomTextures.ts         # Procedural tile albedo/bump/roughness & Canvas 2D fallback renderer
  galleryData.ts              # VC-01..VC-05 character assets, lighting moods & camera presets
  *.test.ts                   # Deterministic node:test unit tests
public/
  textures/                   # High-resolution character portraits (vice_lucia..vice_david.jpg)
```

---

## Credits & Attribution

- **Project Author:** [Iván Olivares R.](https://x.com/ivolivares)
- **Canvas UI & `<Cloth>` Component:** [David Haz](https://x.com/davidhaz) — [github.com/DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui) · [canvasui.dev/docs/components/cloth](https://canvasui.dev/docs/components/cloth)

---

## License

- **Original Application Code:** Licensed under the **[MIT License](./LICENSE)** (Copyright © 2026 Iván Olivares R.).
- **Vendored Canvas UI Component (`components/Cloth.tsx`):** Remains licensed under **David Haz's [MIT + Commons Clause License Condition v1.0](./THIRD_PARTY_NOTICES.md)** (Copyright © 2026 David Haz). You may use, modify, and publish it as part of an application, website, or product while preserving its copyright and permission notices, and you may not sell, sublicense, or redistribute the Canvas UI component itself standalone or in a component bundle.

See [`LICENSE`](./LICENSE) and [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for complete legal details, and [`CONTRIBUTING.md`](./CONTRIBUTING.md) if you would like to contribute.
