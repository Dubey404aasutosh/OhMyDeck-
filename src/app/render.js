/* ============================================================
   RENDER — turns slide data into DOM. Used by present mode,
   the editor stage, thumbnails, the presenter view and PDF export,
   so a slide looks identical everywhere.

   Every slide is a fixed 1600×900 canvas scaled to fit its box.
   ============================================================ */

import { cssColor } from './themes.js';
import { h, stripHtml } from './util.js';

export const W = 1600;
export const H = 900;

export const PATTERNS = { none: 'None', dots: 'Dots', grid: 'Grid', lines: 'Notebook lines', paper: 'Paper texture' };

export function resolveSrc(src, deck) {
  if (!src) return '';
  if (src.startsWith('asset:')) return deck.assets?.[src.slice(6)] || '';
  if (src.startsWith('sticker:')) return `${import.meta.env.BASE_URL}stickers/${src.slice(8)}`;
  return src;
}

export function slideTitle(slide, index) {
  if (slide.label) return slide.label;
  const text = slide.elements.find((e) => e.type === 'text' && stripHtml(e.html).length > 2);
  return text ? stripHtml(text.html).slice(0, 60) : `Slide ${index + 1}`;
}

/** Build the 1600×900 canvas for a slide. */
export function renderSlide(slide, deck) {
  const canvas = h('div.canvas', { dataset: { slideId: slide.id } });
  styleCanvas(canvas, slide);
  for (const el of slide.elements) canvas.append(renderElement(el, deck));
  return canvas;
}

export function styleCanvas(canvas, slide) {
  canvas.style.setProperty('--slide-bg', cssColor(slide.bg || 'bg'));
  // Highlighter colour must contrast with the slide background
  canvas.style.setProperty('--c-mark', slide.bg === 'accent' ? 'var(--c-paper)' : 'var(--c-accent)');
  canvas.dataset.pattern = slide.pattern || 'none';
}

export function renderElement(el, deck) {
  const node = h(`div.el.el--${el.type}`, { dataset: { id: el.id } });
  if (el.type === 'text') {
    node.append(h('div.el__text', { html: el.html || '' }));
  } else if (el.type === 'image') {
    const src = resolveSrc(el.src, deck);
    if (src) node.append(h('img', { src, alt: el.alt || '', draggable: false }));
    else node.append(h('div.el__placeholder', null, 'Double-click to add an image'));
  }
  updateElement(node, el);
  return node;
}

/** Apply an element's position/style to an existing node (no re-creation). */
export function updateElement(node, el) {
  const s = node.style;
  s.left = `${el.x}px`;
  s.top = `${el.y}px`;
  s.width = `${el.w}px`;
  s.height = `${el.h}px`;
  s.transform = el.rotate ? `rotate(${el.rotate}deg)` : '';
  s.opacity = el.opacity ?? 1;
  s.borderRadius = el.type === 'shape' && el.kind === 'circle' ? '50%' : el.radius == null ? 'var(--radius)' : `${el.radius}px`;

  const hasFill = el.fill && el.fill !== 'none';
  s.background = cssColor(el.fill);
  s.border = el.border ? 'var(--border-w) solid var(--c-line)' : '';
  s.boxShadow = el.shadow && (hasFill || el.type !== 'text') ? 'var(--shadow-x) var(--shadow-x) 0 0 var(--c-line)' : '';

  if (el.type === 'text') {
    const fonts = { display: 'var(--font-display)', body: 'var(--font-body)', mono: 'var(--font-mono)' };
    s.fontFamily = fonts[el.font] || fonts.body;
    s.fontSize = `${el.size}px`;
    s.lineHeight = el.lh ?? 1.15;
    s.color = cssColor(el.color || 'ink');
    s.textAlign = el.align || 'left';
    s.justifyContent = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[el.valign || 'top'];
    s.padding = `${el.pad || 0}px`;
    s.textTransform = el.upper ? 'uppercase' : '';
    s.letterSpacing = el.font === 'display' ? '0.01em' : '';
    // Text without a box gets a hard "sticker" text shadow instead of a box shadow
    s.textShadow = el.shadow && !hasFill ? 'calc(var(--shadow-x) * 0.6) calc(var(--shadow-x) * 0.6) 0 var(--c-line)' : '';
  } else if (el.type === 'image') {
    const img = node.querySelector('img');
    if (img) img.style.objectFit = el.fit || 'cover';
  }
}

/** Scale a 1600×900 canvas to fit (contain) inside its parent box. */
export function fitCanvas(canvas, box, { padding = 0 } = {}) {
  const bw = box.clientWidth - padding * 2;
  const bh = box.clientHeight - padding * 2;
  const scale = Math.max(0.05, Math.min(bw / W, bh / H));
  const left = (box.clientWidth - W * scale) / 2;
  const top = (box.clientHeight - H * scale) / 2;
  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  return scale;
}

/** A small static preview (used in sidebar, overview, layout picker). */
export function renderThumb(slide, deck, width = 200) {
  const scale = width / W;
  const box = h('div.thumb', { style: { width: `${width}px`, height: `${H * scale}px` } });
  const canvas = renderSlide(slide, deck);
  canvas.style.transform = `scale(${scale})`;
  canvas.setAttribute('aria-hidden', 'true');
  box.append(canvas);
  return box;
}
