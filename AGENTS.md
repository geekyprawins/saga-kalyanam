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

## Conventions

- Every user-visible string lives in `src/js/content.js` under both `en` and `te`. Never
  hardcode copy in `index.html`; add `data-i18n` and a key in both trees.
- Artwork is hand-written SVG in `public/assets/art/`, layered by `data-depth` for
  parallax. Replace it with real imagery rather than adding new decoration.
- Deferred work (Three.js, GSAP, Lenis) is dynamically imported so it never blocks first
  paint. Keep the first view at HTML + CSS + `src/js` only.
