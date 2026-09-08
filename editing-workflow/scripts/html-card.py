#!/usr/bin/env python3
"""
html-card.py — render a BRAND motion-graphic from a SPEC into a PNG (and optional mp4).

The generalization layer: components are a fixed visual vocabulary (node-flow, kpi-row,
chart, checklist, kinetic, image-frame); the SPEC fills them with whatever a given video
needs. I (Claude) author specs per transcript from my own ideas — this renderer is
topic-agnostic. HTML/CSS is rendered through installed Chrome (render-shot.cjs) so we get
real glows / icons / charts / glass, not PIL primitives.

Spec JSON (any topic):
  { "w":1080,"h":1920,"bg":"light",
    "header":["CLIENT","onboarding"],          # [green, white]; optional
    "component":"node-flow",
    "panel":{"w":1000,"h":560},
    "nodes":[{"icon":"file-text","label":"New Client\\nInquiry","hot":false}, ...] }

Components & their fields:
  node-flow : panel{w,h}, title?, nodes[{icon,label,hot?}]
  kpi-row   : title?, kpis[{icon,value,label}]
  chart     : title?, value?, kind:"area"|"bar", data[num], xlabels[str]?, panel{w,h}
  checklist : items[{icon?,text}]
  kinetic   : lines[[ {t,c:"g"|"w"} ... ]]
  image     : src, w, h   (rounded media frame)

Usage:
  python3 scripts/html-card.py spec.json out.png [--animate 3.5 --out-mp4 card.mp4]
"""
import argparse, html, json, math, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ICONS = os.path.join(ROOT, "node_modules", "lucide-static", "icons")
TOKENS = open(os.path.join(ROOT, "src", "motion", "tokens.css")).read()
COMPONENTS = open(os.path.join(ROOT, "src", "motion", "components.css")).read()
SHOT = os.path.join(HERE, "render-shot.cjs")
_V = os.path.join(ROOT, "bin", "ffmpeg-libass")
FFMPEG = _V if os.path.exists(_V) else "ffmpeg"

# Declarative timeline engine. Any element: data-in (slide-up/slide-left/drop/scale/scale-blur/
# fade/draw), data-ease (easeOut/overshoot/bounce/fastIn/linear), data-delay, data-dur, data-dist.
# SVG paths use data-in="draw". Stage-level OUT via window.__OUT={start,dur,type}. Driven per
# frame by render-shot.cjs seq; static renders call __setProgress(999) -> final state.
ANIM = """<style>.mg-anim,[data-in]{opacity:0;will-change:opacity,transform,filter}</style>
<script>(function(){
function bz(u,a,b){var v=1-u;return 3*v*v*u*a+3*v*u*u*b+u*u*u;}
function cb(x1,y1,x2,y2){return function(t){if(t<=0)return 0;if(t>=1)return 1;var u=t,i,x,d;
for(i=0;i<6;i++){x=bz(u,x1,x2)-t;d=(bz(u+1e-3,x1,x2)-bz(u-1e-3,x1,x2))/2e-3;if(Math.abs(x)<1e-4)break;u-=x/(d||1e-6);}return bz(u,y1,y2);};}
var E={linear:function(t){return t;},easeOut:cb(.25,1,.5,1),overshoot:cb(.34,1.56,.64,1),
bounce:cb(.175,.885,.32,1.275),fastIn:cb(.7,0,.84,0),easeInOut:cb(.4,0,.2,1)};
function ap(el,ty,e){var d=parseFloat(el.getAttribute('data-dist')||70),tx=0,ty2=0,sc=1,op=1,bl=0,e1=Math.min(1,Math.max(0,e));
if(ty==='fade'){op=e1;}
else if(ty==='slide-up'){op=Math.min(1,e*1.4);ty2=(1-e)*d;}
else if(ty==='slide-left'){op=Math.min(1,e*1.4);tx=-(1-e)*d;}
else if(ty==='slide-right'){op=Math.min(1,e*1.4);tx=(1-e)*d;}
else if(ty==='drop'){op=Math.min(1,e*1.6);ty2=-(1-e)*d;}
else if(ty==='scale'){op=Math.min(1,e*2.2);sc=Math.max(0,e);}
else if(ty==='scale-blur'){op=e1;sc=.7+.3*e1;bl=(1-e1)*14;}
else if(ty==='draw'){if(el.__len==null){try{el.__len=el.getTotalLength();el.style.strokeDasharray=el.__len;}catch(x){el.__len=0;}}el.style.strokeDashoffset=(1-e1)*el.__len;el.style.opacity=1;return;}
else{op=Math.min(1,e*2);sc=.55+.45*e;}
el.style.opacity=op;el.style.transform='translate('+tx+'px,'+ty2+'px) scale('+sc+')';el.style.filter=bl>0?'blur('+bl+'px)':'';}
window.__setProgress=function(t){var els=document.querySelectorAll('[data-in],.mg-anim'),i;
for(i=0;i<els.length;i++){var el=els[i];var dl=parseFloat(el.getAttribute('data-delay')||0),
du=parseFloat(el.getAttribute('data-dur')||.45),ef=E[el.getAttribute('data-ease')||'easeOut']||E.easeOut;
ap(el,el.getAttribute('data-in')||'pop',ef((t-dl)/du));}
var O=window.__OUT;if(O){var st=document.querySelector('.stage'),op=Math.max(0,Math.min(1,(t-O.start)/O.dur));
if(op>0){var oe=E.fastIn(op);if(O.type==='slide-blur'){st.style.transform='translateX('+(-oe*120)+'%)';st.style.filter='blur('+(oe*8)+'px)';}
else if(O.type==='fade'){st.style.opacity=1-oe;}else if(O.type==='scale-fade'){st.style.transform='scale('+(1-.06*oe)+')';st.style.opacity=1-oe;}
else if(O.type==='flash'){st.style.filter='brightness('+(1+oe*8)+')';}}}};
})();</script>"""


