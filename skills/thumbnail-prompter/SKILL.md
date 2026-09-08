---
name: thumbnail-prompter
description: Write world-class image-generation prompts for [YOUR_NAME]'s YouTube thumbnails (Pikzels, Nano Banana/Gemini, GPT-Image, Midjourney — any model that takes a face reference). Use whenever [YOUR_NAME] wants a thumbnail, thumbnail ideas, thumbnail prompts, says "/thumbnail-prompter", "make a thumbnail for this video", "thumbnail prompt", "prompt for my thumbnail", or pastes a video title/topic asking for thumbnail concepts. This skill PROMPTS the generation — it does not generate images itself. For critiquing a finished thumbnail against a title, youtube-packaging also applies.
---

# Thumbnail Prompter

Turn a video title/topic into 2–3 distinct thumbnail concepts, each with a copy-paste-ready image-generation prompt. Claude writes prompts; an image model (Pikzels, Nano Banana, GPT-Image, Midjourney + face ref) renders them.

## Assets (always mention in output)

- **Face references:** `[CONTENT_ROOT]/Thumbnails/[YOUR_NAME] for Thumbnails/` — 100+ studio shots. Tell [YOUR_NAME] which *type* of expression to pick as reference (serious/neutral, smiling, pointing, holding gesture).
- **Transparent cutout:** `.../Thumbnails/[your_name]-cutout-transparent.png` — for composite workflows.
- **Output folder:** finished thumbnails live in `[CONTENT_ROOT]/Thumbnails/`.

## [YOUR_NAME]'s established thumbnail identity

Derived from his best existing thumbnails. Not a straitjacket — a baseline to riff on.

**The person:** [YOUR_NAME], mid-20s, buzzcut, black t-shirt, clean studio retouch. Occupies the right third OR center. Direct eye contact with camera. Two expression modes:
- **Serious/neutral** — for failure, warning, contrarian angles ("AI failed", "you're doing it wrong")
- **Confident smile** — for results, proof, how-to angles (holding a dashboard, revenue numbers)

**Composition formula (the 3-element rule):** every thumbnail = FACE + ONE HERO OBJECT + (optional) TEXT. Never more.
- Hero object is held in hand or presented (oversized 3D app icon, laptop with dashboard, phone). Physical interaction with the object beats floating graphics.
- The object carries the story through a **visual metaphor**: burning icon = wasted money, cracked/shattered icon = failure, rising chart = growth, clean dashboard = proof.

**Text rules:**
- 0–2 words max. Text adds intrigue the image can't ("FAILED?", "WRONG ORDER") — never describes the video.
- Huge bold condensed sans, ALL CAPS, top-left or left-stacked. Yellow-gold gradient, or white/3D-extruded with one word on a solid accent-color box.
- A question mark or open loop ("...?", "WRONG ___") creates the curiosity gap.
- A hand-drawn white arrow from text to object connects claim → evidence.
- No-text versions work when the metaphor is strong enough (burning AI icon needs no caption).

**Color system:** near-black background (subtle grid/texture, vignette) + ONE hot accent family (orange/fire is the house accent) + ONE cool contrast on the hero object (purple icon vs orange flames = complementary pop). Rim light on [YOUR_NAME]'s face matches the accent color so he sits *in* the scene, not pasted on.

**Proof elements:** real-looking UI screenshots (dashboards with specific numbers like "$184,920") outperform abstract graphics. Specific numbers > round numbers.

## Archetype 2: interview / case-study (Creator B style)

For client testimonial and interview videos. Plain and clean beats spectacular here — the pro look comes from retouch quality and typography, not effects.

- **Layout:** two shoulders-up face cutouts ([YOUR_NAME] + client) on opposite sides, result in the center.
- **Backgrounds must have depth, never flat color** (validated 2026-08-30: flat blue rejected). Use real environments with shallow depth of field: blurred modern office, ridged/slatted wall with warm lamp glow, dark room with plants and a teal wall, bright airy room. The environment makes it look like a real conversation happened.
- **The number lives in a UI artifact, not floating text:** a phone held up showing a Stripe/revenue balance, a floating white dashboard card with "Gross revenue $X ↑", a chart. UI-styled digits read as proof; decorative text reads as marketing. Composite a real screenshot over the generated card when the model's UI text comes out mushy.
- **Client faces are real frames, retouched — never generated.** Extract the sharpest frame from the video (yt-dlp + ffmpeg), then AI-retouch with identity locked: "Professional retouch of this exact person, keep facial identity and features 100% unchanged, clean even studio lighting, subtle skin cleanup, shoulders-up cutout on transparent background, photorealistic." Enhancement only; inventing features is forbidden.
- **Text rule relaxes:** a stacked 2–3 line claim is allowed when the metric IS the story ("I ADDED / $46K/MO / IN 4 MONTHS"), key line highlighted on a colored box. Bold geometric sans, editor-composited, never generated.
- **Optional one artifact:** phone with revenue screen, chart, workflow screenshot, red marker circle around the number. Max one.
- **No 3D glossy objects, no fire, no glow** in this archetype — it must read as a real conversation with a real result.

Structure every generation prompt in this order — image models weight early tokens heaviest:

