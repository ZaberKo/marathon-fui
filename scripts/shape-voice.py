"""Constrain Aria's voiced pitch and lift formants without moving the cues."""

import sys

import numpy as np
import parselmouth
from parselmouth.praat import call


def shape_voice(sound, delivery):
    floor, ceiling = 95, 550
    # Keep the closer delivery slightly warmer and the countdown steadier.
    formant_ratio, contour = {
        "log": (1.065, 0.25),
        "alert": (1.075, 0.29),
        "count": (1.065, 0.15),
        "soft": (1.045, 0.33),
    }.get(delivery, (1.065, 0.25))
    sound = call(sound, "Change gender", floor, ceiling, formant_ratio, 0.0, 1.0, 1.0)
    pitch = sound.to_pitch_ac(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceiling)
    frequency = pitch.selected_array["frequency"]
    voiced = np.flatnonzero(frequency > 0)
    if voiced.size == 0:
        return sound

    median = np.median(frequency[voiced])
    tier = call("Create PitchTier", "Aria", sound.xmin, sound.xmax)
    times = pitch.xs()
    # Smooth only within voiced islands so consonants and pauses stay intact.
    islands = np.split(voiced, np.flatnonzero(np.diff(voiced) > 1) + 1)
    for island in islands:
        notes = 12 * np.log2(frequency[island] / median)
        for i, index in enumerate(island):
            local = np.median(notes[max(0, i - 3):i + 4])
            target = np.clip(local, -6, 6) * contour
            step = 0.65
            locked = round(target / step) * step
            semitones = 0.75 * locked + 0.25 * target
            call(tier, "Add point", times[index], median * 2 ** (semitones / 12))

    manipulation = call(sound, "To Manipulation", 0.01, floor, ceiling)
    call([tier, manipulation], "Replace pitch tier")
    return call(manipulation, "Get resynthesis (overlap-add)")


if __name__ == "__main__":
    original = parselmouth.Sound(sys.argv[1])
    result = shape_voice(original, sys.argv[2]).values[0]
    # The post-processing stage always emits exactly the original sample count.
    samples = np.zeros(original.n_samples, dtype="<f4")
    count = min(samples.size, result.size)
    samples[:count] = result[:count]
    sys.stdout.buffer.write(samples.tobytes())
