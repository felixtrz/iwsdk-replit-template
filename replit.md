# IWSDK Starter Template

## Overview
WebXR starter template using IWSDK v0.4.2 with an ECS architecture on Three.js, targeting Meta Quest 3 and similar headsets. Pre-configured for the Replit headless environment.

## Tech Stack
- **Framework**: @iwsdk/core with elics ECS
- **Rendering**: Three.js (aliased as super-three)
- **Language**: TypeScript
- **Build Tool**: Vite (port 5000)
- **Package Manager**: npm
- **UI System**: UIKitML (.uikitml -> JSON)
- **XR Emulation**: IWER via Playwright + SwiftShader

## Project Structure
- `src/` - Application logic (index.ts entry, components, systems)
- `ui/` - UIKitML markup files
- `public/` - Static assets (3D models, audio, textures, compiled UI)

## Deployment (GitHub Pages)
- GitHub Actions workflow at `.github/workflows/deploy.yml`
- Triggers on push to `main` or manual dispatch
- Builds with `npm ci` + `npm run build`, deploys `dist/` to GitHub Pages
- Base path auto-set via `VITE_BASE_PATH` env var (reads repo name from GitHub context)
- To use a custom domain, set `VITE_BASE_PATH=/` instead

## Replit Environment Setup
- **Port 5000**, host `0.0.0.0`, `allowedHosts: true` for Replit proxy
- **mkcert removed** — Replit proxy handles HTTPS
- **SwiftShader** — headless Chromium uses CPU rendering (no GPU needed)
- **GPU auto-detection** — managed Playwright browser supports `IWSDK_GPU=auto|gpu|swiftshader`; no manual SwiftShader patching needed

## System Dependencies (Nix)
Playwright Chromium needs: glib, nss, nspr, dbus, at-spi2-core, cups, libdrm, mesa, libgbm, xorg.libX11, xorg.libxcb, xorg.libXcomposite, xorg.libXdamage, xorg.libXext, xorg.libXfixes, xorg.libXrandr, libxkbcommon, pango, cairo, alsa-lib, expat, udev

## Three.js Imports
Always import from `@iwsdk/core`, never from `three`:
```typescript
import { Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from "@iwsdk/core";
```

## Scaffolding New Projects
```bash
npx @iwsdk/create@latest my-app --yes --mode vr
```
Key flags: `--mode vr|ar`, `--no-xr` (browser-only 3D), `--physics`, `--locomotion`, `--grabbing`, `--scene-understanding`, `--environment-raycast`.

## Reference System
Run `npx iwsdk reference warmup` once after first install.
```bash
npx iwsdk reference search --input-json '{"query":"grabbable object","limit":5}'
npx iwsdk reference api --input-json '{"name":"World.create"}'
npx iwsdk reference examples --input-json '{"api_name":"DistanceGrabbable"}'
npx iwsdk reference components --input-json '{}'
npx iwsdk reference systems --input-json '{}'
```

## Runtime Debugging (dev server must be running)

### Scene & ECS
```bash
npx iwsdk scene hierarchy
npx iwsdk scene transform --input-json '{"uuid":"<uuid>"}'
npx iwsdk ecs find --input-json '{"components":["DistanceGrabbable"]}'
npx iwsdk ecs query --input-json '{"entityIndex":3}'
npx iwsdk ecs set-component --input-json '{"entityIndex":3,"componentId":"Transform","field":"position","value":[2,1,-1.8]}'
npx iwsdk ecs pause
npx iwsdk ecs step --input-json '{"frames":1}'
npx iwsdk ecs resume
npx iwsdk ecs snapshot --input-json '{"label":"snap1"}'
npx iwsdk ecs diff --input-json '{"from":"snap1","to":"snap2"}'
```

### XR Emulation
Valid devices: `"headset"`, `"controller-right"`, `"controller-left"`, `"hand-right"`, `"hand-left"`

```bash
npx iwsdk xr enter
npx iwsdk xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.6,"z":-2}}'
npx iwsdk xr look-at --input-json '{"device":"headset","target":{"x":0,"y":0.9,"z":0}}'
npx iwsdk xr animate-to --input-json '{"device":"headset","position":{"x":0,"y":1.5,"z":0},"duration":0.5}'
npx iwsdk xr select --input-json '{"device":"controller-right"}'
```

`set-device-state` uses nested JSON (different from other commands):
```bash
npx iwsdk xr set-device-state --input-json '{"controllers":{"right":{"position":{"x":0.2,"y":1.1,"z":0.3}}}}'
```

### Recovery
If XR commands time out or errors flood the terminal:
1. `npx iwsdk browser reload`
2. If that times out, restart the dev server
3. `npx iwsdk xr enter`
