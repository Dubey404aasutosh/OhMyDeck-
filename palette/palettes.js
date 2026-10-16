// Brand colour roles used across the site. The keys are the current (original) hex values.
export const ROLES = {
  primary: { label: 'Cover / primary', original: 'FF87AB' },
  accent: { label: 'Highlight / accent', original: 'DEF915' },
  paper: { label: 'Paper', original: 'F3E6D6' },
  tint: { label: 'Light tint', original: 'FFC9DA' }
};

export const PALETTES = [
  { id: 'bubblegum', name: 'Bubblegum (current)', primary: 'FF87AB', accent: 'DEF915', paper: 'F3E6D6', tint: 'FFC9DA' },
  { id: 'sky', name: 'Sky Pop', primary: '7CC8FF', accent: 'FFE14D', paper: 'EDF1F2', tint: 'C9E7FF' },
  { id: 'tangerine', name: 'Tangerine', primary: 'FF9F4A', accent: '7CF0D9', paper: 'FBEBDD', tint: 'FFD3AE' },
  { id: 'lavender', name: 'Lavender Lime', primary: 'B9A2FF', accent: 'DEF915', paper: 'EFEAF7', tint: 'DFD3FF' },
  { id: 'mint', name: 'Fresh Mint', primary: '74E6B8', accent: 'FFD23F', paper: 'ECF3EC', tint: 'C3F4DF' },
  { id: 'cherry', name: 'Cherry Soda', primary: 'FF6B6B', accent: 'FFE66D', paper: 'F8E9E1', tint: 'FFC4C4' },
  { id: 'sunflower', name: 'Sunflower', primary: 'FFD23F', accent: 'FF87AB', paper: 'F5EFE3', tint: 'FFE89A' },
  { id: 'sage', name: 'Sage & Clay', primary: 'A9C5A0', accent: 'F4A259', paper: 'F1ECE2', tint: 'D6E4D1' }
];

/** Replace the original brand colours in a CSS/JS/HTML/SVG string. Handles "#ff87ab" and URL-encoded "%23ff87ab". */
export function recolor(text, palette) {
  const map = {};
  for (const [role, { original }] of Object.entries(ROLES)) {
    if (palette[role] && palette[role].toUpperCase() !== original) map[original.toLowerCase()] = palette[role];
  }
  if (!Object.keys(map).length) return text;
  const re = new RegExp(`(#|%23)(${Object.keys(map).join('|')})`, 'gi');
  return text.replace(re, (_, prefix, hex) => {
    const next = map[hex.toLowerCase()];
    return prefix + (hex === hex.toUpperCase() ? next.toUpperCase() : next.toLowerCase());
  });
}
