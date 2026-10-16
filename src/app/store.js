/* ============================================================
   STORE — the single source of truth for the open deck.

   - Decks live in IndexedDB (room for many decks with pictures),
     autosaved shortly after every change.
   - Undo/redo keeps JSON snapshots of the deck *without* image
     data (deck.assets), so history stays light even with photos.
   - Images are stored once in deck.assets and referenced from
     elements as "asset:<id>".
   ============================================================ */

import { uid, debounce } from './util.js';
import { defaultTheme } from './themes.js';
import { starterDeck } from './layouts.js';

const DB_NAME = 'ohmydeck';
const STORE = 'decks';
const LAST_KEY = 'ohmydeck.lastDeck';
const HISTORY_LIMIT = 80;

/* ---------------- IndexedDB (tiny promise wrapper) ---------------- */

let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const dbPut = (deck) => tx('readwrite', (s) => s.put(deck));
export const dbGet = (id) => tx('readonly', (s) => s.get(id));
export const dbDelete = (id) => tx('readwrite', (s) => s.delete(id));
export const dbAll = () => tx('readonly', (s) => s.getAll());

const lastId = {
  get: () => { try { return localStorage.getItem(LAST_KEY); } catch { return null; } },
  set: (id) => { try { localStorage.setItem(LAST_KEY, id); } catch { /* private mode */ } }
};

/* ---------------- Normalising decks (imports, old versions) ---------------- */

export function normalizeDeck(raw) {
  if (!raw || !Array.isArray(raw.slides)) throw new Error('This file is not an OhMyDeck deck.');
  const theme = { ...defaultTheme(), ...(raw.theme || {}) };
  theme.colors = { ...defaultTheme().colors, ...(raw.theme?.colors || {}) };
  return {
    id: raw.id || uid(),
    title: raw.title || 'Untitled deck',
    theme,
    assets: raw.assets || {},
    slides: raw.slides.map((s) => ({
      id: s.id || uid(),
      bg: s.bg || 'bg',
      pattern: s.pattern || 'none',
      label: s.label || '',
      notes: s.notes || '',
      elements: (s.elements || []).map((e) => ({ ...e, id: e.id || uid() }))
    })),
    updated: raw.updated || Date.now()
  };
}

/** Drop images that no element references any more. */
function pruneAssets(deck) {
  const used = new Set();
  for (const s of deck.slides) for (const e of s.elements) if (e.src?.startsWith('asset:')) used.add(e.src.slice(6));
  const assets = {};
  for (const id of used) if (deck.assets[id]) assets[id] = deck.assets[id];
  return assets;
}

/* ---------------- The store ---------------- */

const listeners = new Set();
let undoStack = [];
let redoStack = [];
let lastCheckpoint = { key: null, at: 0 };
let saveState = 'saved';

export const store = {
  deck: null,

  get theme() { return this.deck.theme; },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Notify listeners. `what` hints what changed: 'deck' | 'theme' | 'slides' | 'slide' | 'element' | 'history'. */
  emit(what = 'deck', detail) {
    for (const fn of listeners) fn(what, detail);
  },

  snapshot() {
    const { assets, ...rest } = this.deck;
    return JSON.stringify(rest);
  },

  /**
   * Call BEFORE mutating. `key` coalesces rapid repeats (typing, slider drags,
   * arrow-key nudges) into one undo step.
   */
  checkpoint(key = null, snapshot = null) {
    const now = Date.now();
    if (key && key === lastCheckpoint.key && now - lastCheckpoint.at < 1200) {
      lastCheckpoint.at = now;
      return;
    }
    lastCheckpoint = { key, at: now };
    undoStack.push(snapshot ?? this.snapshot());
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
  },

  /** Mutate + record + notify + autosave in one call. */
  update(what, mutator, key = null) {
    this.checkpoint(key);
    mutator(this.deck);
    this.changed(what);
  },

  changed(what = 'deck', detail) {
    this.deck.updated = Date.now();
    this.emit(what, detail);
    this.scheduleSave();
  },

  canUndo: () => undoStack.length > 0,
  canRedo: () => redoStack.length > 0,

  undo() {
    if (!undoStack.length) return false;
    redoStack.push(this.snapshot());
    this.restore(undoStack.pop());
    return true;
  },

  redo() {
    if (!redoStack.length) return false;
    undoStack.push(this.snapshot());
    this.restore(redoStack.pop());
    return true;
  },

  restore(json) {
    const assets = this.deck.assets;
    this.deck = { ...JSON.parse(json), assets };
    lastCheckpoint = { key: null, at: 0 };
    this.changed('history');
  },

  addAsset(dataURL) {
    const id = uid();
    this.deck.assets[id] = dataURL;
    return `asset:${id}`;
  },

  /* ---- persistence ---- */

  scheduleSave: debounce(() => store.saveNow(), 500),

  async saveNow() {
    if (!this.deck) return;
    try {
      saveState = 'saving';
      this.emit('save', saveState);
      await dbPut({ ...this.deck, assets: pruneAssets(this.deck) });
      saveState = 'saved';
    } catch (err) {
      console.error(err);
      saveState = 'error';
    }
    this.emit('save', saveState);
  },

  get saveState() { return saveState; },

  async open(deck) {
    if (this.deck) await this.saveNow();
    this.deck = normalizeDeck(deck);
    undoStack = [];
    redoStack = [];
    lastId.set(this.deck.id);
    this.emit('deck');
    this.scheduleSave();
  },

  async load() {
    try {
      const id = lastId.get();
      let deck = id ? await dbGet(id) : null;
      if (!deck) {
        const all = await dbAll();
        deck = all.sort((a, b) => b.updated - a.updated)[0];
      }
      this.deck = normalizeDeck(deck || starterDeck());
    } catch (err) {
      console.warn('Storage unavailable, using a temporary deck.', err);
      this.deck = normalizeDeck(starterDeck());
    }
    lastId.set(this.deck.id);
    if (!(await dbGet(this.deck.id).catch(() => null))) this.saveNow();
  },

  async list() {
    if (this.deck) await this.saveNow();
    const all = await dbAll();
    return all
      .map((d) => ({ id: d.id, title: d.title, slides: d.slides.length, updated: d.updated }))
      .sort((a, b) => b.updated - a.updated);
  },

  async remove(id) {
    await dbDelete(id);
  },

  /* ---- import / export ---- */

  exportJSON() {
    const deck = { ...this.deck, assets: pruneAssets(this.deck) };
    return JSON.stringify({ format: 'ohmydeck', version: 1, deck }, null, 1);
  },

  parseImport(text) {
    const data = JSON.parse(text);
    const deck = normalizeDeck(data.deck || data);
    deck.id = uid(); // never overwrite an existing deck on import
    deck.updated = Date.now();
    return deck;
  }
};
