import {
  AudioUtils,
  createComponent,
  createSystem,
  Entity,
  eq,
  Grabbed,
  InputComponent,
  Mesh,
  MeshStandardMaterial,
  PanelDocument,
  PanelUI,
  StatefulGamepad,
  UIKit,
  UIKitDocument,
  Vector3,
} from "@iwsdk/core";

import { BackgroundMusic } from "./music.js";

/** Tag for the directly grabbable demo cube that face buttons manipulate. */
export const DemoCube = createComponent("DemoCube", {});

/** Color palette cycled by the X button. Index 0 is the cube's initial color. */
export const CUBE_COLORS = [0x3b82f6, 0x22c55e, 0xef4444, 0xeab308, 0xa855f7];

const SCALE_STEP = 1.15;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const HUD_INTERVAL = 0.1; // seconds between HUD refreshes
const STICK_DEADZONE = 0.15;
const SPIN_RATE = 3.0; // radians/sec at full thumbstick deflection

/**
 * BUILDING BLOCK — full controller input mapping.
 *
 * Reads both XR controller gamepads every frame and gives every input on the
 * Touch controller a visible or audible handler:
 *
 * | Input                | Handler                                       |
 * | -------------------- | --------------------------------------------- |
 * | A (right)            | scale the cube up                             |
 * | B (right)            | scale the cube down                           |
 * | X (left)             | cycle the cube's colour                       |
 * | Y (left)             | reset colour, scale, position and spin        |
 * | Trigger (either)     | play the chime SFX on the cube                |
 * | Grip / squeeze (left)| toggle the background music                   |
 * | Thumbstick (right)   | spin the cube on its Y axis                   |
 * | Thumbstick click     | stop the spin                                 |
 *
 * Note that IWSDK also consumes some of these: the trigger drives ray select
 * and distance-grab, grip drives proximity grab, and the locomotion feature
 * reads the thumbsticks (left glides, right snap-turns). The handlers here
 * layer on top rather than replacing that.
 *
 * The HUD panel mirrors live button / trigger / grip / thumbstick values so you
 * can confirm input is arriving even when a handler does nothing visible.
 */
