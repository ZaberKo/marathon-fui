# Energy envelope + section boundaries + tempo estimate for a music file (numpy only).
import subprocess, sys, json
import numpy as np
f = sys.argv[1]
sr = 22050
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
hop = int(sr * 0.05)
n = len(x) // hop
rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
db = 20 * np.log10(rms + 1e-9)
# onset strength: positive spectral flux on 1024-point frames
win = 1024
frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop][:n]
spec = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
flux = np.maximum(0, np.diff(np.log1p(spec), axis=0)).sum(axis=1)
flux = np.concatenate([[0], flux])
# tempo via autocorrelation of onset envelope (60-180 BPM)
o = flux - flux.mean()
ac = np.correlate(o, o, 'full')[len(o) - 1:]
lags = np.arange(len(ac)) * 0.05
mask = (lags >= 60 / 180) & (lags <= 60 / 60)
best = lags[mask][np.argmax(ac[mask])]
print(f'duration {len(x)/sr:.1f}s  tempo≈{60/best:.1f} BPM')
# 1-second loudness profile
sec = int(1 / 0.05)
prof = [float(np.mean(db[i:i + sec])) for i in range(0, n, sec)]
line = ''.join(' .:-=+*#%@'[min(9, max(0, int((v + 50) / 4)))] for v in prof)
print('loudness/1s:', line)
# big onsets (hits)
thr = np.percentile(flux, 99.3)
hits = [i * 0.05 for i in range(1, n - 1) if flux[i] > thr and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]]
merged = []
for h in hits:
    if not merged or h - merged[-1] > 0.6: merged.append(h)
print('hits:', ' '.join(f'{h:.1f}' for h in merged))
# silences (< -45 dB for >= 0.3 s)
sil, start = [], None
for i, v in enumerate(db):
    if v < -45 and start is None: start = i
    if v >= -45 and start is not None:
        if (i - start) * 0.05 >= 0.3: sil.append((start * 0.05, i * 0.05))
        start = None
print('silences:', ' '.join(f'{a:.1f}-{b:.1f}' for a, b in sil))
