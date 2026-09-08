#!/usr/bin/env python3
"""
broll-stock.py — real-footage b-roll from Pexels, composited over a base video.

Two modes:
  --mode card  (default): full-screen CUTAWAY. During each cue window the base is
                replaced by a solid bg (black/white) with the stock clip centered in a
                rounded-corner SQUARE (PIL alpha mask). Pro "concept card" look.
  --mode inset: picture-in-picture. Bordered landscape inset in a corner, base shows
                through (for talking-heads that must stay on screen).

Burn captions AFTER this (canonical broll -> subs order) so they sit on top of the cards.

Cues file (JSON): {"cues":[{"start":3.3,"end":6.6,"query":"server room"}, ...]}

Usage:
  PEXELS_API_KEY=xxx python3 scripts/broll-stock.py <base.mp4> <cues.json> <out.mp4>
      [--mode card|inset] [--bg black|white] [--square-pct 0.62] [--radius-pct 0.09]
      [--pos top-right] [--width-pct 0.34] [--margin 56] [--seek 1.0]

Resilient: any cue whose fetch/download fails is skipped, never fatal.
"""
import argparse, json, os, subprocess, sys, urllib.request, urllib.parse
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
_VF = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FFMPEG = _VF if os.path.exists(_VF) else "ffmpeg"
KEY = os.environ.get("PEXELS_API_KEY", "").strip()


def probe_wh(path):
    o = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of",
         "default=noprint_wrappers=1:nokey=1", path]).decode().split()
    return int(o[0]), int(o[1])


def probe_duration(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path]).strip())


def pexels_search(query, want_h):
    if not KEY:
        return None
    url = ("https://api.pexels.com/videos/search?"
           + urllib.parse.urlencode({"query": query, "orientation": "landscape",
                                     "size": "medium", "per_page": 8}))
    try:
        req = urllib.request.Request(
            url, headers={"Authorization": KEY, "User-Agent": "Mozilla/5.0"})
        data = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e:
        print(f"  ! pexels search failed for '{query}': {e}")
        return None
    best = None
    for vid in data.get("videos", []):
        for f in vid.get("video_files", []):
            if f.get("width", 0) < f.get("height", 0):
                continue
            h = f.get("height", 0)
            score = (h < want_h, abs(h - want_h))
            if best is None or score < best[0]:
                best = (score, f.get("link"), vid.get("id"))
    return (best[1], best[2]) if best else None


def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        return dest
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
            f.write(r.read())
        return dest
    except Exception as e:
        print(f"  ! download failed: {e}")
        return None


def make_round_mask(size, radius, path):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    m.save(path)
    return path


def make_round_rect_mask(w, h, radius, path):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    m.save(path)
    return path


