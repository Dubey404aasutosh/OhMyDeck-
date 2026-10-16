/* OhMyDeck 404 — Slide Stacker
   A slide swings across the top. Drop it (tap / click / Space) onto the pile.
   Whatever hangs over the edge gets cut off, so the deck gets narrower.
   Land dead-on for a Perfect; 3 Perfects in a row win width back. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const canvas = $('#stack-canvas');
  const ctx = canvas.getContext('2d');
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- tuning ---------------- */
  const WORLD_W = 480;        // logical width of the play column
  const BLOCK_H = 44;         // slide thickness
  const START_W = 270;
  const MAX_W = 300;
  const PERFECT_TOL = 5;      // px of slack that still counts as perfect
  const GROW_AFTER = 3;       // perfects in a row before the slide grows back
  const GROW_BY = 14;
  const DROP_GAP = BLOCK_H * 2.2;
  const GRAVITY = 2600;

  const BEST_KEY = 'ohmydeck_stacker_best';
  const SOUND_KEY = 'ohmydeck_stacker_sound';

  const PERFECT_WORDS = ['PERFECT!', 'PIXEL PERFECT', 'NAILED IT', 'SYNERGY!', 'ALIGNED!', 'CHEF’S KISS'];
  const MILESTONES = {
    5: 'WARMING UP',
    10: 'INVESTOR READY',
    20: 'BOARD APPROVED',
    30: 'KEYNOTE MATERIAL',
    40: 'STANDING OVATION',
    50: 'LEGENDARY DECK',
    75: 'DECK OF THE YEAR',
    100: 'ABSOLUTE UNIT'
  };
  const ROASTS = [
    'Let’s circle back.',
    'This could have been an email.',
    'Let’s take this offline.',
    'Per my last slide…',
    'Can everyone see my screen?',
    'We’re over time.',
    'Next slide, please.'
  ];

  /* ---------------- palette ---------------- */
  const FALLBACK = { primary: '#FF87AB', accent: '#DEF915', paper: '#F3E6D6', tint: '#FFC9DA', deep: '#FF598B' };
  const C = (role) => (role === 'white' ? '#FFFFFF' : role === 'ink' ? '#000000' : window.OMD ? window.OMD.c(role) : FALLBACK[role]);
  const FILLS = ['paper', 'white', 'tint', 'paper', 'primary', 'white'];
  const CONTENT_KINDS = ['bullets', 'chart', 'title', 'pie', 'bullets', 'quote'];

  /* ---------------- sound ---------------- */
  const SRC = {
    drop: ['/assets/pop-1-B4vg85z0.ogg', '/assets/pop-2-DiP7LmqZ.ogg', '/assets/pop-3-DE83Lziy.ogg'],
    perfect: ['/assets/game-pickup-CUG24MFl.ogg'],
    slice: ['/assets/paper-short-BvcplJlM.ogg'],
    over: ['/assets/game-death-C76uMFwl.ogg'],
    button: ['/assets/button-DkstwzwS.ogg'],
    milestone: ['/assets/highlighter-1-xWJiU_tz.ogg']
  };
  let soundOn = read(SOUND_KEY, '1') !== '0';
  const pool = {};
  let music = null;

  function playSound(name, volume = 0.55) {
    if (!soundOn) return;
    const list = SRC[name];
    const src = list[(Math.random() * list.length) | 0];
    try {
      pool[src] ??= new Audio(src);
      const a = pool[src].cloneNode();
      a.volume = volume;
      a.play().catch(() => {});
    } catch { /* audio not available */ }
  }

  function setMusic(on) {
    try {
      if (!music) {
        music = new Audio('/assets/background-game-Clvd7uQq.mp3');
        music.loop = true;
        music.volume = 0.22;
      }
      if (on && soundOn) music.play().catch(() => {});
      else music.pause();
    } catch { /* ignore */ }
  }

  /* ---------------- storage ---------------- */
  function read(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  }

  /* ---------------- state ---------------- */
  let state = 'title';           // title | play | over | paused
  let blocks = [];               // the stacked deck
  let cur = null;                // the swinging slide
  let debris = [];               // trimmed-off pieces
  let confetti = [];
  let popups = [];
  let score = 0;
  let combo = 0;
  let perfects = 0;
  let bestCombo = 0;
  let best = parseInt(read(BEST_KEY, '0'), 10) || 0;
  let camY = 0;
  let shake = 0;
  let wobble = 0;                // tower sway on game over
  let spawnSide = 1;
  let overAt = 0;

  // view
  let dpr = 1, vw = 0, vh = 0, scale = 1, ox = 0;

  const hudScore = $('#hud-score');
  const hudBest = $('#hud-best');
  const hudCombo = $('#hud-combo');
  const btnPause = $('#btn-pause');
  const btnSound = $('#btn-sound');

  /* ---------------- layout ---------------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    scale = Math.min(vw / (WORLD_W + 40), vh / 760);
    scale = Math.max(0.55, Math.min(scale, 1.5));
    ox = (vw - WORLD_W * scale) / 2;
  }

  // world → screen
  const anchor = () => vh * 0.5;
  const sx = (x) => ox + x * scale;
  const sy = (y) => anchor() + (y - camY) * scale;

  function cameraTarget() {
    const bottomPad = 96;
    const groundCam = BLOCK_H - (vh - bottomPad - anchor()) / scale; // keeps the floor near the bottom
    const focusY = cur ? cur.y : blocks.length ? blocks[blocks.length - 1].y - DROP_GAP : 0;
    const followCam = focusY - (vh * 0.3 - anchor()) / scale;       // keeps the swinging slide ~30% from top
    return Math.min(groundCam, followCam);
  }

  /* ---------------- game flow ---------------- */
  function makeBlock(level, x, w) {
    return {
      x, w, y: -level * BLOCK_H, level,
      w0: w, cx: x, // content is laid out on the original width and clipped as the slide shrinks
      fill: FILLS[level % FILLS.length],
      kind: level === 0 ? 'base' : CONTENT_KINDS[level % CONTENT_KINDS.length],
      seed: (level * 9301 + 49297) % 233280
    };
  }

  function reset() {
    blocks = [makeBlock(0, (WORLD_W - START_W) / 2, START_W)];
    blocks[0].fill = 'accent';
    debris = [];
    confetti = [];
    popups = [];
    score = 0;
    combo = 0;
    perfects = 0;
    bestCombo = 0;
    wobble = 0;
    spawnSide = Math.random() < 0.5 ? 1 : -1;
    spawn();
    camY = cameraTarget();
    updateHud();
  }

  function speedFor(level) {
    return Math.min(170 + level * 7, 470);
  }

  function spawn() {
    const top = blocks[blocks.length - 1];
    const level = top.level + 1;
    const b = makeBlock(level, 0, top.w);
    b.targetY = b.y;
    b.y -= DROP_GAP;
    b.vy = 0;
    b.dir = spawnSide;
    b.speed = speedFor(level);
    b.minX = -b.w * 0.45;
    b.maxX = WORLD_W - b.w * 0.55;
    b.x = spawnSide > 0 ? b.minX : b.maxX;
    b.cx = b.x;
    b.dropping = false;
    spawnSide *= -1;
    cur = b;
  }

  function start() {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    reset();
    setState('play');
    playSound('button', 0.5);
    setMusic(true);
  }

  function drop() {
    if (!cur || cur.dropping) return;
    cur.dropping = true;
    cur.vy = 0;
  }

  function land() {
    const top = blocks[blocks.length - 1];
    const b = cur;
    b.y = b.targetY;
    const dx = b.x - top.x;

    if (Math.abs(dx) <= PERFECT_TOL && Math.abs(b.w - top.w) < 0.5) {
      // Perfect
      b.cx += top.x - b.x;
      b.x = top.x;
      combo += 1;
      perfects += 1;
      bestCombo = Math.max(bestCombo, combo);
      let label = PERFECT_WORDS[(Math.random() * PERFECT_WORDS.length) | 0];
      if (combo >= GROW_AFTER) {
        const grown = Math.min(MAX_W, b.w + GROW_BY);
        if (grown > b.w) {
          b.x = Math.max(0, Math.min(WORLD_W - grown, b.x - (grown - b.w) / 2));
          b.w = grown;
          label = 'BACK IN SCOPE!';
        }
      }
      popup(label, b.x + b.w / 2, b.y - 8, combo >= 2 ? C('primary') : '#fff', 1.15);
      burst(b.x + b.w / 2, b.y, 16 + Math.min(combo, 6) * 4);
      playSound('perfect', 0.6);
      if (!reduced && navigator.vibrate) navigator.vibrate(12);
    } else {
      const left = Math.max(b.x, top.x);
      const right = Math.min(b.x + b.w, top.x + top.w);
      const overlap = right - left;
      if (overlap <= 0) {
        // Missed the deck entirely
        debris.push(toDebris(b, b.x, b.w, b.x < top.x ? -1 : 1));
        cur = null;
        return gameOver();
      }
      // Trim the overhang
      const side = b.x < top.x ? -1 : 1;
      const cutX = side < 0 ? b.x : right;
      const cutW = b.w - overlap;
      debris.push(toDebris(b, cutX, cutW, side));
      b.x = left;
      b.w = overlap;
      combo = 0;
      shake = reduced ? 0 : 5;
      playSound('slice', 0.5);
      if (overlap < 18) popup('HANGING BY A PIXEL', b.x + b.w / 2, b.y - 8, '#fff', 0.9);
    }

    playSound('drop', 0.45);
    blocks.push(b);
    score = blocks.length - 1;
    if (MILESTONES[score]) {
      popup(MILESTONES[score], WORLD_W / 2, b.y - 60, C('accent'), 1.5);
      burst(WORLD_W / 2, b.y - 40, 40);
      playSound('milestone', 0.6);
    }
    updateHud();
    spawn();
  }

  function toDebris(b, x, w, side) {
    return {
      ...b,
      x, w,
      vx: side * (90 + Math.random() * 80),
      vy: -120,
      rot: 0,
      vr: side * (2 + Math.random() * 3),
      life: 0
    };
  }

  function gameOver() {
    setState('over');
    overAt = performance.now();
    shake = reduced ? 0 : 10;
    wobble = reduced ? 0 : 1;
    setMusic(false);
    playSound('over', 0.6);
    const isBest = score > best;
    if (isBest) {
      best = score;
      write(BEST_KEY, String(best));
    }
    $('#over-score').textContent = score;
    $('#over-new').hidden = !isBest || score === 0;
    $('#over-roast').textContent = ROASTS[(Math.random() * ROASTS.length) | 0];
    $('#over-stats').textContent = score === 0
      ? 'Tip: wait until the slide is right above the pile, then drop.'
      : `${perfects} perfect drop${perfects === 1 ? '' : 's'} · best streak ${bestCombo} · best ever ${best}`;
    updateHud();
  }

  function setState(s) {
    state = s;
    body.dataset.state = s;
    $('#panel-title').hidden = s !== 'title';
    $('#panel-over').hidden = s !== 'over';
    $('#panel-pause').hidden = s !== 'paused';
    btnPause.hidden = s !== 'play' && s !== 'paused';
    if (s === 'over') setTimeout(() => $('#panel-over [data-action="restart"]')?.focus({ preventScroll: true }), 400);
  }

  function pause() {
    if (state !== 'play') return;
    setState('paused');
    setMusic(false);
    $('#panel-pause [data-action="resume"]').focus({ preventScroll: true });
  }

  function resume() {
    if (state !== 'paused') return;
    setState('play');
    setMusic(true);
    last = performance.now();
  }

  function updateHud() {
    hudScore.textContent = score;
    hudBest.textContent = Math.max(best, score);
    if (combo >= 2) {
      hudCombo.hidden = false;
      hudCombo.querySelector('b').textContent = combo;
      hudCombo.classList.remove('pop');
      void hudCombo.offsetWidth;
      hudCombo.classList.add('pop');
    } else hudCombo.hidden = true;
    const tb = $('#title-best');
    tb.hidden = best === 0;
    tb.textContent = `Your best: ${best} slide${best === 1 ? '' : 's'}`;
  }

  /* ---------------- effects ---------------- */
  function popup(text, x, y, color, size = 1) {
    popups.push({ text, x, y, color, size, life: 0 });
  }

  function burst(x, y, n) {
    if (reduced) return;
    const roles = ['primary', 'accent', 'tint', 'white', 'deep'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI - Math.PI;
      const v = 260 + Math.random() * 420;
      confetti.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 14,
        s: 6 + Math.random() * 7,
        role: roles[i % roles.length],
        life: 0
      });
    }
  }

  /* ---------------- update ---------------- */
  function update(dt) {
    if (state === 'play' && cur) {
      if (cur.dropping) {
        cur.vy += GRAVITY * dt;
        cur.y += cur.vy * dt;
        if (cur.y >= cur.targetY) land();
      } else {
        cur.x += cur.dir * cur.speed * dt;
        if (cur.x > cur.maxX) { cur.x = cur.maxX; cur.dir = -1; }
        if (cur.x < cur.minX) { cur.x = cur.minX; cur.dir = 1; }
        cur.cx = cur.x;
      }
    }

    for (const d of debris) {
      d.vy += GRAVITY * 0.7 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;
      d.life += dt;
    }
    debris = debris.filter((d) => d.life < 3);

    for (const p of confetti) {
      p.vy += 1100 * dt;
      p.vx *= 0.985;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life += dt;
    }
    confetti = confetti.filter((p) => p.life < 2.2);

    for (const t of popups) { t.life += dt; t.y -= 40 * dt; }
    popups = popups.filter((t) => t.life < 1.3);

    const target = cameraTarget();
    camY += (target - camY) * Math.min(1, dt * 5);
    shake = Math.max(0, shake - dt * 30);
    wobble = Math.max(0, wobble - dt * 0.6);
  }

  /* ---------------- drawing ---------------- */
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawContent(b, x, y, w, h) {
    // content is drawn relative to the slide's original width, then clipped to what's left
    const cx = sx(b.cx), w0 = b.w0 * scale;
    const ink = '#000';
    const accentInk = b.fill === 'accent' || b.fill === 'primary' ? '#000' : C('primary');
    const pad = 10 * scale;
    ctx.save();
    roundRect(x, y, w, h, 6 * scale);
    ctx.clip();
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2 * scale;
    ctx.lineCap = 'round';
    const top = y + pad * 0.9;
    switch (b.kind) {
      case 'base': {
        ctx.font = `${Math.round(18 * scale)}px "BN Dime Display", Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SLIDE 1 OF ∞', cx + w0 / 2, y + h / 2 + 1);
        break;
      }
      case 'bullets': {
        ctx.fillStyle = accentInk;
        ctx.fillRect(cx + pad, top, w0 * 0.34, 6 * scale);
        ctx.fillStyle = ink;
        for (let i = 0; i < 2; i++) {
          const ly = top + (14 + i * 9) * scale;
          ctx.beginPath(); ctx.arc(cx + pad + 2 * scale, ly, 2 * scale, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx + pad + 9 * scale, ly); ctx.lineTo(cx + pad + w0 * (0.5 + ((b.seed >> i) % 30) / 100), ly); ctx.stroke();
        }
        break;
      }
      case 'chart': {
        ctx.fillRect(cx + pad, top, w0 * 0.22, 5 * scale);
        const base = y + h - pad * 0.8;
        const bars = 5;
        for (let i = 0; i < bars; i++) {
          const bh = (8 + ((b.seed >> (i * 2)) % 18)) * scale;
          ctx.fillStyle = i === bars - 1 ? accentInk : ink;
          ctx.fillRect(cx + w0 * 0.45 + i * 14 * scale, base - bh, 9 * scale, bh);
        }
        ctx.beginPath(); ctx.moveTo(cx + w0 * 0.43, base); ctx.lineTo(cx + w0 * 0.45 + bars * 14 * scale, base); ctx.stroke();
        break;
      }
      case 'title': {
        ctx.font = `${Math.round(17 * scale)}px "BN Dime Display", Impact, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const words = ['Q3 ROADMAP', 'NEXT STEPS', 'THANK YOU', 'AGENDA', 'KEY LEARNINGS', 'VISION 2030'];
        ctx.fillText(words[b.seed % words.length], cx + pad, y + h / 2 + 1);
        ctx.fillStyle = accentInk;
        ctx.fillRect(cx + w0 - pad - 26 * scale, y + h / 2 - 6 * scale, 26 * scale, 12 * scale);
        break;
      }
      case 'pie': {
        const r = (h / 2) - pad * 0.6;
        const pcx = cx + w0 * 0.75, pcy = y + h / 2;
        ctx.beginPath(); ctx.arc(pcx, pcy, r, 0, 7); ctx.stroke();
        ctx.fillStyle = accentInk;
        ctx.beginPath(); ctx.moveTo(pcx, pcy); ctx.arc(pcx, pcy, r, -Math.PI / 2, Math.PI * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink;
        ctx.fillRect(cx + pad, top, w0 * 0.3, 5 * scale);
        ctx.beginPath(); ctx.moveTo(cx + pad, top + 14 * scale); ctx.lineTo(cx + pad + w0 * 0.4, top + 14 * scale); ctx.stroke();
        break;
      }
      case 'quote': {
        ctx.font = `${Math.round(30 * scale)}px "BN Dime Display", Impact, sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.fillStyle = accentInk;
        ctx.fillText('“', cx + pad, y + 2 * scale);
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.moveTo(cx + pad + 26 * scale, top + 6 * scale); ctx.lineTo(cx + w0 * 0.8, top + 6 * scale); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + pad + 26 * scale, top + 15 * scale); ctx.lineTo(cx + w0 * 0.6, top + 15 * scale); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  function drawSlide(b, alpha = 1) {
    const x = sx(b.x), y = sy(b.y), w = b.w * scale, h = BLOCK_H * scale;
    const r = 6 * scale;
    const sh = 4 * scale;
    ctx.globalAlpha = alpha;
    // hard shadow
    ctx.fillStyle = '#000';
    roundRect(x + sh, y + sh, w, h, r);
    ctx.fill();
    // card
    ctx.fillStyle = C(b.fill);
    roundRect(x, y, w, h, r);
    ctx.fill();
    drawContent(b, x, y, w, h);
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = '#000';
    roundRect(x, y, w, h, r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawFloor() {
    const y = sy(BLOCK_H) + 4 * scale;
    if (y > vh + 40) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y, vw, 4 * scale);
    // little desk legs under the base slide
    const b = blocks[0];
    if (!b) return;
    ctx.fillRect(sx(b.x + 20), y, 6 * scale, 40 * scale);
    ctx.fillRect(sx(b.x + b.w - 26), y, 6 * scale, 40 * scale);
  }

  function drawGuide() {
    // faint line showing where the top of the deck is — helps aim
    if (!cur || cur.dropping || state !== 'play') return;
    const top = blocks[blocks.length - 1];
    ctx.save();
    ctx.setLineDash([6 * scale, 6 * scale]);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2 * scale;
    for (const x of [top.x, top.x + top.w]) {
      ctx.beginPath();
      ctx.moveTo(sx(x), sy(cur.y + BLOCK_H) + 6 * scale);
      ctx.lineTo(sx(x), sy(top.y) - 6 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    if (state === 'title') {
      drawTitleDecor();
      return;
    }
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawFloor();

    // the deck (sways a little when it collapses)
    const t = performance.now() / 1000;
    blocks.forEach((b, i) => {
      if (wobble > 0 && i > 0) {
        ctx.save();
        const off = Math.sin(t * 14 + i * 0.4) * wobble * i * 0.6 * scale;
        ctx.translate(off, 0);
        drawSlide(b);
        ctx.restore();
      } else drawSlide(b);
    });

    drawGuide();
    if (cur) drawSlide(cur);

    for (const d of debris) {
      ctx.save();
      const cx = sx(d.x + d.w / 2), cy = sy(d.y + BLOCK_H / 2);
      ctx.translate(cx, cy);
      ctx.rotate(d.rot);
      ctx.translate(-cx, -cy);
      drawSlide(d, Math.max(0, 1 - d.life / 3));
      ctx.restore();
    }

    for (const p of confetti) {
      ctx.save();
      ctx.translate(sx(p.x), sy(p.y));
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - p.life / 2.2);
      ctx.fillStyle = C(p.role);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.strokeRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }

    for (const tx of popups) {
      const k = tx.life / 1.3;
      const size = Math.round(28 * tx.size * scale * (k < 0.15 ? 0.6 + k * 2.7 : 1));
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.font = `${size}px "BN Dime Display", Impact, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, size * 0.22);
      const px = Math.max(size * 3, Math.min(vw - size * 3, sx(tx.x)));
      const py = sy(tx.y);
      ctx.strokeStyle = '#000';
      ctx.strokeText(tx.text, px + 3, py + 3);
      ctx.fillStyle = '#000';
      ctx.fillText(tx.text, px + 3, py + 3);
      ctx.strokeText(tx.text, px, py);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.text, px, py);
      ctx.restore();
    }
    ctx.restore();
  }

  // a few idle slides floating behind the title screen
  const decor = Array.from({ length: 7 }, (_, i) => ({
    x: i % 2 ? 0.78 + Math.random() * 0.2 : 0.02 + Math.random() * 0.2, y: Math.random(), w: 110 + Math.random() * 90, rot: (Math.random() - 0.5) * 0.6,
    speed: 0.012 + Math.random() * 0.02, fill: FILLS[i % FILLS.length], kind: CONTENT_KINDS[i % CONTENT_KINDS.length], seed: i * 7919
  }));
  function drawTitleDecor() {
    const t = performance.now() / 1000;
    for (const d of decor) {
      const y = ((d.y + (reduced ? 0 : t * d.speed)) % 1.2) - 0.1;
      const b = { x: 0, y: 0, w: d.w, w0: d.w, cx: 0, fill: d.fill, kind: d.kind, seed: d.seed };
      ctx.save();
      const px = d.x * vw, py = (1 - y) * vh;
      ctx.translate(px, py);
      ctx.rotate(d.rot + (reduced ? 0 : Math.sin(t + d.seed) * 0.05));
      ctx.translate(-(ox + (d.w * scale) / 2), -(anchor() + (BLOCK_H / 2 - camY) * scale));
      drawSlide(b, 0.28);
      ctx.restore();
    }
  }

  /* ---------------- loop ---------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state !== 'paused') update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------------- input ---------------- */
  function primaryAction() {
    if (state === 'title') start();
    else if (state === 'play') drop();
    else if (state === 'over' && performance.now() - overAt > 700) start();
    else if (state === 'paused') resume();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    primaryAction();
  });
  // taps anywhere on the empty play area (but not on buttons/links) also drop
  document.querySelector('.stacker__main').addEventListener('pointerdown', (e) => {
    if (e.target === canvas || e.target.closest('button, a')) return;
    if (state === 'play') { e.preventDefault(); drop(); }
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'start' || action === 'restart') start();
    if (action === 'resume') resume();
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('a, button') && (e.key === 'Enter' || e.key === ' ')) return; // let buttons handle themselves
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!e.repeat) primaryAction();
    } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state === 'play') pause();
      else if (state === 'paused') resume();
    } else if (e.key === 'm' || e.key === 'M') {
      toggleSound();
    }
  });

  btnPause.addEventListener('click', () => (state === 'play' ? pause() : resume()));

  function toggleSound() {
    soundOn = !soundOn;
    write(SOUND_KEY, soundOn ? '1' : '0');
    btnSound.setAttribute('aria-pressed', String(soundOn));
    btnSound.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');
    setMusic(state === 'play');
  }
  btnSound.addEventListener('click', toggleSound);
  btnSound.setAttribute('aria-pressed', String(soundOn));
  btnSound.setAttribute('aria-label', soundOn ? 'Mute sound' : 'Unmute sound');

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', resize);

  /* ---------------- boot ---------------- */
  resize();
  reset();
  setState('title');
  updateHud();
  requestAnimationFrame(frame);

  // test hook (harmless in production): lets automated checks read the state
  window.__stacker = { get state() { return state; }, get score() { return score; }, get combo() { return combo; }, get cur() { return cur; }, get top() { return blocks[blocks.length - 1]; } };
})();
