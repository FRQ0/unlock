import sys, math, os, random, subprocess, glob
WORK = os.environ.get('VID_DIR', os.path.dirname(os.path.abspath(__file__)))  # pasta de trabalho: fr/ (quadros dos clipes), site_full.jpg, out/
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

W, H, FPS = 1080, 1920, 30
LIME = (200, 245, 66); BG = (13, 15, 18); INK = (244, 244, 239); MUTED = (169, 176, 186)
SURF = (28, 33, 40); CYAN = (92, 225, 230); LINE = (38, 44, 53); WA = (37, 211, 102)
WIDE = '/usr/share/fonts/truetype/google-fonts/ofl/archivoblack/ArchivoBlack-Regular.ttf'
IB = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
IM = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
ISB = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
_f = {}
def F(p, s):
    if (p, s) not in _f: _f[(p, s)] = ImageFont.truetype(p, s)
    return _f[(p, s)]
def clamp(v, a=0.0, b=1.0): return max(a, min(b, v))
def ease(t): t = clamp(t); return 1 - (1 - t) ** 3
def ease_io(t): t = clamp(t); return t * t * (3 - 2 * t)
def back(t):  # overshoot
    t = clamp(t); c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2

# ---------- static layers ----------
def radial(cx, cy, r, color, strength):
    g = Image.new('L', (W, H), 0); ImageDraw.Draw(g).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    g = g.filter(ImageFilter.GaussianBlur(r * 0.5)).point(lambda v: int(v * strength))
    return g
BASE = Image.new('RGB', (W, H), BG)
HORIZON = radial(540, 1250, 700, LIME, 0.10)
BASE = Image.composite(Image.new('RGB', (W, H), LIME), BASE, HORIZON)
VIG = Image.new('L', (W, H), 0); ImageDraw.Draw(VIG).ellipse((-300, -200, W + 300, H + 200), fill=255)
VIG = VIG.filter(ImageFilter.GaussianBlur(220))
BLACK = Image.new('RGB', (W, H), (0, 0, 0))
GRAD = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(GRAD)
for y in range(1100, H): gd.line([(0, y), (W, y)], fill=int(235 * clamp((y - 1100) / 520)))
for y in range(0, 420): gd.line([(0, y), (W, y)], fill=int(170 * clamp((420 - y) / 420)))
GLOWS = {}
def glow(im, cx, cy, r, s, color=LIME):
    k = (cx, cy, r, color)
    if k not in GLOWS: GLOWS[k] = radial(cx, cy, r, color, 1.0)
    return Image.composite(Image.new('RGB', (W, H), color), im, GLOWS[k].point(lambda v: int(v * s)))
SHADOW = Image.new('L', (700, 160), 0); ImageDraw.Draw(SHADOW).ellipse((40, 30, 660, 130), fill=200); SHADOW = SHADOW.filter(ImageFilter.GaussianBlur(30))

random.seed(7)
PARTS = [(random.uniform(0, W), random.uniform(0, H), random.uniform(0.3, 1.2), random.uniform(2, 5)) for _ in range(46)]

def background(t, grid=True, floor=True, parts=True):
    im = BASE.copy(); d = ImageDraw.Draw(im)
    if grid:
        for x in range(0, W, 60): d.line([(x, 0), (x, 1150)], fill=(22, 26, 32))
        off = (t * 40) % 60
        for y in range(0, 1150, 60): d.line([(0, y + off - 60), (W, y + off - 60)], fill=(22, 26, 32))
    if floor:  # perspective floor grid receding to horizon at y=1150
        hy, vx = 1150, 540
        for k in range(-12, 13):
            d.line([(vx, hy), (vx + k * 260, H)], fill=(30, 36, 44), width=2)
        for j in range(14):
            z = ((j + (t * 1.6) % 1) / 14.0)
            y = hy + (H - hy) * (z ** 2.2)
            c = int(30 + 40 * z)
            d.line([(0, y), (W, y)], fill=(c - 4, c + 4, c - 8), width=2)
    if parts:
        for (x, y, sp, r) in PARTS:
            yy = (y - t * 60 * sp) % H; xx = x + math.sin(t * sp + y) * 12
            a = int(90 + 80 * math.sin(t * 2 + x))
            d.ellipse((xx - r, yy - r, xx + r, yy + r), fill=(int(200 * a / 255), int(245 * a / 255), int(66 * a / 255)))
    return im

