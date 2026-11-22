import { ringChime, setSound } from './audio.js';
import { t } from './content.js';

/* The opening arch: a temple doorway with a hanging bell. The bell tap is the
   page's first real user gesture, so it is what unlocks audio on iOS; only then
   do the doors part and reveal the invitation. */
export function initArch() {
  const arch = document.getElementById('arch');
  const bell = document.getElementById('archBell');
  if (!arch || !bell) return;

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behind = [document.getElementById('main'), document.querySelector('.bar')].filter(Boolean);
  let opened = false;

  root.classList.add('arch-ready', 'arch-locked');
  behind.forEach((el) => el.setAttribute('inert', ''));
  bell.setAttribute('aria-label', t('ringBell'));
  window.scrollTo(0, 0);

  const reveal = () => {
    arch.classList.add('is-gone');
    arch.setAttribute('aria-hidden', 'true');
    root.classList.remove('arch-locked');
    behind.forEach((el) => el.removeAttribute('inert'));
    window.scrollTo(0, 0);
    document.getElementById('cue')?.focus({ preventScroll: true });
  };

  const open = () => {
    if (opened) return;
    opened = true;

    bell.classList.add('is-ringing');
    arch.classList.add('is-open');

    /* This click is the gesture that unlocks playback, so start the music and
       peal the bell here rather than waiting for a scroll. Audio failing must
       never stop the doors from opening. */
    try {
      setSound(true);
      ringChime();
    } catch {
      /* the invitation still opens without sound */
    }

    window.setTimeout(reveal, reduced ? 140 : 1180);
  };

  bell.addEventListener('click', open);

  const focusBell = () => bell.focus({ preventScroll: true });
  if (reduced) focusBell();
  else window.setTimeout(focusBell, 450);
}
