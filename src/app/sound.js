/* ============================================================
   SOUND — tiny synthesized UI sounds (no audio files needed).
   Respects the deck's "sound" theme setting and a per-viewer
   mute toggle remembered in localStorage.
   ============================================================ */

const KEY = 'ohmydeck.muted';
let ctx = null;
let muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
let enabled = true;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const active = () => enabled && !muted;

export const sound = {
  setEnabled(v) { enabled = v; },
  isMuted: () => muted,
  toggleMute() {
    muted = !muted;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* ignore */ }
    return muted;
  },

  click() {
    if (!active()) return;
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(440, t + 0.05);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.08);
  },

  whoosh(dir = 1) {
    if (!active()) return;
    const a = audio();
    if (!a) return;
    const t = a.currentTime;
    const len = 0.45;
    const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(dir > 0 ? 400 : 2400, t);
    f.frequency.exponentialRampToValueAtTime(dir > 0 ? 2400 : 400, t + len);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + len);
  }
};