def vignette(im): return Image.composite(im, BLACK, VIG.point(lambda v: int(90 + v * 0.65)))

# ---------- text ----------
_tl = {}
def line_img(txt, font, color):
    k = (txt, font.path, font.size, color)
    if k not in _tl:
        b = font.getbbox(txt); w, h = b[2] + 8, int(font.size * 1.18)
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(im).text((0, int(font.size * 0.05)), txt, font=font, fill=color)
        _tl[k] = im
    return _tl[k]
def anim_text(im, txt, y, font, t, color=INK, stagger=0.09, dur=0.38, x=None, scale=1.0):
    lh = int(font.size * 1.12)
    for i, ln in enumerate(txt.split('\n')):
        p = ease((t - i * stagger) / dur)
        if p <= 0: continue
        li = line_img(ln, font, color)
        if scale != 1.0: li = li.resize((int(li.width * scale), int(li.height * scale)), Image.LANCZOS)
        hh = int(li.height * p)
        if hh <= 0: continue
        part = li.crop((0, 0, li.width, hh))
        xx = int((W - li.width) / 2) if x is None else x
        yy = int(y + i * lh * scale + li.height - hh)
        im.paste(part, (xx, yy), part)
    return y + len(txt.split('\n')) * lh * scale

def label(im, txt, y, color=CYAN, t=1.0):
    if t <= 0: return
    f = F(MONO, 30); d = ImageDraw.Draw(im)
    n = int(len(txt) * clamp(t / 0.4))
    s = txt[:n]; w = d.textlength(txt, font=f)
    d.text(((W - w) / 2, y), s, font=f, fill=color)

def chip(im, txt, cx, cy, t, fill=SURF, fg=INK, border=LIME):
    p = back(t / 0.35)
    if t <= 0: return
    f = F(ISB, 36); d0 = ImageDraw.Draw(im)
    w = int(d0.textlength(txt, font=f) + 64); h = 76
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 38, fill=fill + (255,), outline=border + (255,), width=3)
    d.ellipse((22, 31, 36, 45), fill=border + (255,))
    d.text((46, 17), txt, font=f, fill=fg)
    s = max(0.01, p)
    c = c.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    im.paste(c, (int(cx - c.width / 2), int(cy - c.height / 2)), c)