def icon(name):
    p = os.path.join(ICONS, f"{name}.svg")
    if not os.path.exists(p):
        p = os.path.join(ICONS, "circle.svg")
    return open(p).read()


def lbl(s):
    return html.escape(s).replace("\\n", "<br>").replace("\n", "<br>")


# ---------- components ----------
def c_node_flow(s):
    pw = s.get("panel", {}).get("w", 1000)
    ph = s.get("panel", {}).get("h", 560)
    top = ""
    if s.get("title") or s.get("pill"):
        top = (f'<div class="topbar"><div class="title">{lbl(s.get("title",""))}</div>'
               f'<div class="pill"><span class="dot"></span>{lbl(s.get("pill","Workspaces"))}</div></div>')
    items = []
    nodes = s["nodes"]
    for i, n in enumerate(nodes):
        hot = " hot" if n.get("hot") else ""
        items.append(
            f'<div class="node" data-in="scale" data-ease="overshoot" '
            f'data-delay="{0.15 + i*0.16:.2f}" data-dur="0.38" style="transform-origin:center">'
            f'<div class="tile{hot}">{icon(n["icon"])}</div>'
            f'<div class="lbl">{lbl(n["label"])}</div></div>')
        if i < len(nodes) - 1:
            items.append(f'<div class="conn" data-in="fade" data-delay="{0.26 + i*0.16:.2f}" data-dur="0.22"></div>')
    return (f'<div class="panel" style="width:{pw}px;height:{ph}px">{top}'
            f'<div class="flow">{"".join(items)}</div></div>')


def c_kpi_row(s):
    pw = s.get("panel", {}).get("w", 1000)
    top = (f'<div class="topbar"><div class="title">{lbl(s.get("title",""))}</div></div>'
           if s.get("title") else "")
    chips = []
    for j, k in enumerate(s["kpis"]):
        ic = f'<div class="ico">{icon(k["icon"])}</div>' if k.get("icon") else ""
        chips.append(
            f'<div class="kpi" data-in="slide-up" data-ease="overshoot" data-dist="55" '
            f'data-delay="{0.3 + j*0.18:.2f}" data-dur="0.5">{ic}'
            f'<div class="v">{lbl(k["value"])}</div><div class="l">{lbl(k["label"])}</div></div>')
    pad = "padding:74px 30px 34px" if top else "padding:30px"
    return (f'<div class="panel" style="width:{pw}px;{pad}">{top}'
            f'<div class="kpis">{"".join(chips)}</div></div>')


