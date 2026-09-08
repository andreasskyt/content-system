#!/usr/bin/env python3
"""
sfx-generate — synthesises the UI click library used by scripts/sfx.ts.

A mouse click is a transient, not a sound with a pitch: a near-instant attack,
a short resonant body from the switch housing, and an exponential decay under
20ms. That is cheap to model and expensive to license — every clip in a paid ad
would otherwise carry an attribution or non-commercial obligation.

Deterministic: same seed, same files. Re-run any time to rebuild the library.

Usage: python3 scripts/sfx-generate.py [out_dir]
"""

import math
import os
import random
import struct
import sys
import wave

SR = 48_000


def synth_click(
    seed: int,
    centre_hz: float,
    decay_ms: float,
    noise_mix: float,
    tail: bool,
) -> list[float]:
    """One click: filtered noise + two resonant partials under a fast decay."""
    rng = random.Random(seed)
    # Buffer follows the decay: a 30ms tau truncated at 45ms is audibly clipped.
    n = int(SR * max(0.045, (decay_ms / 1000.0) * 7))
    out = [0.0] * n

    # One-pole bandpass state for the noise component.
    lp = 0.0
    hp_prev = 0.0
    k_lp = min(1.0, centre_hz * 2.2 / (SR / 2))
    k_hp = min(1.0, centre_hz * 0.35 / (SR / 2))

    tau = decay_ms / 1000.0
    for i in range(n):
        t = i / SR
        env = math.exp(-t / tau)
        # 0.4ms attack ramp stops the very first sample clipping as a pop.
        env *= min(1.0, t / 0.0004)

        white = rng.uniform(-1.0, 1.0)
        lp += k_lp * (white - lp)
        hp_prev += k_hp * (lp - hp_prev)
        noise = lp - hp_prev

        tone = (
            math.sin(2 * math.pi * centre_hz * t) * 0.6
            + math.sin(2 * math.pi * centre_hz * 1.87 * t) * 0.25
        )

        out[i] = env * (noise * noise_mix + tone * (1.0 - noise_mix))

    # Mechanical switches release a fainter second tick a few ms later.
    if tail:
        offset = int(SR * 0.008)
        for i in range(offset, n):
            t = (i - offset) / SR
            env = math.exp(-t / (tau * 0.55)) * 0.32
            out[i] += env * math.sin(2 * math.pi * centre_hz * 1.4 * t)

    peak = max(abs(v) for v in out) or 1.0
    return [v / peak * 0.92 for v in out]


def write_wav(path: str, samples: list[float]) -> None:
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(
            b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in samples)
        )


# centre_hz, decay_ms, noise_mix, tail — spread so a round-robin never sounds looped
VARIANTS = [
    ("click_01_soft",   1400, 7.0, 0.55, False),
    ("click_02_soft",   1650, 6.0, 0.62, False),
    ("click_03_mid",    2100, 5.0, 0.70, True),
    ("click_04_mid",    2450, 4.5, 0.66, False),
    ("click_05_crisp",  3000, 3.8, 0.78, True),
    ("click_06_crisp",  3400, 3.2, 0.82, False),
    ("click_07_tick",   4200, 2.6, 0.88, False),
    ("click_08_tick",   4800, 2.2, 0.90, True),
    # Heavier, for the depth header — lower and longer so it reads as weight.
    ("thud_01_header",   320, 26.0, 0.30, False),
    ("thud_02_header",   240, 34.0, 0.24, True),
]


def main() -> None:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "assets/sfx/clicks"
    os.makedirs(out_dir, exist_ok=True)
    for seed, (name, hz, decay, mix, tail) in enumerate(VARIANTS):
        s = synth_click(seed * 7919, hz, decay, mix, tail)
        p = os.path.join(out_dir, f"{name}.wav")
        write_wav(p, s)
        print(f"  {p}  ({len(s)/SR*1000:.0f}ms)")


if __name__ == "__main__":
    main()
