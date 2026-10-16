# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**OhMyDeck** is a Vite static site based on Nodeck (nodeck.online), an "anti-presentation" interactive slide-deck website. It uses GSAP animations, Howler audio and Swiper carousels, and the 404 page is the Slide Stacker game. The "site broken" terminal slide has been removed from the HTML, but its dead code is still in the bundle. Much of the repo is captured production output rather than hand-written source; see below.

The site was rebranded from Nodeck to OhMyDeck. The original author's credits ("About this project" modal), the `author` meta and JSON-LD, and the `nodeck.online` URLs in canonical/OG/sitemap tags were deliberately left unchanged.

## Commands

```bash
npm install
npm run dev       # Vite dev server; middleware rewrites /404 -> /404.html
npm run build     # tsc then vite build -> dist/ (tsc currently fails with TS18003: src/ has no .ts files)
npm run preview   # serve dist/
```

No test runner or linter is configured.

## Architecture: two parallel code paths

What actually runs depends on which file the HTML references, so check the `<script>`/`<link>` tags before you edit anything.

1. **The live path (what the pages load today).** `index.html` and `404.html` reference prebuilt, minified, content-hashed bundles in `public/assets/`, e.g. `/assets/main-BqI5seD_.js`, `/assets/sound-CsfXcoUP.js`, `/assets/main-DxuZMaGs.css`, `/assets/404-k6BThIw6.js`. Vendor chunks (`gsap-*`, `howler-*`, `swiper-*`, `three-*`, `phaser-*`, `html2canvas-*`) sit next to them and are imported by relative path. Vite serves `public/` as-is, so changing behavior on this path means editing the minified bundles directly, which is how recent commits did it.
   - The root `main.js`, `sound.js` and `main.css` are copies of those bundles (`sound.js` and `main.css` are byte-identical; `main.js` is an older copy of `public/assets/main-BqI5seD_.js`). Nothing loads them.
   - `404.html` and `public/404.html` are identical copies. If you change one, keep both in sync.
   - Hashed asset filenames are referenced by literal string from the HTML and from other bundles. Don't rename them.

2. **The readable rewrite in `src/`, which nothing loads yet.** These are ES modules that import `gsap` from npm:
   - `src/js/main.js` is the entry point. On DOMContentLoaded it runs `initSplitText()`, then builds `SlideController` (`slides.js`) and `UIController` (`components.js`) and wires them to each other with `slideController.setUIController(ui)`.
   - `slides.js` handles slide index state (1–10), transitions, and keyboard navigation (arrows, Space, Home/End, M for the menu, N for presenter notes).
   - `animations.js` covers split-text and the GSAP entrance animation for each slide.
   - `audio.js` is a singleton `audio` object that synthesizes SFX with the Web Audio API (no sample files). Any element with `data-sfx="click"` triggers `audio.playClick()`.
   - `src/styles/*.css` has stylesheets split into main, slides, components and animations.
   - This code expects the same DOM ids as `index.html` (`slides-container`, `.slide`, `slide-counter`, `nav-prev`, `nav-next`, `statusbar`, and others). To use it, point `index.html` at `/src/js/main.js` and the `src/styles` files instead of the hashed bundles.

`tsconfig.json` only includes `src/` (which is JS, so the type-check is close to a no-op). The build has two Rollup inputs: `index.html` (`main`) and `404.html` (`notFound`).

## Content (Aasutosh's personal deck)

The slides now carry Aasutosh's own content, written in the first person.

Where text lives when you edit it:
- **Slide copy:** `index.html`. Keep the existing elements and classes: `data-split` drives the text animation, and `span.text-highlight` drives the marker highlight.
- **Project pop-ups (slide "Projects"):** the `#proof-project-N` panels after `</main>`.
- **Presenter notes and menu slide names:** string constants in `public/assets/main-BqI5seD_.js`, passed to each slide class (`super(t, notes, name, thumb)`).
- **Slide menu thumbnails:** `public/assets/slideN-nav-overlay-*.webp`. These are 480×270 screenshots, so regenerate them after visible text changes. The footer slide's thumbnail is a data URI inside the main JS.
- **About-me photo:** `public/assets/about-aasutosh.jpg`.

On slide 5, the original red strike-through animation was restyled into an accent-colour highlight by an override appended to the end of `main-DxuZMaGs.css`.

## 404 page: Slide Stacker

`404.html` and `public/404.html` are identical; keep them in sync. They are a self-contained page that does not use the old bundles:
- `public/assets/stacker.css` holds the styles.
- `public/assets/stacker.js` is a plain canvas game.

The game drops swinging slides onto a pile and trims the overhang. Landing within 5px counts as a Perfect, and 3 Perfects in a row grow the slide back. It plays the existing `/assets/*.ogg` sounds plus `background-game-*.mp3`.

localStorage keys:
- `ohmydeck_stacker_best` stores the best score.
- `ohmydeck_stacker_sound` stores the sound setting.

All tuning constants sit at the top of `stacker.js`. `window.__stacker` exposes read-only state for automated tests.

The old Phaser game is unused: `404-k6BThIw6.js`, `404-D8qzVPqi.css`, `phaser-*.js` and `nodeck-pattern-tile-*.png`.

The footer row on the last slide (copyright, Credits/Legal modals, designer credit) was removed. `.slide__footnotes--footer` stays as an empty element because the main bundle animates it.

## Colour palettes

Visitors can switch between 8 palettes (plus a custom mix) with the round button in the top-left corner. Their choice is saved in `localStorage` under `omd_palette`.

- `public/omd-palette.js` is a plain script loaded blocking at the top of `<head>` in `index.html`, `404.html` and `public/404.html`. It holds the palette list, sets `--omd-primary | accent | paper | tint | deep` on `:root` before first paint, exposes `window.OMD`, and builds the switcher UI. `deep` is derived from `primary`, darker and more saturated.
- The brand colours are never hard-coded. Use the variables instead:
  - **CSS:** `var(--omd-*)`.
  - **Minified JS:** `OMD.c("role")` for a single colour, or `OMD.live([...roles])` for an array that updates in place when the palette changes.
  - **SVG artwork tinted by the palette:** a CSS mask over `background-color: var(--omd-*)`. The highlighter stroke, the slide 2 marker and the card patterns are done this way. Colours left inside those mask URLs are irrelevant.
- Literal hex values in the HTML (theme-color meta, `var(--omd-x, #hex)`, `fill="#hex"`) are only fallbacks.
- Raster images keep their baked-in colours: the sticky note, highlighter, eraser, nav overlays, and the OG and Twitter share images.

## Logos

The cover logo (`svg.slide__logo--cover`) and the small top logo (`#logo-home-btn svg`) spell OHMYDECK. They were generated from the BN Dime Display glyphs in the original logo style:
- letters condensed about 7% and tilted from −12° to +12° along an arch;
- a white letter path;
- a black shadow path built from the outer contours plus a copy offset about (44, 45), stroked with a round join (width 76 for the cover, 48 for the small logo).

The hover/intro animation pairs `g[data-letter=k]` with `path[data-shadow=k]`, so letter keys must stay unique. The 404 background uses `public/assets/ohmydeck-pattern-tile.png`; the old `nodeck-pattern-tile-*.png` is unused.

## Markup conventions

`index.html` (~130 KB) holds all slide content inline. The JS hooks into it through data attributes: `data-split` (text-split animation targets), `data-modal` / `data-modal-close`, `data-project-open` / `data-project-panel`, `data-swiper-*` (carousel mounts), `data-sound`, and `data-letter` / `data-shadow`.
