/* ============================================================
   LAYOUTS — ready-made slide designs. Each returns plain slide
   data that you can then freely edit. Coordinates are in the
   1600×900 canvas space.
   ============================================================ */

import { uid } from './util.js';
import { defaultTheme } from './themes.js';

const base = { rotate: 0, opacity: 1, fill: 'none', border: false, shadow: false, radius: null };

export const text = (o) => ({
  id: uid(), type: 'text', ...base,
  font: 'body', size: 36, color: 'ink', align: 'left', valign: 'top', lh: 1.2, pad: 0, upper: false,
  x: 120, y: 120, w: 800, h: 100, html: 'Text', ...o
});

export const image = (o) => ({
  id: uid(), type: 'image', ...base, fit: 'cover', src: '', alt: '',
  x: 120, y: 120, w: 600, h: 400, ...o
});

export const shape = (o) => ({
  id: uid(), type: 'shape', ...base, kind: 'rect', fill: 'accent',
  x: 120, y: 120, w: 300, h: 300, ...o
});

export const sticker = (name, o) => image({ src: `sticker:${name}`, fit: 'contain', radius: 0, ...o });

const eyebrow = (html, o) => text({ font: 'mono', size: 28, upper: true, x: 120, y: 110, w: 1360, h: 40, html, ...o });
const title = (html, o) => text({ font: 'display', size: 96, lh: 1, x: 120, y: 165, w: 1360, h: 210, html, ...o });
const body = (html, o) => text({ size: 36, lh: 1.35, x: 120, y: 450, w: 1000, h: 300, html, ...o });
const card = (html, o) => text({ size: 30, lh: 1.3, fill: 'paper', border: true, shadow: true, pad: 40, w: 440, h: 420, html, ...o });

export const slide = (o) => ({ id: uid(), bg: 'bg', pattern: 'none', label: '', notes: '', elements: [], ...o });

