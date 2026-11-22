import numpy as np, wave, subprocess, random, os
BASE = os.environ.get('VID_DIR', os.path.dirname(os.path.abspath(__file__)))
VOZ = os.environ.get('VOZ', os.path.join(BASE, '..', '..', 'marca', 'voz', 'voz-unlock-thiago-narracao.mp3'))
SR = 44100; DUR = 40.0; N = int(SR * DUR)
rng = np.random.default_rng(3)
mus = np.zeros(N); sfx = np.zeros(N)
def tt(d): return np.arange(int(SR * d)) / SR
def add(buf, t0, sig, g=1.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += sig[:j - i] * g
def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4)); return e
def lp(x, k=8):  # crude low-pass (moving average)
    return np.convolve(x, np.ones(k) / k, mode='same')
def hp(x, k=8): return x - lp(x, k)

# ---------- instruments ----------
def kick(g=1.0):
    t = tt(0.4); f = 50 + 110 * np.exp(-t * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * g
def hat(g=0.3):
    n = int(SR * 0.06); return hp(rng.standard_normal(n), 3) * env(n, 0.001, 0.015) * g
def snare(g=0.5):
    n = int(SR * 0.22); t = np.arange(n) / SR
    return (hp(rng.standard_normal(n), 4) * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.5) * np.exp(-t * 18) * g
def saw(f, d, g=0.2):
    t = tt(d); x = 2 * ((t * f) % 1) - 1; return lp(x, 14) * g
def note(f, d, g=0.25):
    t = tt(d); x = (2 * ((t * f) % 1) - 1) * 0.6 + np.sin(2 * np.pi * f * t) * 0.6
    return lp(x, 10) * env(len(t), 0.005, d * 0.6) * g
def pad(freqs, d, g=0.08):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * t + 0.3 * np.sin(2 * np.pi * 0.3 * t)) + 0.5 * np.sin(2 * np.pi * f * 2.003 * t) for f in freqs)
    e = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6); return x * e * g

# ---------- music ----------
DROP = 11.5
# pre-drop: drone + heartbeat
add(mus, 0, pad([55, 110, 164.8], DROP, 0.07))
for k in range(16):
    b = 2.6 + k * 0.5
    if b < DROP - 0.3: add(mus, b, kick(0.55)); add(mus, b + 0.18, kick(0.3))
# riser 8.1 -> drop
rt = tt(DROP - 8.1); noise = rng.standard_normal(len(rt))
add(mus, 8.1, hp(noise, 2) * (rt / rt[-1]) ** 2 * 0.25)
add(mus, 8.1, np.sin(2 * np.pi * np.cumsum(200 + 900 * (rt / rt[-1]) ** 2) / SR) * (rt / rt[-1]) ** 2 * 0.08)
# post-drop groove 120 bpm
beat = 0.5; prog = [(110, [220, 261.6, 329.6]), (87.3, [174.6, 220, 261.6]), (130.8, [261.6, 329.6, 392]), (98, [196, 246.9, 293.7])]
t0 = DROP; bar = 0
while t0 < 39.0:
    root, chord = prog[bar % 4]
    add(mus, t0, pad(chord, beat * 4, 0.05))
    for b in range(4):
        tb = t0 + b * beat
        if tb >= 39.0: break
        add(mus, tb, kick(0.9))
        add(mus, tb + beat / 2, hat(0.22))
        if b in (1, 3): add(mus, tb, snare(0.35))
        for e in range(2): add(mus, tb + e * beat / 2, note(root / 2 if e == 0 else root, beat / 2 * 0.9, 0.22))
    t0 += beat * 4; bar += 1
fade = np.ones(N); fs = int(38.6 * SR); fade[fs:] = np.linspace(1, 0, N - fs); mus *= fade

# ---------- sfx ----------
def click(g=0.8):
    n = int(SR * 0.08); t = np.arange(n) / SR
    return (hp(rng.standard_normal(n), 2) * np.exp(-t * 90) + np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 60) * 0.5) * g
def clack(g=1.0):
    return click(g) * 1.0 + np.concatenate([np.zeros(int(SR * 0.05)), click(g * 0.7)])[:int(SR * 0.08)]
def ding(g=0.35):
    t = tt(0.35); return (np.sin(2 * np.pi * 1318.5 * t) + 0.6 * np.sin(2 * np.pi * 1760 * t)) * np.exp(-t * 9) * g
def glitch(g=0.3):
    n = int(SR * 0.14); x = rng.standard_normal(n); x = np.repeat(x[::40], 40)[:n]
    return x * env(n, 0.002, 0.08) * g
def whoosh(d=0.45, g=0.35):
    t = tt(d); x = rng.standard_normal(len(t)); y = np.zeros_like(x)
    k = np.linspace(30, 3, len(t)).astype(int)
    c = np.cumsum(x); y = (c - np.roll(c, 8)) / 8
    y = hp(x, 3) * np.sin(np.pi * t / d) ** 2
    return y * g
def pop(g=0.4):
    t = tt(0.12); f = 600 + 900 * np.exp(-t * 40); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * g
def boom(g=1.0):
    t = tt(1.6); sub = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 2.2)
    n = hp(rng.standard_normal(len(t)), 2) * np.exp(-t * 7) * 0.5
    return (sub + n) * g
def tick(g=0.3):
    t = tt(0.05); return np.sin(2 * np.pi * 3000 * t) * np.exp(-t * 120) * g

add(sfx, 0.02, clack(0.7)); add(sfx, 0.0, glitch(0.35))
for k in range(8):
    tk = 2.6 + k * 0.42
    if tk < 6.5: add(sfx, tk, ding(0.30))
for tg in (2.6, 6.5, 8.1): add(sfx, tg, glitch(0.4))
r = random.Random(4); tk = 8.2
while tk < 10.5: add(sfx, tk, tick(0.18)); tk += r.uniform(0.08, 0.16)
add(sfx, DROP, boom(0.9)); add(sfx, DROP, clack(0.9))
for ts in (12.9, 17.3, 23.3, 25.5, 29.2, 34.1): add(sfx, ts - 0.15, whoosh(0.45, 0.28))
for ts in (13.4, 13.8, 14.2, 18.9, 19.7, 20.5): add(sfx, ts, pop(0.32))
add(sfx, 24.1, ding(0.35))
for ts in (26.2, 26.8, 27.4): add(sfx, ts, whoosh(0.3, 0.22))
for ts in (29.8, 30.6, 31.4, 32.5): add(sfx, ts, pop(0.35))
add(sfx, 34.15, clack(0.6)); add(sfx, 34.6, pop(0.4))

# ---------- voice ----------
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VOZ, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout
voice = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
vb = np.zeros(N); add(vb, 0.3, voice, 1.0)
# duck music under voice
venv = np.abs(vb); venv = np.convolve(venv, np.ones(4410) / 4410, mode='same'); duck = 1 - 0.55 * np.clip(venv / 0.05, 0, 1)
mix = vb * 1.0 + mus * 0.55 * duck + sfx * 0.7
mix = mix / max(1e-6, np.max(np.abs(mix))) * 0.92
st = np.stack([mix, mix], axis=1)
with wave.open(os.path.join(BASE, 'out', 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('ok', np.max(np.abs(vb)))
