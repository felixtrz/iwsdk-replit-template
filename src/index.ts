/**
 * ============================================================================
 * INTERACTION BUILDING BLOCKS — keep all four when you remix this template
 * ============================================================================
 *
 * A WebXR app that is missing any of these feels broken in a headset. The
 * reference scene below wires up every one; if you replace the scene, carry the
 * blocks over. Full rationale and recipes live in the `hz-iwsdk-webxr` skill at
 * `skills/hz-iwsdk-webxr/references/building-blocks.md`.
 *
 *  1. CONTROLLER RAY / POINTER — `ControllerRaySystem` (src/ray.ts) forces both
 *     controller rays permanently visible and adds hover/press highlighting on
 *     every `RayInteractable`.
 *
 *  2. FULL CONTROLLER INPUT MAPPING — `ControllerInputSystem` (src/input.ts)
 *     handles trigger, grip, thumbstick and A/B/X/Y, and mirrors live state onto
 *     the input HUD panel.
 *
 *  3. BACKGROUND MUSIC + SPATIAL AUDIO — `BackgroundMusicSystem` (src/music.ts)
 *     loops `public/audio/ambient-loop.wav` non-positionally, while the robot
 *     and the cube play positional chime SFX on interaction.
 *
 *  4. GRABBABLE OBJECTS — the cube uses `OneHandGrabbable` (grab it directly),
 *     the plant uses `DistanceGrabbable` (pull it in with the ray).
 *
 * Only drop a block if the user explicitly asks you to.
 * ============================================================================
 */

import {
  AssetManifest,
  AssetType,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SessionMode,
  SRGBColorSpace,
  AssetManager,
  World,
} from "@iwsdk/core";

import {
  AudioSource,
  DistanceGrabbable,
  MovementMode,
  OneHandGrabbable,
  PanelUI,
  PlaybackMode,
  RayInteractable,
  ScreenSpace,
} from "@iwsdk/core";

import { EnvironmentType, LocomotionEnvironment } from "@iwsdk/core";

import { PanelSystem } from "./panel.js";

import { Robot } from "./robot.js";

import { RobotSystem } from "./robot.js";

import { ControllerInputSystem, CUBE_COLORS, DemoCube } from "./input.js";

import { BackgroundMusic, BackgroundMusicSystem } from "./music.js";

import { ControllerRaySystem } from "./ray.js";

const assets: AssetManifest = {
  chimeSound: {
    url: "./audio/chime.mp3",
    type: AssetType.Audio,
    priority: "background",
  },
  ambientMusic: {
    url: "./audio/ambient-loop.wav",
    type: AssetType.Audio,
    priority: "background",
  },
  webxr: {
    url: "./textures/webxr.png",
    type: AssetType.Texture,
    priority: "critical",
  },
  environmentDesk: {
    url: "./gltf/environmentDesk/environmentDesk.gltf",
    type: AssetType.GLTF,
    priority: "critical",
  },
  plantSansevieria: {
    url: "./gltf/plantSansevieria/plantSansevieria.gltf",
    type: AssetType.GLTF,
    priority: "critical",
  },
  robot: {
    url: "./gltf/robot/robot.gltf",
    type: AssetType.GLTF,
    priority: "critical",
  },
};

World.create(document.getElementById("scene-container") as HTMLDivElement, {
  assets,
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    // Optional structured features; layers/local-floor are offered by default
    features: { handTracking: true, layers: true },
  },
  features: {
    locomotion: { useWorker: true },
    grabbing: true,
    physics: false,
    sceneUnderstanding: false,
    environmentRaycast: false,
  },
}).then((world) => {
  const { camera } = world;

  camera.position.set(-4, 1.5, -6);
  camera.rotateY(-Math.PI * 0.75);

  const { scene: envMesh } = AssetManager.getGLTF("environmentDesk")!;
  envMesh.rotateY(Math.PI);
  envMesh.position.set(0, -0.1, 0);
  world
    .createTransformEntity(envMesh)
    .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

  const { scene: plantMesh } = AssetManager.getGLTF("plantSansevieria")!;

  plantMesh.position.set(1.2, 0.85, -1.8);

  // BUILDING BLOCK 4a — grab at a distance by pointing the ray and holding the trigger.
  world
    .createTransformEntity(plantMesh)
    .addComponent(RayInteractable)
    .addComponent(DistanceGrabbable, {
      movementMode: MovementMode.MoveFromTarget,
    });

  const { scene: robotMesh } = AssetManager.getGLTF("robot")!;
  // defaults for AR
  robotMesh.position.set(-1.2, 0.4, -1.8);
  robotMesh.scale.setScalar(1);

  robotMesh.position.set(-1.2, 0.95, -1.8);
  robotMesh.scale.setScalar(0.5);

  // BUILDING BLOCK 3a — positional SFX: the robot chimes when the ray clicks it.
  world
    .createTransformEntity(robotMesh)
    .addComponent(RayInteractable)
    .addComponent(Robot)
    .addComponent(AudioSource, {
      src: "./audio/chime.mp3",
      maxInstances: 3,
      playbackMode: PlaybackMode.FadeRestart,
    });

  // BUILDING BLOCK 4b — grab directly with the grip button when your hand is close.
  const cubeMesh = new Mesh(
    new BoxGeometry(0.2, 0.2, 0.2),
    new MeshStandardMaterial({ color: CUBE_COLORS[0] }),
  );
  cubeMesh.position.set(0, 1.0, -1.7);
  world
    .createTransformEntity(cubeMesh)
    .addComponent(RayInteractable)
    .addComponent(OneHandGrabbable, {})
    .addComponent(DemoCube)
    .addComponent(AudioSource, {
      src: "./audio/chime.mp3",
      maxInstances: 2,
      playbackMode: PlaybackMode.FadeRestart,
    });

  // BUILDING BLOCK 3b — background music: non-positional, looping, plays from
  // the listener so it stays at a constant level wherever the player walks.
  world.createTransformEntity().addComponent(BackgroundMusic).addComponent(AudioSource, {
    src: "./audio/ambient-loop.wav",
    positional: false,
    loop: true,
    autoplay: true,
    volume: 0.35,
  });

  const panelEntity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: "./ui/welcome.json",
      maxHeight: 0.8,
      maxWidth: 1.6,
    })
    .addComponent(RayInteractable)
    .addComponent(ScreenSpace, {
      top: "20px",
      left: "20px",
      height: "40%",
    });
  panelEntity.object3D!.position.set(0, 1.29, -1.9);

  const webxrLogoTexture = AssetManager.getTexture("webxr")!;
  webxrLogoTexture.colorSpace = SRGBColorSpace;
  const logoBanner = new Mesh(
    new PlaneGeometry(3.39, 0.96),
    new MeshBasicMaterial({
      map: webxrLogoTexture,
      transparent: true,
    }),
  );
  world.createTransformEntity(logoBanner);
  logoBanner.position.set(0, 1, 1.8);
  logoBanner.rotateY(Math.PI);

  const hudPanelEntity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: "./ui/input-hud.json",
      maxHeight: 0.6,
      maxWidth: 1.4,
    })
    .addComponent(RayInteractable)
    .addComponent(ScreenSpace, {
      top: "20px",
      right: "20px",
      height: "30%",
    });
  hudPanelEntity.object3D!.position.set(1.7, 1.1, -1.9);

  world
    .registerSystem(PanelSystem)
    .registerSystem(RobotSystem)
    .registerSystem(ControllerRaySystem)
    .registerSystem(BackgroundMusicSystem)
    .registerSystem(ControllerInputSystem);
});
