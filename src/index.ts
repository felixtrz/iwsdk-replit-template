import {
  AssetManifest,
  AssetType,
  Mesh,
  MeshBasicMaterial,
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
  Interactable,
  PanelUI,
  PlaybackMode,
  ScreenSpace,
} from "@iwsdk/core";

import { EnvironmentType, LocomotionEnvironment } from "@iwsdk/core";

import { PanelSystem } from "./panel.js";

import { Robot } from "./robot.js";

import { RobotSystem } from "./robot.js";

const assets: AssetManifest = {
  chimeSound: {
    url: "./audio/chime.mp3",
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

  world
    .createTransformEntity(plantMesh)
    .addComponent(Interactable)
    .addComponent(DistanceGrabbable, {
      movementMode: MovementMode.MoveFromTarget,
    });

  const { scene: robotMesh } = AssetManager.getGLTF("robot")!;
  // defaults for AR
  robotMesh.position.set(-1.2, 0.4, -1.8);
  robotMesh.scale.setScalar(1);

  robotMesh.position.set(-1.2, 0.95, -1.8);
  robotMesh.scale.setScalar(0.5);

  world
    .createTransformEntity(robotMesh)
    .addComponent(Interactable)
    .addComponent(Robot)
    .addComponent(AudioSource, {
      src: "./audio/chime.mp3",
      maxInstances: 3,
      playbackMode: PlaybackMode.FadeRestart,
    });

  const panelEntity = world
    .createTransformEntity()
    .addComponent(PanelUI, {
      config: "./ui/welcome.json",
      maxHeight: 0.8,
      maxWidth: 1.6,
    })
    .addComponent(Interactable)
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

  world.registerSystem(PanelSystem).registerSystem(RobotSystem);
});
