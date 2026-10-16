/* ============================================================
   EDITOR — slide list, canvas editing and the inspector panel.

   Mouse:  click = select · drag = move · handles = resize
           click selected text (or double-click) = edit text
           double-click image = replace · Alt while dragging = no snapping
   Keys:   see HELP below (also shown with the ? button).
   ============================================================ */

import { store, dbGet, dbPut } from './store.js';
import { renderSlide, updateElement, styleCanvas, renderThumb, fitCanvas, slideTitle, resolveSrc, PATTERNS, W, H } from './render.js';
import { LAYOUTS, STICKERS, text, image, shape, sticker, starterDeck, blankDeck } from './layouts.js';
import { PRESETS, FONTS, TRANSITIONS, COLOR_TOKENS, applyPreset } from './themes.js';
import { section, row, seg, swatches, range, toggle, number, select as dropdown, textInput, btn, iconBtn, popover, closePopover, modal, syncAll } from './controls.js';
import { printDeck } from './print.js';
import { h, icon, uid, clamp, debounce, toast, downloadFile, pickFile, processImage, isTyping } from './util.js';

const HELP = [
  ['Present from this slide', 'F5 · Ctrl+Enter'],
  ['Undo / Redo', 'Ctrl+Z · Ctrl+Y (or Ctrl+Shift+Z)'],
  ['New slide', 'Ctrl+M'],
  ['Duplicate element (or slide)', 'Ctrl+D'],
  ['Copy / Cut / Paste element', 'Ctrl+C · Ctrl+X · Ctrl+V'],
  ['Paste a picture', 'Ctrl+V with an image copied, or drag a file onto the slide'],
  ['Delete element', 'Delete · Backspace'],
  ['Move element', 'Arrow keys (Shift = 10px)'],
  ['Edit selected text', 'Enter, or click it again'],
  ['Stop editing / deselect', 'Esc'],
  ['Select next element', 'Tab'],
  ['Previous / next slide', 'Page Up · Page Down'],
  ['Bold / Italic / Underline', 'Ctrl+B · Ctrl+I · Ctrl+U (while editing text)'],
  ['Free move (no snapping)', 'Hold Alt while dragging'],
  ['Keep proportions while resizing', 'Hold Shift (pictures keep them by default)']
];

const PRESENT_HELP = [
  ['Next / previous', '→ Space Enter click · ← right-click'],
  ['Notes', 'N'],
  ['Overview of all slides', 'O'],
  ['Fullscreen', 'F'],
  ['Black screen', 'B'],
  ['Presenter window (notes + timer)', 'P'],
  ['Back to editing', 'E']
];

