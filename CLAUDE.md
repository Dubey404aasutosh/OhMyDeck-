# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Vite static site reproducing **Nodeck** (nodeck.online), an "anti-presentation" interactive slide-deck website (10 slides, GSAP animations, Howler audio, Swiper carousels, a Phaser mini-game on the 404 page). Much of the repo is captured production output rather than hand-written source; see below.

## Commands

```bash
npm install
npm run dev       # Vite dev server; middleware rewrites /404 -> /404.html
npm run build     # tsc (type-check src/ only, noEmit) then vite build -> dist/
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

## Markup conventions

`index.html` (~130 KB) holds all slide content inline. The JS hooks into it through data attributes: `data-split` (text-split animation targets), `data-modal` / `data-modal-close`, `data-project-open` / `data-project-panel`, `data-swiper-*` (carousel mounts), `data-sound`, and `data-letter` / `data-shadow`.