export const LAYOUTS = [
  {
    key: 'cover',
    name: 'Cover',
    make: (c = {}) => slide({
      bg: 'bg',
      elements: [
        eyebrow(c.eyebrow ?? 'A presentation about', { align: 'center', y: 230 }),
        text({ font: 'display', size: 170, lh: 0.95, align: 'center', valign: 'middle', shadow: true, x: 100, y: 290, w: 1400, h: 260, html: c.title ?? 'Your big idea' }),
        text({ size: 42, align: 'center', x: 250, y: 600, w: 1100, h: 120, html: c.subtitle ?? 'A short line that says <mark>why it matters.</mark>' })
      ]
    })
  },
  {
    key: 'title-text',
    name: 'Title + text',
    make: (c = {}) => slide({
      bg: 'paper',
      elements: [
        eyebrow(c.eyebrow ?? 'Section'),
        title(c.title ?? 'A clear, punchy <mark>headline</mark>'),
        body(c.body ?? 'Supporting text goes here. Keep it to one idea per slide — say the rest out loud.')
      ]
    })
  },
  {
    key: 'statement',
    name: 'Statement',
    make: (c = {}) => slide({
      bg: 'accent',
      elements: [
        text({ font: 'display', size: 130, lh: 1, align: 'center', valign: 'middle', upper: true, x: 100, y: 180, w: 1400, h: 540, html: c.title ?? 'One big<br><mark>statement.</mark>' })
      ]
    })
  },
  {
    key: 'three-cards',
    name: 'Three cards',
    make: (c = {}) => {
      const items = c.cards ?? [
        ['01', 'First point', 'Explain it in a sentence or two.'],
        ['02', 'Second point', 'Explain it in a sentence or two.'],
        ['03', 'Third point', 'Explain it in a sentence or two.']
      ];
      const fills = ['paper', 'accent', 'accent2'];
      return slide({
        bg: 'bg',
        elements: [
          title(c.title ?? 'Three things to know', { y: 100, h: 140, size: 88 }),
          ...items.map(([n, t, d], i) =>
            card(
              `<span style="font-family:var(--font-mono);font-size:26px">${n}</span><br><b style="font-size:44px">${t}</b><br><br>${d}`,
              { x: 120 + i * 470, y: 320, fill: fills[i], rotate: [-1.5, 1, -0.5][i] }
            )
          )
        ]
      });
    }
  },
  {
    key: 'image-text',
    name: 'Image + text',
    make: (c = {}) => slide({
      bg: 'paper',
      elements: [
        image({ x: 120, y: 140, w: 680, h: 620, border: true, shadow: true, src: c.src ?? '' }),
        eyebrow(c.eyebrow ?? 'Picture this', { x: 880, y: 200, w: 600 }),
        title(c.title ?? 'Show, don’t tell', { x: 880, y: 250, w: 620, h: 200, size: 84 }),
        body(c.body ?? 'Pair one strong image with one strong sentence.', { x: 880, y: 480, w: 600, h: 260 })
      ]
    })
  },
  {
    key: 'big-number',
    name: 'Big number',
    make: (c = {}) => slide({
      bg: 'accent2',
      elements: [
        text({ font: 'display', size: 340, lh: 1, align: 'center', valign: 'middle', shadow: true, x: 100, y: 110, w: 1400, h: 400, html: c.number ?? '87%' }),
        text({ size: 48, align: 'center', x: 250, y: 560, w: 1100, h: 180, html: c.caption ?? 'of people remember stories, not slides.' })
      ]
    })
  },
  {
    key: 'two-columns',
    name: 'Two columns',
    make: (c = {}) => slide({
      bg: 'paper',
      elements: [
        title(c.title ?? 'Before & after', { y: 100, h: 140, size: 88 }),
        card(c.left ?? '<b style="font-size:40px">Before</b><ul><li>Point one</li><li>Point two</li><li>Point three</li></ul>', { x: 120, y: 300, w: 650, h: 480 }),
        card(c.right ?? '<b style="font-size:40px">After</b><ul><li>Point one</li><li>Point two</li><li>Point three</li></ul>', { x: 830, y: 300, w: 650, h: 480, fill: 'accent' })
      ]
    })
  },
  {
    key: 'steps',
    name: 'Steps / timeline',
    make: (c = {}) => {
      const steps = c.steps ?? ['Discover', 'Define', 'Design', 'Deliver'];
      const gap = 1360 / steps.length;
      return slide({
        bg: 'paper',
        pattern: 'dots',
        elements: [
          title(c.title ?? 'How it works', { y: 100, h: 140, size: 88 }),
          shape({ x: 200, y: 446, w: 1200, h: 8, fill: 'line', radius: 4 }),
          ...steps.flatMap((s, i) => [
            text({ font: 'display', size: 56, align: 'center', valign: 'middle', fill: i % 2 ? 'accent' : 'bg', border: true, shadow: true, radius: 70, x: 120 + i * gap + gap / 2 - 70, y: 380, w: 140, h: 140, html: String(i + 1).padStart(2, '0') }),
            text({ size: 34, align: 'center', x: 120 + i * gap, y: 560, w: gap, h: 160, html: `<b>${s}</b><br><span style="font-size:26px">Short description</span>` })
          ])
        ]
      });
    }
  },
  {
    key: 'quote',
    name: 'Quote',
    make: (c = {}) => slide({
      bg: 'bg',
      elements: [
        text({ font: 'display', size: 360, lh: 1, color: 'accent', shadow: true, x: 110, y: 40, w: 300, h: 300, html: '“' }),
        text({ font: 'display', size: 84, lh: 1.05, x: 220, y: 260, w: 1200, h: 360, html: c.quote ?? 'The best pitch is <mark>no pitch.</mark>' }),
        text({ font: 'mono', size: 30, upper: true, x: 220, y: 660, w: 1000, h: 50, html: c.author ?? '— Someone wise' })
      ]
    })
  },
  {
    key: 'section',
    name: 'Section break',
    make: (c = {}) => slide({
      bg: 'line',
      elements: [
        text({ font: 'mono', size: 34, color: 'accent', upper: true, align: 'center', x: 200, y: 300, w: 1200, h: 50, html: c.eyebrow ?? 'Part 02' }),
        text({ font: 'display', size: 160, color: 'paper', align: 'center', valign: 'middle', x: 100, y: 360, w: 1400, h: 260, html: c.title ?? 'Next chapter' })
      ]
    })
  },
  {
    key: 'blank',
    name: 'Blank',
    make: () => slide({ bg: 'paper' })
  }
];

