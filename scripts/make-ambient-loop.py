#!/usr/bin/env python3
"""Generate public/audio/ambient-loop.wav — a seamless ambient pad.

The template needs a background-music asset that ships with the repo and has no
licensing strings attached, so we synthesise one instead of vendoring a track.

Seamlessness: every partial and every LFO uses a frequency that is an exact
multiple of 1 / LOOP_SECONDS, so sample 0 and sample N are phase-continuous and
the file loops with no click.

Swap the output for your own music whenever you like — keep the filename or
update the `ambientMusic` entry in `src/index.ts`.

Usage:  python3 scripts/make-ambient-loop.py
"""

import math
import os
import struct
import wave

LOOP_SECONDS = 16
# The pad tops out around 500 Hz, so 11.025 kHz is transparent and keeps the
# asset small enough to live in the repo.
SAMPLE_RATE = 11025
OUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "public",
    "audio",
    "ambient-loop.wav",
)

# Frequency grid: anything that is a whole number of cycles per loop is seamless.
STEP = 1.0 / LOOP_SECONDS


def snap(freq):
    """Snap a frequency to the nearest loop-seamless value."""
    return round(freq / STEP) * STEP


# A minor 9 pad, voiced low so it sits under speech and SFX.
PARTIALS = [
    # (frequency Hz, gain, LFO cycles per loop, LFO depth)
    (snap(110.00), 0.55, 1, 0.35),  # A2  root
    (snap(164.81), 0.32, 2, 0.40),  # E3  fifth
    (snap(220.00), 0.24, 3, 0.45),  # A3  octave
    (snap(261.63), 0.20, 2, 0.50),  # C4  minor third
    (snap(329.63), 0.12, 5, 0.55),  # E4
    (snap(493.88), 0.07, 3, 0.65),  # B4  ninth, shimmer
    # Slight detunes for chorus/beating movement.
    (snap(110.00) + STEP, 0.28, 1, 0.35),
    (snap(164.81) + STEP, 0.16, 2, 0.40),
]


def main():
    frame_count = LOOP_SECONDS * SAMPLE_RATE
    samples = [0.0] * frame_count

    for freq, gain, lfo_cycles, lfo_depth in PARTIALS:
        omega = 2.0 * math.pi * freq / SAMPLE_RATE
        lfo_omega = 2.0 * math.pi * lfo_cycles / frame_count
        for i in range(frame_count):
            lfo = 1.0 - lfo_depth + lfo_depth * (0.5 + 0.5 * math.sin(lfo_omega * i))
            samples[i] += gain * lfo * math.sin(omega * i)

    # Slow global swell so the loop breathes rather than sitting flat.
    swell_omega = 2.0 * math.pi / frame_count
    for i in range(frame_count):
        samples[i] *= 0.62 + 0.38 * (0.5 + 0.5 * math.sin(swell_omega * i))

    peak = max(abs(s) for s in samples) or 1.0
    scale = 0.5 / peak  # leave headroom; final level is set by AudioSource.volume

    frames = bytearray()
    for s in samples:
        frames += struct.pack("<h", int(max(-1.0, min(1.0, s * scale)) * 32767))

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with wave.open(OUT_PATH, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(bytes(frames))

    print(f"wrote {OUT_PATH} ({len(frames) / 1024:.0f} KiB, {LOOP_SECONDS}s loop)")


if __name__ == "__main__":
    main()
