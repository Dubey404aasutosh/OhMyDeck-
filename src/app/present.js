/* ============================================================
   PRESENT — full-screen slideshow.
   Keys: → ↓ Space PgDn Enter = next · ← ↑ PgUp Backspace = prev
         Home / End · N notes · O overview · F fullscreen
         B black screen · S sound · P presenter window · E edit
   ============================================================ */

import gsap from 'gsap';
import { store } from './store.js';
import { renderSlide, renderThumb, fitCanvas, slideTitle } from './render.js';
import { sound } from './sound.js';
import { cssColor, fgOn } from './themes.js';
import { h, icon, isTyping, prefersReducedMotion } from './util.js';

export function createPresent(app) {
  let mounted = false;
  let busy = false;
  let idleTimer;
  let layer = null;

  const holder = h('div.present__holder');
  const viewport = h('div.present__viewport', null, holder);
  const progress = h('div.present__progress');
  const wipeLabel = h('div.wipe__label');
  const wipe = h('div.wipe', null, wipeLabel);
  const blackout = h('div.blackout');
  const notesBody = h('div.notes__body');
  const notes = h('div.notes', null, h('div.notes__title', null, 'Presenter notes'), notesBody);
  const overviewGrid = h('div.overview__grid');
  const overview = h(
    'div.overview',
    { onclick: (e) => e.target === overview && toggleOverview(false) },
    h('div.overview__head', null, h('span', null, 'All slides'), h('button.ui-btn', { onclick: () => toggleOverview(false), title: 'Close (Esc)' }, icon('close'))),
    overviewGrid
  );

  const counter = h('span.statusbar__counter');
  const label = h('span.statusbar__label');
  const muteBtn = h('button.ui-btn', { title: 'Sound on/off (S)', onclick: () => toggleMute() });
  const notesBtn = h('button.ui-btn', { title: 'Presenter notes (N)', onclick: () => toggleNotes() }, icon('notes'), h('span.ui-btn__txt', null, 'Notes'));

  const statusbar = h(
    'div.statusbar',
    null,
    h('div.statusbar__left', null, notesBtn, label),
    h(
      'div.statusbar__right',
      null,
      h('button.ui-btn', { title: 'Overview (O)', onclick: () => toggleOverview() }, icon('grid')),
      h('button.ui-btn', { title: 'Previous (←)', onclick: () => prev() }, icon('prev')),
      counter,
      h('button.ui-btn.ui-btn--accent', { title: 'Next (→ or Space)', onclick: () => next() }, icon('next')),
      muteBtn,
      h('button.ui-btn', { title: 'Presenter window with timer (P)', onclick: () => openPresenterWindow() }, icon('monitor')),
      h('button.ui-btn', { title: 'Fullscreen (F)', onclick: () => toggleFullscreen() }, icon('full')),
      h('button.ui-btn', { title: 'Edit slides (E)', onclick: () => app.setMode('edit') }, icon('edit'), h('span.ui-btn__txt', null, 'Edit'))
    )
  );

  const root = h('div.present', null, viewport, progress, wipe, blackout, notes, statusbar, overview);

  /* ---------- rendering ---------- */

  function makeLayer(index) {
    const canvas = renderSlide(store.deck.slides[index], store.deck);
    const l = h('div.present__layer', { style: { background: cssColor(store.deck.slides[index].bg || 'bg') } }, canvas);
    holder.append(l);
    fitCanvas(canvas, holder);
    return l;
  }

  function fitAll() {
    for (const c of holder.querySelectorAll('.canvas')) fitCanvas(c, holder);
  }

  function updateChrome() {
    const { slides } = store.deck;
    const i = app.index;
    counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    label.textContent = `${store.deck.title} · ${slideTitle(slides[i], i)}`;
    progress.style.width = `${((i + 1) / slides.length) * 100}%`;
    const n = slides[i].notes?.trim();
    notesBody.textContent = n || 'No notes for this slide. Add them in edit mode.';
    notesBody.classList.toggle('is-empty', !n);
    muteBtn.replaceChildren(icon(sound.isMuted() ? 'mute' : 'sound'));
    muteBtn.hidden = !store.theme.sound;
    document.title = `${store.deck.title} — ${i + 1}/${slides.length}`;
  }

  function entrance(l) {
    if (prefersReducedMotion()) return;
    const els = l.querySelectorAll('.el');
    gsap.from(els, { y: 40, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'back.out(1.6)', delay: 0.05 });
  }

  function showInstant() {
    holder.replaceChildren();
    layer = makeLayer(app.index);
    updateChrome();
  }

  async function goTo(target, { animate = true, broadcast = true } = {}) {
    const slides = store.deck.slides;
    target = Math.max(0, Math.min(slides.length - 1, target));
    if (target === app.index && layer) return;
    if (busy) return;
    const dir = target > app.index ? 1 : -1;
    app.setIndex(target, { silent: true });
    if (broadcast) app.channel?.post({ type: 'goto', index: target });
    updateChrome();
    const type = !animate || prefersReducedMotion() ? (animate ? 'fade' : 'none') : store.theme.transition;
    const old = layer;
    busy = true;
    try {
      await runTransition(type, old, target, dir);
    } finally {
      busy = false;
    }
  }

  function runTransition(type, old, target, dir) {
    return new Promise((resolve) => {
      if (store.theme.sound && type !== 'none') sound.whoosh(dir);

      if (type === 'none' || !old) {
        old?.remove();
        layer = makeLayer(target);
        if (type !== 'none') entrance(layer);
        return resolve();
      }

      if (type === 'fade') {
        layer = makeLayer(target);
        gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out', onComplete: () => { old.remove(); resolve(); } });
        entrance(layer);
        return;
      }

      if (type === 'slide') {
        layer = makeLayer(target);
        const tl = gsap.timeline({ onComplete: () => { old.remove(); gsap.set(layer, { clearProps: 'all' }); resolve(); } });
        tl.fromTo(layer, { xPercent: 100 * dir }, { xPercent: 0, duration: 0.7, ease: 'power3.inOut' }, 0);
        tl.to(old, { xPercent: -100 * dir, duration: 0.7, ease: 'power3.inOut' }, 0);
        return;
      }

      // "wipe": a coloured panel sweeps across showing the next slide's title, Nodeck-style
      wipeLabel.textContent = slideTitle(store.deck.slides[target], target);
      wipeLabel.style.color = fgOn('accent', 'line');
      const tl = gsap.timeline({ onComplete: resolve });
      tl.set(wipe, { visibility: 'visible', xPercent: 100 * dir });
      tl.set(wipeLabel, { opacity: 0, y: 30 });
      tl.to(wipe, { xPercent: 0, duration: 0.45, ease: 'power3.in' });
      tl.to(wipeLabel, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }, '-=0.1');
      tl.add(() => {
        old.remove();
        layer = makeLayer(target);
      }, '+=0.15');
      tl.to(wipeLabel, { opacity: 0, y: -20, duration: 0.2 });
      tl.to(wipe, { xPercent: -100 * dir, duration: 0.5, ease: 'power3.out' }, '<');
      tl.add(() => entrance(layer), '<0.1');
      tl.set(wipe, { visibility: 'hidden' });
    });
  }

  const next = () => goTo(app.index + 1);
  const prev = () => goTo(app.index - 1);

  /* ---------- panels ---------- */

  function toggleNotes(force) {
    const on = force ?? !root.classList.contains('show-notes');
    root.classList.toggle('show-notes', on);
    notesBtn.classList.toggle('is-active', on);
  }

  function toggleOverview(force) {
    const on = force ?? !root.classList.contains('show-overview');
    root.classList.toggle('show-overview', on);
    if (!on) return;
    overviewGrid.replaceChildren(
      ...store.deck.slides.map((s, i) =>
        h(
          'button.overview__item',
          { class: i === app.index ? 'overview__item is-current' : 'overview__item', onclick: () => { toggleOverview(false); goTo(i, { animate: false }); } },
          renderThumb(s, store.deck, 280),
          h('span', null, `${i + 1}. ${slideTitle(s, i)}`)
        )
      )
    );
  }

  function toggleMute() {
    sound.toggleMute();
    updateChrome();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function openPresenterWindow() {
    const url = `${location.pathname}?presenter#${app.index + 1}`;
    window.open(url, 'ohmydeck-presenter', 'width=1200,height=760');
  }

  /* ---------- input ---------- */

  function onKey(e) {
    if (!mounted || isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (root.classList.contains('show-overview') && k === 'Escape') return toggleOverview(false);
    const map = {
      ArrowRight: next, ArrowDown: next, PageDown: next, ' ': next, Enter: next,
      ArrowLeft: prev, ArrowUp: prev, PageUp: prev, Backspace: prev,
      Home: () => goTo(0), End: () => goTo(store.deck.slides.length - 1),
      n: () => toggleNotes(), N: () => toggleNotes(),
      o: () => toggleOverview(), O: () => toggleOverview(), m: () => toggleOverview(), M: () => toggleOverview(),
      f: toggleFullscreen, F: toggleFullscreen,
      b: () => blackout.classList.toggle('is-on'), B: () => blackout.classList.toggle('is-on'), '.': () => blackout.classList.toggle('is-on'),
      s: toggleMute, S: toggleMute,
      p: openPresenterWindow, P: openPresenterWindow,
      e: () => app.setMode('edit'), E: () => app.setMode('edit'),
      Escape: () => { toggleNotes(false); blackout.classList.remove('is-on'); }
    };
    const fn = map[k];
    if (fn) {
      e.preventDefault();
      fn();
    }
  }

  let downX = null;
  viewport.addEventListener('pointerdown', (e) => { downX = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (downX == null) return;
    const dx = e.clientX - downX;
    downX = null;
    if (Math.abs(dx) > 60) return dx < 0 ? next() : prev();
    if (e.button === 0 && !window.getSelection()?.toString()) next();
  });
  viewport.addEventListener('contextmenu', (e) => { e.preventDefault(); prev(); });
  blackout.addEventListener('click', () => blackout.classList.remove('is-on'));

  function onMove() {
    root.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!statusbar.matches(':hover') && !root.classList.contains('show-overview')) root.classList.add('is-idle');
    }, 2500);
  }

  const ro = new ResizeObserver(() => fitAll());

  return {
    root,
    mount() {
      mounted = true;
      sound.setEnabled(store.theme.sound);
      showInstant();
      if (layer) entrance(layer);
      ro.observe(holder);
      window.addEventListener('keydown', onKey);
      window.addEventListener('pointermove', onMove);
      onMove();
    },
    unmount() {
      mounted = false;
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
      toggleOverview(false);
      blackout.classList.remove('is-on');
      holder.replaceChildren();
      layer = null;
      document.title = 'OhMyDeck';
    },
    /** Called when another window (presenter view) changes slide. */
    remoteGoTo(i) {
      if (mounted) goTo(i, { broadcast: false });
    }
  };
}