1. **Format declaration:** "YouTube thumbnail, 16:9, 1920x1080, ultra-high contrast, professional MrBeast-style thumbnail quality"
2. **Subject + face ref instruction:** "The man from the reference image, [expression], [position: right third / centered], wearing a black t-shirt, direct eye contact, sharp studio lighting with [accent color] rim light on the [side] of his face"
3. **Hero object + interaction:** what he holds/presents, its size ("oversized", "giant"), material ("glossy 3D", "realistic"), and the metaphor state ("top corner burning with realistic flames and embers", "shattered with deep cracks")
4. **Background:** "near-black background with subtle grid texture, [accent elements: rising flames along the bottom / glowing orange bar chart / dashed curve line], heavy vignette"
5. **Text (if any):** exact string in quotes, placement, style: `Large bold condensed sans-serif text "FAILED?" in yellow-to-gold gradient, top left, with a white hand-drawn arrow curving down toward the icon`
6. **Anatomy lock (mandatory, every prompt):** "Anatomically correct human body: exactly five fingers on each visible hand with natural proportions, realistic skin, natural ears, natural neck and shoulder anatomy. Photorealistic human — nothing uncanny, warped, or AI-looking."
7. **Quality/negative tail:** "hyper-detailed, vibrant saturated colors, crisp edges, no watermark, no extra text, no distorted hands, no missing or extra fingers, no merged fingers, no warped limbs"

Keep prompts 80–150 words. One idea per prompt. If the model supports it, note "use face reference for identity, do not alter facial structure."

## Proven wins (validated on real generations — reuse these)

- **GPT-Image + face reference produces excellent results** with the prompt formula. First-choice model.
- **"Floating above his open palm"** beats "holding" — eliminates finger distortion and the object's glow reflecting on the palm grounds it in the scene. Default interaction pose.
- **Make the hero object the light source.** Prompt the rim light color to match the object's glow — the model then lights face, hand, and object as one photograph.
- **Symbols on objects, never filenames/words.** Brain, gear, chart, lock — icons read at 168px; rendered text on objects doesn't.
- **Light-ray/particle stream connecting two objects** communicates relationship without text.
- **Monochromatic warm ramp works on black.** Gold→orange within one family gives enough separation for "two different things" when background is near-black; complementary contrast is optional, not required.
- **Prompt the text slot empty** (top-left clear) and composite text in an editor afterward.

## Anatomy guardrails (hands ruined a real generation — never again)

- **Minimize hand exposure by design.** Prefer poses where hands are partially out of frame, behind an object (laptop lid, screen edge), or simplified: crossed arms, one open palm at frame edge. A pose that shows all ten fingers is asking for trouble.
- **Describe the hand pose explicitly** when a hand is visible: "one open relaxed palm facing up, all five fingers visible and naturally spread" — vague hand references generate vague hands.
- **Always include the anatomy lock line and the finger negatives** from the prompt formula. No exceptions, even for face-only concepts (ears and necks warp too).
- **Verify before delivering a verdict on any generated result:** zoom into hands (count fingers on each hand), ears, teeth, neck/shoulder joint, and the eye reflections. Flag ANY anatomical error as an automatic regenerate — a missing finger is unusable regardless of how good the rest looks. Fix via inpainting/edit of the hand region when the model supports it (GPT-Image edit, Nano Banana) rather than rerolling the whole image.

## Best practices (general, beyond the house style)

- **Legible at 168px wide.** Mentally shrink it: if the story doesn't read on a phone in the sidebar, the concept fails. This kills fine detail, small text, busy backgrounds.
- **Title + thumbnail = one system.** Thumbnail must NOT repeat the title's words — it completes them. Title says the topic; thumbnail says the emotion/stakes.
- **One emotion per thumbnail.** Curiosity, fear of loss, or aspiration. Pick one.
- **Contrast is the whole game:** brightness contrast (face lit vs dark bg), color contrast (complementary accent pairs), size contrast (giant object in a human hand).
- **Faces pull clicks; eye contact pulls harder.** Eyes in the upper third, never cropped.
- **Avoid:** more than 3 focal elements, gradients-on-gradients, red-circle-and-arrow clichés on nothing, generic robot imagery for AI topics (use app icons, dashboards, terminals — his audience is business owners, not sci-fi fans), bottom-right corner content (timestamp overlay covers it).

## Workflow

1. **Intake:** video title (or transcript/topic). If no title yet, ask for the working title or route through youtube-packaging first — thumbnail concepts depend on the title.
2. **Angle:** identify the video's core emotion (failure/warning vs proof/aspiration) → pick expression mode and metaphor.
3. **Deliver 2–3 concepts**, each with:
   - Concept name + one-line rationale (what curiosity gap it opens)
   - Which face reference type to use (serious vs smiling vs holding gesture)
   - The full generation prompt (copy-paste block)
   - Text overlay (if any) — note when text is better added afterward in an editor for crispness (AI text rendering is still the weakest link; Pikzels handles text OK, Midjourney doesn't)
4. **Iterate:** when [YOUR_NAME] pastes a generated result, critique against the 168px test, the 3-element rule, and the color system — then rewrite the prompt targeting the specific failure, don't regenerate blind.

## Concept diversity rule

The 2–3 concepts must differ in *mechanism*, not decoration: e.g. (a) metaphor-object no text, (b) text + cracked object curiosity gap, (c) proof/dashboard smile. Never three variations of the same layout.
