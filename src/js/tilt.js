/* Parallax input: mouse on desktop, finger drag on touch, gyroscope where allowed.
   Writes normalised -1..1 values to --px / --py on the root element. */

const root = document.documentElement;
const target = { x: 0, y: 0 };
const value = { x: 0, y: 0 };
let raf = 0;
let idleFrames = 0;
let listening = false;
let dragStart = null;
let base = { x: 0, y: 0 };

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function kick() {
  idleFrames = 0;
  if (!raf) raf = requestAnimationFrame(loop);
}

function loop() {
  value.x += (target.x - value.x) * 0.075;
  value.y += (target.y - value.y) * 0.075;
  root.style.setProperty('--px', value.x.toFixed(4));
  root.style.setProperty('--py', value.y.toFixed(4));

  const settled = Math.abs(target.x - value.x) < 0.0015 && Math.abs(target.y - value.y) < 0.0015;
  idleFrames = settled ? idleFrames + 1 : 0;

  if (idleFrames > 40) {
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(loop);
}

function clamp(v) {
  return Math.max(-1, Math.min(1, v));
}

export function initTilt(surface) {
  if (listening || reduced()) return;
  listening = true;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      target.x = clamp((e.clientX / window.innerWidth - 0.5) * 1.7);
      target.y = clamp((e.clientY / window.innerHeight - 0.5) * 1.7);
      kick();
    },
    { passive: true },
  );

  const el = surface || window;
  el.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      dragStart = { x: t.clientX, y: t.clientY, bx: target.x, by: target.y };
    },
    { passive: true },
  );

  el.addEventListener(
    'touchmove',
    (e) => {
      if (!dragStart) return;
      const t = e.touches[0];
      const dx = (t.clientX - dragStart.x) / window.innerWidth;
      const dy = (t.clientY - dragStart.y) / window.innerHeight;
      target.x = clamp(dragStart.bx + dx * 2.6);
      target.y = clamp(dragStart.by + dy * 2.6);
      kick();
    },
    { passive: true },
  );

  const end = () => {
    dragStart = null;
  };
  el.addEventListener('touchend', end, { passive: true });
  el.addEventListener('touchcancel', end, { passive: true });
}

function onOrientation(e) {
  if (e.gamma == null || e.beta == null) return;
  base = base || { x: 0, y: 0 };
  target.x = clamp(e.gamma / 26);
  target.y = clamp((e.beta - 45) / 30);
  kick();
}

/** Must be called from a user gesture on iOS 13+. */
export async function requestOrientation() {
  if (reduced()) return false;
  const D = window.DeviceOrientationEvent;
  if (!D) return false;
  try {
    if (typeof D.requestPermission === 'function') {
      const state = await D.requestPermission();
      if (state !== 'granted') return false;
    }
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    return true;
  } catch {
    return false;
  }
}

export function resetTilt() {
  target.x = 0;
  target.y = 0;
  kick();
}
