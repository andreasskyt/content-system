# Reusable HTML components

All components use the [BRAND] brand tokens from `brand.md`. Copy them into slides as needed.

## Tag / category label (top of every slide)

Small uppercase label above the headline to categorize the content.

```html
<span class="sans" style="display:inline-block;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--brand-primary);margin-bottom:16px;">THE PROBLEM</span>
```

Colors:
- Light slides: `var(--brand-primary)` (deep green)
- Dark slides: `var(--brand-accent-gold)` (gold pop against near-black)
- Gradient slides: `rgba(255,255,255,0.7)`

## Headline

```html
<h1 class="sans" style="font-size:30px;font-weight:700;letter-spacing:-0.4px;line-height:1.15;color:var(--brand-text-dark);margin:0;">
  Stop hiring editors.<br>Start shipping systems.
</h1>
```

On dark slides: `color:#fff`. On gradient: `color:#fff`.

## Progress bar (every slide, bottom)

Absolute-positioned at the bottom. Fill = `(index+1)/total * 100%`.

```html
<div style="position:absolute;bottom:0;left:0;right:0;padding:16px 28px 20px;z-index:10;display:flex;align-items:center;gap:10px;">
  <div style="flex:1;height:3px;background:rgba(0,0,0,0.08);border-radius:2px;overflow:hidden;">
    <div style="height:100%;width:42%;background:var(--brand-primary);border-radius:2px;"></div>
  </div>
  <span class="sans" style="font-size:11px;color:rgba(0,0,0,0.3);font-weight:500;">3/7</span>
</div>
```

Adapt for dark slides: track `rgba(255,255,255,0.12)`, fill `#fff`, counter `rgba(255,255,255,0.4)`.

## Swipe arrow (every slide except last)

Right-edge chevron telling users to swipe.

```html
<div style="position:absolute;right:0;top:0;bottom:0;width:48px;z-index:9;display:flex;align-items:center;justify-content:center;background:linear-gradient(to right,transparent,rgba(0,0,0,0.06));">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M9 6l6 6-6 6" stroke="rgba(0,0,0,0.25)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</div>
```

Dark slides: bg `rgba(255,255,255,0.08)`, stroke `rgba(255,255,255,0.35)`.

## Logo lockup (first and last slides)

Uses the profile picture at `profile.png` (must be copied into each carousel folder — see brand.md).

```html
<div style="display:flex;align-items:center;gap:12px;">
  <img src="profile.png" alt="[BRAND_SLUG]" style="width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;">
  <span class="sans" style="font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--brand-text-dark);">[BRAND]</span>
</div>
```

On dark/gradient: text color = `#fff`. Never substitute a monogram circle here.

## Strikethrough pill (problem slide — "what's being replaced")

```html
<span class="sans" style="display:inline-block;font-size:11px;padding:5px 12px;border:1px solid rgba(255,255,255,0.15);border-radius:20px;color:rgba(255,255,255,0.5);text-decoration:line-through;margin:4px 4px 0 0;">Hiring editors</span>
```

## Tag pill (feature labels, options)

```html
<span class="sans" style="display:inline-block;font-size:11px;padding:5px 12px;background:rgba(48,59,47,0.12);border-radius:20px;color:var(--brand-primary);margin:4px 4px 0 0;">n8n</span>
```

On dark slides: `background:rgba(255,255,255,0.08)`, `color:var(--brand-accent-gold)` (gold pop against green-free dark).

## Quote / prompt box

```html
<div style="padding:16px 18px;background:rgba(0,0,0,0.25);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
  <p class="sans" style="font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin:0 0 6px 0;">The shift</p>
  <p class="sans" style="font-size:15px;color:#fff;line-height:1.4;margin:0;font-weight:400;">"The work didn't need a human. It needed a system."</p>
</div>
```

## Feature list row (proof slide)

```html
<div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0;border-bottom:1px solid var(--brand-light-border);">
  <span style="color:var(--brand-primary);font-size:15px;width:20px;text-align:center;line-height:1.5;">●</span>
  <div>
    <div class="sans" style="font-size:14px;font-weight:600;color:var(--brand-text-dark);line-height:1.3;">Auto-cut retakes</div>
    <div class="sans" style="font-size:12px;color:var(--brand-text-muted);line-height:1.4;margin-top:2px;">Claude picks the best take from N tries</div>
  </div>
</div>
```

The bullet `●` can be swapped for a small SVG icon or a Lucide/Unicode glyph (→, ✓, ◆, ▲).

## Numbered step (how-to slide)

```html
<div style="display:flex;align-items:flex-start;gap:16px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
  <span class="sans" style="font-size:26px;font-weight:700;letter-spacing:-0.5px;color:var(--brand-primary);min-width:38px;line-height:1;">01</span>
  <div>
    <div class="sans" style="font-size:14px;font-weight:600;color:#fff;line-height:1.3;">Upload raw video</div>
    <div class="sans" style="font-size:12px;color:rgba(255,255,255,0.55);line-height:1.4;margin-top:2px;">/short form raw or /long form raw folder</div>
  </div>
</div>
```

Dark slide version above. Light version: border `var(--brand-light-border)`, title `var(--brand-text-dark)`, description `var(--brand-text-muted)`.

## CTA button (last slide only)

