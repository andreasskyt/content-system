# Artifact partials

The **artifact** is the object that proves the premise — the thing the video is
actually about. Copy a block, change the numbers and labels, drop it into
`artifact.html` in the spec. Never invent a new one when one of these fits.

All of these assume the classes in `templates/thumb.html` are loaded. Sizes are
tuned for a ~700px-wide artifact slot in the 1280×720 design space.

---

## 1. App / dashboard window

For: anything with a UI. Dashboards, CRMs, portals, admin panels.

```html
<div class="win" style="height:100%">
  <div class="win-bar">
    <span class="win-dot" style="background:#ff5f57"></span>
    <span class="win-dot" style="background:#febc2e"></span>
    <span class="win-dot" style="background:#28c840"></span>
    <div class="win-tabs"><span class="on">Overview</span><span>Revenue</span><span>Clients</span></div>
  </div>
  <div class="win-body">
    <div style="font-size:23px;font-weight:800;letter-spacing:-.4px">Business Overview</div>
    <div style="font-size:12.5px;color:var(--muted);font-weight:600;margin-top:3px">Last 30 days</div>
    <!-- KPI row -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px">
      <div style="border:1px solid var(--line);border-radius:14px;padding:13px 14px">
        <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:700">Revenue</div>
        <div style="font-size:27px;font-weight:800;letter-spacing:-1px;margin-top:6px">$184,920</div>
        <div style="font-size:12px;font-weight:700;color:var(--green);margin-top:4px">▲ 12.4%</div>
      </div>
      <!-- repeat ×3, vary label/value/colour -->
    </div>
  </div>
</div>
```

Line chart to drop inside a card (`viewBox` is fixed, `preserveAspectRatio="none"` stretches it):

```html
<svg width="100%" height="118" viewBox="0 0 400 132" preserveAspectRatio="none">
  <line x1="0" y1="32" x2="400" y2="32" stroke="#eef1f5"/>
  <line x1="0" y1="66" x2="400" y2="66" stroke="#eef1f5"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#1f9d63" stop-opacity=".22"/>
    <stop offset="100%" stop-color="#1f9d63" stop-opacity="0"/></linearGradient></defs>
  <path d="M0,104 C60,86 140,82 200,60 C260,40 340,24 400,16 L400,132 L0,132 Z" fill="url(#g)"/>
  <path d="M0,104 C60,86 140,82 200,60 C260,40 340,24 400,16" fill="none" stroke="#1f9d63" stroke-width="3" stroke-linecap="round"/>
  <circle cx="400" cy="16" r="5" fill="#1f9d63" stroke="#fff" stroke-width="2.5"/>
</svg>
```

Bar group:

```html
<div style="display:flex;align-items:flex-end;gap:10px;height:86px">
  <div style="flex:1;background:#3b82f6;height:44px;border-radius:4px 4px 0 0"></div>
  <div style="flex:1;background:#3b82f6;height:62px;border-radius:4px 4px 0 0"></div>
  <div style="flex:1;background:#dbe3ee;height:30px;border-radius:4px 4px 0 0"></div>
</div>
```

## 2. Code editor

For: code quality, AI-written code, bugs, refactors.

```html
<div class="win" style="height:100%;background:#0d1117;border-color:#20262e">
  <div class="win-bar" style="background:#161b22;border-color:#20262e">
    <span class="win-dot" style="background:#ff5f57"></span>
    <span class="win-dot" style="background:#febc2e"></span>
    <span class="win-dot" style="background:#28c840"></span>
    <div class="win-tabs"><span class="on" style="color:#e6edf3">page.tsx</span><span>api.ts</span></div>
  </div>
  <div style="padding:18px 20px;font-family:ui-monospace,Menlo,monospace;font-size:15px;line-height:1.75">
    <div style="color:#8b949e">1  <span style="color:#ff7b72">export default async function</span> <span style="color:#d2a8ff">Page</span>() {</div>
    <div style="color:#8b949e">2    <span style="color:#ff7b72">const</span> data = <span style="color:#ff7b72">await</span> supabase.<span style="color:#d2a8ff">from</span>(<span style="color:#a5d6ff">'orders'</span>)</div>
    <div style="background:rgba(229,72,77,.18);border-left:3px solid #e5484d;margin:0 -20px;padding:0 17px;color:#8b949e">3    <span style="color:#ff7b72">.select</span>(<span style="color:#a5d6ff">'*'</span>)  <span style="color:#f0883e">// no RLS, no limit</span></div>
    <div style="color:#8b949e">4  }</div>
  </div>
</div>
```

## 3. Automation / node graph (n8n-style)

For: workflows, automations, pipelines, "the system".