export const layoutByKey = (key) => LAYOUTS.find((l) => l.key === key) || LAYOUTS[LAYOUTS.length - 1];

/* ---------------- Starter decks ---------------- */

export function blankDeck() {
  return {
    id: uid(),
    title: 'Untitled deck',
    theme: defaultTheme(),
    assets: {},
    slides: [layoutByKey('cover').make({ eyebrow: 'Your name · Date', title: 'Title', subtitle: 'Subtitle' })],
    updated: Date.now()
  };
}

export function starterDeck() {
  const L = (k, c) => layoutByKey(k).make(c);

  const cover = L('cover', {
    eyebrow: 'A presentation about',
    title: 'Your big idea',
    subtitle: 'A deck that <mark>sells thinking,</mark> not slides.'
  });
  cover.elements.push(
    sticker('highlighter.webp', { x: 1330, y: 360, w: 140, h: 490, rotate: 24 }),
    sticker('sticky-note.webp', { x: 110, y: 70, w: 230, h: 230, rotate: -8 })
  );
  cover.notes = 'Welcome! Press E (or the pencil button) to edit any slide. Press N to show/hide these notes, O for the slide overview, F for fullscreen.';

  const problem = L('title-text', {
    eyebrow: 'The problem',
    title: 'Presentation culture has become <mark>predictable.</mark>',
    body: 'Bullet points. Stock photos. Endless slides. Ideas get squeezed into templates until everything starts looking the same.'
  });
  problem.elements.push(sticker('eraser.webp', { x: 1210, y: 520, w: 260, h: 260, rotate: 14 }));
  problem.notes = 'Pause here. Let the audience recognise the pain before offering anything.';

  const message = L('statement', { title: 'The format became<br><mark>the message.</mark>' });
  message.notes = 'Full-screen slides. Presenter notes. Slide navigation. The website behaves like a presentation.';

  const cards = L('three-cards', {
    title: 'What we do',
    cards: [
      ['01', 'Understand', 'Listen first. Find the real problem behind the brief.'],
      ['02', 'Shape', 'Turn messy thinking into one clear story.'],
      ['03', 'Deliver', 'Ship the work, not another deck about the work.']
    ]
  });

  const picture = L('image-text', {
    src: 'sticker:thinking.avif',
    eyebrow: 'How we think',
    title: 'Ideas over <mark>templates</mark>',
    body: 'Double-click this image in edit mode to replace it with your own picture.'
  });

  const number = L('big-number', { number: '3×', caption: 'faster decisions when the idea fits on <b>one slide.</b>' });

  const steps = L('steps', { title: 'How it works', steps: ['Discover', 'Define', 'Design', 'Deliver'] });

  const quote = L('quote', { quote: 'The best deck is <mark>no deck.</mark>', author: '— Someone who has sat through too many' });

  const next = L('two-columns', {
    title: 'Next steps',
    left: '<b style="font-size:40px">This week</b><ul><li>Agree the goal</li><li>Pick an owner</li><li>Book a review</li></ul>',
    right: '<b style="font-size:40px">This month</b><ul><li>Prototype</li><li>Test with 5 people</li><li>Decide: ship or stop</li></ul>'
  });

  const end = L('cover', { eyebrow: 'Questions?', title: 'Thank you.', subtitle: 'hello@yourcompany.com' });
  end.bg = 'accent';
  end.elements.push(sticker('pin.png', { x: 760, y: 160, w: 80, h: 80 }));

  return {
    id: uid(),
    title: 'My presentation',
    theme: defaultTheme(),
    assets: {},
    slides: [cover, problem, message, cards, picture, number, steps, quote, next, end],
    updated: Date.now()
  };
}

export const STICKERS = [
  { file: 'highlighter.webp', w: 140, h: 490 },
  { file: 'sticky-note.webp', w: 300, h: 300 },
  { file: 'eraser.webp', w: 260, h: 260 },
  { file: 'pin.png', w: 90, h: 90 },
  { file: 'handshake.webp', w: 330, h: 330 },
  { file: 'b2b.webp', w: 330, h: 330 },
  { file: 'founder.webp', w: 330, h: 330 },
  { file: 'thinking.avif', w: 600, h: 400 },
  { file: 'highlighter-stroke.svg', w: 500, h: 104 }
];
