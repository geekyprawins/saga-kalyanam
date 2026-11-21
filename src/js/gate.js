import { ringBell } from './audio.js';
import { requestOrientation } from './tilt.js';
import { t } from './content.js';

export function initGate() {
  const scene = document.getElementById('gate');
  const bells = Array.from(document.querySelectorAll('[data-bell]'));
  const ringBtn = document.getElementById('ringBtn');
  const cue = document.getElementById('cue');
  let opened = false;

  function open({ animate = true } = {}) {
    if (opened) return;
    opened = true;
    scene.classList.add('is-open');
    if (animate) scene.style.setProperty('--open', '1');
    const label = cue?.querySelector('span');
    if (label) label.textContent = t('enter');
  }

  function ring(bell) {
    requestOrientation();
    ringBell({ gain: 0.95 });
    if (bell) {
      bell.classList.add('ringing');
      window.setTimeout(() => bell.classList.remove('ringing'), 2700);
    }
    window.setTimeout(() => open(), 360);
  }

  bells.forEach((bell) => {
    bell.addEventListener('click', () => ring(bell));
  });

  ringBtn?.addEventListener('click', () => ring(bells[0]));

  // Scrolling past the closed gate opens it too, so nobody is ever stuck.
  const onScroll = () => {
    if (opened) return;
    if (window.scrollY > window.innerHeight * 0.08) open();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  return { open, isOpen: () => opened };
}
