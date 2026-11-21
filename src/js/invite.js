import { swish } from './audio.js';
import { wedding } from './content.js';

export function initInvite() {
  const card = document.getElementById('inviteCard');
  if (card) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', 'Open the invitation card');

    const toggle = () => {
      const open = card.classList.toggle('is-open');
      card.setAttribute('aria-expanded', String(open));
      swish();
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  }

  startCountdown();
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
