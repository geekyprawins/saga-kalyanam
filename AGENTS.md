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
  hardcode copy in `index.html`; add `data-i18n` and a key in both trees. The text inside
  a `data-i18n` element is the no-JS fallback, so it has to be rewritten whenever the `en`
  value changes — a stale one survives in view-source and to crawlers while the page looks
  right in a browser.
- The guest line (`?to=Name`) sits under the date, built by `addressFor()` into three
  pieces so `.greet__name` can carry the gold. English reads "To Name & family", Telugu
  "Name గారు & కుటుంబానికి"; `greetingFor()` flattens the same pieces for the saved card.
- Scene artwork is raster in `public/assets/art/`, already decorated (garlands, lamps,
  kolam), so CSS must not draw a second arch, frame or seal on top of it. The one-time
  originals arrive as multi-megabyte PNGs; convert them to WebP (Pillow, `method=6`) and
  commit only the WebP. `hero-temple`, `mandapam`, `invite-frame`, `lamps` and
  `kolam-velvet` are the current set.
- Anything referenced from CSS or HTML uses `./assets/art/...`: `public/` is the only
  folder whose paths survive `base: './'`. Prefer an `<img>` over a CSS `url()` anyway —
  it carries `width`/`height` and can be gated per breakpoint with `<picture>`.
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
- The face is `invite-frame.webp`, printed at 4:5, so the card's `aspect-ratio` must stay
  `0.8` or the arch and lamps crop. The type lives in the cream panel: `padding: 17% 16%
  21%` is the measured safe area, and the venue is the line that overflows it first.
- `--wax` (the seal) is the only stationery still drawn in CSS.
- Each `.invite__leaf` holds an `<img class="invite__cover">` of `kolam-velvet.webp`. Both
  leaves show the same square, so the closed card reads as one continuous panel until the
  leaves turn.
- `.invite__face` needs `isolation: isolate` and the art at `z-index: -1`. Without it the
  face's type escapes the preserve-3d sort and floats above the closed cover.

## Sound

`src/js/audio.js` plays `public/assets/audio/bgm.mp3` through the Web Audio graph, so
the master fade, the visibility suspend and the card noises all share one context, and
synthesises the two card noises (`swish`, `crack`).

The master is a 29 s stereo WAV in `/originals` (git-ignored, like the photos). The
shipped MP3 is a 1.5 s equal-power crossfade loop built from it — the source fades out
over its last four seconds, so a plain `loop` would jump. MP3 encoders also pad both
ends with silence, which `trimEncoderPad()` strips after `decodeAudioData`, otherwise
the loop plays ~20 ms of nothing every lap.

Sound is on by default: the toggle is painted "on" at boot and `armSound()` starts the
track at the first interaction anywhere on the page. Scrolling opens the gate, so the
gesture list includes `wheel`, `scroll` and `touchmove` alongside the pointer/touch/key
events — a guest who scrolls in must not be left in silence while the icon reads "on".
The AudioContext is created at boot and the track is decoded ahead of time (decoding
works while the context is suspended); `armSound()` also attempts an immediate `resume()`
so browsers that permit autoplay for the site start on open. Otherwise the first real
gesture unlocks audio with `primeAudio()`, which starts a one-sample silent buffer
*synchronously inside the gesture* — the iOS unlock — and then resumes the context.

Do **not** start the real track while the context is still suspended: iOS silently drops
such a source, so it never plays even after `resume()`, which is exactly why the first
gesture used to be silent and cycling mute→unmute (a fresh source on a running context)
"fixed" it. `setSound(true)` therefore waits for `state === 'running'` before calling
`startBgm()`. A wheel alone is not a user activation in Chrome, so `armSound()` only
removes its listeners once the context is actually running; a scroll that did not unlock
leaves them armed for the next click/tap/keypress.

`isAudioRunning()` reports whether the context is actually running, and the sound button
uses it: the first tap on a still-silent page starts playback instead of muting. Once the
user mutes, `mutedByUser` stops later gestures from bringing it back. `prefetchBgm()`
still warms the bytes on idle as a fallback; the decoded buffer is cached, so toggling off
and on restarts without another fetch.
