import { guestName } from './content.js';

/** The kolam on the threshold carries the guest's initial when a ?to= link is used. */
export function initKolam() {
  const svg = document.getElementById('kolam');
  const initial = document.getElementById('kolamInitial');
  const dot = document.getElementById('kolamDot');
  if (!svg || !initial) return;

  const name = guestName();
  if (!name) return;

  const first = firstGrapheme(name);
  if (!first) return;

  initial.textContent = first;
  svg.classList.add('is-personal');
  dot?.classList.add('is-hidden');
}

function firstGrapheme(text) {
  try {
    const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text);
    return [...segments][0]?.segment ?? '';
  } catch {
    return Array.from(text)[0] ?? '';
  }
}
