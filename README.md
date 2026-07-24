# IWSDK Starter Template (Replit)

A ready-to-run WebXR starter template using the [Immersive Web SDK](https://developers.meta.com/horizon/documentation/web/webxr-iwsdk-overview) (IWSDK) v0.3.2, pre-configured for the Replit environment.

## What's Included

- **VR desk scene** with a robot, plant, and environment — all grabbable and interactive
- **Spatial UI panel** built with UIKitML
- **ECS architecture** with example components (`Robot`) and systems (`RobotSystem`, `PanelSystem`)
- **XR emulation** via a headless Playwright browser with SwiftShader (no GPU required)
- **AI dev tools** (MCP) for scene inspection, ECS debugging, and XR emulation from the terminal

## Getting Started

1. **Fork this Repl** — dependencies install automatically, and the postinstall script patches the IWSDK dev plugin for the headless environment.
2. **Run the workflow** — click "Run" or use `npm run dev:runtime`. The Vite dev server starts on port 5000.
3. **Warm up the reference system** (optional, one-time):
   ```bash
   npx iwsdk reference warmup
   ```
4. **Start building** — edit files in `src/`, add UI in `ui/`, and drop 3D models in `public/gltf/`.

## Project Structure

```
src/
  index.ts        Entry point — world setup, assets, entity creation
  robot.ts        Robot component + system (ECS example)
  panel.ts        Panel system for spatial UI interaction
ui/
  welcome.uikitml UIKitML markup (compiled to public/ui/welcome.json)
public/
  gltf/           3D models (GLTF)
  audio/          Sound effects
  textures/       Image assets
scripts/
  patch-iwsdk.js  Postinstall patches for headless environments
```

## Useful Commands

```bash
# Scene & ECS debugging (requires dev server running)
npx iwsdk scene hierarchy
npx iwsdk ecs find --input-json '{"components":["Robot"]}'
npx iwsdk ecs pause
npx iwsdk ecs resume

# XR emulation
npx iwsdk xr enter
npx iwsdk xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.6,"z":-2}}'
npx iwsdk xr select --input-json '{"device":"controller-right"}'

# Reference system (after warmup)
npx iwsdk reference search --input-json '{"query":"grabbable object","limit":5}'
npx iwsdk reference api --input-json '{"name":"World.create"}'
```

## Notes

- The preview pane shows a white screen — this is expected since WebXR/Three.js needs a GPU for 3D rendering. The headless managed browser handles the runtime.
- All Three.js classes should be imported from `@iwsdk/core`, not from `three` directly.
- The `scripts/patch-iwsdk.js` postinstall script applies two patches:
  1. **SwiftShader** — switches the headless browser from hardware GL to CPU-based rendering
  2. **Reference validation** — bypasses an archive integrity check that fails due to platform differences in tar/zlib