# ---------- lock ----------
def lock_img(size, open_t=0.0, col=LIME, hole=BG):
    S = 4; k = size * S / 100.0
    im = Image.new('RGBA', (int(110 * k), int(115 * k)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    ox, oy = 5 * k, 15 * k; up = -16 * open_t; lw = int(9 * k)
    sy = oy + up * k
    d.arc((ox + 32 * k, sy + 10 * k, ox + 68 * k, sy + 46 * k), 180, 360, fill=col + (255,), width=lw)
    d.line((ox + 32 * k + lw / 2 - 1, sy + 28 * k, ox + 32 * k + lw / 2 - 1, oy + 48 * k), fill=col + (255,), width=lw)
    rx = ox + 68 * k - lw / 2 + 1
    d.line((rx, sy + 28 * k, rx, sy + 34 * k + (14 * k) * (1 - clamp(open_t * 3))), fill=col + (255,), width=lw)
    d.rounded_rectangle((ox + 16 * k, oy + 44 * k, ox + 84 * k, oy + 92 * k), int(12 * k), fill=col + (255,))
    d.ellipse((ox + 43 * k, oy + 56 * k, ox + 57 * k, oy + 70 * k), fill=hole + (255,))
    d.rounded_rectangle((ox + 46.5 * k, oy + 64 * k, ox + 53.5 * k, oy + 79 * k), int(3.5 * k), fill=hole + (255,))
    return im.resize((im.width // S, im.height // S), Image.LANCZOS)
def paste_lock(im, cx, cy, size, open_t=0.0, yaw=0.0, col=LIME, hole=BG):
    L = lock_img(size, open_t, col, hole)
    sx = abs(math.cos(yaw))
    if sx < 0.98:
        sh = max(1, int(L.width * sx))
        L = L.resize((sh, L.height), Image.LANCZOS)
        if math.cos(yaw) < 0: L = L.transpose(Image.FLIP_LEFT_RIGHT)
        if sx < 0.35:  # show thickness: darker side
            dark = Image.new('RGBA', L.size, (120, 150, 40, 255)); L = Image.composite(dark, L, L.split()[3].point(lambda v: v * 0)) if False else L
    im.paste(L, (int(cx - L.width / 2), int(cy - L.height / 2)), L)

# ---------- perspective phone ----------
def coeffs(dst, src):
    A = []; B = []
    for (x, y), (X, Y) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -X * x, -X * y]); B.append(X)
        A.append([0, 0, 0, x, y, 1, -Y * x, -Y * y]); B.append(Y)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()
def phone_card(screen, h, radius=56, bezel=16):
    w = int(screen.width * h / screen.height)
    s = screen.resize((w, h), Image.BILINEAR).convert('RGB')
    card = Image.new('RGBA', (w + bezel * 2, h + bezel * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius + bezel, fill=(30, 34, 41, 255), outline=(88, 98, 112, 255), width=3)
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius, fill=255)
    card.paste(s, (bezel, bezel), m)
    # glass sheen
    sheen = Image.new('L', card.size, 0); ImageDraw.Draw(sheen).polygon([(0, 0), (card.width * 0.55, 0), (card.width * 0.15, card.height), (0, card.height)], fill=22)
    card = Image.composite(Image.new('RGBA', card.size, (255, 255, 255, 255)), card, ImageChops.multiply(sheen, card.split()[3]))
    return card
def project(card, yaw, pitch=0.0):
    w, h = card.size; D = 2.6 * h
    pts = []
    for (x, y) in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        x1 = x * math.cos(yaw); z = x * math.sin(yaw)
        y1 = y * math.cos(pitch); z += y * math.sin(pitch)
        s = D / (D + z); pts.append((x1 * s, y1 * s))
    minx = min(p[0] for p in pts); miny = min(p[1] for p in pts)
    maxx = max(p[0] for p in pts); maxy = max(p[1] for p in pts)
    ow, oh = int(maxx - minx) + 4, int(maxy - miny) + 4
    dst = [(p[0] - minx + 2, p[1] - miny + 2) for p in pts]
    c = coeffs(dst, [(0, 0), (w, 0), (w, h), (0, h)])
    return card.transform((ow, oh), Image.PERSPECTIVE, c, Image.BICUBIC)
def place_phone(im, screen, cx, cy, h, yaw, pitch=0.04, scale=1.0):
    card = phone_card(screen, int(h * scale))
    P = project(card, yaw, pitch)
    sh = SHADOW.resize((int(P.width * 1.1), 140))
    im.paste((0, 0, 0), (int(cx - sh.width / 2), int(cy + P.height / 2 - 40)), sh)
    im.paste(P, (int(cx - P.width / 2), int(cy - P.height / 2)), P)

def glitch(im, amt, seed):
    if amt <= 0: return im
    rnd = random.Random(seed); a = np.array(im)
    dx = int(18 * amt)
    a[:, :, 0] = np.roll(a[:, :, 0], dx, axis=1); a[:, :, 2] = np.roll(a[:, :, 2], -dx, axis=1)
    for _ in range(int(6 * amt) + 1):
        y = rnd.randint(0, H - 80); hh = rnd.randint(10, 70); s = rnd.randint(-60, 60)
        a[y:y + hh] = np.roll(a[y:y + hh], s, axis=1)
    return Image.fromarray(a)

def frames(d):
    return sorted(glob.glob(os.path.join(WORK, 'fr', d, '*.jpg')))
FR = {k: frames(k) for k in ['man', 'note', 'goog', 'pizza', 'pad']}
def clip(k, t, speed=1.0):
    L = FR[k]; i = min(len(L) - 1, int(t * FPS * speed)); im = Image.open(L[i]).convert('RGB')
    if k == 'goog':  # hide search suggestions (they show city names)
        y0, y1 = int(im.height * 0.105), int(im.height * 0.62)
        im.paste(im.crop((0, y0, im.width, y1)).filter(ImageFilter.GaussianBlur(14)), (0, y0))
    return im
SITE = Image.open(os.path.join(WORK, 'site_full.jpg')).convert('RGB')

def caption_band(im, txt, t, size=84, y=1530, color=INK):
    im2 = Image.composite(BLACK, im, GRAD)
    anim_text(im2, txt, y, F(WIDE, size), t, color)
    return im2

# ---------- scenes (t = local seconds) ----------
def sc1(t):
    im = background(t); im = glow(im, 540, 980, 420, 0.25 + 0.1 * math.sin(t * 9))
    shake = math.sin(t * 46) * 9 * clamp(t / 1.5 + 0.3)
    z = 1 + 0.05 * t
    paste_lock(im, 540 + shake, 1000, int(400 * z), 0)
    anim_text(im, 'TEM ALGO\nTRAVANDO O SEU\nNEGÓCIO?', 300, F(WIDE, 96), t - 0.1)
    im = vignette(im)
    if 0.0 <= t < 0.12: im = glitch(im, 1 - t / 0.12, 1)
    return im

NOTIFS = [('Carla', 'Cadê meu pedido?? 😠'), ('João Pedro', 'Ainda tá aberto?'), ('Mesa 4', 'Moço, respondeee'), ('Fernanda', 'Mandei o pix, viu?'),
          ('Ricardo', 'Vocês entregam no centro?'), ('Bia', 'Oi?? Alguém aí?'), ('Lucas', 'Quero 2 x-bacon'), ('Dona Marta', 'Faz 40 min que pedi')]
def notif_card(name, msg, count):
    w, h = 900, 150
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 34, fill=(32, 36, 42, 240), outline=(60, 66, 76, 255), width=2)
    d.ellipse((28, 35, 108, 115), fill=WA + (255,))
    d.rounded_rectangle((48, 55, 88, 88), 10, fill=(255, 255, 255, 255)); d.polygon([(56, 86), (52, 98), (66, 88)], fill=(255, 255, 255, 255))
    d.text((132, 30), name, font=F(IB, 40), fill=INK); d.text((132, 82), msg.replace(' 😠', ''), font=F(IM, 36), fill=MUTED)
    d.text((w - 150, 34), 'agora', font=F(IM, 28), fill=MUTED)
    d.ellipse((w - 92, 78, w - 40, 130), fill=WA + (255,)); s = str(count); fw = d.textlength(s, font=F(IB, 28)); d.text((w - 66 - fw / 2, 89), s, font=F(IB, 28), fill=(0, 0, 0))
    return c
def sc2(t):
    if t < 3.9:  # 2a fictional chat overload
        lt = t
        im = clip('man', lt).resize((int(W * (1 + 0.04 * lt)), int(H * (1 + 0.04 * lt))))
        im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
        im = Image.blend(im, BLACK, 0.35)
        n = min(len(NOTIFS), int(lt / 0.42) + 1)
        for k in range(n):
            age = lt - k * 0.42; p = back(age / 0.3)
            slot = n - 1 - k
            c = notif_card(*NOTIFS[k], count=3 + k * 4)
            s = max(0.05, p); cc = c.resize((int(c.width * s), int(c.height * s)), Image.LANCZOS)
            y = 230 + slot * 170
            if y > 1250: continue
            im.paste(cc, (int(540 - cc.width / 2), int(y + (1 - ease(age / 0.3)) * -60)), cc)
        im = caption_band(im, 'PEDIDO PERDIDO\nNO WHATSAPP', lt - 0.15)
        if lt < 0.15: im = glitch(im, 1, 2)
        return im
    if t < 5.5:  # 2b notebook
        lt = t - 3.9; z = 1.08 + 0.06 * lt
        im = clip('note', lt).resize((int(W * z), int(H * z)))
        im = im.crop(((im.width - W) // 2, (im.height - H) // 2, (im.width - W) // 2 + W, (im.height - H) // 2 + H))
        im = Image.blend(im, Image.new('RGB', (W, H), (60, 10, 10)), 0.18)
        im = caption_band(im, 'FILA NA HORA\nDO MOVIMENTO', lt - 0.1)
        if lt < 0.15: im = glitch(im, 1, 3)
        return im
    lt = t - 5.5  # 2c google search
    im = background(t)
    place_phone(im, clip('goog', lt), 540, 820, 1150, -0.32 + 0.12 * ease_io(lt / 2.5), 0.05)
    im = vignette(im)
    im = caption_band(im, 'CLIENTE QUE\nNÃO TE ACHA', lt - 0.1)
    if lt < 0.15: im = glitch(im, 1, 4)
    return im

def sc3(t):
    OPEN = 0.9
    im = background(t)
    g = 0.25 + (0.6 if t > OPEN else 0.2 * t)
    im = glow(im, 540, 820, 460, clamp(g, 0, 0.85))
    d = ImageDraw.Draw(im)
    if t > OPEN:  # shockwave rings
        for k in range(2):
            rt = (t - OPEN - k * 0.12)
            if rt > 0:
                r = 120 + rt * 1400; a = clamp(1 - rt / 0.7)
                col = tuple(int(BG[i] + (LIME[i] - BG[i]) * a) for i in range(3))
                d.ellipse((540 - r, 820 - r, 540 + r, 820 + r), outline=col, width=int(10 * a) + 1)
        rnd = random.Random(5)
        for _ in range(60):
            ang = rnd.uniform(0, 6.28); sp = rnd.uniform(500, 1500); rt = t - OPEN
            x = 540 + math.cos(ang) * sp * rt; y = 820 + math.sin(ang) * sp * rt + 300 * rt * rt
            a = clamp(1 - rt / 1.0)
            if a > 0: d.ellipse((x - 5, y - 5, x + 5, y + 5), fill=tuple(int(c * a) for c in LIME))
    yaw = (1 - ease(t / OPEN)) * math.pi * 2
    shake = (math.sin(t * 80) * 14 * clamp(1 - (t - OPEN) / 0.25)) if t > OPEN else 0
    paste_lock(im, 540 + shake, 820, 420 if t < OPEN else int(420 + 40 * clamp(1 - (t - OPEN) / 0.3)), ease((t - OPEN) / 0.18), yaw)
    if t > OPEN:
        sc = 1 + 0.5 * (1 - ease((t - OPEN) / 0.22))
        f = F(WIDE, 128); y = 1240
        for i, ln in enumerate(['A GENTE', 'DESTRAVA.']):
            li = line_img(ln, f, LIME if i == 1 else INK)
            li = li.resize((int(li.width * sc), int(li.height * sc)), Image.LANCZOS)
            im.paste(li, (int((W - li.width) / 2), int(y + i * 150 - (sc - 1) * 80)), li)
    if t > OPEN + 0.5:
        anim_text(im, 'unlock', 1600, F(IB, 70), t - OPEN - 0.5)
    im = vignette(im)
    if OPEN <= t < OPEN + 0.18:
        im = Image.blend(im, Image.new('RGB', (W, H), (235, 255, 180)), 0.8 * (1 - (t - OPEN) / 0.18))
    return im

def site_shot(t, dur):
    vh = int(780 * 2.05); maxy = min(SITE.height - vh, 9800)
    y = int(ease_io(t / dur) * maxy); return SITE.crop((0, y, 780, y + vh))
def sc4(t):
    im = background(t)
    label(im, '// SITES', 150, t=t)
    place_phone(im, site_shot(t, 4.4), 540, 820, 1150, 0.30 - 0.5 * ease_io(t / 4.4), 0.06)
    chip(im, 'No Google', 210, 470, t - 0.5); chip(im, '24h no ar', 880, 760, t - 0.9); chip(im, 'Feito pro celular', 300, 1080, t - 1.3)
    im = vignette(im)
    im = caption_band(im, 'SITES QUE\nTRABALHAM POR VOCÊ', t - 0.15, size=80)
    if t < 0.12: im = glitch(im, 1, 5)
    return im
def sc5(t):
    im = background(t)
    label(im, '// CARDÁPIO 3D', 150, t=t)
    fi = int(t * 33) if t < 2.0 else min(187, 88 + int((t - 2.0) * 25))
    scr = Image.open(FR['pizza'][fi]).convert('RGB')
    place_phone(im, scr, 540, 820, 1120, -0.28 + 0.46 * ease_io(t / 6.0), 0.05)
    chip(im, 'Prato em 3D', 220, 520, t - 1.6); chip(im, 'QR na mesa', 860, 820, t - 2.4); chip(im, 'Tamanho real', 250, 1110, t - 3.2)
    im = vignette(im)
    im = caption_band(im, 'CARDÁPIO 3D\nNA MESA', t - 0.15)
    if t < 0.12: im = glitch(im, 1, 6)
    return im
def order_bubble(t):
    p = back(t / 0.35)
    if t <= 0: return None
    w, h = 820, 170
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 36, fill=(18, 60, 40, 245), outline=WA + (255,), width=3)
    d.ellipse((28, 45, 108, 125), fill=WA + (255,)); d.line((48, 86, 64, 102), fill=(255, 255, 255), width=8); d.line((64, 102, 92, 68), fill=(255, 255, 255), width=8)
    d.text((132, 34), 'Novo pedido #2', font=F(IB, 44), fill=INK); d.text((132, 94), 'Entrega · Pix · R$ 35,50', font=F(IM, 36), fill=(190, 230, 200))
    s = max(0.05, p); return c.resize((int(w * s), int(h * s)), Image.LANCZOS)
def sc6(t):
    im = background(t)
    label(im, '// PEDIDOS', 150, t=t)
    place_phone(im, clip('pad', t), 540, 830, 1120, 0.26 - 0.36 * ease_io(t / 2.2), 0.05)
    b = order_bubble(t - 0.8)
    if b: im.paste(b, (int(540 - b.width / 2), 1180), b)
    im = vignette(im)
    im = caption_band(im, 'PEDIDO PRONTO\nNO WHATSAPP', t - 0.1, size=80)
    if t < 0.12: im = glitch(im, 1, 7)
    return im

PLANS = [('PRESENÇA', 'Site profissional, no Google\ne bonito no celular'),
         ('MESA 3D', 'Cardápio com pratos em 3D,\nQR na mesa e chamar garçom'),
         ('SOB MEDIDA', 'Sistemas, pedidos no WhatsApp\ne automação')]
def plan_card(k):
    name, desc = PLANS[k]; w, h = 900, 300
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 40, fill=SURF + (255,), outline=(LIME if k == 1 else (60, 68, 80)) + (255,), width=4)
    d.text((54, 46), f'0{k + 1}', font=F(MONO, 30), fill=CYAN)
    d.text((54, 86), name, font=F(WIDE, 64), fill=LIME if k == 1 else INK)
    yy = 180
    for ln in desc.split('\n'): d.text((54, yy), ln, font=F(IM, 38), fill=MUTED); yy += 50
    return c
PC = None
def sc7(t):
    global PC
    if PC is None: PC = [plan_card(k) for k in range(3)]
    im = background(t)
    label(im, '// PLANOS', 210, t=t)
    anim_text(im, 'ESCOLHA O\nSEU PLANO', 270, F(WIDE, 100), t - 0.1)
    for k in range(3):
        st = 0.7 + k * 0.6; p = ease((t - st) / 0.45)
        if p <= 0: continue
        yaw = (1 - p) * 1.25
        P = project(PC[k], yaw, 0.0)
        x = 540 + (1 - p) * 300
        im.paste(P, (int(x - P.width / 2), int(780 + k * 340 - P.height / 2 + 150)), P)
    if t > 2.6: anim_text(im, 'ORÇAMENTO GRÁTIS', 1780, F(WIDE, 56), t - 2.6, LIME)
    im = vignette(im)
    if t < 0.12: im = glitch(im, 1, 8)
    return im

STEPS = [('01', 'CONVERSA', 0.6), ('02', 'PROPOSTA', 1.4), ('03', 'CONSTRUÇÃO', 2.2), ('04', 'DESTRAVADO', 3.3)]
def sc8(t):
    im = background(t); d = ImageDraw.Draw(im)
    label(im, '// COMO FUNCIONA', 260, t=t)
    top, gap = 470, 300
    cur = -1
    for k, (_, _, st) in enumerate(STEPS):
        if t >= st: cur = k
    d.line((215, top + 80, 215, top + 80 + gap * 3), fill=(44, 50, 60), width=6)
    if cur >= 0:
        prog = (cur + ease((t - STEPS[cur][2]) / 0.5)) / 3 if cur < 3 else 1
        d.line((215, top + 80, 215, top + 80 + gap * 3 * clamp(prog * 1.0)), fill=LIME, width=6)
    for k, (n, word, st) in enumerate(STEPS):
        p = ease((t - st) / 0.35)
        if p <= 0: continue
        y = top + k * gap; on = (k == cur)
        r = 70 if on else 56
        d.ellipse((215 - r, y + 80 - r, 215 + r, y + 80 + r), fill=LIME if on else SURF, outline=LIME, width=4)
        fw = d.textlength(n, font=F(WIDE, 54)); d.text((215 - fw / 2, y + 48), n, font=F(WIDE, 54), fill=BG if on else LIME)
        anim_text(im, word, y + 40, F(WIDE, 82 if on else 70), t - st, INK if on else (130, 138, 150), x=330 + int((1 - p) * 60))
    im = vignette(im)
    if cur == 3: im = glow(im, 540, top + gap * 3 + 80, 300, 0.25 * clamp((t - 3.3) / 0.3))
    if t < 0.12: im = glitch(im, 1, 9)
    return im

def sc9(t):
    im = background(t)
    im = glow(im, 540, 700, 420, 0.45 + 0.12 * math.sin(t * 3.5))
    paste_lock(im, 540, 700, 380, 1.0, math.sin(t * 1.6) * 0.55)
    anim_text(im, 'unlock', 960, F(IB, 140), t - 0.2)
    a = back((t - 0.5) / 0.4)
    if t > 0.5:
        pulse = 1 + 0.025 * math.sin(t * 6)
        w, h = int(820 * a * pulse), int(150 * a * pulse)
        if w > 10 and h > 10:
            b = Image.new('RGBA', (w, h), (0, 0, 0, 0)); bd = ImageDraw.Draw(b)
            bd.rounded_rectangle((0, 0, w - 1, h - 1), h // 2, fill=LIME + (255,))
            f = F(WIDE, max(8, int(60 * a * pulse))); tw = bd.textlength('ORÇAMENTO GRÁTIS', font=f)
            bd.text(((w - tw) / 2, h * 0.24), 'ORÇAMENTO GRÁTIS', font=f, fill=BG)
            im.paste(b, (int(540 - w / 2), int(1260 - h / 2)), b)
    anim_text(im, '@unlock_systems', 1420, F(IB, 60), t - 0.9)
    anim_text(im, 'WhatsApp (34) 99777-2264', 1510, F(ISB, 52), t - 1.1, MUTED)
    im = vignette(im)
    if t > 5.3: im = Image.blend(im, BLACK, clamp((t - 5.3) / 0.6))
    if t < 0.12: im = glitch(im, 1, 10)
    return im

SCENES = [('c1', sc1, 2.6), ('c2', sc2, 8.0), ('c3', sc3, 2.3), ('c4', sc4, 4.4), ('c5', sc5, 6.0),
          ('c6', sc6, 2.2), ('c7', sc7, 3.7), ('c8', sc8, 4.9), ('c9', sc9, 5.9)]

def encode(name, fn, secs):
    n = int(round(secs * FPS)); tmp = f'{WORK}/out/{name}.tmp.mp4'
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', tmp], stdin=subprocess.PIPE)
    for i in range(n): p.stdin.write(fn(i / FPS).convert('RGB').tobytes())
    p.stdin.close(); p.wait()
    if p.returncode == 0: os.replace(tmp, f'{WORK}/out/{name}.mp4')
    print(name, p.returncode, flush=True)

if __name__ == '__main__':
    os.makedirs(WORK + '/out', exist_ok=True)
    if sys.argv[1] == 'stills':
        picks = [('c1', 1.2), ('c2', 2.5), ('c2', 4.6), ('c2', 7.2), ('c3', 1.25), ('c4', 2.5), ('c5', 4.0), ('c6', 1.6), ('c7', 3.0), ('c8', 3.8), ('c9', 2.5)]
        S = {n: f for n, f, _ in SCENES}
        ims = [S[n](t).resize((216, 384)) for n, t in picks]
        sheet = Image.new('RGB', (216 * 6, 384 * 2)); [sheet.paste(m, ((k % 6) * 216, (k // 6) * 384)) for k, m in enumerate(ims)]
        sheet.save(WORK + '/out/stills.png')
        S['c3'](1.25).save(WORK + '/out/full_c3.jpg'); S['c5'](4.0).save(WORK + '/out/full_c5.jpg')
    else:
        only = sys.argv[2:] or [n for n, _, _ in SCENES]
        for n, f, s in SCENES:
            if n in only: encode(n, f, s)
