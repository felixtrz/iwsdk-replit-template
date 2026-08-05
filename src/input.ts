import {
  createComponent,
  createSystem,
  Entity,
  eq,
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

/** Tag for the directly grabbable demo cube that face buttons manipulate. */
export const DemoCube = createComponent("DemoCube", {});

/** Color palette cycled by the X button. Index 0 is the cube's initial color. */
export const CUBE_COLORS = [0x3b82f6, 0x22c55e, 0xef4444, 0xeab308, 0xa855f7];

const SCALE_STEP = 1.15;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const HUD_INTERVAL = 0.1; // seconds between HUD refreshes

/**
 * Reads both XR controller gamepads every frame:
 * - Maps A/B/X/Y face buttons to visible actions on the DemoCube.
 * - Mirrors live button / trigger / grip / thumbstick state onto the HUD panel.
 */
export class ControllerInputSystem extends createSystem({
  cube: { required: [DemoCube] },
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

  init() {
    this.cubeHome = new Vector3();

    this.queries.cube.subscribe("qualify", (entity) => {
      this.cubeEntity = entity;
      const obj = entity.object3D!;
      this.cubeHome.copy(obj.position);
      this.cubeHomeScale = obj.scale.x;
      this.cubeScale = this.cubeHomeScale;
      this.colorIndex = 0;
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

  update(_delta: number, time: number) {
    const left = this.input.xr.gamepads.left;
    const right = this.input.xr.gamepads.right;

    this.applyCubeActions(left, right);

    if (time - this.lastHud >= HUD_INTERVAL) {
      this.lastHud = time;
      this.updateHud(left, right);
    }
  }

  private applyCubeActions(
    left: StatefulGamepad | undefined,
    right: StatefulGamepad | undefined,
  ) {
    const cubeEntity = this.cubeEntity;
    if (!cubeEntity) {
      return;
    }
    const mesh = cubeEntity.object3D as Mesh;

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
      mesh.position.copy(this.cubeHome);
      mesh.scale.setScalar(this.cubeHomeScale);
      (mesh.material as MeshStandardMaterial).color.setHex(CUBE_COLORS[0]);
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
