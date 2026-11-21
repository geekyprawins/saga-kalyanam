# Working in this repo

Static wedding-invite site. Vite + plain JS. No framework, no server, no database.

## Commands

```bash
npm install
npm run dev       # port 12000, host 0.0.0.0
npm run build     # dist/ (base: './', so paths stay relative)
npm run preview   # port 12001, serves dist/
```

## Verifying a change

Rendering is the only real test — there are no unit tests. A headless Chromium with
`--remote-debugging-port=9222` plus a ~30-line CDP script (set device metrics 390×844,
navigate, `scrollIntoView()`, `Page.captureScreenshot`) is enough to check every scene.
Looking at the page at desktop width is misleading: the gate is a portrait strip and the
whole layout is thumb-first. Always check 390 wide.

Watch for these, which have bitten before:

- **Painting order.** Layers that must cover something (`invite__leaf`, `wipe__layer--top`)
  have to come *after* it in the DOM or carry a `z-index`. A later sibling paints on top
  of an earlier absolute one at the same z-index.
- **Animations beat declarations.** `.invite__tap` had an infinite `opacity` keyframe, so
  `opacity: 0` on open did nothing until `animation: none` was added.
- **Scroll tweens override CSS opacity.** A GSAP tween writing `opacity` wins over the
  stylesheet — set the tween's end state to the value you actually want.
- **Telugu.** `--font-display` and `--font-body` both list `Noto Serif Telugu` as a
  per-glyph fallback; without it every Telugu string renders as tofu. Telugu also needs
  `letter-spacing: 0` and no `text-transform`.

## Photos

Real photos live in `public/assets/photos/*.webp`; the slot names are listed in that
folder's `README.txt`. The camera originals sit in `/originals`, which is git-ignored.
Keep them out of `public/` — Vite copies that folder verbatim into `dist/`, so one 40 MB
JPEG there ships to every visitor.

`src/js/photos.js` probes `webp -> avif -> jpg -> png` per `[data-photo]` slot and writes
`background-image` inline. That inline write replaces the element's *whole* background
stack, so any element that started with more than one background layer needs a
`.has-photo` reset for `background-size`, `background-position` and `background-repeat`.
Without it the ornament's tile size survives and the photo repeats across the box —
`.wipe__layer` carries exactly that reset.

## Conventions

- Every user-visible string lives in `src/js/content.js` under both `en` and `te`. Never
  hardcode copy in `index.html`; add `data-i18n` and a key in both trees.
- Artwork is hand-written SVG in `public/assets/art/`, layered by `data-depth` for
  parallax. Replace it with real imagery rather than adding new decoration.
- Deferred work (Three.js, GSAP, Lenis) is dynamically imported so it never blocks first
  paint. Keep the first view at HTML + CSS + `src/js` only.
- Small-caps labels take their size from `--label` (0.62rem, 0.74rem in Telugu). Adding a
  new uppercase label class means adding it to that list, not inventing a new font-size —
  anything under ~10px is unreadable on a phone in a bright room.
- Social preview URLs in `index.html` are absolute on purpose; crawlers drop relative ones.
  Changing hosts means editing `og:url`, `og:image` and `twitter:image` together.

## The invite card

- `.invite__inner` is `preserve-3d`, so its children are sorted by depth rather than DOM
  order. `.invite__seal` deliberately sits *outside* it: put it back inside and the wax
  shards disappear behind the leaves as the card opens.
- `src/js/invite.js` breaks the seal into eight `clip-path` wedges (`.seel__shard`) and
  opens the card 340ms later, so the debris falls across the opening leaves.
- `src/js/savecard.js` paints the 1080×1350 share card on a canvas. Its `tracked()` helper
  spaces per glyph, so it skips any non-Latin line — spacing Telugu by code point tears
  the conjuncts apart.
- The stationery is three SVG data URIs on `.scene--invite`: `--frame` (printed border),
  `--damask` (paper tile) and `--wax` (seal). The frame is applied with `border-image`
  so it stretches to any card size without redrawing; give the SVG explicit `width` and
  `height` or the intrinsic 300×150 box shifts every slice.
- `.invite__leaf` has no pseudo-elements left (foil and seam), so its frame is a real
  `<span class="invite__leaf-frame">`. Each leaf is clipped to its half, so the two halves
  read as one frame until the leaves turn.
- The face's horizontal padding must clear the 22px frame band, or a long venue line runs
  under the border.

## Ambience

`src/js/audio.js` synthesises everything. The gate bell is a struck-bell partial stack;
the ambience is a sannai melam — nadaswaram (detuned saws, nasal peak, jaru slide and
vibrato) over a tavil in adi talam and a Sa/Pa drone, in Mohanam. It is a 32-step loop that
alternates two phrases. Headless Chromium has no audio device, so `ctx.currentTime` never
advances there: verify changes by rendering the module through `OfflineAudioContext`
(strip `export`, inject `ctx`/`ambience`/`wet`) and reading the WAV back, not by watching
the live page.
