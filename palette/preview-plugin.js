// Dev-only palette preview. Recolours the served HTML/CSS/JS/SVG on the fly (nothing on disk changes)
// and injects a small switcher panel. Not part of `vite build`.
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { PALETTES, ROLES, recolor } from './palettes.js';

const COOKIE = 'omd_palette';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

function currentPalette(cookieHeader = '') {
  const raw = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  const value = raw ? decodeURIComponent(raw.slice(COOKIE.length + 1)) : '';
  if (value.startsWith('custom:')) {
    const [primary, accent, paper, tint] = value.slice(7).split(',');
    if ([primary, accent, paper, tint].every((h) => /^[0-9a-f]{6}$/i.test(h || ''))) {
      return { id: 'custom', name: 'Custom', primary, accent, paper, tint };
    }
  }
  return PALETTES.find((p) => p.id === value) || PALETTES[0];
}

function switcher(active) {
  const data = JSON.stringify({ palettes: PALETTES, roles: ROLES, active, cookie: COOKIE });
  return `
<div id="omd-pal" hidden>
<style>
#omd-pal{position:fixed;top:14px;left:14px;z-index:2147483647;font:600 13px/1.3 'DM Sans',system-ui,sans-serif;color:#000;text-transform:none;letter-spacing:normal}
#omd-pal *{box-sizing:border-box;text-transform:none;letter-spacing:normal}
#omd-pal .t{display:flex;align-items:center;gap:8px;padding:7px 12px;border:2px solid #000;border-radius:99px;background:#fff;box-shadow:3px 3px 0 #000;cursor:pointer}
#omd-pal .t i,#omd-pal .row i{display:inline-block;width:14px;height:14px;border:2px solid #000;border-radius:50%}
#omd-pal .p{position:absolute;top:calc(100% + 10px);left:0;width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 90px);overflow:auto;padding:10px;border:2px solid #000;border-radius:16px;background:#fff;box-shadow:5px 5px 0 #000}
#omd-pal .row{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:2px solid transparent;border-radius:10px;background:none;font:inherit;text-align:left;cursor:pointer}
#omd-pal .row:hover{background:#f2f2f2}
#omd-pal .row.on{border-color:#000}
#omd-pal .row span.sw{display:flex;gap:3px;flex:none}
#omd-pal .row i{width:20px;height:20px;border-radius:6px}
#omd-pal h4{margin:10px 6px 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#555}
#omd-pal .c{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 6px}
#omd-pal label{display:flex;align-items:center;gap:6px;font-weight:600;font-size:12px}
#omd-pal input[type=color]{width:34px;height:26px;padding:0;border:2px solid #000;border-radius:6px;background:none;cursor:pointer}
#omd-pal .a{margin:8px 6px 4px;width:calc(100% - 12px);padding:8px;border:2px solid #000;border-radius:10px;background:#DEF915;font:inherit;cursor:pointer;box-shadow:2px 2px 0 #000}
#omd-pal .note{margin:8px 6px 2px;font-weight:400;font-size:11.5px;color:#555}
</style>
<button class="t" type="button" aria-expanded="false">Palette: <b></b> <span class="dots"></span></button>
<div class="p" hidden></div>
</div>
<script>
(() => {
  const D = ${data};
  const root = document.getElementById('omd-pal');
  const btn = root.querySelector('.t');
  const panel = root.querySelector('.p');
  const roles = Object.keys(D.roles);
  const dots = (p) => roles.map((r) => '<i style="background:#' + p[r] + '"></i>').join('');
  const set = (v) => { document.cookie = D.cookie + '=' + encodeURIComponent(v) + ';path=/;max-age=31536000'; location.reload(); };
  btn.querySelector('b').textContent = D.active.name;
  btn.querySelector('.dots').innerHTML = dots(D.active);
  panel.innerHTML = D.palettes.map((p) =>
    '<button type="button" class="row' + (p.id === D.active.id ? ' on' : '') + '" data-id="' + p.id + '"><span class="sw">' + dots(p) + '</span>' + p.name + '</button>'
  ).join('') +
    '<h4>Custom mix</h4><div class="c">' + roles.map((r) => '<label><input type="color" data-role="' + r + '" value="#' + D.active[r] + '">' + D.roles[r].label + '</label>').join('') + '</div>' +
    '<button type="button" class="a">Preview custom colours</button>' +
    '<p class="note">Preview only, on this computer. Nothing is saved to the site files until you approve a palette.</p>';
  panel.addEventListener('click', (e) => {
    const row = e.target.closest('.row');
    if (row) set(row.dataset.id);
    if (e.target.closest('.a')) set('custom:' + roles.map((r) => panel.querySelector('[data-role=' + r + ']').value.slice(1)).join(','));
  });
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden)); });
  // keep the site's own click / key handlers (slide navigation) away from the panel
  for (const ev of ['click', 'pointerdown', 'mousedown', 'keydown', 'wheel', 'touchstart']) root.addEventListener(ev, (e) => e.stopPropagation());
  root.hidden = false;
})();
</script>`;
}

export function palettePreview() {
  return {
    name: 'ohmydeck-palette-preview',
    apply: 'serve',
    configureServer(server) {
      const rootDir = server.config.root;
      server.middlewares.use(async (req, res, next) => {
        try {
          let path = new URL(req.url, 'http://localhost').pathname;
          if (path === '/') path = '/index.html';
          const ext = extname(path);
          if (!TYPES[ext]) return next();
          const isPage = path === '/index.html' || path === '/404.html';
          if (!isPage && !path.startsWith('/assets/')) return next();
          const palette = currentPalette(req.headers.cookie);
          if (!isPage && palette.id === PALETTES[0].id) return next();

          const file = isPage ? resolve(rootDir, `.${path}`) : resolve(server.config.publicDir, `.${path}`);
          let text = recolor(await readFile(file, 'utf8'), palette);
          if (isPage) text = text.replace('</body>', `${switcher(palette)}\n</body>`);
          res.setHeader('Content-Type', `${TYPES[ext]}; charset=utf-8`);
          res.setHeader('Cache-Control', 'no-store');
          res.end(text);
        } catch {
          next();
        }
      });
    }
  };
}