def _area_svg(data, w, h):
    n = len(data)
    lo, hi = min(data), max(data)
    rng = (hi - lo) or 1
    pad = 16
    def X(i): return pad + i / (n - 1) * (w - 2 * pad)
    def Y(v): return h - pad - (v - lo) / rng * (h - 2 * pad) * 0.92
    pts = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, v in enumerate(data))
    grid = "".join(f'<line x1="0" y1="{h*f:.0f}" x2="{w}" y2="{h*f:.0f}" '
                   f'stroke="rgba(255,255,255,.05)" stroke-width="1"/>' for f in (.25, .5, .75))
    return (f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="none" style="height:{h}px">'
            f'<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="rgba(46,200,110,.55)"/>'
            f'<stop offset="1" stop-color="rgba(46,200,110,.02)"/></linearGradient></defs>'
            f'{grid}<polygon points="{pad},{h-pad} {pts} {w-pad},{h-pad}" fill="url(#ag)"/>'
            f'<polyline points="{pts}" fill="none" stroke="#7bf0ad" stroke-width="3" '
            f'stroke-linejoin="round" filter="drop-shadow(0 0 6px rgba(80,240,150,.6))"/></svg>')


def _bar_svg(data, w, h):
    n = len(data)
    hi = max(data) or 1
    bw = w / n * 0.55
    gap = w / n
    bars = []
    for i, v in enumerate(data):
        bh = v / hi * (h - 24)
        x = i * gap + (gap - bw) / 2
        bars.append(f'<rect x="{x:.1f}" y="{h-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
                    f'rx="6" fill="url(#bg)"/>')
    return (f'<svg viewBox="0 0 {w} {h}" style="height:{h}px">'
            f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="#4ae08a"/><stop offset="1" stop-color="rgba(46,200,110,.25)"/>'
            f'</linearGradient></defs>{"".join(bars)}</svg>')


def c_chart(s):
    pw = s.get("panel", {}).get("w", 1000)
    cw, ch = pw - 80, s.get("panel", {}).get("h", 300)
    svg = _bar_svg(s["data"], cw, ch) if s.get("kind") == "bar" else _area_svg(s["data"], cw, ch)
    head = ""
    if s.get("title"):
        head += f'<div class="ctitle">{lbl(s["title"])}</div>'
    if s.get("value"):
        head += f'<div class="cval">{lbl(s["value"])}</div>'
    return (f'<div class="panel" data-in="scale-blur" data-ease="easeOut" data-delay="0.2" '
            f'data-dur="0.6" style="width:{pw}px;padding:30px 40px 34px;transform-origin:center">'
            f'<div class="chart">{head}{svg}</div></div>')


def c_checklist(s):
    rows = []
    for j, it in enumerate(s["items"]):
        ic = icon(it.get("icon", "check"))
        rows.append(
            f'<div class="row" data-in="slide-left" data-ease="overshoot" data-dist="70" '
            f'data-delay="{0.25 + j*0.2:.2f}" data-dur="0.5">'
            f'<div class="mk">{ic}</div>{lbl(it["text"])}</div>')
    return f'<div class="checklist">{"".join(rows)}</div>'


def c_kinetic(s):
    lines = []
    for i, line in enumerate(s["lines"]):
        spans = "".join(f'<span class="{seg.get("c","w")}">{lbl(seg["t"])}</span> ' for seg in line)
        lines.append(f'<div class="line" data-in="slide-up" data-ease="overshoot" data-dist="55" '
                     f'data-delay="{0.15 + i*0.16:.2f}" data-dur="0.5">{spans}</div>')
    return f'<div class="kinetic">{"".join(lines)}</div>'


def c_icon_grid(s):
    anim = s.get("anim", "drop")          # drop-with-bounce by default
    ease = s.get("ease", "bounce")
    tiles = "".join(
        f'<div class="tile" data-in="{anim}" data-ease="{ease}" data-dist="90" '
        f'data-delay="{0.2 + j*0.07:.2f}" data-dur="0.42" '
        f'style="transform-origin:center">{icon(n)}</div>'
        for j, n in enumerate(s["icons"]))
    return f'<div class="icongrid">{tiles}</div>'