export function createEditor(app) {
  let mounted = false;
  let selectedId = null;
  let editingId = null;
  let canvas = null;
  let scale = 1;
  let insertOffset = 0;

  /* ================= DOM skeleton ================= */

  const saveBadge = h('span.save-badge');
  const titleInput = h('input.deck-title', { type: 'text', 'aria-label': 'Deck title', spellcheck: false });
  titleInput.addEventListener('input', () => store.update('title', (d) => { d.title = titleInput.value || 'Untitled deck'; }, 'title'));

  const undoBtn = iconBtn('Undo (Ctrl+Z)', 'undo', () => undo());
  const redoBtn = iconBtn('Redo (Ctrl+Y)', 'redo', () => redo());

  const addTextBtn = btn('Text', 'text', () => addText());
  const addImageBtn = btn('Picture', 'image', () => addImageFromFile());
  const addShapeBtn = btn('Shape', 'shape', () => shapeMenu());
  const stickerBtn = btn('Stickers', 'sticker', () => stickerMenu());
  const themeBtn = btn('Theme', 'palette', () => themePanel());
  const decksBtn = btn('My decks', 'folder', () => decksPanel());
  const exportBtn = btn('Export', 'download', () => exportMenu());
  const helpBtn = iconBtn('Help & shortcuts', 'help', () => helpPanel());
  const presentBtn = btn('Present', 'play', () => app.setMode('present'), '.ui-btn--accent.ui-btn--big');

  const topbar = h(
    'header.topbar',
    null,
    h('div.topbar__group', null, h('div.brand', null, 'OhMyDeck'), decksBtn, titleInput, saveBadge),
    h('div.topbar__group.topbar__tools', null, undoBtn, redoBtn, h('span.topbar__sep'), addTextBtn, addImageBtn, addShapeBtn, stickerBtn, h('span.topbar__sep'), themeBtn),
    h('div.topbar__group', null, exportBtn, helpBtn, presentBtn)
  );

  const slideList = h('div.slide-list');
  const addSlideBtn = btn('New slide', 'plus', () => layoutMenu(addSlideBtn), '.ui-btn--accent.ui-btn--block');
  const sidebar = h('aside.sidebar', null, slideList, h('div.sidebar__foot', null, addSlideBtn));

  const stageBox = h('div.stage-box');
  const workspace = h('main.workspace', null, stageBox, h('div.workspace__hint', null, 'Click to select · drag to move · click selected text to type · drop pictures here'));
  const inspector = h('aside.inspector');

  const root = h('div.editor', null, topbar, h('div.editor__body', null, sidebar, workspace, inspector));

  /* ================= helpers ================= */

  const slide = () => store.deck.slides[app.index];
  const findEl = (id) => slide()?.elements.find((e) => e.id === id);
  const selected = () => (selectedId ? findEl(selectedId) : null);
  const nodeOf = (id) => canvas?.querySelector(`.el[data-id="${id}"]`);

  function changeEl(mutator, key) {
    const el = selected();
    if (!el) return;
    store.checkpoint(key ? `${key}:${el.id}` : null);
    mutator(el);
    store.changed('element', el.id);
  }

  function changeSlide(mutator, key) {
    store.checkpoint(key ? `${key}:${slide().id}` : null);
    mutator(slide());
    store.changed('slide');
  }

  /* ================= sidebar ================= */

  let dragFrom = null;

  function renderSidebar() {
    const items = store.deck.slides.map((s, i) => {
      const item = h(
        'div.slide-item',
        { draggable: true, class: i === app.index ? 'slide-item is-current' : 'slide-item', dataset: { index: i }, onclick: () => goTo(i) },
        h('span.slide-item__no', null, i + 1),
        renderThumb(s, store.deck, 168),
        h(
          'div.slide-item__actions',
          null,
          iconBtn('Duplicate slide', 'dup', (e) => { e.stopPropagation(); duplicateSlide(i); }),
          iconBtn('Delete slide', 'trash', (e) => { e.stopPropagation(); deleteSlide(i); })
        )
      );
      item.addEventListener('dragstart', (e) => {
        dragFrom = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', `slide:${i}`);
      });
      item.addEventListener('dragover', (e) => {
        if (dragFrom == null) return;
        e.preventDefault();
        const r = item.getBoundingClientRect();
        const after = e.clientY > r.top + r.height / 2;
        item.classList.toggle('drop-before', !after);
        item.classList.toggle('drop-after', after);
      });
      item.addEventListener('dragleave', () => item.classList.remove('drop-before', 'drop-after'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const after = item.classList.contains('drop-after');
        item.classList.remove('drop-before', 'drop-after');
        if (dragFrom == null) return;
        let to = i + (after ? 1 : 0);
        if (dragFrom < to) to--;
        moveSlide(dragFrom, to);
        dragFrom = null;
      });
      item.addEventListener('dragend', () => { dragFrom = null; });
      return item;
    });
    slideList.replaceChildren(...items);
    slideList.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
  }

  const refreshCurrentThumb = debounce(() => {
    const item = slideList.children[app.index];
    if (!item || !slide()) return;
    item.querySelector('.thumb').replaceWith(renderThumb(slide(), store.deck, 168));
  }, 250);

  /* ================= stage ================= */

  const selBox = h('div.sel', null, ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((d) => h(`div.sel__h.sel__h--${d}`, { dataset: { dir: d } })));
  const guideV = h('div.guide.guide--v');
  const guideH = h('div.guide.guide--h');
  guideV.hidden = guideH.hidden = true;

  function renderStage() {
    if (editingId) stopEditing();
    const s = slide();
    canvas = renderSlide(s, store.deck);
    canvas.classList.add('canvas--edit');
    canvas.append(guideV, guideH, selBox);
    stageBox.replaceChildren(canvas);
    fit();
    if (selectedId && !findEl(selectedId)) selectedId = null;
    positionSel();
  }

  function fit() {
    if (!canvas) return;
    scale = fitCanvas(canvas, stageBox, { padding: 28 });
    canvas.style.setProperty('--inv', 1 / scale);
  }

  function positionSel() {
    const el = selected();
    for (const n of canvas?.querySelectorAll('.el.is-selected') || []) n.classList.remove('is-selected');
    if (!el) {
      selBox.hidden = true;
      return;
    }
    nodeOf(el.id)?.classList.add('is-selected');
    selBox.hidden = false;
    Object.assign(selBox.style, {
      left: `${el.x}px`, top: `${el.y}px`, width: `${el.w}px`, height: `${el.h}px`,
      transform: el.rotate ? `rotate(${el.rotate}deg)` : ''
    });
    selBox.classList.toggle('is-editing', editingId === el.id);
  }

  function select(id) {
    if (editingId && editingId !== id) stopEditing();
    if (selectedId === id) return;
    selectedId = id;
    positionSel();
    renderInspector();
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  /* ---------- snapping ---------- */

  function snap(el, x, y, free) {
    guideV.hidden = guideH.hidden = true;
    if (free) return { x, y };
    const T = 8 / Math.max(scale, 0.3);
    const others = slide().elements.filter((o) => o.id !== el.id);
    const xs = [0, W / 2, W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
    const ys = [0, H / 2, H, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
    const best = (targets, pos, size) => {
      let res = null;
      for (const off of [0, size / 2, size]) {
        for (const t of targets) {
          const d = Math.abs(pos + off - t);
          if (d < T && (!res || d < res.d)) res = { d, pos: t - off, line: t };
        }
      }
      return res;
    };
    const bx = best(xs, x, el.w);
    const by = best(ys, y, el.h);
    if (bx) { x = bx.pos; guideV.hidden = false; guideV.style.left = `${bx.line}px`; }
    if (by) { y = by.pos; guideH.hidden = false; guideH.style.top = `${by.line}px`; }
    return { x, y };
  }

  /* ---------- pointer: select / move / resize ---------- */

  stageBox.addEventListener('pointerdown', (e) => {
    if (!canvas || e.button !== 0) return;
    const handle = e.target.closest('.sel__h');
    const node = e.target.closest('.el');

    if (editingId && node?.dataset.id === editingId && !handle) return; // clicking inside text being edited

    if (handle) return startResize(e, handle.dataset.dir);
    if (!node) {
      select(null);
      return;
    }
    const id = node.dataset.id;
    const wasSelected = selectedId === id;
    select(id);
    startMove(e, id, wasSelected);
  });

  function startMove(e, id, wasSelected) {
    const el = findEl(id);
    const node = nodeOf(id);
    const start = toLogical(e);
    const orig = { x: el.x, y: el.y };
    const snapshot = store.snapshot();
    let moved = false;
    e.preventDefault();

    const onMove = (ev) => {
      const p = toLogical(ev);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) * scale < 4) return;
      if (!moved) {
        store.checkpoint(null, snapshot);
        moved = true;
        canvas.classList.add('is-dragging');
      }
      const s = snap(el, orig.x + dx, orig.y + dy, ev.altKey);
      el.x = Math.round(s.x);
      el.y = Math.round(s.y);
      updateElement(node, el);
      positionSel();
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      guideV.hidden = guideH.hidden = true;
      canvas?.classList.remove('is-dragging');
      if (moved) store.changed('element', el.id);
      else if (wasSelected && el.type === 'text') startEditing(el.id, ev);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startResize(e, dir) {
    const el = selected();
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const node = nodeOf(el.id);
    const start = toLogical(e);
    const o = { x: el.x, y: el.y, w: el.w, h: el.h };
    store.checkpoint();

    const onMove = (ev) => {
      const p = toLogical(ev);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      let { x, y, w, h: hh } = o;
      if (dir.includes('e')) w = o.w + dx;
      if (dir.includes('w')) w = o.w - dx;
      if (dir.includes('s')) hh = o.h + dy;
      if (dir.includes('n')) hh = o.h - dy;
      const keep = (el.type === 'image' || (el.type === 'shape' && el.kind === 'circle')) !== ev.shiftKey;
      if (keep && dir.length === 2) {
        const ratio = o.w / o.h;
        if (Math.abs(w - o.w) / o.w > Math.abs(hh - o.h) / o.h) hh = w / ratio;
        else w = hh * ratio;
      }
      w = Math.max(20, w);
      hh = Math.max(10, hh);
      if (dir.includes('w')) x = o.x + o.w - w;
      if (dir.includes('n')) y = o.y + o.h - hh;
      Object.assign(el, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) });
      updateElement(node, el);
      positionSel();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      store.changed('element', el.id);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  stageBox.addEventListener('dblclick', (e) => {
    const node = e.target.closest('.el');
    if (!node) return;
    const el = findEl(node.dataset.id);
    if (el?.type === 'text' && editingId !== el.id) startEditing(el.id, e);
    if (el?.type === 'image') replaceImage(el);
  });

  /* ---------- text editing ---------- */

  let editSnapshot = null;
  let editRecorded = false;

  function startEditing(id, e) {
    const node = nodeOf(id);
    const textNode = node?.querySelector('.el__text');
    if (!textNode) return;
    editingId = id;
    editSnapshot = store.snapshot();
    editRecorded = false;
    textNode.contentEditable = 'true';
    textNode.spellcheck = true;
    node.classList.add('is-editing');
    textNode.focus({ preventScroll: true });
    const sel = window.getSelection();
    const range = e && document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (range && textNode.contains(range.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      const r = document.createRange();
      r.selectNodeContents(textNode);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    positionSel();
  }

  function commitText() {
    const el = findEl(editingId);
    const textNode = nodeOf(editingId)?.querySelector('.el__text');
    if (!el || !textNode) return;
    const html = textNode.innerHTML;
    if (html === el.html) return;
    if (!editRecorded) {
      store.checkpoint(null, editSnapshot);
      editRecorded = true;
    }
    el.html = html;
    store.changed('text');
  }

  function stopEditing() {
    if (!editingId) return;
    commitText();
    const node = nodeOf(editingId);
    const textNode = node?.querySelector('.el__text');
    if (textNode) {
      textNode.contentEditable = 'false';
      textNode.blur();
    }
    node?.classList.remove('is-editing');
    editingId = null;
    window.getSelection()?.removeAllRanges();
    positionSel();
  }

  stageBox.addEventListener('input', (e) => {
    if (e.target.closest('.el__text')) commitText();
  });

  stageBox.addEventListener('paste', (e) => {
    if (!editingId) return;
    const textData = e.clipboardData?.getData('text/plain');
    if (textData != null && !e.clipboardData.files.length) {
      e.preventDefault();
      e.stopPropagation();
      document.execCommand('insertText', false, textData);
    }
  });

  /** Run a formatting command on the current text selection, or the whole box if not editing. */
  function formatText(fn) {
    const el = selected();
    if (!el || el.type !== 'text') return;
    const wasEditing = editingId === el.id;
    if (!wasEditing) {
      startEditing(el.id);
      const r = document.createRange();
      r.selectNodeContents(nodeOf(el.id).querySelector('.el__text'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
    }
    fn();
    commitText();
    if (!wasEditing) stopEditing();
  }

  const exec = (cmd, value = null) => formatText(() => document.execCommand(cmd, false, value));

  /** Wrap the selection in a tag (mark / span with style), or unwrap if already wrapped. */
  function wrapSelection(tag, style) {
    formatText(() => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const host = nodeOf(editingId).querySelector('.el__text');
      let anc = range.commonAncestorContainer;
      if (anc.nodeType === 3) anc = anc.parentNode;
      const existing = tag === 'mark' ? anc.closest('mark') : null;
      if (existing && host.contains(existing)) {
        existing.replaceWith(...existing.childNodes);
        host.normalize();
        return;
      }
      if (range.collapsed) return;
      const wrapper = document.createElement(tag);
      if (style) Object.assign(wrapper.style, style);
      wrapper.append(range.extractContents());
      range.insertNode(wrapper);
      // remove empty leftovers
      for (const m of host.querySelectorAll('mark:empty, span:empty')) m.remove();
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(wrapper);
      sel.addRange(r);
    });
  }

  function hasTextSelection() {
    if (!editingId) return false;
    const sel = window.getSelection();
    return sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed;
  }

  /* ================= adding things ================= */

  function nextPos(w, hgt) {
    insertOffset = (insertOffset + 30) % 180;
    return { x: Math.round((W - w) / 2 + insertOffset - 60), y: Math.round((H - hgt) / 2 + insertOffset - 60) };
  }

  function addElement(el, { edit = false } = {}) {
    store.checkpoint();
    slide().elements.push(el);
    selectedId = el.id;
    store.changed('elements');
    if (edit) {
      startEditing(el.id);
      document.execCommand('selectAll');
    }
  }

  function addText(html = 'Type something') {
    const el = text({ html, size: 48, w: 700, h: 90, ...nextPos(700, 90) });
    addElement(el, { edit: true });
  }

  async function addImageFromFile(at) {
    const file = await pickFile('image/*');
    if (file) await addImageFile(file, at);
  }

  async function addImageFile(file, at) {
    try {
      const { src, width, height } = await processImage(file);
      const ratio = width / height;
      let w = Math.min(900, width);
      let hh = w / ratio;
      if (hh > 700) { hh = 700; w = hh * ratio; }
      const pos = at ? { x: Math.round(at.x - w / 2), y: Math.round(at.y - hh / 2) } : nextPos(w, hh);
      addElement(image({ src: store.addAsset(src), fit: 'contain', radius: 0, w: Math.round(w), h: Math.round(hh), ...pos, alt: file.name.replace(/\.[^.]+$/, '') }));
    } catch (err) {
      console.error(err);
      toast('Could not read that picture.', 'error');
    }
  }

  async function replaceImage(el) {
    const file = await pickFile('image/*');
    if (!file) return;
    const { src } = await processImage(file);
    store.checkpoint();
    el.src = store.addAsset(src);
    store.changed('elements');
  }

  function shapeMenu() {
    const add = (el) => { closePopover(); addElement(el); };
    popover(addShapeBtn, h('div.menu', null,
      h('button.menu__item', { onclick: () => add(shape({ kind: 'rect', ...nextPos(400, 260), w: 400, h: 260, border: true, shadow: true })) }, h('span.menu__swatch.menu__swatch--rect'), 'Rectangle'),
      h('button.menu__item', { onclick: () => add(shape({ kind: 'circle', ...nextPos(280, 280), w: 280, h: 280, fill: 'accent2', border: true, shadow: true })) }, h('span.menu__swatch.menu__swatch--circle'), 'Circle'),
      h('button.menu__item', { onclick: () => add(shape({ kind: 'rect', ...nextPos(600, 8), w: 600, h: 8, fill: 'line', radius: 4 })) }, h('span.menu__swatch.menu__swatch--line'), 'Line'),
      h('button.menu__item', { onclick: () => { closePopover(); addElement(text({ html: '<b>Card title</b><br>Some text inside a box.', size: 32, fill: 'paper', border: true, shadow: true, pad: 36, w: 480, h: 280, ...nextPos(480, 280) }), { edit: true }); } }, h('span.menu__swatch.menu__swatch--card'), 'Text card'),
      h('button.menu__item', { onclick: () => { closePopover(); addElement(text({ html: 'Button', size: 34, font: 'body', align: 'center', valign: 'middle', fill: 'accent', border: true, shadow: true, pad: 12, w: 300, h: 90, ...nextPos(300, 90) }), { edit: true }); } }, h('span.menu__swatch.menu__swatch--pill'), 'Label / button'),
      h('button.menu__item', { onclick: () => { closePopover(); addElement(text({ html: 'Big title', font: 'display', size: 120, lh: 1, w: 1000, h: 150, shadow: true, ...nextPos(1000, 150) }), { edit: true }); } }, h('span.menu__swatch.menu__swatch--title'), 'Big title'),
      h('button.menu__item', { onclick: () => { closePopover(); addElement(text({ html: '<ul><li>First point</li><li>Second point</li><li>Third point</li></ul>', size: 38, lh: 1.4, w: 800, h: 260, ...nextPos(800, 260) }), { edit: true }); } }, h('span.menu__swatch.menu__swatch--list'), 'Bullet list')
    ));
  }

  function stickerMenu() {
    popover(stickerBtn, h('div.sticker-grid', null, STICKERS.map((s) =>
      h('button.sticker-grid__item', { title: s.file, onclick: () => { closePopover(); addElement(sticker(s.file, { w: s.w, h: s.h, ...nextPos(s.w, s.h) })); } },
        h('img', { src: resolveSrc(`sticker:${s.file}`, store.deck), alt: '' }))
    )));
  }

  function layoutMenu(anchor) {
    const pop = popover(anchor, h('div.layout-grid', null, LAYOUTS.map((l) => {
      const preview = l.make();
      return h('button.layout-grid__item', { onclick: () => { closePopover(); addSlide(l.make()); } }, renderThumb(preview, store.deck, 180), h('span', null, l.name));
    })));
    pop.classList.add('popover--layouts');
  }

  /* ================= slide operations ================= */

  function goTo(i) {
    if (editingId) stopEditing();
    i = clamp(i, 0, store.deck.slides.length - 1);
    if (i === app.index) return;
    selectedId = null;
    app.setIndex(i);
  }

  function addSlide(s) {
    store.update('slides', (d) => d.slides.splice(app.index + 1, 0, s));
    selectedId = null;
    app.setIndex(app.index + 1);
  }

  function duplicateSlide(i = app.index) {
    const copy = structuredClone(store.deck.slides[i]);
    copy.id = uid();
    copy.elements.forEach((e) => { e.id = uid(); });
    store.update('slides', (d) => d.slides.splice(i + 1, 0, copy));
    app.setIndex(i + 1);
  }

  function deleteSlide(i = app.index) {
    if (store.deck.slides.length === 1) {
      toast('A deck needs at least one slide.');
      return;
    }
    store.update('slides', (d) => d.slides.splice(i, 1));
    selectedId = null;
    app.setIndex(Math.min(app.index >= i ? Math.max(0, app.index - 1) : app.index, store.deck.slides.length - 1));
    toast('Slide deleted — Ctrl+Z to undo.');
  }

  function moveSlide(from, to) {
    if (from === to) return;
    const currentId = slide().id;
    store.update('slides', (d) => {
      const [s] = d.slides.splice(from, 1);
      d.slides.splice(to, 0, s);
    });
    app.setIndex(store.deck.slides.findIndex((s) => s.id === currentId));
  }

  /* ================= element operations ================= */

  function deleteSelected() {
    const el = selected();
    if (!el) return;
    store.update('elements', () => { slide().elements = slide().elements.filter((e) => e.id !== el.id); });
    selectedId = null;
    renderInspector();
  }

  function duplicateSelected() {
    const el = selected();
    if (!el) return duplicateSlide();
    addElement({ ...structuredClone(el), id: uid(), x: el.x + 30, y: el.y + 30 });
  }

  function arrange(where) {
    const el = selected();
    if (!el) return;
    store.update('elements', () => {
      const list = slide().elements;
      const i = list.indexOf(el);
      list.splice(i, 1);
      const to = { front: list.length, back: 0, forward: Math.min(list.length, i + 1), backward: Math.max(0, i - 1) }[where];
      list.splice(to, 0, el);
    });
  }

  function undo() {
    if (editingId) stopEditing();
    if (!store.undo()) toast('Nothing to undo.');
  }

  function redo() {
    if (editingId) stopEditing();
    if (!store.redo()) toast('Nothing to redo.');
  }

  /* ================= inspector ================= */

  function renderInspector() {
    const el = selected();
    const content = el ? elementInspector(el) : slideInspector();
    inspector.replaceChildren(content);
  }

  function slideInspector() {
    const s = slide();
    return h(
      'div.insp',
      null,
      h('div.insp__head', null, h('h3', null, `Slide ${app.index + 1}`), h('div.insp__head-actions', null,
        iconBtn('Duplicate slide', 'dup', () => duplicateSlide()),
        iconBtn('Delete slide', 'trash', () => deleteSlide()))),
      section('Background',
        swatches(() => slide().bg, (v) => changeSlide((sl) => { sl.bg = v; }, 'bg')),
        row('Pattern', dropdown(PATTERNS, () => slide().pattern, (v) => changeSlide((sl) => { sl.pattern = v; }))),
        h('button.link-btn', { type: 'button', onclick: () => {
          const { bg, pattern } = slide();
          store.update('slides', (d) => d.slides.forEach((x) => { x.bg = bg; x.pattern = pattern; }));
          toast('Background applied to every slide.');
        } }, 'Use this background on all slides')
      ),
      section('Transition title',
        textInput(() => slide().label, (v) => changeSlide((sl) => { sl.label = v; }, 'label'), { placeholder: slideTitle({ ...s, label: '' }, app.index) }),
        h('p.insp-hint', null, 'Shown during the wipe transition and in the overview.')
      ),
      section('Presenter notes',
        textInput(() => slide().notes, (v) => changeSlide((sl) => { sl.notes = v; }, 'notes'), { multiline: true, placeholder: 'What you want to say on this slide… (only you see this, press N while presenting)' })
      ),
      section('Add to this slide', h('div.insp-grid', null,
        btn('Text', 'text', () => addText()),
        btn('Picture', 'image', () => addImageFromFile()),
        btn('Shape', 'shape', () => shapeMenu()),
        btn('Sticker', 'sticker', () => stickerMenu())
      )),
      h('p.insp-hint', null, 'Tip: click anything on the slide to style it.')
    );
  }

  function elementInspector(el) {
    const set = (k, key) => (v) => changeEl((e) => { e[k] = v; }, key ?? k);
    const get = (k) => () => selected()?.[k];
    const names = { text: 'Text', image: 'Picture', shape: 'Shape' };

    const parts = [
      h('div.insp__head', null, h('h3', null, names[el.type]), h('div.insp__head-actions', null,
        iconBtn('Duplicate (Ctrl+D)', 'dup', () => duplicateSelected()),
        iconBtn('Delete (Del)', 'trash', () => deleteSelected())))
    ];

    if (el.type === 'text') {
      parts.push(
        section('Format',
          h('div.toolbar', null,
            iconBtn('Bold (Ctrl+B)', 'bold', () => exec('bold')),
            iconBtn('Italic (Ctrl+I)', 'italic', () => exec('italic')),
            iconBtn('Underline (Ctrl+U)', 'underline', () => exec('underline')),
            iconBtn('Strikethrough', 'strike', () => exec('strikeThrough')),
            iconBtn('Highlighter (select words first)', 'marker', () => wrapSelection('mark')),
            iconBtn('Bullet list', 'list', () => exec('insertUnorderedList')),
            iconBtn('Numbered list', 'olist', () => exec('insertOrderedList')),
            iconBtn('Bigger (selected words)', 'up', () => wrapSelection('span', { fontSize: '1.25em' })),
            iconBtn('Smaller (selected words)', 'down', () => wrapSelection('span', { fontSize: '0.8em' })),
            iconBtn('Clear formatting', 'clear', () => formatText(() => {
              document.execCommand('removeFormat');
              const host = nodeOf(editingId).querySelector('.el__text');
              for (const m of host.querySelectorAll('mark, span')) m.replaceWith(...m.childNodes);
            }))
          ),
          h('p.insp-hint', null, 'Select words while typing to format just those words; otherwise the whole box changes.')
        ),
        section('Text',
          row('Font', seg([{ value: 'display', label: 'Display' }, { value: 'body', label: 'Body' }, { value: 'mono', label: 'Mono' }], get('font'), set('font'))),
          row('Size', range(10, 400, 1, get('size'), set('size'))),
          row('Line height', range(0.7, 2.5, 0.05, get('lh'), set('lh'))),
          row('Align', seg([{ value: 'left', icon: 'alignL', title: 'Left' }, { value: 'center', icon: 'alignC', title: 'Center' }, { value: 'right', icon: 'alignR', title: 'Right' }], get('align'), set('align'))),
          row('Vertical', seg([{ value: 'top', icon: 'vTop', title: 'Top' }, { value: 'middle', icon: 'vMid', title: 'Middle' }, { value: 'bottom', icon: 'vBot', title: 'Bottom' }], get('valign'), set('valign'))),
          toggle('UPPERCASE', get('upper'), set('upper')),
          row('Colour', swatches(get('color'), (v) => {
            if (hasTextSelection()) {
              wrapSelection('span', { color: v.startsWith('#') ? v : `var(--c-${v})` });
            } else changeEl((e) => { e.color = v; }, 'color');
          }))
        )
      );
    }

    if (el.type === 'image') {
      parts.push(section('Picture',
        h('div.insp-grid', null, btn('Replace picture', 'upload', () => replaceImage(selected()))),
        row('Fit', seg([{ value: 'cover', label: 'Fill box' }, { value: 'contain', label: 'Show all' }], get('fit'), set('fit'))),
        row('Alt text', textInput(get('alt'), set('alt', 'alt'), { placeholder: 'Describe the picture' }))
      ));
    }

    if (el.type === 'shape') {
      parts.push(section('Shape',
        row('Type', seg([{ value: 'rect', label: 'Rectangle' }, { value: 'circle', label: 'Circle' }], get('kind'), set('kind')))
      ));
    }

    parts.push(
      section('Box',
        row(el.type === 'shape' ? 'Colour' : 'Fill', swatches(get('fill'), set('fill'), { none: true })),
        toggle('Border', get('border'), set('border')),
        toggle('Hard shadow', get('shadow'), set('shadow')),
        row('Corners', range(0, 300, 1, () => selected()?.radius ?? store.theme.radius, set('radius'))),
        el.type === 'text' ? row('Padding', range(0, 160, 1, get('pad'), set('pad'))) : null
      ),
      section('Arrange',
        row('Rotate', range(-180, 180, 1, get('rotate'), set('rotate'))),
        row('Opacity', range(0, 1, 0.05, get('opacity'), set('opacity'))),
        h('div.xywh', null,
          h('label', null, 'X', number(get('x'), set('x'))),
          h('label', null, 'Y', number(get('y'), set('y'))),
          h('label', null, 'W', number(get('w'), set('w'), { min: 10 })),
          h('label', null, 'H', number(get('h'), set('h'), { min: 10 }))
        ),
        h('div.insp-grid.insp-grid--4', null,
          iconBtn('Bring to front', 'front', () => arrange('front')),
          iconBtn('Bring forward', 'up', () => arrange('forward')),
          iconBtn('Send backward', 'down', () => arrange('backward')),
          iconBtn('Send to back', 'back', () => arrange('back'))
        ),
        h('div.insp-grid', null,
          btn('Center on slide', null, () => changeEl((e) => { e.x = Math.round((W - e.w) / 2); e.y = Math.round((H - e.h) / 2); })),
          btn('Center horizontally', null, () => changeEl((e) => { e.x = Math.round((W - e.w) / 2); }))
        )
      )
    );
    return h('div.insp', null, parts);
  }

  /* ================= panels ================= */

  function themePanel() {
    const t = () => store.theme;
    const setT = (k, key) => (v) => store.update('theme', (d) => { d.theme[k] = v; }, key ?? `theme-${k}`);
    const presetGrid = h('div.preset-grid', null, PRESETS.map((p) =>
      h('button.preset', { type: 'button', onclick: () => { store.update('theme', (d) => applyPreset(d.theme, p)); syncAll(body); markPreset(); } },
        h('div.preset__swatch', { style: { background: p.colors.bg, color: p.colors.ink, borderColor: p.colors.line } },
          h('span.preset__aa', { style: { fontFamily: FONTS[p.fontDisplay].css } }, 'Aa'),
          h('span.preset__dots', null, ['paper', 'accent', 'accent2'].map((k) => h('i', { style: { background: p.colors[k], borderColor: p.colors.line } })))),
        h('span', null, p.name))
    ));
    const markPreset = () => [...presetGrid.children].forEach((b, i) => b.classList.toggle('is-active', PRESETS[i].name === t().preset));
    markPreset();

    const colorRows = COLOR_TOKENS.map((c) => {
      const input = h('input', { type: 'color' });
      input.addEventListener('input', () => store.update('theme', (d) => { d.theme.colors[c.key] = input.value; d.theme.preset = 'Custom'; }, `color-${c.key}`));
      input.dataset.sync = '';
      input._sync = () => { input.value = t().colors[c.key]; };
      input._sync();
      return h('label.color-row', null, input, h('span', null, c.label));
    });

    const fontOpts = Object.fromEntries(Object.entries(FONTS).map(([k, f]) => [k, f.label]));
    const body = h('div.theme-panel', null,
      section('Ready-made themes', presetGrid),
      section('Colours', h('div.color-rows', null, colorRows), h('p.insp-hint', null, 'Every slide uses these colours, so changing one updates the whole deck.')),
      section('Fonts',
        row('Headings', dropdown(fontOpts, () => t().fontDisplay, setT('fontDisplay'))),
        row('Body text', dropdown(fontOpts, () => t().fontBody, setT('fontBody')))
      ),
      section('Style',
        row('Border width', range(0, 10, 1, () => t().border, setT('border'))),
        row('Shadow offset', range(0, 20, 1, () => t().shadow, setT('shadow'))),
        row('Corner radius', range(0, 60, 1, () => t().radius, setT('radius')))
      ),
      section('Presenting',
        row('Transition', dropdown(TRANSITIONS, () => t().transition, setT('transition'))),
        toggle('Sound effects', () => t().sound, setT('sound'))
      )
    );
    modal('Theme', body, { wide: true });
  }

  async function decksPanel() {
    const list = h('div.deck-list');
    const refresh = async () => {
      const decks = await store.list();
      list.replaceChildren(...decks.map((d) =>
        h('div.deck-row', { class: d.id === store.deck.id ? 'deck-row is-current' : 'deck-row' },
          h('div.deck-row__info', null, h('b', null, d.title), h('span', null, `${d.slides} slide${d.slides === 1 ? '' : 's'} · edited ${new Date(d.updated).toLocaleString()}`)),
          d.id === store.deck.id ? h('span.deck-row__tag', null, 'Open') : btn('Open', null, async () => { const deck = await dbGet(d.id); m.close(); app.openDeck(deck); }),
          iconBtn('Duplicate deck', 'dup', async () => {
            const deck = await dbGet(d.id);
            const copy = { ...structuredClone(deck), id: uid(), title: `${deck.title} (copy)`, updated: Date.now() };
            await dbPut(copy);
            refresh();
          }),
          d.id === store.deck.id ? null : iconBtn('Delete deck', 'trash', async () => {
            if (!confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
            await store.remove(d.id);
            refresh();
          })
        )
      ));
    };
    const body = h('div',
      null,
      h('div.insp-grid.insp-grid--3', null,
        btn('New from starter', 'plus', () => { m.close(); app.openDeck(starterDeck()); }, '.ui-btn--accent'),
        btn('New blank deck', 'plus', () => { m.close(); app.openDeck(blankDeck()); }),
        btn('Import deck file', 'upload', () => { m.close(); importDeck(); })
      ),
      h('p.insp-hint', null, 'Decks are saved automatically in this browser. Use Export → “Deck file” to back up or move a deck to another computer.'),
      list
    );
    const m = modal('My decks', body, { wide: true });
    refresh();
  }

  async function importDeck(file) {
    file ??= await pickFile('.json,application/json');
    if (!file) return;
    try {
      const deck = store.parseImport(await file.text());
      await app.openDeck(deck);
      toast(`Imported “${deck.title}”.`);
    } catch (err) {
      console.error(err);
      toast(err.message || 'Could not import that file.', 'error');
    }
  }

  function exportMenu() {
    const safe = (store.deck.title || 'deck').replace(/[^\w\- ]+/g, '').trim() || 'deck';
    popover(exportBtn, h('div.menu', null,
      h('button.menu__item', { onclick: () => { closePopover(); printDeck(store.deck); } }, icon('pdf'), h('span', null, h('b', null, 'PDF'), h('small', null, 'Print → Save as PDF, one slide per page'))),
      h('button.menu__item', { onclick: () => { closePopover(); downloadFile(`${safe}.ohmydeck.json`, store.exportJSON()); toast('Deck file downloaded.'); } }, icon('download'), h('span', null, h('b', null, 'Deck file (.json)'), h('small', null, 'Backup, share or open on another computer'))),
      h('button.menu__item', { onclick: () => { closePopover(); importDeck(); } }, icon('upload'), h('span', null, h('b', null, 'Import deck file'), h('small', null, 'Opens as a new deck')))
    ), { align: 'right' });
  }

  function helpPanel() {
    const table = (rows) => h('table.help-table', null, rows.map(([a, b]) => h('tr', null, h('td', null, a), h('td', null, h('kbd', null, b)))));
    modal('Help & shortcuts', h('div.help', null,
      h('p', null, 'Everything saves automatically in this browser. Click any text, picture or shape on the slide to change it in the panel on the right. Change colours and fonts for the whole deck with ', h('b', null, 'Theme'), '.'),
      h('h4', null, 'Editing'), table(HELP),
      h('h4', null, 'Presenting'), table(PRESENT_HELP)
    ), { wide: true });
  }

  /* ================= keyboard, clipboard, drop ================= */

  let nudgeKey = 0;

  function onKey(e) {
    if (!mounted || document.querySelector('.modal')) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;

    if (mod && (k === 'z' || k === 'Z') && !e.shiftKey) { e.preventDefault(); return undo(); }
    if (mod && (k === 'y' || ((k === 'z' || k === 'Z') && e.shiftKey))) { e.preventDefault(); return redo(); }
    if (mod && k === 's') { e.preventDefault(); store.saveNow(); return toast('Saved in this browser.'); }
    if (k === 'F5' || (mod && k === 'Enter')) { e.preventDefault(); return app.setMode('present'); }

    if (editingId) {
      if (k === 'Escape') { e.preventDefault(); stopEditing(); }
      return;
    }
    if (isTyping(e)) return;

    const el = selected();
    if (mod && k === 'd') { e.preventDefault(); return duplicateSelected(); }
    if (mod && k === 'm') { e.preventDefault(); return addSlide(LAYOUTS[1].make()); }
    if (k === 'PageDown') { e.preventDefault(); return goTo(app.index + 1); }
    if (k === 'PageUp') { e.preventDefault(); return goTo(app.index - 1); }
    if (k === 'Escape') return select(null);
    if (k === 'Tab') {
      e.preventDefault();
      const list = slide().elements;
      if (!list.length) return;
      const i = list.findIndex((x) => x.id === selectedId);
      return select(list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].id);
    }
    if (!el) {
      if (k === 'ArrowDown') { e.preventDefault(); goTo(app.index + 1); }
      if (k === 'ArrowUp') { e.preventDefault(); goTo(app.index - 1); }
      return;
    }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return deleteSelected(); }
    if (k === 'Enter' && el.type === 'text') { e.preventDefault(); return startEditing(el.id); }
    const step = e.shiftKey ? 10 : 1;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
    if (d) {
      e.preventDefault();
      const now = Date.now();
      if (now - nudgeKey > 800) store.checkpoint();
      nudgeKey = now;
      el.x += d[0];
      el.y += d[1];
      updateElement(nodeOf(el.id), el);
      positionSel();
      store.changed('element', el.id);
    }
  }

  const CLIP_PREFIX = 'ohmydeck-element:';

  function onCopy(e, cut = false) {
    if (!mounted || editingId || isTyping(e) || !selected()) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', CLIP_PREFIX + JSON.stringify({ el: selected(), asset: selected().src?.startsWith('asset:') ? store.deck.assets[selected().src.slice(6)] : null }));
    if (cut) deleteSelected();
  }

  function onPaste(e) {
    if (!mounted || editingId || isTyping(e) || document.querySelector('.modal')) return;
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      files.forEach((f) => addImageFile(f));
      return;
    }
    const txt = e.clipboardData?.getData('text/plain') || '';
    if (txt.startsWith(CLIP_PREFIX)) {
      e.preventDefault();
      try {
        const { el, asset } = JSON.parse(txt.slice(CLIP_PREFIX.length));
        const copy = { ...el, id: uid(), x: el.x + 30, y: el.y + 30 };
        if (asset) copy.src = store.addAsset(asset);
        addElement(copy);
      } catch { /* ignore malformed clipboard */ }
    } else if (txt.trim()) {
      e.preventDefault();
      const html = txt.trim().split(/\n+/).map((l) => l.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])).join('<br>');
      addElement(text({ html, size: 40, w: 900, h: 200, ...nextPos(900, 200) }));
    }
  }

  workspace.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      workspace.classList.add('is-drop');
    }
  });
  workspace.addEventListener('dragleave', (e) => { if (e.target === workspace || !workspace.contains(e.relatedTarget)) workspace.classList.remove('is-drop'); });
  workspace.addEventListener('drop', (e) => {
    workspace.classList.remove('is-drop');
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    e.preventDefault();
    const json = files.find((f) => f.name.endsWith('.json'));
    if (json) return importDeck(json);
    const at = canvas ? toLogical(e) : null;
    files.filter((f) => f.type.startsWith('image/')).forEach((f, i) => addImageFile(f, at && { x: at.x + i * 30, y: at.y + i * 30 }));
  });

  /* ================= store events ================= */

  function onStore(what, detail) {
    if (!mounted) return;
    switch (what) {
      case 'save':
        saveBadge.textContent = { saving: 'Saving…', saved: 'Saved', error: 'Not saved — export a backup!' }[detail];
        saveBadge.dataset.state = detail;
        return;
      case 'text':
        refreshCurrentThumb();
        return;
      case 'element': {
        const el = findEl(detail);
        const node = el && nodeOf(el.id);
        if (node) updateElement(node, el);
        positionSel();
        syncAll(inspector);
        refreshCurrentThumb();
        updateHistoryBtns();
        return;
      }
      case 'slide':
        if (canvas) styleCanvas(canvas, slide());
        refreshCurrentThumb();
        updateHistoryBtns();
        return;
      case 'theme':
        renderStage();
        syncAll(inspector);
        updateHistoryBtns();
        return;
      case 'title':
        updateHistoryBtns();
        return;
      default: // 'deck' | 'history' | 'slides' | 'elements'
        if (app.index >= store.deck.slides.length) app.setIndex(store.deck.slides.length - 1, { silent: true });
        if (document.activeElement !== titleInput) titleInput.value = store.deck.title;
        renderSidebar();
        renderStage();
        renderInspector();
        updateHistoryBtns();
    }
  }

  function updateHistoryBtns() {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
  }

  const ro = new ResizeObserver(() => fit());
  const onCut = (e) => onCopy(e, true);

  return {
    root,
    mount() {
      mounted = true;
      selectedId = null;
      titleInput.value = store.deck.title;
      onStore('deck');
      onStore('save', store.saveState);
      ro.observe(stageBox);
      window.addEventListener('keydown', onKey);
      window.addEventListener('copy', onCopy);
      window.addEventListener('cut', onCut);
      window.addEventListener('paste', onPaste);
    },
    unmount() {
      if (editingId) stopEditing();
      mounted = false;
      closePopover();
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('cut', onCut);
      window.removeEventListener('paste', onPaste);
    },
    onStore,
    /** Slide index changed from outside (sidebar, URL hash…). */
    indexChanged() {
      if (!mounted) return;
      selectedId = null;
      for (const [i, item] of [...slideList.children].entries()) item.classList.toggle('is-current', i === app.index);
      slideList.children[app.index]?.scrollIntoView({ block: 'nearest' });
      renderStage();
      renderInspector();
    }
  };
}
