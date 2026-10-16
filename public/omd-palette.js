/* OhMyDeck colour palettes.
   Loaded (blocking) in <head> so the saved palette is applied before the first paint.
   - CSS uses var(--omd-primary | accent | paper | tint | deep)
   - JS bundles call OMD.c(role) for single colours and OMD.live([...roles]) for colour lists
   - The switcher button (top-left) lets visitors change palette; the choice is remembered. */
(function () {
  var KEY = 'omd_palette';
  var ROLES = ['primary', 'accent', 'paper', 'tint'];
  var LABELS = { primary: 'Cover / primary', accent: 'Highlight / accent', paper: 'Paper', tint: 'Light tint' };

  var PALETTES = [
    { id: 'bubblegum', name: 'Bubblegum', primary: '#FF87AB', accent: '#DEF915', paper: '#F3E6D6', tint: '#FFC9DA' },
    { id: 'sky', name: 'Sky Pop', primary: '#7CC8FF', accent: '#FFE14D', paper: '#EDF1F2', tint: '#C9E7FF' },
    { id: 'tangerine', name: 'Tangerine', primary: '#FF9F4A', accent: '#7CF0D9', paper: '#FBEBDD', tint: '#FFD3AE' },
    { id: 'lavender', name: 'Lavender Lime', primary: '#B9A2FF', accent: '#DEF915', paper: '#EFEAF7', tint: '#DFD3FF' },
    { id: 'mint', name: 'Fresh Mint', primary: '#74E6B8', accent: '#FFD23F', paper: '#ECF3EC', tint: '#C3F4DF' },
    { id: 'cherry', name: 'Cherry Soda', primary: '#FF6B6B', accent: '#FFE66D', paper: '#F8E9E1', tint: '#FFC4C4' },
    { id: 'sunflower', name: 'Sunflower', primary: '#FFD23F', accent: '#FF87AB', paper: '#F5EFE3', tint: '#FFE89A' },
    { id: 'sage', name: 'Sage & Clay', primary: '#A9C5A0', accent: '#F4A259', paper: '#F1ECE2', tint: '#D6E4D1' }
  ];

  function store(get, value) {
    try {
      if (get) return JSON.parse(localStorage.getItem(KEY) || 'null');
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch (e) { return null; }
  }

  // Darker, punchier version of the primary colour (the original used #FF598B next to #FF87AB)
  function deepen(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    l = Math.max(0, l - 0.09);
    s = Math.min(1, s + 0.08);
    function f(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    var out = s ? [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)] : [l, l, l];
    return '#' + out.map(function (v) { return ('0' + Math.round(v * 255).toString(16)).slice(-2); }).join('').toUpperCase();
  }

  function resolve(saved) {
    if (saved && saved.id === 'custom' && ROLES.every(function (r) { return /^#[0-9a-f]{6}$/i.test(saved[r] || ''); })) {
      return { id: 'custom', name: 'Custom', primary: saved.primary, accent: saved.accent, paper: saved.paper, tint: saved.tint };
    }
    var id = saved && saved.id;
    for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === id) return PALETTES[i];
    return PALETTES[0];
  }

  var current = resolve(store(true));
  var liveLists = [];

  function colors(p) {
    return { primary: p.primary, accent: p.accent, paper: p.paper, tint: p.tint, deep: deepen(p.primary) };
  }

  function apply(p) {
    current = p;
    var c = colors(p);
    var root = document.documentElement.style;
    for (var k in c) root.setProperty('--omd-' + k, c[k]);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', meta.getAttribute('data-omd') === 'accent' ? c.accent : c.paper);
    liveLists.forEach(function (l) { l.roles.forEach(function (r, i) { l.list[i] = c[r]; }); });
  }

  window.OMD = {
    palettes: PALETTES,
    get current() { return current; },
    /** Current colour for a role: primary | accent | paper | tint | deep */
    c: function (role) { return colors(current)[role]; },
    /** An array of current colours that stays up to date when the palette changes */
    live: function (roles) {
      var list = roles.map(function (r) { return colors(current)[r]; });
      liveLists.push({ roles: roles, list: list });
      return list;
    },
    set: function (p) { apply(p); store(false, p.id === 'custom' ? p : { id: p.id }); }
  };

  apply(current);

  /* ---------- switcher UI ---------- */

  var CSS =
    '#omd-pal{position:fixed;top:16px;left:16px;z-index:2147483646;font:600 13px/1.3 "DM Sans","DM Sans Fallback",system-ui,sans-serif;color:#000;text-transform:none;letter-spacing:normal}' +
    '#omd-pal *{box-sizing:border-box;text-transform:none;letter-spacing:normal}' +
    '#omd-pal .omd-t{display:grid;place-items:center;width:44px;height:44px;padding:0;border:3px solid #000;border-radius:50%;background:#fff;box-shadow:3px 3px 0 #000;cursor:pointer;transition:transform .1s ease-out,box-shadow .1s ease-out}' +
    '#omd-pal .omd-t:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 #000}' +
    '#omd-pal .omd-t:active{transform:translate(2px,2px);box-shadow:0 0 0 #000}' +
    '#omd-pal .omd-t:focus-visible,#omd-pal button:focus-visible{outline:3px solid #000;outline-offset:3px}' +
    '#omd-pal .omd-t svg{width:22px;height:22px;overflow:visible}#omd-pal .omd-t svg path{fill:none!important;stroke:#000!important}#omd-pal .omd-t svg circle{fill:#000!important;stroke:none!important}' +
    '#omd-pal .omd-p{position:absolute;top:calc(100% + 10px);left:0;width:min(330px,calc(100vw - 32px));max-height:calc(100vh - 90px);overflow:auto;padding:10px;border:3px solid #000;border-radius:16px;background:#fff;box-shadow:5px 5px 0 #000}' +
    '#omd-pal h4{margin:4px 6px 8px;font-family:inherit;line-height:1.3;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#555}' +
    '#omd-pal .omd-r{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:2px solid transparent;border-radius:10px;background:none;color:#000;font:inherit;text-align:left;cursor:pointer}' +
    '#omd-pal .omd-r:hover{background:#f2f2f2}' +
    '#omd-pal .omd-r[aria-checked=true]{border-color:#000}' +
    '#omd-pal .omd-s{display:flex;gap:3px;flex:none}' +
    '#omd-pal .omd-s i{display:block;width:20px;height:20px;border:2px solid #000;border-radius:6px}' +
    '#omd-pal .omd-c{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 6px}' +
    '#omd-pal label{display:flex;align-items:center;gap:6px;font-size:12px}' +
    '#omd-pal input[type=color]{flex:none;width:34px;height:26px;padding:0;border:2px solid #000;border-radius:6px;background:none;cursor:pointer}' +
    '#omd-pal .omd-a{margin:10px 6px 4px;width:calc(100% - 12px);padding:9px;border:2px solid #000;border-radius:10px;background:var(--omd-accent);color:#000;font:inherit;font-weight:800;cursor:pointer;box-shadow:2px 2px 0 #000}' +
    '@media (max-width:767px){#omd-pal{top:12px;left:12px}#omd-pal .omd-t{width:38px;height:38px}}';

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.4-.8-2.3 0-.9.7-1.6 1.6-1.6H17a4 4 0 004-4c0-4.7-4-8.6-9-8.6z"/><circle cx="7.5" cy="11" r="1.3" fill="#000"/><circle cx="10.5" cy="7" r="1.3" fill="#000"/><circle cx="15" cy="7.5" r="1.3" fill="#000"/></svg>';

  function swatches(p) {
    return '<span class="omd-s">' + ROLES.map(function (r) { return '<i style="background:' + p[r] + '"></i>'; }).join('') + '</span>';
  }

  function build() {
    if (document.getElementById('omd-pal')) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement('div');
    root.id = 'omd-pal';
    root.innerHTML =
      '<button type="button" class="omd-t" aria-label="Change colour palette" aria-expanded="false" title="Colour palette">' + ICON + '</button>' +
      '<div class="omd-p" hidden role="dialog" aria-label="Colour palette"><h4>Colour palette</h4><div class="omd-list" role="radiogroup"></div>' +
      '<h4 style="margin-top:14px">Custom mix</h4><div class="omd-c">' +
      ROLES.map(function (r) { return '<label><input type="color" data-role="' + r + '">' + LABELS[r] + '</label>'; }).join('') +
      '</div><button type="button" class="omd-a">Use custom colours</button></div>';
    document.body.appendChild(root);

    var btn = root.querySelector('.omd-t');
    var panel = root.querySelector('.omd-p');
    var list = root.querySelector('.omd-list');

    function render() {
      list.innerHTML = PALETTES.map(function (p) {
        return '<button type="button" class="omd-r" role="radio" aria-checked="' + (p.id === current.id) + '" data-id="' + p.id + '">' + swatches(p) + p.name + '</button>';
      }).join('');
      ROLES.forEach(function (r) { root.querySelector('[data-role=' + r + ']').value = current[r].toLowerCase(); });
    }

    function toggle(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) render();
    }

    btn.addEventListener('click', function () { toggle(panel.hidden); });
    list.addEventListener('click', function (e) {
      var row = e.target.closest('.omd-r');
      if (!row) return;
      for (var i = 0; i < PALETTES.length; i++) if (PALETTES[i].id === row.dataset.id) OMD.set(PALETTES[i]);
      render();
    });
    root.querySelector('.omd-a').addEventListener('click', function () {
      var p = { id: 'custom', name: 'Custom' };
      ROLES.forEach(function (r) { p[r] = root.querySelector('[data-role=' + r + ']').value.toUpperCase(); });
      OMD.set(p);
      render();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { toggle(false); btn.focus(); }
    }, true);
    document.addEventListener('pointerdown', function (e) {
      if (!panel.hidden && !root.contains(e.target)) toggle(false);
    });
    // Keep the slideshow's own click / keyboard / swipe handlers away from the panel
    ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'wheel', 'touchstart', 'touchend'].forEach(function (ev) {
      root.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
    // Keys: block them only while the panel is open (or Enter/Space pressing a switcher button),
    // so arrow keys still move the slides when the palette button has focus.
    ['keydown', 'keyup'].forEach(function (ev) {
      root.addEventListener(ev, function (e) {
        if (!panel.hidden || e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