def c_hub(s):
    center = s.get("center", {"icon": "database", "label": "One Place"})
    sats = s["satellites"]
    n = len(sats)
    R = 340   # orbit radius (px from frame center)
    # central bubble, dead-center of the frame (outer div positions, inner div animates)
    parts = [f'<div class="hub-pos" style="left:50%;top:50%">'
             f'<div class="hub-center" data-in="scale" data-ease="overshoot" data-delay="0.1" '
             f'data-dur="0.5" style="transform-origin:center">{icon(center["icon"])}'
             f'<div class="ct">{lbl(center["label"])}</div></div></div>']
    for i, sat in enumerate(sats):
        ang = math.radians(-90 + i * (360.0 / n))
        x = round(R * math.cos(ang))
        y = round(R * math.sin(ang))
        parts.append(
            f'<div class="hub-pos" style="left:calc(50% + {x}px);top:calc(50% + {y}px)">'
            f'<div class="hub-sat" data-in="scale" data-ease="overshoot" '
            f'data-delay="{0.4 + i*0.1:.2f}" data-dur="0.45" style="transform-origin:center">'
            f'<div class="st">{icon(sat["icon"])}</div><div class="sl">{lbl(sat["label"])}</div></div></div>')
    return f'<div class="hubwrap">{"".join(parts)}</div>'


def c_sheets(s):
    names = s["sheets"]
    pos = [(30, 20), (520, 70), (150, 250), (560, 300), (300, 470), (0, 430)]
    cards = []
    for j, nm in enumerate(names):
        x, y = pos[j % len(pos)]
        grid = ('<div class="cell h"></div>' * 4) + ('<div class="cell"></div>' * 8)
        cards.append(f'<div class="sheet" data-in="scale" data-ease="overshoot" '
                     f'data-delay="{0.1 + j*0.13:.2f}" data-dur="0.4" '
                     f'style="left:{x}px;top:{y}px;transform-origin:center">'
                     f'<div class="sh">{icon("table-2")}{lbl(nm)}</div>'
                     f'<div class="sgrid">{grid}</div></div>')
    delay = 0.2 + len(names) * 0.13
    xmark = (f'<div class="xmark"><svg viewBox="0 0 1080 640" preserveAspectRatio="none">'
             f'<path d="M150,90 L930,560" data-in="draw" data-ease="easeOut" data-delay="{delay:.2f}" data-dur="0.35"/>'
             f'<path d="M930,90 L150,560" data-in="draw" data-ease="easeOut" data-delay="{delay+0.2:.2f}" data-dur="0.35"/>'
             f'</svg></div>')
    return f'<div class="sheets">{"".join(cards)}{xmark}</div>'


def c_slack(s):
    msgs = s["messages"]
    rows = []
    for j, m in enumerate(msgs):
        rows.append(f'<div class="smsg" data-in="slide-up" data-ease="overshoot" data-dist="45" '
                    f'data-delay="{0.4 + j*0.45:.2f}" data-dur="0.45">'
                    f'<div class="av" style="background:{m.get("color","#2EA44F")}">{lbl(m["name"][0])}</div>'
                    f'<div class="mb"><div class="nm">{lbl(m["name"])}'
                    f'<span class="tm">{lbl(m.get("time",""))}</span></div>'
                    f'<div class="tx">{lbl(m["text"])}</div></div></div>')
    return (f'<div class="slack"><div class="stop">{icon("hash")}{lbl(s.get("workspace","Agency Workspace"))}</div>'
            f'<div class="schan"># {lbl(s.get("channel","general"))}</div>{"".join(rows)}</div>')


def c_feed(s):
    top = (f'<div class="ftop"><div class="ft">{lbl(s.get("title","Live Feed"))}</div>'
           f'<div class="pill"><span class="dot"></span>{lbl(s.get("pill","Live"))}</div></div>')
    rows = []
    for j, it in enumerate(s["items"]):
        tm = f'<div class="tm">{lbl(it.get("time",""))}</div>' if it.get("time") else ""
        # text may contain <b>..</b> already-escaped markers via {b}..{/b}
        txt = lbl(it["text"]).replace("[b]", "<b>").replace("[/b]", "</b>")
        rows.append(f'<div class="fitem" data-in="slide-up" data-ease="overshoot" data-dist="42" '
                    f'data-delay="{0.3 + j*0.22:.2f}" data-dur="0.45">'
                    f'<div class="av">{icon(it.get("icon","trophy"))}</div>'
                    f'<div class="txt">{txt}</div>{tm}</div>')
    return f'<div class="feed">{top}{"".join(rows)}</div>'


