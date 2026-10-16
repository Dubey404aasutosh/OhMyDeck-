/* ============================================================
   PRESENTER VIEW — opened in a second window (P in present mode).
   Shows current + next slide, notes, a timer and the clock, and
   stays in sync with the main window via BroadcastChannel.
   ============================================================ */

import { store } from './store.js';
import { renderSlide, fitCanvas, slideTitle } from './render.js';
import { applyTheme } from './themes.js';
import { h, icon } from './util.js';

export function startPresenterView(root, channel) {
  let index = Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1);
  const started = Date.now();
  let paused = 0;
  let pausedAt = null;

  const current = h('div.pv__stage');
  const upcoming = h('div.pv__stage');
  const notes = h('div.pv__notes');
  const counter = h('div.pv__counter');
  const timer = h('button.pv__timer', { title: 'Click to pause/resume' });
  const clock = h('div.pv__clock');
  const nextTitle = h('div.pv__label');

  root.replaceChildren(
    h(
      'div.pv',
      null,
      h('div.pv__main', null, h('div.pv__label', null, 'Now'), current),
      h(
        'div.pv__side',
        null,
        h('div.pv__label', null, 'Next'),
        upcoming,
        nextTitle,
        h('div.pv__label', null, 'Notes'),
        notes
      ),
      h(
        'div.pv__bar',
        null,
        h('button.ui-btn', { onclick: () => go(index - 1) }, icon('prev'), ' Prev'),
        counter,
        h('button.ui-btn.ui-btn--accent', { onclick: () => go(index + 1) }, 'Next ', icon('next')),
        h('div.pv__spacer'),
        timer,
        h('button.ui-btn', { onclick: () => { paused = 0; pausedAt = null; resetAt = Date.now(); } }, 'Reset timer'),
        clock
      )
    )
  );
  let resetAt = started;

  timer.addEventListener('click', () => {
    if (pausedAt) {
      paused += Date.now() - pausedAt;
      pausedAt = null;
    } else pausedAt = Date.now();
  });

  function draw() {
    const slides = store.deck.slides;
    index = Math.max(0, Math.min(slides.length - 1, index));
    applyTheme(store.theme);
    const c = renderSlide(slides[index], store.deck);
    current.replaceChildren(c);
    fitCanvas(c, current);
    if (slides[index + 1]) {
      const n = renderSlide(slides[index + 1], store.deck);
      upcoming.replaceChildren(n);
      fitCanvas(n, upcoming);
      nextTitle.textContent = slideTitle(slides[index + 1], index + 1);
    } else {
      upcoming.replaceChildren(h('div.pv__end', null, 'End of deck'));
      nextTitle.textContent = '';
    }
    notes.textContent = slides[index].notes || '—';
    counter.textContent = `${index + 1} / ${slides.length}`;
    document.title = `Presenter — ${store.deck.title}`;
  }

  function go(i, broadcast = true) {
    index = i;
    draw();
    if (broadcast) channel.post({ type: 'goto', index });
  }

  function tick() {
    const elapsed = (pausedAt ?? Date.now()) - resetAt - paused;
    const s = Math.max(0, Math.floor(elapsed / 1000));
    timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    timer.classList.toggle('is-paused', !!pausedAt);
    clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  channel.on((msg) => {
    if (msg.type === 'goto') go(msg.index, false);
  });

  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); go(index + 1); }
    if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(index - 1); }
  });
  window.addEventListener('resize', draw);

  draw();
  tick();
  setInterval(tick, 500);
}
