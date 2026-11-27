# Contributing to Vice VI · 3D Cloth Gallery

Thank you for your interest in contributing! This project explores interactive
3D web graphics combining **Three.js**, **Chrome's `html-in-canvas` API**,
**Canvas UI's `<Cloth>` component**, and **procedural Web Audio synthesis**.

## Code of Conduct

All contributors and maintainers agree to follow our
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting Started

1. **Fork & Clone**
   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   cd <repo-name>
   npm install
   ```
2. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
   To test live `html-in-canvas` DOM painting natively, use **Chrome 157+** or
   enable `chrome://flags/#canvas-draw-element` in Chrome Canary/Dev.
3. **Create a Feature Branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Quality Checks (Required Before Opening a PR)

Run all three verification gates locally:

```bash
# 1. Unit tests (cloth physics, bathtub/jamb collisions, Web Audio math, html-in-canvas detection)
npm test

# 2. ESLint validation (must pass with 0 errors and 0 warnings)
npm run lint

# 3. Production Next.js + TypeScript build
npm run build
```

## Architecture & Coding Guidelines

- **Keep pure simulation/math decoupled from React & WebGL:** Physics
  (`lib/clothPhysics.ts`), audio mapping (`lib/audioEngine.ts`), and browser
  capability probing (`lib/htmlInCanvasBridge.ts`) should remain testable in
  Node via `node:test` with zero browser globals required for core math.
- **No WebGL teardown on UI state changes:** Sync React props into refs inside
  `components/BathroomScene.tsx` so changing characters, lighting moods, camera
  presets, or physics sliders never recreates the WebGLRenderer.
- **Avoid `backdrop-blur` over full-viewport WebGL:** Use crisp solid/semi-opaque
  surfaces so frame pacing stays smooth on both hardware GPUs and software WebGL.
- **Icons:** Import icons exclusively from `lucide-react`.
- **Graceful browser fallbacks:** Any new `html-in-canvas` enhancement must keep
  standard browsers (Firefox, Safari, Chrome < 157, Android) fully functional.

## Important License Note on `components/Cloth.tsx`

`components/Cloth.tsx` is vendored from **Canvas UI** by David Haz
([github.com/DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui)) under
the **MIT + Commons Clause License Condition v1.0** (see
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)).

- Do **not** remove or alter David Haz's copyright/license header in
  `components/Cloth.tsx` or the attribution links in the app and documentation.
- Upstream improvements to `<Cloth>` itself should be submitted directly to
  [DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui).

## Submitting a Pull Request

1. Keep pull requests focused on a single feature, bug fix, or improvement.
2. Include before/after screenshots (or a short recording) for visual or 3D
   scene changes.
3. Confirm `npm test`, `npm run lint`, and `npm run build` all pass cleanly.
4. Clearly describe what changed, why it was needed, and how it was tested.