def c_form(s):
    cls = "formcard dark" if s.get("theme") == "dark" else "formcard"
    head = f'<div class="fhead"><div class="dot">{icon(s.get("icon","table-2"))}</div>{lbl(s["title"])}</div>'
    rows = []
    for j, f in enumerate(s["fields"]):
        val = (f'<div class="ftag">{lbl(f["value"])}</div>' if f.get("tag")
               else f'<div class="fval">{lbl(f["value"])}</div>')
        li = icon(f["icon"]) if f.get("icon") else ""
        rows.append(f'<div class="frow" data-in="slide-left" data-ease="easeOut" data-dist="60" '
                    f'data-delay="{0.35 + j*0.14:.2f}" data-dur="0.45">'
                    f'<div class="flabel">{li}{lbl(f["label"])}</div>{val}</div>')
    return f'<div class="{cls}">{head}{"".join(rows)}</div>'


def c_dashboard(s):
    kpis = "".join(
        f'<div class="dk" data-in="slide-up" data-ease="overshoot" data-dist="45" '
        f'data-delay="{0.3 + j*0.12:.2f}" data-dur="0.45"><div class="v">{lbl(k["value"])}</div>'
        f'<div class="l">{lbl(k["label"])}</div></div>' for j, k in enumerate(s["kpis"]))
    data = s.get("data", [20, 30, 28, 40, 46, 44, 55, 62, 70, 76, 82, 90, 96])
    svg = _area_svg(data, 900, 210)
    bars = s.get("bars", [40, 72, 55, 88, 62, 76])
    mb = max(bars) or 1
    blabels = s.get("bar_labels")
    if blabels:   # labeled bar chart (e.g. Client 1, Client 2 ... on x-axis)
        cols = "".join(f'<div class="bc"><div class="bar" style="height:{round(b/mb*100)}%"></div>'
                       f'<div class="bl">{lbl(l)}</div></div>' for b, l in zip(bars, blabels))
        barsec = (f'<div class="dbarsx" data-in="scale-blur" data-ease="easeOut" data-delay="0.85" data-dur="0.55">'
                  f'<div class="bt">{lbl(s.get("bars_title","Revenue by client"))}</div><div class="bw">{cols}</div></div>')
    else:
        barhtml = "".join(f'<div class="bar" style="height:{round(b/mb*100)}%"></div>' for b in bars)
        barsec = (f'<div class="dbars" data-in="scale-blur" data-ease="easeOut" data-delay="0.85" data-dur="0.55">'
                  f'{barhtml}</div>')
    w_pct = 94 if s.get("wide") else 80
    cls = "dashfull light" if s.get("theme") == "light" else "dashfull"
    return (f'<div class="{cls}" style="width:{w_pct}%">'
            f'<div class="dtop"><div class="dtitle">{lbl(s.get("title","Dashboard"))}</div>'
            f'<div class="pill"><span class="dot"></span>{lbl(s.get("pill","Live"))}</div></div>'
            f'<div class="dbody"><div class="dkpis">{kpis}</div><div class="drow2">'
            f'<div class="dchart" data-in="scale-blur" data-ease="easeOut" data-delay="0.7" data-dur="0.55">'
            f'<div class="ct">{lbl(s.get("chart_title","Revenue · 90 days"))}</div>{svg}</div>'
            f'{barsec}'
            f'</div></div></div>')


def c_image(s):
    return (f'<img class="frame" src="file://{s["src"]}" '
            f'style="width:{s.get("w",900)}px;height:{s.get("h",506)}px;object-fit:cover">')


COMPONENTS_FN = {"node-flow": c_node_flow, "kpi-row": c_kpi_row, "chart": c_chart,
                 "checklist": c_checklist, "kinetic": c_kinetic, "icon-grid": c_icon_grid,
                 "form": c_form, "dashboard": c_dashboard, "hub": c_hub, "feed": c_feed,
                 "sheets": c_sheets, "slack": c_slack, "image": c_image}


