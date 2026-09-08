# Motion principles — keep animations [BRAND], not sparkle

Modern agency feeds (Kyle Whitrow, Lex Fridman, Anthropic) share three traits:
snap, restraint, and physicality. The slides feel like real objects with weight,
not tweened boxes. Copy these rules before touching animation code.

## 1. Spring physics, never linear tweens

Do NOT use CSS `transition`, linear interpolation, or constant-speed animations.
Every entrance animation uses one of the five named springs from `easing.ts`:

| Preset    | Feel                            | Use for                                    |
|-----------|---------------------------------|--------------------------------------------|
| `enter`   | Clean slide-up, minimal overshoot | Body text, subheads, list items          |
| `emphasis`| Snappy overshoot + settle       | Headlines, stats, hero elements            |
| `snap`    | Fast, no overshoot              | Checkmarks, cursors, micro-interactions    |
| `smooth`  | Slow, heavy, lots of damping    | Rails, background gradients, Ken Burns     |
| `exit`    | Quick, firm                     | Dismissals (rare — slides rarely exit)     |

Headlines should **overshoot slightly and settle** — that's `emphasis`. It gives them weight. Body text should not overshoot — that's `enter`.

## 2. Stagger is the texture

`STAGGER = 4` frames between sibling elements is the default. More than 6 and
the carousel feels slow; less than 3 and the animation feels like one blob
moving. When in doubt, keep it at 4.

Headlines split by `word`, not `char`. Character-by-character typing looks AI-generated unless it's the TerminalWindow (where it's appropriate).

## 3. Motion budget per slide

A 3-second slide has roughly three motion windows:

- Frames 0–24 (0–0.8s): primary element enters (headline, stat, terminal)
- Frames 24–54 (0.8–1.8s): secondary elements enter (body, list items, output)
- Frames 54–90 (1.8–3.0s): HOLD — no new motion, let the reader read

**Never animate during the hold phase.** If the slide loops in Instagram, the hold is what the viewer sees 95% of the time. Motion there looks anxious.

## 4. Overshoot & settle

The signature of modern motion design is a single overshoot + settle on
anchoring elements. Don't add secondary bounces. Don't add wiggle. One spring
per element, one overshoot, done.

## 5. Subtle ambient motion

The only elements that move during the hold phase:

- The traveling pulse in `data-flow` slides (loops at 1.6s period)
- Ken Burns zoom in `kinetic-photo` slides (1.04x → 1.12x over the full duration)
- The cursor blink in `terminal-demo` slides (2Hz)
- The CTA button pulse on the `cta` slide (1.4s period, ±4% scale)

Everything else holds still.

## 6. Contrast + motion trade-off

On gradient surfaces, reduce motion intensity — the gradient itself provides visual weight. On flat white/light surfaces, motion can be bolder because there's nothing else happening.

## 7. The read-test

After rendering a slide, play it at 0.5× speed. If at any frame you can't read
all the visible text clearly, something is animating too late or for too long.
Cut motion, not type.

## 8. Export quality defaults

- fps: 30 (not 24, not 60)
- codec: h264 (Instagram-compatible, small file sizes)
- duration: 90 frames (3s) for standard slides, 120 frames (4s) for showpieces with complex motion
- scale: 1.0 for production, 0.5 for drafts

Never ship a 60fps motion carousel — IG re-encodes to 30fps anyway and you burn render time for nothing.
