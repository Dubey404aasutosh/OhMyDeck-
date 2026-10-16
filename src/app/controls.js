/* ============================================================
   CONTROLS — small form widgets for the inspector & theme panel.
   Each takes get()/set() callbacks and returns a node with a
   .sync() method so values refresh after drags / undo.
   ============================================================ */

import { COLOR_TOKENS, hexColor, isToken } from './themes.js';
import { store } from './store.js';
import { h, icon } from './util.js';

export function section(title, ...children) {
  return h('div.insp-section', null, title ? h('div.insp-section__title', null, title) : null, ...children);
}

export function row(label, control) {
  return h('label.insp-row', null, h('span.insp-row__label', null, label), control);
}

export function syncAll(root) {
  for (const n of root.querySelectorAll('[data-sync]')) n._sync?.();
}

function syncable(node, fn) {
  node.dataset.sync = '';
  node._sync = fn;
  fn();
  return node;
}

/** Segmented buttons. options: [{ value, label?, icon?, title? }] */
export function seg(options, get, set) {
  const btns = options.map((o) =>
    h('button.seg__btn', { type: 'button', title: o.title || o.label || '', onclick: () => { set(o.value); sync(); } }, o.icon ? icon(o.icon) : null, o.label && !o.icon ? o.label : null)
  );
  const node = h('div.seg', null, btns);
  const sync = () => btns.forEach((b, i) => b.classList.toggle('is-active', options[i].value === get()));
  return syncable(node, sync);
}

/** Colour swatches: theme tokens + custom colour picker (+ optional "none"). */
export function swatches(get, set, { none = false } = {}) {
  const items = [];
  if (none) items.push({ value: 'none', node: h('button.swatch.swatch--none', { type: 'button', title: 'None' }) });
  for (const t of COLOR_TOKENS) {
    items.push({ value: t.key, node: h('button.swatch', { type: 'button', title: t.label, style: { background: `var(--c-${t.key})` } }) });
  }
  items.push({ value: '#ffffff', node: h('button.swatch', { type: 'button', title: 'White', style: { background: '#ffffff' } }) });
  const picker = h('input.swatch-picker', { type: 'color', title: 'Custom colour' });
  for (const it of items) {
    it.node.addEventListener('mousedown', (e) => e.preventDefault()); // keep text selection while editing
    it.node.addEventListener('click', () => { set(it.value); sync(); });
  }
  picker.addEventListener('input', () => { set(picker.value); sync(); });
  const node = h('div.swatches', null, items.map((i) => i.node), picker);
  const sync = () => {
    const v = get();
    let matched = false;
    for (const it of items) {
      const on = it.value === v;
      matched ||= on;
      it.node.classList.toggle('is-active', on);
    }
    picker.classList.toggle('is-active', !matched && !!v && !isToken(v));
    picker.value = hexColor(v, store.theme);
  };
  return syncable(node, sync);
}

/** Slider + number box. */
export function range(min, max, step, get, set) {
  const slider = h('input', { type: 'range', min, max, step });
  const num = h('input.num', { type: 'number', min, max, step });
  const apply = (v) => {
    const n = parseFloat(v);
    if (Number.isFinite(n)) set(n);
  };
  slider.addEventListener('input', () => { apply(slider.value); num.value = slider.value; });
  num.addEventListener('input', () => { apply(num.value); slider.value = num.value; });
  const node = h('div.range', null, slider, num);
  return syncable(node, () => {
    const v = get();
    slider.value = v;
    if (document.activeElement !== num) num.value = Math.round(v * 100) / 100;
  });
}

export function toggle(label, get, set) {
  const input = h('input', { type: 'checkbox' });
  input.addEventListener('change', () => set(input.checked));
  const node = h('label.toggle', null, input, h('span.toggle__track'), h('span', null, label));
  return syncable(node, () => { input.checked = !!get(); });
}

export function number(get, set, { min, max, step = 1 } = {}) {
  const input = h('input.num', { type: 'number', min, max, step });
  input.addEventListener('input', () => {
    const n = parseFloat(input.value);
    if (Number.isFinite(n)) set(n);
  });
  return syncable(input, () => {
    if (document.activeElement !== input) input.value = Math.round(get());
  });
}

export function select(options, get, set) {
  const sel = h('select', null, Object.entries(options).map(([v, l]) => h('option', { value: v }, l)));
  sel.addEventListener('change', () => set(sel.value));
  return syncable(sel, () => { sel.value = get(); });
}

export function textInput(get, set, { placeholder = '', multiline = false } = {}) {
  const input = multiline ? h('textarea', { placeholder, rows: 6 }) : h('input', { type: 'text', placeholder });
  input.addEventListener('input', () => set(input.value));
  return syncable(input, () => {
    if (document.activeElement !== input) input.value = get() || '';
  });
}

export function btn(label, iconName, onclick, cls = '') {
  return h(`button.ui-btn${cls}`, { type: 'button', onclick, title: label }, iconName ? icon(iconName) : null, h('span.ui-btn__txt', null, label));
}

export function iconBtn(title, iconName, onclick, cls = '') {
  const b = h(`button.ui-btn.ui-btn--icon${cls}`, { type: 'button', onclick, title, 'aria-label': title }, icon(iconName));
  b.addEventListener('mousedown', (e) => e.preventDefault()); // don't steal focus from text being edited
  return b;
}

/* ---------- popovers & modals ---------- */

let openPop = null;

export function popover(anchor, content, { align = 'left' } = {}) {
  closePopover();
  const pop = h('div.popover', null, content);
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth;
  let left = align === 'right' ? r.right - pw : r.left;
  left = Math.max(8, Math.min(window.innerWidth - pw - 8, left));
  pop.style.left = `${left}px`;
  const below = window.innerHeight - r.bottom - 16;
  const above = r.top - 16;
  if (pop.offsetHeight > below && above > below) {
    // not enough room underneath (e.g. the New slide button) → open upwards
    pop.style.maxHeight = `${above - 8}px`;
    pop.style.top = `${Math.max(8, r.top - 8 - pop.offsetHeight)}px`;
  } else {
    pop.style.maxHeight = `${below - 8}px`;
    pop.style.top = `${r.bottom + 8}px`;
  }
  const onDown = (e) => {
    if (!pop.contains(e.target) && !anchor.contains(e.target)) closePopover();
  };
  const onKey = (e) => e.key === 'Escape' && closePopover();
  setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
  window.addEventListener('keydown', onKey);
  openPop = { pop, cleanup: () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); } };
  return pop;
}

export function closePopover() {
  if (!openPop) return;
  openPop.cleanup();
  openPop.pop.remove();
  openPop = null;
}

export function modal(title, content, { wide = false, onClose } = {}) {
  const close = () => {
    overlay.remove();
    window.removeEventListener('keydown', onKey, true);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  const overlay = h(
    'div.modal',
    { onpointerdown: (e) => e.target === overlay && close() },
    h(
      `div.modal__box${wide ? '.modal__box--wide' : ''}`,
      { role: 'dialog', 'aria-label': title },
      h('div.modal__head', null, h('h2', null, title), h('button.ui-btn.ui-btn--icon', { type: 'button', onclick: () => close(), 'aria-label': 'Close' }, icon('close'))),
      h('div.modal__body', null, content)
    )
  );
  document.body.append(overlay);
  window.addEventListener('keydown', onKey, true);
  return { close, overlay };
}