def build_html(spec):
    w, h = spec.get("w", 1080), spec.get("h", 1920)
    bg = spec.get("bg", "light")
    header = ""
    if spec.get("header"):
        hd = spec["header"]
        inner = (f'<span class="g">{lbl(hd[0])}</span> <span class="w">{lbl(hd[1])}</span>'
                 if len(hd) > 1 else f'<span class="g">{lbl(hd[0])}</span>')
        header = f'<div class="header mg-anim" data-delay="0">{inner}</div>'
    body = COMPONENTS_FN[spec["component"]](spec)
    if spec["component"] == "hub":
        bg += " hub-stage"
    return (f'<!doctype html><html><head><meta charset="utf-8">'
            f'<style>{TOKENS}{COMPONENTS}</style>{ANIM}</head>'
            f'<body><div class="stage {bg}" style="width:{w}px;min-height:{h}px">'
            f'{header}{body}</div></body></html>'), w, h


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec"); ap.add_argument("output")
    ap.add_argument("--animate", type=float, default=0.0, help="static card -> mp4 (fade+push) of N sec")
    ap.add_argument("--animate-seq", type=float, default=0.0,
                    help="animate .mg-anim elements one-at-a-time over N sec -> mp4 (frame sequence)")
    ap.add_argument("--out-mp4", default=None)
    ap.add_argument("--out-type", default=None,
                    help="stage out animation for --animate-seq: slide-blur|fade|scale-fade|flash")
    ap.add_argument("--out-dur", type=float, default=0.4)
    ap.add_argument("--fps", type=int, default=24)
    a = ap.parse_args()
    spec = json.load(open(a.spec))
    doc, w, h = build_html(spec)
    if a.animate_seq > 0 and a.out_type:
        inj = (f'<script>window.__OUT={{start:{a.animate_seq - a.out_dur:.3f},'
               f'dur:{a.out_dur},type:"{a.out_type}"}}</script></body>')
        doc = doc.replace("</body>", inj)
    tmp_html = "/tmp/html_card.html"
    open(tmp_html, "w").write(doc)

    r = subprocess.run(["node", SHOT, tmp_html, a.output, str(w), str(h)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"html-card: render failed: {r.stderr.strip() or r.stdout.strip()}")
    print(f"[html-card] {spec['component']} -> {a.output}")

    if a.animate_seq > 0:
        out_mp4 = a.out_mp4 or os.path.splitext(a.output)[0] + ".mp4"
        fdir = "/tmp/html_card_frames"
        if os.path.isdir(fdir):
            for f in os.listdir(fdir):
                os.remove(os.path.join(fdir, f))
        rs = subprocess.run(["node", SHOT, "seq", tmp_html, fdir, str(w), str(h),
                             str(a.fps), str(a.animate_seq)], capture_output=True, text=True)
        if rs.returncode != 0:
            sys.exit(f"html-card: seq failed: {rs.stderr.strip()}")
        subprocess.run([FFMPEG, "-y", "-framerate", str(a.fps), "-i", f"{fdir}/frame_%05d.png",
                        "-vf", "format=yuv420p", "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                        "-movflags", "+faststart", out_mp4],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"[html-card] animated-seq -> {out_mp4}")
        return

    if a.animate > 0:
        out_mp4 = a.out_mp4 or os.path.splitext(a.output)[0] + ".mp4"
        # gentle reveal: 0.4s fade-in + slow 1.0->1.04 push, held for `animate` seconds
        D = a.animate
        vf = (f"scale={w*2}:-2,zoompan=z='min(1.04,1.0+0.0008*in)':d={int(D*a.fps)}:"
              f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}:fps={a.fps},"
              f"fade=t=in:st=0:d=0.4,format=yuv420p")
        subprocess.run([FFMPEG, "-y", "-loop", "1", "-t", str(D), "-i", a.output,
                        "-vf", vf, "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                        "-movflags", "+faststart", out_mp4],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"[html-card] animated -> {out_mp4}")


if __name__ == "__main__":
    main()