export class ControllerInputSystem extends createSystem({
  cube: { required: [DemoCube] },
  music: { required: [BackgroundMusic] },
  hud: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", "./ui/input-hud.json")],
  },
}) {
  private hudEls: Record<string, UIKit.Text> = {};
  private hudCache: Record<string, string> = {};
  private lastHud = 0;

  private cubeEntity: Entity | null = null;
  private cubeHome!: Vector3;
  private cubeHomeScale = 1;
  private cubeScale = 1;
  private colorIndex = 0;
  private cubeSpin = 0; // radians/sec, driven by the right thumbstick

  init() {
    this.cubeHome = new Vector3();

    this.queries.cube.subscribe("qualify", (entity) => {
      this.cubeEntity = entity;
      const obj = entity.object3D!;
      this.cubeHome.copy(obj.position);
      this.cubeHomeScale = obj.scale.x;
      this.cubeScale = this.cubeHomeScale;
      this.colorIndex = 0;
      this.cubeSpin = 0;
    });

    this.queries.cube.subscribe("disqualify", (entity) => {
      if (this.cubeEntity === entity) {
        this.cubeEntity = null;
      }
    });

    this.queries.hud.subscribe("qualify", (entity) => {
      const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
      if (!doc) {
        return;
      }
      for (const id of [
        "l-x",
        "l-y",
        "l-trigger",
        "l-grip",
        "l-stick",
        "r-a",
        "r-b",
        "r-trigger",
        "r-grip",
        "r-stick",
      ]) {
        const el = doc.getElementById(id) as UIKit.Text | null;
        if (el) {
          this.hudEls[id] = el;
        }
      }
    });
  }

  update(delta: number, time: number) {
    const left = this.input.xr.gamepads.left;
    const right = this.input.xr.gamepads.right;

    this.applyCubeActions(left, right, delta);
    this.applyMusicToggle(left);

    if (time - this.lastHud >= HUD_INTERVAL) {
      this.lastHud = time;
      this.updateHud(left, right);
    }
  }

  private applyCubeActions(
    left: StatefulGamepad | undefined,
    right: StatefulGamepad | undefined,
    delta: number,
  ) {
    const cubeEntity = this.cubeEntity;
    if (!cubeEntity) {
      return;
    }
    const mesh = cubeEntity.object3D as Mesh;

    // --- Face buttons -----------------------------------------------------
    if (right?.getButtonDown(InputComponent.A_Button)) {
      this.cubeScale = Math.min(this.cubeScale * SCALE_STEP, MAX_SCALE);
      mesh.scale.setScalar(this.cubeScale);
    }
    if (right?.getButtonDown(InputComponent.B_Button)) {
      this.cubeScale = Math.max(this.cubeScale / SCALE_STEP, MIN_SCALE);
      mesh.scale.setScalar(this.cubeScale);
    }
    if (left?.getButtonDown(InputComponent.X_Button)) {
      this.colorIndex = (this.colorIndex + 1) % CUBE_COLORS.length;
      (mesh.material as MeshStandardMaterial).color.setHex(
        CUBE_COLORS[this.colorIndex],
      );
    }
    if (left?.getButtonDown(InputComponent.Y_Button)) {
      this.colorIndex = 0;
      this.cubeScale = this.cubeHomeScale;
      this.cubeSpin = 0;
      mesh.position.copy(this.cubeHome);
      mesh.scale.setScalar(this.cubeHomeScale);
      (mesh.material as MeshStandardMaterial).color.setHex(CUBE_COLORS[0]);
    }

    // --- Trigger: spatial SFX --------------------------------------------
    if (
      left?.getButtonDown(InputComponent.Trigger) ||
      right?.getButtonDown(InputComponent.Trigger)
    ) {
      AudioUtils.play(cubeEntity);
    }

    // --- Thumbstick: spin -------------------------------------------------
    if (
      left?.getButtonDown(InputComponent.Thumbstick) ||
      right?.getButtonDown(InputComponent.Thumbstick)
    ) {
      this.cubeSpin = 0;
    }
    const stick = right?.getAxesValues(InputComponent.Thumbstick);
    if (stick && Math.abs(stick.x) > STICK_DEADZONE) {
      this.cubeSpin = stick.x * SPIN_RATE;
    }
    // Let the grab system own the transform while the cube is held.
    if (this.cubeSpin !== 0 && !cubeEntity.hasComponent(Grabbed)) {
      mesh.rotation.y += this.cubeSpin * delta;
    }
  }

  /** Grip / squeeze on the left controller mutes and unmutes the soundtrack. */
  private applyMusicToggle(left: StatefulGamepad | undefined) {
    if (!left?.getButtonDown(InputComponent.Squeeze)) {
      return;
    }
    for (const entity of this.queries.music.entities) {
      if (AudioUtils.isPlaying(entity)) {
        AudioUtils.pause(entity, 0.3);
      } else {
        AudioUtils.play(entity, 0.6);
      }
    }
  }

  private updateHud(
    left: StatefulGamepad | undefined,
    right: StatefulGamepad | undefined,
  ) {
    this.setHud("l-x", `X  ${btn(left?.getButtonPressed(InputComponent.X_Button))}`);
    this.setHud("l-y", `Y  ${btn(left?.getButtonPressed(InputComponent.Y_Button))}`);
    this.setHud("l-trigger", `Trig  ${val(left?.getButtonValue(InputComponent.Trigger))}`);
    this.setHud("l-grip", `Grip  ${btn(left?.getButtonPressed(InputComponent.Squeeze))}`);
    this.setHud("l-stick", `Stick  ${stick(left?.getAxesValues(InputComponent.Thumbstick))}`);

    this.setHud("r-a", `A  ${btn(right?.getButtonPressed(InputComponent.A_Button))}`);
    this.setHud("r-b", `B  ${btn(right?.getButtonPressed(InputComponent.B_Button))}`);
    this.setHud("r-trigger", `Trig  ${val(right?.getButtonValue(InputComponent.Trigger))}`);
    this.setHud("r-grip", `Grip  ${btn(right?.getButtonPressed(InputComponent.Squeeze))}`);
    this.setHud("r-stick", `Stick  ${stick(right?.getAxesValues(InputComponent.Thumbstick))}`);
  }

  private setHud(id: string, text: string) {
    if (this.hudCache[id] === text) {
      return;
    }
    this.hudCache[id] = text;
    this.hudEls[id]?.setProperties({ text });
  }
}

function btn(pressed: boolean | undefined): string {
  return pressed ? "ON" : "off";
}

function val(value: number | undefined): string {
  return (value ?? 0).toFixed(2);
}

function stick(axes: { x: number; y: number } | undefined): string {
  if (!axes) {
    return "0.00, 0.00";
  }
  return `${axes.x.toFixed(2)}, ${axes.y.toFixed(2)}`;
}
