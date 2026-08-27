import {
  Color,
  createSystem,
  Hovered,
  Mesh,
  Pressed,
  RayDisplayMode,
  RayInteractable,
} from "@iwsdk/core";
import type { Entity, Material, Object3D, RayPointer } from "@iwsdk/core";

/**
 * BUILDING BLOCK — controller ray / pointer.
 *
 * IWSDK already builds a ray mesh and a cursor for each hand, but the default
 * `RayDisplayMode.VisibleOnIntersection` only reveals the ray once it lands on
 * something interactable. In a sparse scene that reads as "this app has no
 * pointer". This system:
 *
 *   1. forces both rays permanently visible, and
 *   2. gives every `RayInteractable` an emissive hover / press highlight so the
 *      ray always has visible consequences.
 *
 * Keep this system registered. If you want the stock behaviour back, change
 * `RAY_DISPLAY_MODE` rather than deleting the highlight feedback.
 */
const RAY_DISPLAY_MODE = RayDisplayMode.Visible;

const HOVER = { color: 0x2f6fd0, intensity: 0.45 };
const PRESS = { color: 0x8fd0ff, intensity: 0.95 };

type Highlight = { color: number; intensity: number } | null;

/** Materials that can carry an emissive tint (MeshStandard / MeshPhysical / ...). */
type EmissiveMaterial = Material & { emissive: Color; emissiveIntensity: number };

function isEmissive(material: Material): material is EmissiveMaterial {
  return (material as EmissiveMaterial).emissive instanceof Color;
}

/** `MultiPointer` keeps its ray visual private; this is the runtime shape. */
type MultiPointerInternals = { ray?: { visual?: RayPointer } };

export class ControllerRaySystem extends createSystem({
  hovered: { required: [RayInteractable, Hovered] },
  pressed: { required: [RayInteractable, Pressed] },
}) {
  /** Original emissive values, so a highlight can be undone exactly. */
  private originals = new Map<EmissiveMaterial, { hex: number; intensity: number }>();

  /** Level the current traversal is applying — avoids allocating a closure per call. */
  private pendingLevel: Highlight = null;

  private readonly applyToObject = (child: Object3D) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!isEmissive(material)) {
        continue;
      }
      let original = this.originals.get(material);
      if (!original) {
        original = {
          hex: material.emissive.getHex(),
          intensity: material.emissiveIntensity,
        };
        this.originals.set(material, original);
      }
      if (this.pendingLevel) {
        material.emissive.setHex(this.pendingLevel.color);
        material.emissiveIntensity = this.pendingLevel.intensity;
      } else {
        material.emissive.setHex(original.hex);
        material.emissiveIntensity = original.intensity;
      }
    }
  };

  init() {
    this.showRays();

    // Rays are rebuilt with the XR input rig, so re-assert on every session.
    this.cleanupFuncs.push(this.world.visibilityState.subscribe(() => this.showRays()));

    this.queries.hovered.subscribe("qualify", (entity) => this.highlight(entity, HOVER));
    this.queries.hovered.subscribe("disqualify", (entity) => this.highlight(entity, null));
    this.queries.pressed.subscribe("qualify", (entity) => this.highlight(entity, PRESS));
    this.queries.pressed.subscribe("disqualify", (entity) =>
      this.highlight(entity, entity.hasComponent(Hovered) ? HOVER : null),
    );
  }

  private showRays() {
    for (const handedness of ["left", "right"] as const) {
      const pointer = this.input.xr.multiPointers[handedness] as unknown as
        | MultiPointerInternals
        | undefined;
      const visual = pointer?.ray?.visual;
      if (visual) {
        visual.rayDisplayMode = RAY_DISPLAY_MODE;
      }
    }
  }

  private highlight(entity: Entity, level: Highlight) {
    const root = entity.object3D;
    if (!root) {
      return;
    }
    this.pendingLevel = level;
    root.traverse(this.applyToObject);
    this.pendingLevel = null;
  }
}
