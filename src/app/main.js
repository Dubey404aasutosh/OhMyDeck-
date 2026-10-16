/* ============================================================
   MAIN — boots the app and switches between Edit and Present.
   URL:  #3          → open on slide 3
         #present/3  → start presenting slide 3
         ?presenter  → presenter window (notes + timer)
   ============================================================ */

import './styles/base.css';
import './styles/canvas.css';
import './styles/present.css';
import './styles/editor.css';
import './styles/print.css';

import { store } from './store.js';
import { applyTheme } from './themes.js';
import { createEditor } from './editor.js';
import { createPresent } from './present.js';
import { startPresenterView } from './presenter.js';
import { sound } from './sound.js';

const rootEl = document.getElementById('app');

/** Same-origin sync between the main window and the presenter window. */
function createChannel() {
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('ohmydeck') : null;
  const handlers = new Set();
  bc?.addEventListener('message', (e) => handlers.forEach((fn) => fn(e.data)));
  return { post: (msg) => bc?.postMessage(msg), on: (fn) => handlers.add(fn) };
}

function parseHash() {
  const m = location.hash.match(/^#(present\/)?(\d+)?/);
  return { present: !!m?.[1], index: m?.[2] ? parseInt(m[2], 10) - 1 : null };
}

async function boot() {
  await store.load();
  applyTheme(store.theme);
  document.fonts?.ready.then(() => window.dispatchEvent(new Event('resize')));
  const channel = createChannel();

  if (new URLSearchParams(location.search).has('presenter')) {
    rootEl.className = 'app app--presenter';
    startPresenterView(rootEl, channel);
    return;
  }

  const hash = parseHash();
  const app = {
    index: Math.max(0, Math.min(store.deck.slides.length - 1, hash.index ?? 0)),
    mode: null,
    channel,

    setIndex(i, { silent = false } = {}) {
      i = Math.max(0, Math.min(store.deck.slides.length - 1, i));
      const changed = i !== this.index;
      this.index = i;
      writeHash();
      if (!silent && changed && this.mode === 'edit') editor.indexChanged();
    },

    setMode(mode) {
      if (mode === this.mode) return;
      if (this.mode === 'edit') editor.unmount();
      if (this.mode === 'present') present.unmount();
      this.mode = mode;
      rootEl.className = `app app--${mode}`;
      rootEl.replaceChildren(mode === 'edit' ? editor.root : present.root);
      if (mode === 'edit') editor.mount();
      else {
        if (store.theme.sound) sound.click();
        present.mount();
      }
      writeHash();
    },

    async openDeck(deck) {
      await store.open(deck);
      this.index = 0;
      applyTheme(store.theme);
      if (this.mode === 'present') {
        present.unmount();
        present.mount();
      }
      writeHash();
    }
  };

  function writeHash() {
    const h = `#${app.mode === 'present' ? 'present/' : ''}${app.index + 1}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  const editor = createEditor(app);
  const present = createPresent(app);

  store.subscribe((what, detail) => {
    if (['theme', 'deck', 'history'].includes(what)) {
      applyTheme(store.theme);
      sound.setEnabled(store.theme.sound);
    }
    if (app.mode === 'edit') editor.onStore(what, detail);
  });

  channel.on((msg) => {
    if (msg.type !== 'goto') return;
    if (app.mode === 'present') present.remoteGoTo(msg.index);
    else app.setIndex(msg.index);
  });

  window.addEventListener('hashchange', () => {
    const h = parseHash();
    if (h.index != null && h.index !== app.index) {
      if (app.mode === 'present') present.remoteGoTo(h.index);
      else app.setIndex(h.index);
    }
  });

  // Save before the tab closes
  window.addEventListener('pagehide', () => store.saveNow());

  app.setMode(hash.present ? 'present' : 'edit');
}

boot().catch((err) => {
  console.error(err);
  rootEl.innerHTML = `<div class="boot boot--error">Something went wrong while loading.<br><small>${String(err.message || err)}</small></div>`;
});
