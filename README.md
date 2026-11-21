# SaGa Kalyanam — Sanjana & Gagan

A mobile-first wedding invitation that plays as a short walk into the wedding: you land on the temple entrance, the aisle carries you down to the mandapam, and the invitation card opens under your thumb.

**Thursday, 10 December 2026 · Sumuhurtham 8:34 PM**
K Convention Function Hall, Jangareddygudem, Eluru District, Andhra Pradesh
Hosted by The Swamiraju Family

## Run it

```bash
npm install
npm run dev      # http://localhost:12000
npm run build    # static site in dist/
npm run preview  # serve the build
```

`vite.config.js` sets `base: './'`, so `dist/` works from a domain root, a subfolder, or `file://`.

## Deploy

Upload `dist/` to any static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3. No server, no build step at runtime, no database.

```bash
npm run build && npx vercel deploy dist --prod   # or drag dist/ into Netlify
```

### Share preview

`public/assets/og.jpg` (1200×630) is the card WhatsApp shows when the link is pasted. The `og:image`, `og:url` and `twitter:image` tags in `index.html` are **absolute** URLs, because crawlers ignore relative ones. They currently point at the hosted preview; swap that host for the final domain in all three tags before sending the link out.

## What to edit

| What | Where |
| --- | --- |
| Names, date, venue, WhatsApp number | `src/js/content.js` → `wedding` |
| Every English and Telugu string | `src/js/content.js` → `i18n.en` / `i18n.te` |
| Scene order and markup | `index.html` |
| Colours, type scale | `src/css/base.css` (tokens at the top) |
| Scene artwork | `public/assets/art/*.webp` |

### RSVP

`wedding.rsvpWhatsApp` is `null`, so a reply opens WhatsApp's contact picker and the guest chooses who to send it to. Set it to a number in international form without `+` (e.g. `'919876543210'`) to send every reply straight to one phone. Nothing is stored on a server either way.

### Personalised links

`?to=Ramesh+Garu` greets that guest by name on the gate and prefills the RSVP name field. Works in English and Telugu. Share one link per household from a spreadsheet if you like.

## Photos

The engagement photographs are served from `public/assets/photos/`. Each image slot is a named probe: drop a file in with a matching name and it replaces the drawn ornament automatically, no code change.

```
public/assets/photos/
  bride-2.webp          groom-2.webp        couple portraits (4:5)
  bride-3.webp          bride-4.webp        carousel cards (3:4)
  groom-3.webp                              carousel card (3:4)
  ring.webp             moment.webp         carousel cards (3:4)
  rings.webp                                carousel card (3:4)
  details-bride.webp    details-groom.webp  wipe reveal (3:4)
```

The couple's second set is what ships. The first set is deleted, so no slot can fall
back to it.

`.webp` first, then `.avif`, `.jpg`, `.png`. Portrait crops work best at 4:5; the carousel cards at 3:4. Keep each under ~250 KB.

The camera originals are kept in `/originals`, which is git-ignored and never served. To regenerate the web images after replacing one, run:

```bash
python3 - <<'PY'
from PIL import Image, ImageOps
im = ImageOps.exif_transpose(Image.open('originals/photos/bride-2.jpg')).convert('RGB')
im.save('public/assets/photos/bride-2.webp', 'WEBP', quality=82, method=6)
PY
```

## Replacing the artwork

`public/assets/art/` holds five WebP files, each already decorated — garlands, lamps,
kolam — so CSS must not draw a second arch or frame on top of it.

| File | Where it goes | Size |
| --- | --- | --- |
| `hero-temple.webp` | the gate, full bleed | 1500 x 844 |
| `mandapam.webp` | behind "Two hearts. Two families." | 1500 x 844 |
| `invite-frame.webp` | the invitation card face | 1122 x 1402 |
| `kolam-velvet.webp` | the two card covers | 1000 x 1000 |
| `lamps.webp` | beside the card, wide screens only | 1122 x 1402 |

Export from the one-time PNGs with Pillow (`method=6`) and commit only the WebP. A phone
never downloads `lamps.webp`: a `<picture>` element gates it to `min-aspect-ratio: 3/4`.

## How it is built

Plain JavaScript, no framework.

- **The gate** — one photograph. Device tilt nudges it a few pixels, the scroll dollies it, and the copy sits on the aisle under a scrim tied to its own height.
- **Sound** — the couple's own recording, `public/assets/audio/bgm.mp3` (446 KB), built with a crossfade at the loop seam because the master fades out. Decoded once into an `AudioBuffer`; starts muted, the first tap turns it on.
- **Petals** — Three.js, imported only when the browser is capable and the user has not asked for reduced motion.
- **Scroll motion** — GSAP ScrollTrigger and Lenis, dynamically imported after first paint so they never block the gate.
- **Copy** — every string lives in one file with an English and a Telugu tree.

### Performance

First view is HTML + CSS + app code only: about 23 KB gzipped, plus fonts and the 247 KB hero photograph, which is preloaded. Three.js (130 KB gz), the motion chunk (50 KB gz) and the 446 KB track all load after first paint. Images are lazy.

### Graceful degradation

- No WebGL, or a low-power hint → the petal field is skipped, the CSS scene still works.
- `prefers-reduced-motion: reduce` → no smooth scroll, no parallax, no 3D tilt, no petal field; everything still readable and every control still works.
- Telugu falls back per glyph, so mixed lines ("ప్రియమైన Ramesh గారికి") keep the right typeface on each script.

## Browser notes

Tested in Chromium at 360 × 640, 390 × 844, 390 × 600, 844 × 390, 768 × 1024, 1024 × 768 and 1280 × 860. The layout is built for WhatsApp's in-app browser first: no fixed-position tricks, no hover-only affordances, `100svh` for the gate so the address bar cannot crop it, and tap targets at 44 px or more.

## Files

```
index.html              seven scenes, in order
src/css/base.css        tokens, type, gold foil, petals, toast
src/css/gate.css        the gate: copy, date, scroll cue
src/css/scenes.css      the six scenes after the gate
src/js/content.js       wedding facts + every string in en/te
src/js/main.js          boot, reveals, language, tone, deferred motion
src/js/gate.js          the gate's scroll state
src/js/tilt.js          device tilt on the hero photograph
src/js/audio.js         the recorded track, fades and card noises
src/js/petals.js        Three.js petal field
src/js/gallery.js       carousel + wipe-to-reveal
src/js/invite.js        card opening + countdown
src/js/actions.js       calendar, directions, share, RSVP
src/js/photos.js        optional photo drop-in
```
