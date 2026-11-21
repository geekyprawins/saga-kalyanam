# SaGa Kalyanam — Sanjana & Gagan

A mobile-first wedding invitation that plays as a short walk into the wedding: you ring a brass bell at a temple gate, the doors open onto a sunset courtyard, and the invitation card opens like the gate did.

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
| Gate artwork | `public/assets/art/*.svg` |

### RSVP

`wedding.rsvpWhatsApp` is `null`, so a reply opens WhatsApp's contact picker and the guest chooses who to send it to. Set it to a number in international form without `+` (e.g. `'919876543210'`) to send every reply straight to one phone. Nothing is stored on a server either way.

### Personalised links

`?to=Ramesh+Garu` greets that guest by name on the gate and prefills the RSVP name field. Works in English and Telugu. Share one link per household from a spreadsheet if you like.

## Photos

The site ships with drawn artwork, not stock photography. Every image slot is a named probe: drop a file into `public/assets/photos/` with a matching name and it replaces the ornament automatically, no code change.

```
public/assets/photos/
  bride.webp            groom.webp
  mehendi-1.webp        ring.webp
  blessings.webp        family.webp
  mandapam.webp
  mehendi-2.webp        mehendi-detail.webp
  ring-2.webp           ring-detail.webp
```

`.webp` first, then `.avif`, `.jpg`, `.png`. Portrait crops work best at 4:5; the carousel cards at 3:4. Keep each under ~200 KB.

## Replacing the gate artwork

`public/assets/art/` holds four stacked layers that parallax against each other:

| File | Layer | Depth |
| --- | --- | --- |
| `sky.svg` | sunset, sun, haze | furthest |
| `mid.svg` | courtyard floor, gopuram, kolam | mid |
| `arch.svg` | the temple arch itself, split into two door leaves | near |
| `fore.svg` | lamps, flower bowl, silk drape | nearest |

To use the painted Codex frame instead, export it as PNG/WebP at 900 × 1948 and cut it into the same four layers (arch into two mirrored halves around the centre line). Keep the filenames and the `data-depth` values in `index.html`.

## How it is built

Plain JavaScript, no framework.

- **Layers and parallax** — CSS 3D transforms. Pointer drag, device tilt (with a tap-to-enable prompt on iOS), and scroll all move the layers.
- **Sound** — synthesised in the Web Audio API at runtime. No audio files to download, nothing to license. Starts muted; the first bell tap turns it on.
- **Petals** — Three.js, imported only when the browser is capable and the user has not asked for reduced motion.
- **Scroll motion** — GSAP ScrollTrigger and Lenis, dynamically imported after first paint so they never block the gate.
- **Copy** — every string lives in one file with an English and a Telugu tree.

### Performance

First view is HTML + CSS + app code only: about 23 KB gzipped, plus fonts. Three.js (130 KB gz) and the motion chunk (50 KB gz) load after first paint. Images are lazy.

### Graceful degradation

- No WebGL, or a low-power hint → the petal field is skipped, the CSS scene still works.
- `prefers-reduced-motion: reduce` → no smooth scroll, no parallax, no 3D tilt, no petal field; everything still readable and every control still works.
- Telugu falls back per glyph, so mixed lines ("ప్రియమైన Ramesh గారికి") keep the right typeface on each script.

## Browser notes

Tested in Chromium at 390 × 844 and 1440 × 900. The layout is built for WhatsApp's in-app browser first: no fixed-position tricks, no hover-only affordances, `100svh` for the gate so the address bar cannot crop it, and tap targets at 44 px or more.

## Files

```
index.html              seven scenes, in order
src/css/base.css        tokens, type, gold foil, petals, toast
src/css/gate.css        the 3D gate stage
src/css/scenes.css      the six scenes after the gate
src/js/content.js       wedding facts + every string in en/te
src/js/main.js          boot, reveals, language, tone, deferred motion
src/js/gate.js          bell, doors, tilt, dolly
src/js/audio.js         synthesised bells and ambience
src/js/petals.js        Three.js petal field
src/js/gallery.js       carousel + wipe-to-reveal
src/js/invite.js        card opening + countdown
src/js/actions.js       calendar, directions, share, RSVP
src/js/photos.js        optional photo drop-in
```