```html
<div class="win" style="height:100%;background:#1a1d23;border-color:#2b303a">
  <div style="padding:34px 26px;display:flex;align-items:center;gap:18px">
    <div style="background:#252932;border:1px solid #363c48;border-radius:12px;padding:14px 16px;min-width:120px">
      <div style="width:26px;height:26px;border-radius:7px;background:#f5a524"></div>
      <div style="color:#e6edf3;font-size:13px;font-weight:700;margin-top:9px">Webhook</div>
    </div>
    <svg width="46" height="12"><path d="M0 6 H38" stroke="#4a515e" stroke-width="2.5"/><path d="M38 1 L46 6 L38 11 Z" fill="#4a515e"/></svg>
    <!-- repeat node + connector; mark the broken one with border-color:#e5484d -->
  </div>
</div>
```

## 4. Chat thread (AI conversation)

For: prompting, AI output quality, "I asked ChatGPT/Claude".

```html
<div class="win" style="height:100%">
  <div class="win-body" style="padding:22px">
    <div style="background:#f2f4f8;border-radius:16px 16px 16px 4px;padding:13px 16px;font-size:14.5px;font-weight:600;max-width:78%">Build me a CRM for my cleaning business</div>
    <div style="background:var(--brand);color:#fff;border-radius:16px 16px 4px 16px;padding:13px 16px;font-size:14.5px;font-weight:600;max-width:82%;margin:14px 0 0 auto">Sure! Here's a complete CRM...</div>
  </div>
</div>
```

## 5. Terminal

For: errors, builds, deploys, "it broke".

```html
<div class="win" style="height:100%;background:#0c0d10;border-color:#1e2128">
  <div style="padding:20px 22px;font-family:ui-monospace,Menlo,monospace;font-size:15px;line-height:1.8;color:#c9d1d9">
    <div><span style="color:#3fb950">➜</span> npm run build</div>
    <div style="color:#e5484d;font-weight:700">✖ Failed to compile.</div>
    <div style="color:#8b949e">Type error: Property 'id' does not exist</div>
  </div>
</div>
```

## 6. Big stat block

For: one number that IS the story. Use instead of a window, not inside one.

```html
<div style="text-align:center">
  <div style="font-family:Montserrat;font-weight:900;font-size:210px;line-height:.86;letter-spacing:-8px;color:var(--accent)">87%</div>
  <div style="font-family:Poppins;font-weight:700;font-size:28px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin-top:10px">of builds never ship</div>
</div>
```

## 7. Document / invoice

For: money, contracts, proposals, reports.

```html
<div style="background:#fff;border-radius:6px;padding:34px 38px;box-shadow:0 40px 90px rgba(16,24,40,.22);height:100%">
  <div style="font-size:13px;font-weight:700;letter-spacing:1.5px;color:var(--muted);text-transform:uppercase">Invoice</div>
  <div style="font-family:Montserrat;font-weight:900;font-size:70px;letter-spacing:-2px;margin-top:14px">$24,000</div>
  <div style="height:1px;background:var(--line);margin:22px 0"></div>
  <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600"><span>Custom system build</span><span>$18,000</span></div>
</div>
```

## 8. Phone screen

For: mobile apps, DMs, notifications.

```html
<div style="width:300px;height:600px;background:#fff;border:12px solid #14161a;border-radius:44px;overflow:hidden;box-shadow:0 40px 80px rgba(16,24,40,.3)">
  <div style="height:34px;background:#14161a"></div>
  <div style="padding:20px"><!-- content --></div>
</div>
```

---

## Decor pieces

Error toast (absolute-positioned, pass in `decor`):

```html
<div class="badge" style="left:436px;bottom:186px">
  <svg width="26" height="26" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e5484d"/>
    <path d="M12 7v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="12" cy="16.6" r="1.35" fill="#fff"/></svg>
  <div><div class="t">Failed to fetch data</div><div class="s">500 · undefined is not a function</div></div>
</div>
```

Hand-drawn circle annotation — one per thumbnail, maximum:

```html
<svg class="circle-annot" style="left:760px;top:300px" width="300" height="190" viewBox="0 0 300 190">
  <ellipse cx="150" cy="95" rx="140" ry="82" fill="none" stroke="var(--accent)" stroke-width="8"
           stroke-linecap="round" stroke-dasharray="470 60" transform="rotate(-4 150 95)"/>
</svg>
```

Curved arrow:

```html
<svg class="arrow-annot" style="left:520px;top:400px" width="220" height="160" viewBox="0 0 220 160">
  <path d="M10 20 C90 30 150 70 180 120" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round"/>
  <path d="M160 112 L186 130 L156 140 Z" fill="var(--accent)"/>
</svg>
```

Tape strip (adds physical texture to a flat composition):

```html
<div style="position:absolute;z-index:9;left:300px;top:40px;width:150px;height:38px;
     background:rgba(226,214,180,.75);transform:rotate(-6deg);
     box-shadow:0 2px 6px rgba(0,0,0,.12)"></div>
```
