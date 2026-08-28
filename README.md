# IWSDK Starter Template (Replit)

A ready-to-run WebXR starter template using the [Immersive Web SDK](https://developers.meta.com/horizon/documentation/web/webxr-iwsdk-overview) (IWSDK), pre-configured for the Replit environment.

This is the **remix build** for the Meta-device WebXR path. The skill version of
the same material lives at `skills/hz-iwsdk-webxr/` in this workspace — remix
this repo when you want a working scene in one click, use the skill when your
agent is building from scratch.

## What's Included

- **VR desk scene** with a robot, plant, and environment — all grabbable and interactive
- **The four interaction building blocks** (see below), wired up and commented
- **Spatial UI panels** built with UIKitML, including a live controller-input HUD
- **ECS architecture** with example components (`Robot`, `DemoCube`, `BackgroundMusic`) and systems
- **XR emulation** via a headless Playwright browser with SwiftShader (no GPU required)
- **AI dev tools** (MCP + CLI) for scene inspection, ECS debugging, and XR emulation from the terminal

## Interaction Building Blocks

Every WebXR scene should ship all four of these. They are the things that get
silently dropped when a scene is rewritten, and their absence is what makes an
app feel broken in a headset. The header comment in `src/index.ts` maps each one
to the code that implements it.

| Block | Where it lives | What it does |
| ----- | -------------- | ------------ |
| **Controller ray / pointer** | `src/ray.ts` | Forces both controller rays permanently visible and highlights whatever they hover or press. IWSDK's default only shows the ray on intersection, which reads as "no pointer". |
| **Full controller input mapping** | `src/input.ts` | A handler for trigger, grip, thumbstick and A/B/X/Y, plus a HUD panel mirroring live input state. |
| **Background music + spatial audio** | `src/music.ts`, `public/audio/` | A looping non-positional soundtrack, plus positional chime SFX on the robot and cube. |
| **Grabbable objects** | `src/index.ts` | The cube is `OneHandGrabbable` (grip up close), the plant is `DistanceGrabbable` (pull it in with the ray). |

If you remix this template, keep all four unless you're explicitly asked to drop
one. `replit.md` tells your coding agent the same thing.

## Getting Started

1. **Fork / remix this Repl** — dependencies install automatically.
2. **Run the workflow** — click "Run" or use `npm run dev:runtime`. The Vite dev server starts on port 5000.
3. **Warm up the reference system** (optional, one-time):
   ```bash
   npx iwsdk reference warmup
   ```
4. **Start building** — edit files in `src/`, add UI in `ui/`, and drop 3D models in `public/gltf/`.

## Step 4 — Run it on a real Meta device

The preview pane is not the deliverable. WebXR needs a headset, and a headset
needs a **public HTTPS URL**. There are two ways to get there.

### Deploy, then open the URL in the Quest browser

1. Deploy the app. On Replit, use **Deploy** — `.replit` is already configured
   for a static deployment (`npm run build` → serve `dist/`). Any static host
   works too; a GitHub Pages workflow ships in `.github/workflows/deploy.yml`.
2. Note the public URL, e.g. `https://your-app.replit.app`.
3. Put the headset on, open the **Meta Quest Browser**, and enter that URL.
   Typing on the controller keyboard is slow — instead, send the link to
   yourself and open it from a message, or use the browser's phone-pairing.
4. Tap **Enter XR** on the welcome panel. You should immediately see two
   controller rays, hear the ambient loop, and be able to grab the cube.

WebXR requires a secure context, so the URL must be HTTPS. Replit deployments
and GitHub Pages both are; a raw `http://<LAN-IP>:5000` will not enter XR.

### Iterate against a laptop-tethered headset

Deploying on every edit is too slow for a build loop. For live iteration, keep
the dev server running on the laptop and point the headset at it over USB:

```bash
npm run dev:runtime                  # Vite on :5000
adb reverse tcp:5000 tcp:5000        # headset :5000 -> laptop :5000
```

With `adb reverse` in place, `http://localhost:5000` in the Quest browser is a
secure context (browsers treat `localhost` as trusted), so XR works and Vite's
hot reload repaints the headset as you save. The headset must be in developer
mode with USB debugging on; `npx -y metavr device list` or `adb devices`
confirms it is visible.

Deploy for sharing and for the final demo; tether for the edit loop.

### Iterate with no headset at all

The headless XR emulator lets an agent drive the scene from the terminal — enter
a session, move the headset and controllers, and click things:

```bash
npx iwsdk dev up
npx iwsdk xr enter
npx iwsdk xr select --input-json '{"device":"controller-right"}'
npx iwsdk scene hierarchy
```

## Project Structure

```
src/
  index.ts        Entry point — world setup, assets, entity creation
  ray.ts          Controller ray visibility + hover/press feedback
  input.ts        Full controller input mapping + HUD mirroring
  music.ts        Background music component + session handling
  robot.ts        Robot component + system (ECS example)
  panel.ts        Panel system for spatial UI interaction
ui/
  welcome.uikitml   UIKitML markup (compiled to public/ui/welcome.json)
  input-hud.uikitml Live controller-input HUD
public/
  gltf/           3D models (GLTF)
  audio/          chime.mp3 (SFX) + ambient-loop.wav (music)
  textures/       Image assets
scripts/
  make-ambient-loop.py  Regenerates the ambient soundtrack
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
- `public/audio/ambient-loop.wav` is synthesised by `scripts/make-ambient-loop.py`, so the template ships with no licensed audio. Swap in your own track and update the `ambientMusic` entry in `src/index.ts`.
