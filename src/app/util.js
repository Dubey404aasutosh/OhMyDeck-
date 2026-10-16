/* ============================================================
   UTIL — tiny DOM + misc helpers shared by every module.
   ============================================================ */

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/**
 * h('button.btn', { onclick, title: 'x' }, 'Label', childNode)
 * Tag string supports .class and #id shorthands.
 */
export function h(tag, props, ...children) {
  const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9-]*)(.*)$/i);
  const node = document.createElement(name || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === '.') node.classList.add(part.slice(1));
    else node.id = part.slice(1);
  }
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k in node && typeof v !== 'string') node[k] = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function icon(name) {
  const span = document.createElement('span');
  span.className = 'i';
  span.innerHTML = ICONS[name] || '';
  return span;
}

const svg = (d) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  prev: svg('<path d="M15 18l-6-6 6-6"/>'),
  next: svg('<path d="M9 18l6-6-6-6"/>'),
  play: svg('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  grid: svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  notes: svg('<path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  sound: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 8a5 5 0 010 8"/>'),
  mute: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  monitor: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  undo: svg('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),
  redo: svg('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>'),
  text: svg('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>'),
  shape: svg('<rect x="3" y="3" width="10" height="10" rx="1"/><circle cx="16" cy="16" r="5"/>'),
  sticker: svg('<path d="M4 4h16v9l-7 7H4z"/><path d="M13 20v-7h7"/>'),
  palette: svg('<path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.4-.8-2.3 0-.9.7-1.6 1.6-1.6H17a4 4 0 004-4c0-4.7-4-8.6-9-8.6z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>'),
  trash: svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  up: svg('<path d="M6 15l6-6 6 6"/>'),
  down: svg('<path d="M6 9l6 6 6-6"/>'),
  front: svg('<rect x="9" y="9" width="11" height="11" rx="1" fill="currentColor"/><path d="M15 5V4H4v11h1"/>'),
  back: svg('<rect x="4" y="4" width="11" height="11" rx="1" fill="currentColor"/><path d="M19 9h1v11H9v-1"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
  folder: svg('<path d="M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z"/>'),
  pdf: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  bold: svg('<path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z"/>'),
  italic: svg('<path d="M11 5h6M7 19h6M14 5l-4 14"/>'),
  underline: svg('<path d="M7 4v7a5 5 0 0010 0V4M5 20h14"/>'),
  strike: svg('<path d="M4 12h16M16 6.5C15 5 13.6 4.5 12 4.5c-2.5 0-4 1.3-4 3 0 4 8 2.5 8 7 0 2-1.8 3.5-4.2 3.5-1.9 0-3.4-.7-4.3-2"/>'),
  marker: svg('<path d="M4 20h8"/><path d="M14.5 4.5l5 5-8 8H6.5v-5z"/>'),
  list: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>'),
  olist: svg('<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1V9M3.5 15.5c0-1 2.5-1.2 2.5.3 0 1-2.5 2-2.5 3.2H6"/>'),
  clear: svg('<path d="M5 6V4h12v2M11 4l-4 16M4 20l16-16"/>'),
  alignL: svg('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
  alignC: svg('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
  alignR: svg('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
  vTop: svg('<path d="M4 4h16M12 8v12M8 12l4-4 4 4"/>'),
  vMid: svg('<path d="M4 12h16M12 3v5M9 6l3 2 3-2M12 21v-5M9 18l3-2 3 2"/>'),
  vBot: svg('<path d="M4 20h16M12 4v12M8 12l4 4 4-4"/>'),
  dup: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M14 11v6M11 14h6"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>')
};

let toastTimer;
export function toast(msg, type = 'info') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = h('div.toast');
    document.body.append(el);
  }
  el.textContent = msg;
  el.dataset.type = type;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

export function downloadFile(name, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, style: { display: 'none' } });
    input.addEventListener('change', () => {
      resolve(input.files[0] || null);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

export const readText = (file) => file.text();

export function readDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Load an image file, shrink it to at most `max` px on the long side and
 * return { src, width, height }. Keeps GIF/SVG untouched (animation/vector).
 */
export async function processImage(file, max = 1920) {
  const original = await readDataURL(file);
  const img = await loadImage(original);
  const w = img.naturalWidth || 800;
  const hgt = img.naturalHeight || 600;
  if (/gif|svg/.test(file.type) || (w <= max && hgt <= max && file.size < 400_000)) {
    return { src: original, width: w, height: hgt };
  }
  const scale = Math.min(1, max / Math.max(w, hgt));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(hgt * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  let src = canvas.toDataURL('image/webp', 0.86);
  if (!src.startsWith('data:image/webp')) src = canvas.toDataURL('image/jpeg', 0.86);
  return { src, width: canvas.width, height: canvas.height };
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export const isTyping = (e) => {
  const t = e.target;
  return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
};

export const stripHtml = (html) => {
  const d = document.createElement('div');
  d.innerHTML = (html || '').replace(/<br\s*\/?>|<\/(p|div|li)>/gi, ' ');
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
};

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
