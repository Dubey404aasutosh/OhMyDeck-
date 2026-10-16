/* ============================================================
   THEMES — colour tokens, font stacks and presets.
   Elements store colour *tokens* ("ink", "accent"…) rather than
   hex values, so switching theme recolours the whole deck.
   ============================================================ */

export const COLOR_TOKENS = [
  { key: 'bg', label: 'Background' },
  { key: 'paper', label: 'Paper' },
  { key: 'ink', label: 'Text' },
  { key: 'accent', label: 'Accent' },
  { key: 'accent2', label: 'Accent 2' },
  { key: 'line', label: 'Lines & shadows' }
];

const TOKEN_KEYS = new Set(COLOR_TOKENS.map((t) => t.key));

export const FONTS = {
  dime: { label: 'Dime Display (loud)', css: "'BN Dime Display', 'BN Dime Display Fallback', Impact, sans-serif" },
  dmsans: { label: 'DM Sans (clean)', css: "'DM Sans', 'DM Sans Fallback', system-ui, sans-serif" },
  vga: { label: 'IBM VGA (retro)', css: "'IBM VGA', 'Courier New', monospace" },
  serif: { label: 'Serif (classic)', css: "Georgia, 'Times New Roman', serif" },
  system: { label: 'System UI', css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  impact: { label: 'Impact (poster)', css: "Impact, 'Arial Narrow Bold', 'Arial Black', sans-serif" }
};

export const TRANSITIONS = {
  wipe: 'Wipe with title',
  slide: 'Slide',
  fade: 'Fade',
  none: 'None'
};

export const PRESETS = [
  {
    name: 'Nodeck Pink',
    colors: { bg: '#FF87AB', paper: '#F3E6D6', ink: '#000000', accent: '#DEF915', accent2: '#22E34D', line: '#000000' },
    fontDisplay: 'dime', fontBody: 'dmsans', border: 3, shadow: 6, radius: 16
  },
  {
    name: 'Paper',
    colors: { bg: '#F3E6D6', paper: '#FFFFFF', ink: '#111111', accent: '#FF87AB', accent2: '#DEF915', line: '#111111' },
    fontDisplay: 'dime', fontBody: 'dmsans', border: 3, shadow: 6, radius: 16
  },
  {
    name: 'Lime',
    colors: { bg: '#DEF915', paper: '#F3E6D6', ink: '#000000', accent: '#FF87AB', accent2: '#FFFFFF', line: '#000000' },
    fontDisplay: 'dime', fontBody: 'dmsans', border: 3, shadow: 6, radius: 16
  },
  {
    name: 'Midnight',
    colors: { bg: '#0A0F0A', paper: '#1B231B', ink: '#F3E6D6', accent: '#22E34D', accent2: '#FF87AB', line: '#22E34D' },
    fontDisplay: 'dime', fontBody: 'dmsans', border: 3, shadow: 6, radius: 16
  },
  {
    name: 'Ocean',
    colors: { bg: '#7FD3FF', paper: '#F2F7FA', ink: '#08223A', accent: '#FFD23F', accent2: '#FF6B6B', line: '#08223A' },
    fontDisplay: 'dime', fontBody: 'dmsans', border: 3, shadow: 6, radius: 18
  },
  {
    name: 'Sunset',
    colors: { bg: '#FF9F5A', paper: '#FFF1E0', ink: '#2A0E00', accent: '#FFE14D', accent2: '#8E7CFF', line: '#2A0E00' },
    fontDisplay: 'impact', fontBody: 'dmsans', border: 3, shadow: 6, radius: 14
  },
  {
    name: 'Clean Business',
    colors: { bg: '#FFFFFF', paper: '#F1F4F8', ink: '#14213D', accent: '#FCA311', accent2: '#3A86FF', line: '#14213D' },
    fontDisplay: 'system', fontBody: 'system', border: 2, shadow: 0, radius: 10
  },
  {
    name: 'Retro Terminal',
    colors: { bg: '#101810', paper: '#182418', ink: '#7DFFA0', accent: '#22E34D', accent2: '#DEF915', line: '#7DFFA0' },
    fontDisplay: 'vga', fontBody: 'vga', border: 2, shadow: 4, radius: 0
  },
  {
    name: 'Editorial',
    colors: { bg: '#F7F3EC', paper: '#FFFFFF', ink: '#1E1E1E', accent: '#FF5C5C', accent2: '#B7FFCF', line: '#1E1E1E' },
    fontDisplay: 'serif', fontBody: 'serif', border: 2, shadow: 0, radius: 4
  }
];

export function defaultTheme() {
  const p = PRESETS[0];
  return {
    preset: p.name,
    colors: { ...p.colors },
    fontDisplay: p.fontDisplay,
    fontBody: p.fontBody,
    border: p.border,
    shadow: p.shadow,
    radius: p.radius,
    transition: 'wipe',
    sound: true
  };
}

export function applyPreset(theme, preset) {
  theme.preset = preset.name;
  theme.colors = { ...preset.colors };
  theme.fontDisplay = preset.fontDisplay;
  theme.fontBody = preset.fontBody;
  theme.border = preset.border;
  theme.shadow = preset.shadow;
  theme.radius = preset.radius;
}

export function isToken(v) {
  return TOKEN_KEYS.has(v);
}

/** Token or literal colour → CSS value. */
export function cssColor(v) {
  if (!v || v === 'none') return 'transparent';
  return isToken(v) ? `var(--c-${v})` : v;
}

/** Token or literal colour → hex (for <input type=color>). */
export function hexColor(v, theme) {
  if (isToken(v)) return theme.colors[v];
  if (/^#[0-9a-f]{6}$/i.test(v || '')) return v;
  return '#000000';
}

/* ---------- automatic text contrast ---------- */

let currentTheme = null;

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Best readable text colour on a background: the theme's text colour if it works, else another theme colour, else black/white. */
export function readableOn(bgHex, theme = currentTheme) {
  if (!theme || !/^#[0-9a-f]{6}$/i.test(bgHex || '')) return null;
  const c = theme.colors;
  const candidates = [c.ink, c.line, c.paper, c.bg, '#111111', '#ffffff'];
  const good = candidates.find((x) => contrast(x, bgHex) >= 4.5);
  return good || candidates.sort((a, b) => contrast(b, bgHex) - contrast(a, bgHex))[0];
}

/** CSS colour for default "Text"-coloured words sitting on a fill/background (token or hex). */
export function textOn(fill) {
  if (!fill || fill === 'none') return null;
  if (isToken(fill)) return `var(--on-${fill})`;
  return readableOn(fill);
}

/** Write a theme onto an element as CSS custom properties. */
export function applyTheme(theme, root = document.documentElement) {
  for (const { key } of COLOR_TOKENS) root.style.setProperty(`--c-${key}`, theme.colors[key]);
  root.style.setProperty('--font-display', (FONTS[theme.fontDisplay] || FONTS.dime).css);
  root.style.setProperty('--font-body', (FONTS[theme.fontBody] || FONTS.dmsans).css);
  root.style.setProperty('--font-mono', FONTS.vga.css);
  root.style.setProperty('--border-w', `${theme.border}px`);
  root.style.setProperty('--shadow-x', `${theme.shadow}px`);
  root.style.setProperty('--radius', `${theme.radius}px`);
  for (const { key } of COLOR_TOKENS) root.style.setProperty(`--on-${key}`, readableOn(theme.colors[key], theme));
  currentTheme = theme;
}
