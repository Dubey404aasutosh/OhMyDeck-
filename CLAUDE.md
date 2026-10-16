# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**OhMyDeck** is a general-purpose presentation editor and player: plain Vite with vanilla ES modules, and GSAP as the only runtime dependency. It began as a scrape of the Nodeck website (nodeck.online) and keeps that visual style, but all content is now data the user edits in the browser. `README.md` has the user-facing feature list.

## Commands

```bash
npm install
npm run dev       # Vite dev server
npm run build     # vite build -> dist/ (relative base './', so dist/ works from any sub-path)
npm run preview
```

There is no test runner, linter or TypeScript.

## Leftovers from the old site (unused)

Nothing references these: `public/` (minified Nodeck bundles, audio, and the Phaser 404 game), `404.html`, the root `main.js`, `sound.js` and `main.css`, `src/js/`, `src/styles/` and `tsconfig.json`. They are safe to delete. `vite.config.js` sets `publicDir: 'static'` so that none of them get copied into `dist/`. Static assets the app uses (fonts, sticker images, favicon) live in `static/`.

## Architecture (`src/app/`)

**Data model.** A deck is `{ id, title, theme, assets, slides[] }`. A slide is `{ id, bg, pattern, label, notes, elements[] }`. Elements have type `text | image | shape` and are positioned in a fixed **1600×900 logical canvas** (`render.js` exports `W` and `H`), which is scaled to fit with a CSS transform. Element ordering in the array is z-order.

**Colours are theme tokens.** Elements and slides store `bg | paper | ink | accent | accent2 | line` (or a literal hex). `themes.js → applyTheme()` writes these as `--c-*` CSS variables on `:root`, together with `--on-*` "readable text on that colour" variables, fonts, `--border-w`, `--shadow-x` and `--radius`. A theme change therefore recolours every slide and thumbnail with no re-render. Text coloured `ink` automatically switches to a readable colour on its slide background or box fill (`textOn()` in `render.js`).

**Images.** Uploaded pictures are downscaled (`util.processImage`) and stored once in `deck.assets[id]`. Elements reference them as `src: "asset:<id>"`. Built-in stickers use `"sticker:<file>"`, which resolves to `static/stickers/`. Use `resolveSrc()` for both.

**Modules:**
- `store.js`: the single source of truth (`store.deck`).
  - **Mutation protocol:** call `store.checkpoint(key?)` *before* mutating, then `store.changed(what, detail)`, or use `store.update(what, fn, key)`, which does all three.
  - The `key` coalesces rapid edits (typing, sliders, nudges) into one undo step.
  - Undo snapshots are JSON strings that exclude `assets`.
  - Decks persist to IndexedDB (`ohmydeck` db, `decks` store), with a debounced autosave that prunes unreferenced assets.
  - The `what` strings drive selective re-rendering in `editor.onStore`. `element` and `text` updates touch only the affected nodes, so the caret and inspector focus survive. `deck`, `history`, `slides` and `elements` trigger a full re-render.
- `render.js`: the slide → DOM renderer, shared by the editor, present mode, thumbnails, the presenter window and PDF. `updateElement()` restyles an existing node in place.
- `layouts.js`: element factories (`text`, `image`, `shape`, `sticker`), the `LAYOUTS` used by "New slide", and the starter and blank decks.
- `editor.js`: the slide list (HTML5 drag reorder), the stage, and the inspector.
  - **Stage:** pointer-based move and resize with snapping guides. Text is edited with `contentEditable` and `execCommand`, plus custom `wrapSelection()` for highlighter `<mark>` and coloured or sized spans.
  - **Inspector:** built from the widgets in `controls.js`, each a `get`/`set` pair with a `.sync()` that `syncAll()` refreshes.
  - Also contains the theme, decks, export and help panels.
- `present.js`: the slideshow, with GSAP transitions (`wipe`, `slide`, `fade`, `none`), notes, overview, blackout, idle-hiding status bar and keyboard/touch navigation.
- `presenter.js`: the `?presenter` second window. It syncs the slide index with the main window over a `BroadcastChannel('ohmydeck')`.
- `main.js`: boots the app, owns `app.index` and `app.mode`, and switches between edit and present. The URL hash is `#3` (edit) or `#present/3`.
- `print.js` + `styles/print.css`: render every slide into `#print-root` and call `window.print()` (`@page` 1600×900px).

**CSS.** `styles/canvas.css` defines how slides look everywhere. UI chrome uses fixed `--ui-*` colours in `base.css`, independent of the deck theme. Editor overlays such as handles and guides are counter-scaled with `--inv` (1/scale).
