import '../css/main.css';
import { initGate } from './gate.js';
import { initCarousel, initWipes } from './gallery.js';
import { initInvite } from './invite.js';
import { initSaveCard } from './savecard.js';
import { initActions } from './actions.js';
import { loadPhotos } from './photos.js';
import { initTilt } from './tilt.js';
import { armSound, isAudioRunning, isSoundOn, prefetchBgm, setSound } from './audio.js';
import { addressFor, getLang, guestName, setLang } from './content.js';

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const guest = guestName();

/* ── capability check ─────────────────────────────────── */
function isLite() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return true;
  } catch {
    return true;
  }
  if (navigator.connection && navigator.connection.saveData) return true;
  if (navigator.deviceMemory && navigator.deviceMemory < 2) return true;
  return false;
}

const lite = isLite() || reducedMotion;
if (lite) root.classList.add('lite');

/* ── language ─────────────────────────────────────────── */
const langBtn = document.getElementById('langBtn');
let teluguLoaded = false;

function loadTeluguFont() {
  if (teluguLoaded) return;
  teluguLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Telugu:wght@300;400;500&display=swap';
  document.head.appendChild(link);
}

function paintGreeting() {
  const el = document.getElementById('greet');
  const parts = addressFor(guest);
  if (!el || !parts) return;
  const name = document.createElement('span');
  name.className = 'greet__name';
  name.textContent = parts.name;

  const bits = [];
  if (parts.lead) bits.push(`${parts.lead} `);
  bits.push(name);
  if (parts.tail) {
    const tail = document.createElement('span');
    tail.className = 'greet__tail';
    tail.textContent = ` ${parts.tail}`;
    bits.push(tail);
  }
  el.replaceChildren(...bits);
  el.hidden = false;
}

function paintLangButton(lang) {
  if (!langBtn) return;
  langBtn.textContent = lang === 'en' ? 'తెలుగు' : 'English';
  langBtn.setAttribute('lang', lang === 'en' ? 'te' : 'en');
  langBtn.setAttribute('aria-label', lang === 'en' ? 'Read in Telugu' : 'Read in English');
}

setLang(getLang());
paintLangButton(getLang());
paintGreeting();

langBtn?.addEventListener('click', () => {
  const next = getLang() === 'en' ? 'te' : 'en';
  if (next === 'te') loadTeluguFont();
  setLang(next);
  paintLangButton(next);
  paintGreeting();
});

/* ── sound ────────────────────────────────────────────── */
const soundBtn = document.getElementById('soundBtn');

function paintSound(on) {
  soundBtn?.setAttribute('aria-pressed', String(on));
  soundBtn?.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
}

soundBtn?.addEventListener('click', () => {
  /* The icon reads "on" from first paint, before any sound can play. If audio has
     not actually started yet, a tap should start it — not mute a silent track. */
  if (!isAudioRunning()) {
    setSound(true);
    paintSound(true);
    return;
  }
  const next = !isSoundOn();
  setSound(next);
  paintSound(next);
});

/* Sound is on from the start. Browsers will not play before a gesture, so the
   track is armed here and begins at the first tap anywhere on the page; the icon
   already reads "on" so nobody has to go looking for a button. */
armSound();
paintSound(isSoundOn());

/* ── scenes ───────────────────────────────────────────── */
loadPhotos();
initGate();
initCarousel();
initWipes();
initInvite();
initSaveCard();
initActions();

let petalModule = null;
function petals() {
  if (!petalModule) petalModule = import('./petals.js');
  return petalModule;
}

if (!lite) {
  initTilt(document.getElementById('gate'));
  window.setTimeout(() => {
    petals().then((m) => m.createPetalField(document.getElementById('petals')));
  }, 700);
}

document.getElementById('petalBtn')?.addEventListener('click', () => {
  petals().then((m) => m.showerPetals(44));
});

/* ── reveals ──────────────────────────────────────────── */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealObserver.unobserve(entry.target);
    });
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
);

document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

/* ── petal field follows the page tone ────────────────── */
const tonedSections = Array.from(document.querySelectorAll('[data-tone]'));
let toneQueued = false;

function updateTone() {
  toneQueued = false;
  const mid = window.innerHeight * 0.5;
  const onLight = tonedSections.some((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < mid && rect.bottom > mid;
  });
  document.body.classList.toggle('on-light', onLight);
}

function queueTone() {
  if (toneQueued) return;
  toneQueued = true;
  requestAnimationFrame(updateTone);
}

window.addEventListener('scroll', queueTone, { passive: true });
window.addEventListener('resize', queueTone, { passive: true });
updateTone();

/* ── scroll-linked motion (loaded after first paint) ──── */
async function initScrollMotion() {
  if (reducedMotion) return;
  const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('lenis'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const stage = document.getElementById('stage');
  if (stage) {
    ScrollTrigger.create({
      trigger: '#gate',
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        stage.style.setProperty('--dolly', (1 + self.progress * 0.55).toFixed(3));
      },
    });

    gsap.to('.gate__copy', {
      yPercent: -22,
      opacity: 0,
      ease: 'none',
      scrollTrigger: { trigger: '#gate', start: '12% top', end: 'bottom top', scrub: true },
    });

    gsap.fromTo(
      '.bless__bg',
      { scale: 1.22, opacity: 0.45 },
      {
        scale: 1,
        opacity: 0.9,
        ease: 'none',
        scrollTrigger: { trigger: '#blessings', start: 'top bottom', end: 'center center', scrub: true },
      },
    );
  }

  const lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  lenis.on('scroll', queueTone);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.refresh();
}

if ('requestIdleCallback' in window) requestIdleCallback(initScrollMotion, { timeout: 1200 });
else window.setTimeout(initScrollMotion, 400);

if (!navigator.connection?.saveData) {
  if ('requestIdleCallback' in window) requestIdleCallback(prefetchBgm, { timeout: 3000 });
  else window.setTimeout(prefetchBgm, 2000);
}

/* ── curtain ──────────────────────────────────────────── */
const veil = document.getElementById('veil');

function liftVeil() {
  veil?.classList.add('is-gone');
  root.classList.add('is-ready');
}

if (document.readyState === 'complete') window.setTimeout(liftVeil, 260);
else window.addEventListener('load', () => window.setTimeout(liftVeil, 260));
window.setTimeout(liftVeil, 2200);
