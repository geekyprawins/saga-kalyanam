import { crack, swish } from './audio.js';
import { wedding } from './content.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FRAGMENTS = 6;

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
  let busy = false;

  if (seal) {
    const broken = new URL('./assets/art/wax-seal-broken.png', document.baseURI).href;
    seal.style.setProperty('--seal-broken', `url("${broken}")`);
  }

  const open = () => {
    card.classList.add('is-open');
    card.setAttribute('aria-expanded', 'true');
    swish();
  };

  const close = () => {
    card.classList.remove('is-open', 'is-hit');
    card.setAttribute('aria-expanded', 'false');
    seal?.classList.remove('is-cracking');
    clearShards(seal);
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
    shards(seal);

    window.setTimeout(open, 340);
    window.setTimeout(() => {
      clearShards(seal);
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

function clearShards(seal) {
  seal?.querySelectorAll('.seel__shard').forEach((n) => n.remove());
}

function shards(seal) {
  const frag = document.createDocumentFragment();
  for (const piece of buildShards()) {
    const el = document.createElement('span');
    el.className = 'seel__shard';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--clip', piece.clip);
    el.style.setProperty('--dx', `${piece.dx.toFixed(1)}px`);
    el.style.setProperty('--dy', `${piece.dy.toFixed(1)}px`);
    el.style.setProperty('--dz', `${piece.dz.toFixed(1)}px`);
    el.style.setProperty('--rot', `${piece.rot.toFixed(1)}deg`);
    el.style.setProperty('--delay', `${piece.delay}ms`);
    frag.appendChild(el);
  }
  seal.appendChild(frag);
}

function buildShards() {
  const rand = seeded(17);
  const cx = 50;
  const cy = 50;
  const reach = 150;
  const out = [];

  const angles = [-90 + rand() * 20];
  for (let i = 1; i <= FRAGMENTS; i += 1) {
    angles.push(angles[i - 1] + 360 / FRAGMENTS + (rand() - 0.5) * 24);
  }
  angles[FRAGMENTS] = angles[0] + 360;

  const edges = angles.map((angle) => {
    const rad = (angle * Math.PI) / 180;
    return [0.52, 0.68, 0.84, 1].map((t) => {
      const r = reach * t * (1 + (rand() - 0.5) * 0.05);
      return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
    });
  });

  for (let i = 0; i < FRAGMENTS; i += 1) {
    const points = [[cx, cy], ...edges[i], ...edges[i + 1].slice().reverse()];
    const mid = (((angles[i] + angles[i + 1]) / 2) * Math.PI) / 180;
    const travel = 36 + rand() * 44;

    out.push({
      clip: `polygon(${points.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ')})`,
      dx: Math.cos(mid) * travel,
      dy: Math.sin(mid) * travel,
      dz: 16 + rand() * 48,
      rot: (rand() - 0.5) * 80,
      delay: Math.round(rand() * 60),
    });
  }

  return out;
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
