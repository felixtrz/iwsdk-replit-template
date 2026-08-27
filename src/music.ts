import {
  AudioSource,
  AudioUtils,
  createComponent,
  createSystem,
  VisibilityState,
} from "@iwsdk/core";

/**
 * BUILDING BLOCK — background music.
 *
 * Tag for the looping, non-positional ambient soundtrack. Exactly one entity in
 * the scene should carry it; `src/index.ts` creates that entity next to the
 * positional SFX so the two are easy to compare.
 *
 * The track itself is `public/audio/ambient-loop.wav`, synthesised by
 * `scripts/make-ambient-loop.py` so the template ships with no licensed audio.
 * Replace it with your own music and update the `ambientMusic` asset entry.
 */
export const BackgroundMusic = createComponent("BackgroundMusic", {});

/**
 * Starts the soundtrack and keeps it in step with the XR session:
 * duck it out when the headset loses focus, fade it back in on return.
 * The initial start is handled by `autoplay` on the AudioSource.
 */
export class BackgroundMusicSystem extends createSystem({
  music: { required: [BackgroundMusic, AudioSource] },
}) {
  init() {
    this.cleanupFuncs.push(
      this.world.visibilityState.subscribe((state) => {
        for (const entity of this.queries.music.entities) {
          if (state === VisibilityState.VisibleBlurred) {
            AudioUtils.pause(entity, 0.4);
          } else if (state === VisibilityState.Visible) {
            AudioUtils.play(entity, 1.5);
          }
        }
      }),
    );
  }
}