```html
<div style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:var(--brand-light-bg);color:var(--brand-primary-dark);font-family:'Poppins',sans-serif;font-weight:600;font-size:14px;border-radius:28px;">
  Follow @[IG_HANDLE] →
</div>
```

## YouTube thumbnail CTA slide (last slide, YouTube carousels only)

Used when the carousel is about a specific YouTube video and the CTA drives a ManyChat DM flow ("Comment KEYWORD → get the link"). Thumbnail is fetched via `scripts/fetch_youtube_thumbnail.py` and embedded as a base64 data URI so it survives the Playwright PNG export.

The card is 340×191 (16:9, fits inside the slide's 348px content width) with rounded corners and a subtle border to separate it from the gradient background. A centered play-button overlay signals "this is a video" so the viewer recognizes it even at thumb-scrolling speed.

```html
<div class="slide gradient center">
  <div class="lockup" style="margin-bottom:22px;">
    <div class="circle" style="background:#fff;color:var(--brand-primary);">S</div>
    <div class="name" style="color:#fff;">[BRAND]</div>
  </div>

  <!-- Framed thumbnail card with play-button overlay -->
  <div style="position:relative;width:340px;height:191px;margin:0 auto 22px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.15);box-shadow:0 6px 18px rgba(0,0,0,0.35);">
    <img src="data:image/jpeg;base64,__THUMBNAIL_B64__" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
      <div style="width:54px;height:54px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--brand-primary-dark)"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </div>
  </div>

  <h1 style="color:#fff;font-size:26px;line-height:1.18;text-align:center;">
    Comment <span style="color:var(--brand-accent-gold);">WATCH</span><br>and I'll DM you the link.
  </h1>

  <div style="text-align:center;margin-top:14px;color:rgba(255,255,255,0.7);font-size:13px;font-weight:500;letter-spacing:0.4px;">@[IG_HANDLE]</div>

  <!-- progress bar at 100%, no swipe arrow — last slide -->
  <div class="progress">
    <div class="progress-track"><div class="progress-fill" style="width:100%;"></div></div>
    <span class="progress-counter">N/N</span>
  </div>
</div>
```

Rules for this slide:
- **Swap the keyword** (`WATCH`) per carousel — keep it one uppercase word, ≤7 chars, easy to spell.
- **Always embed as base64.** An `https://img.youtube.com/...` URL will render in the browser preview but will NOT survive `scripts/export_carousel.py` (see `export-guide.md`).
- **Keyword always in gold** (`--brand-accent-gold`) — this is the gradient surface, where gold is allowed.
- **No swipe arrow** (last slide).
- **Caption** for the IG preview frame can reference the keyword too: "comment WATCH and i'll send the video →".

## Instagram preview frame (wraps the carousel for preview in chat)

```html
<div class="ig-frame" style="width:420px;margin:20px auto;background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow:hidden;font-family:'Poppins',sans-serif;">
  <!-- Header -->
  <div class="ig-header" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eee;">
    <img src="profile.png" alt="[BRAND_SLUG]" style="width:32px;height:32px;border-radius:50%;object-fit:cover;display:block;">
    <div>
      <div style="font-size:13px;font-weight:600;color:#222;">[BRAND_SLUG]</div>
      <div style="font-size:11px;color:#888;">[BRAND]</div>
    </div>
  </div>

  <!-- Carousel viewport -->
  <div class="carousel-viewport" style="position:relative;width:420px;height:525px;overflow:hidden;">
    <div class="carousel-track" style="display:flex;height:100%;transform:translateX(0);transition:transform 0.35s ease;">
      <!-- Each slide: width:420px; height:525px; flex-shrink:0; position:relative; -->
    </div>
  </div>

  <!-- Dot indicators -->
  <div class="ig-dots" style="display:flex;justify-content:center;gap:4px;padding:8px 0;">
    <!-- one <span style="width:5px;height:5px;border-radius:50%;background:#303b2f;"></span> per slide, bg #ccc for inactive -->
  </div>

  <!-- Actions -->
  <div class="ig-actions" style="display:flex;gap:14px;padding:8px 14px;">
    <!-- heart, comment, share SVGs, bookmark on the right -->
  </div>

  <!-- Caption -->
  <div class="ig-caption" style="padding:4px 14px 14px;font-size:13px;color:#222;line-height:1.4;">
    <b>[BRAND_SLUG]</b> built this so i could stop doing it by hand. swipe for the system →
    <div style="color:#999;font-size:10px;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">2 hours ago</div>
  </div>
</div>
```

**The .ig-frame must be exactly 420px wide. Do not change this width.** All slide typography and spacing is designed for 420px. If you resize, everything breaks.

## Slide shell (every slide wraps content in this)

Light slide:
```html
<div class="slide" style="width:420px;height:525px;flex-shrink:0;position:relative;background:var(--brand-light-bg);padding:0 36px 52px;display:flex;flex-direction:column;justify-content:flex-end;">
  <!-- content -->
  <!-- progress bar -->
  <!-- swipe arrow (omit on last slide) -->
</div>
```

Dark slide: `background:var(--brand-dark-bg)`. Gradient slide: `background:linear-gradient(165deg, #161B15 0%, #303b2f 50%, #4C564A 100%);`.

For hero and CTA slides, use `justify-content:center` so content sits centered vertically.