def fetch_cues(cues, assets, want_h, seek):
    """Return list of (raw_path, start, end, dur) for cues that fetched OK."""
    got = []
    for c in cues:
        s, e, q = float(c["start"]), float(c["end"]), c["query"]
        dur = max(0.4, e - s)
        res = pexels_search(q, want_h)
        if not res:
            print(f"  - skip '{q}' (no result)"); continue
        link, vid = res
        raw = download(link, os.path.join(assets, f"{vid}.mp4"))
        if not raw:
            continue
        got.append((raw, s, e, dur))
        print(f"  + '{q}' -> {vid}.mp4  [{s:.1f}-{e:.1f}]")
    return got


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base"); ap.add_argument("cues"); ap.add_argument("output")
    ap.add_argument("--mode", default="card", choices=["card", "inset"])
    ap.add_argument("--bg", default="black")
    ap.add_argument("--square-pct", type=float, default=0.62)
    ap.add_argument("--card-width-pct", type=float, default=0.60)  # smaller centered container ([YOUR_NAME])
    ap.add_argument("--card-aspect", type=float, default=16/9)     # rounded-rect aspect
    ap.add_argument("--radius-pct", type=float, default=0.055)
    ap.add_argument("--pos", default="top-right")
    ap.add_argument("--width-pct", type=float, default=0.34)
    ap.add_argument("--margin", type=int, default=56)
    ap.add_argument("--border", type=int, default=5)
    ap.add_argument("--seek", type=float, default=1.0)
    ap.add_argument("--assets-dir", default=None)
    ap.add_argument("--preset", default="fast"); ap.add_argument("--crf", default="18")
    a = ap.parse_args()

    if not KEY:
        sys.exit("broll-stock: PEXELS_API_KEY not set in env.")
    cues = json.load(open(a.cues))["cues"]
    BW, BH = probe_wh(a.base)
    BDUR = probe_duration(a.base)
    assets = a.assets_dir or os.path.join(os.path.dirname(a.base), "broll_assets")
    os.makedirs(assets, exist_ok=True)

    if a.mode == "card":
        # centered ROUNDED RECTANGLE (landscape footage shape), no border, on black/white bg
        CW = int(BW * a.card_width_pct); CW -= CW % 2
        CH = int(CW / a.card_aspect); CH -= CH % 2
        if CH > BH * 0.92:                      # keep within frame (e.g. vertical base)
            CH = int(BH * 0.92); CH -= CH % 2; CW = int(CH * a.card_aspect); CW -= CW % 2
        R = max(2, round(min(CW, CH) * a.radius_pct))
        cx, cy = (BW - CW) // 2, (BH - CH) // 2
        mask = make_round_rect_mask(CW, CH, R, "/tmp/broll_rect_mask.png")
        got = fetch_cues(cues, assets, CH * 2, a.seek)
        if not got:
            sys.exit("broll-stock: no clips fetched — check key/queries.")

        inputs = ["-i", a.base]
        for raw, s, e, dur in got:
            inputs += ["-stream_loop", "-1", "-ss", str(a.seek), "-t", f"{dur:.3f}", "-i", raw]
        mask_idx = 1 + len(got)
        inputs += ["-loop", "1", "-t", f"{BDUR:.3f}", "-i", mask]

        n = len(got)
        filters = [f"[{mask_idx}:v]format=gray,split={n}" + "".join(f"[m{i}]" for i in range(n))]
        for i, (raw, s, e, dur) in enumerate(got):
            vi = i + 1
            filters.append(
                f"[{vi}:v]scale={CW}:{CH}:force_original_aspect_ratio=increase,"
                f"crop={CW}:{CH},setsar=1,format=rgba[fg{i}];"
                f"[fg{i}][m{i}]alphamerge,setpts=PTS-STARTPTS+{s}/TB[sq{i}]")
        cur = "[0:v]"
        chain = []
        for i, (raw, s, e, dur) in enumerate(got):
            out = f"[t{i}]" if i < n - 1 else "[v]"
            chain.append(
                f"{cur}drawbox=x=0:y=0:w={BW}:h={BH}:color={a.bg}:t=fill:"
                f"enable='between(t,{s},{e})'[bg{i}];"
                f"[bg{i}][sq{i}]overlay=x={cx}:y={cy}:enable='between(t,{s},{e})'{out}")
            cur = out
        fc = ";".join(filters + chain)
        print(f"[broll-stock] CARD · {n}/{len(cues)} · {CW}x{CH} r{R} bg={a.bg} centered")

    else:  # inset
        iw = int(BW * a.width_pct); iw -= iw % 2
        ih = int(iw * 9 / 16); ih -= ih % 2
        b = a.border
        if a.pos == "top-left":
            x, y = a.margin, a.margin
        elif a.pos == "top-center":
            x, y = (BW - iw) // 2, a.margin
        else:
            x, y = BW - iw - a.margin, a.margin
        got = fetch_cues(cues, assets, ih * 2, a.seek)
        if not got:
            sys.exit("broll-stock: no clips fetched.")
        inputs = ["-i", a.base]
        for raw, s, e, dur in got:
            inputs += ["-stream_loop", "-1", "-ss", str(a.seek), "-t", f"{dur:.3f}", "-i", raw]
        filters = []
        for i, (raw, s, e, dur) in enumerate(got):
            vi = i + 1
            filters.append(
                f"[{vi}:v]scale={iw}:{ih}:force_original_aspect_ratio=increase,"
                f"crop={iw}:{ih},setsar=1,pad={iw+2*b}:{ih+2*b}:{b}:{b}:white,"
                f"setpts=PTS-STARTPTS+{s}/TB[ins{i}]")
        sw, sh = iw + 2 * b, ih + 2 * b
        cur = "[0:v]"; chain = []
        for i, (raw, s, e, dur) in enumerate(got):
            out = f"[t{i}]" if i < len(got) - 1 else "[v]"
            chain.append(
                f"{cur}drawbox=x={x+8}:y={y+8}:w={sw}:h={sh}:color=black@0.35:t=fill:"
                f"enable='between(t,{s},{e})'[sh{i}];"
                f"[sh{i}][ins{i}]overlay=x={x}:y={y}:enable='between(t,{s},{e})'{out}")
            cur = out
        fc = ";".join(filters + chain)
        print(f"[broll-stock] INSET · {len(got)}/{len(cues)} · {iw}x{ih} @ ({x},{y})")

    cmd = [FFMPEG, "-y"] + inputs + ["-filter_complex", fc,
           "-map", "[v]", "-map", "0:a:0", "-t", f"{BDUR + 0.1:.3f}", "-shortest",
           "-c:v", "libx264", "-preset", a.preset, "-crf", a.crf,
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", a.output]
    subprocess.run(cmd, check=True)
    print(f"[broll-stock] wrote {a.output}")


if __name__ == "__main__":
    main()
