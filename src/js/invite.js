import { crack, swish } from './audio.js';
import { wedding } from './content.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Cracks radiate from a point off the seal's centre, so the break reads as wax
   rather than a pie. Each wedge is widened past its neighbours so the shards
   overlap and leave no seam while they are still in place. */
const CRACK_ANGLES = [-96, -47, -3, 45, 93, 141, 190, 239, 288];

export function initInvite() {
  const card = document.getElementById('inviteCard');
  if (card) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', 'Open the invitation card');
    bindCard(card);

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  }

  startCountdown();
}

function bindCard(card) {
  const seal = card.querySelector('.invite__seal');
  const label = seal?.querySelector('.seel__label');
  let busy = false;

  const open = () => {
    card.classList.add('is-open');
    card.setAttribute('aria-expanded', 'true');
    swish();
  };

  const close = () => {
    card.classList.remove('is-open', 'is-hit');
    card.setAttribute('aria-expanded', 'false');
    seal?.classList.remove('is-cracking');
    clearDebris(seal);
    swish();
  };

  const breakSeal = () => {
    if (!seal || reducedMotion) {
      open();
      return;
    }

    busy = true;
    card.classList.add('is-hit');
    seal.classList.add('is-cracking');
    crack();

    const text = label?.textContent?.trim() || 'S & G';
    shards(seal, text);
    dust(seal);
    flash(seal);

    window.setTimeout(open, 340);
    window.setTimeout(() => {
      clearDebris(seal);
      card.classList.remove('is-hit');
      busy = false;
    }, 1000);
  };

  card.addEventListener('click', () => {
    if (busy) return;
    if (card.classList.contains('is-open')) close();
    else breakSeal();
  });
}

function clearDebris(seal) {
  seal?.querySelectorAll('.seel__shard, .seel__dust, .seel__flash').forEach((n) => n.remove());
}

function shards(seal, text) {
  const frag = document.createDocumentFragment();
  for (const piece of buildShards()) {
    const el = document.createElement('span');
    el.className = 'seel__shard';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = text;
    el.style.setProperty('--clip', piece.clip);
    el.style.setProperty('--dx', `${piece.dx.toFixed(1)}px`);
    el.style.setProperty('--dy', `${piece.dy.toFixed(1)}px`);
    el.style.setProperty('--rot', `${piece.rot.toFixed(1)}deg`);
    el.style.setProperty('--delay', `${piece.delay}ms`);
    frag.appendChild(el);
  }
  seal.appendChild(frag);
}

function buildShards() {
  const rand = seeded(11);
  const cx = 47;
  const cy = 43;
  const out = [];

  for (let i = 0; i < CRACK_ANGLES.length - 1; i += 1) {
    const from = CRACK_ANGLES[i] - 4;
    const to = CRACK_ANGLES[i + 1] + 4;
    const points = [[cx, cy]];

    for (const t of [0, 0.34, 0.68, 1]) {
      const angle = ((from + (to - from) * t) * Math.PI) / 180;
      const radius = 76 + rand() * 14;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }

    const mid = (((from + to) / 2) * Math.PI) / 180;
    const travel = 9 + rand() * 13;

    out.push({
      clip: `polygon(${points.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ')})`,
      dx: Math.cos(mid) * travel,
      dy: Math.sin(mid) * travel,
      rot: (rand() - 0.5) * 50,
      delay: Math.round(rand() * 55),
    });
  }

  return out;
}

function dust(seal) {
  const rand = seeded(23);
  const frag = document.createDocumentFragment();

  for (let i = 0; i < 14; i += 1) {
    const angle = rand() * Math.PI * 2;
    const travel = 26 + rand() * 48;
    const el = document.createElement('span');
    el.className = 'seel__dust';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--dx', `${(Math.cos(angle) * travel).toFixed(1)}px`);
    el.style.setProperty('--dy', `${(Math.sin(angle) * travel).toFixed(1)}px`);
    el.style.setProperty('--size', `${(1.6 + rand() * 2.6).toFixed(1)}px`);
    el.style.setProperty('--delay', `${Math.round(rand() * 90)}ms`);
    frag.appendChild(el);
  }

  seal.appendChild(frag);
}

function flash(seal) {
  const el = document.createElement('span');
  el.className = 'seel__flash';
  el.setAttribute('aria-hidden', 'true');
  seal.appendChild(el);
}

function seeded(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function startCountdown() {
  const target = new Date(wedding.dateISO).getTime();
  const cells = {
    days: document.getElementById('cdDays'),
    hours: document.getElementById('cdHours'),
    mins: document.getElementById('cdMins'),
    secs: document.getElementById('cdSecs'),
  };
  if (!cells.days) return;

  const pad = (n) => String(n).padStart(2, '0');
  let timer = 0;

  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) {
      cells.days.textContent = '00';
      cells.hours.textContent = '00';
      cells.mins.textContent = '00';
      cells.secs.textContent = '00';
      window.clearInterval(timer);
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    cells.days.textContent = String(days);
    cells.hours.textContent = pad(hours);
    cells.mins.textContent = pad(mins);
    cells.secs.textContent = pad(secs);
  }

  tick();
  timer = window.setInterval(tick, 1000);
}
