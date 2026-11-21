import { wedding, t } from './content.js';

let toastTimer = 0;

export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2600);
}

const pad = (n) => String(n).padStart(2, '0');

function icsStamp(date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function buildIcs() {
  const start = new Date(wedding.dateISO);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SaGa Kalyanam//Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:saga-kalyanam-${start.getTime()}@invitation`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${esc(`${wedding.bride} & ${wedding.groom} — ${wedding.title}`)}`,
    `LOCATION:${esc(`${wedding.venueName}, ${wedding.venueArea}`)}`,
    `DESCRIPTION:${esc('Sumuhurtham 8:34 PM. With love, ' + wedding.family)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Wedding tomorrow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

async function addToCalendar() {
  const blob = buildIcs();
  const file = new File([blob], 'saga-kalyanam.ics', { type: 'text/calendar' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: wedding.title });
      return;
    }
  } catch {
    /* user dismissed the sheet, fall through to download */
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'saga-kalyanam.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(t('calendarReady'));
}

async function shareInvitation() {
  const url = window.location.origin + window.location.pathname;
  const text = `${wedding.bride} & ${wedding.groom} — ${wedding.title}, 10 December 2026, Sumuhurtham 8:34 PM, ${wedding.venueName}, Jangareddygudem.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: wedding.title, text, url });
      return;
    } catch {
      /* dismissed */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(t('linkCopied'));
  } catch {
    toast(url);
  }
}

function submitRsvp(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get('name') || 'Guest').trim();
  const guests = data.get('guests') || '1';
  const attending = data.get('attending') === 'no' ? 'no' : 'yes';
  const note = String(data.get('note') || '').trim();

  const body = [
    attending === 'yes' ? `Yes, we will be there — ${wedding.title}` : `So sorry, we cannot make it — ${wedding.title}`,
    `Name: ${name}`,
    `Guests: ${guests}`,
    note ? `Note: ${note}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const base = wedding.rsvpWhatsApp ? `https://wa.me/${wedding.rsvpWhatsApp}` : 'https://wa.me/';
  window.open(`${base}?text=${encodeURIComponent(body)}`, '_blank', 'noopener');
  form.hidden = true;
  document.getElementById('rsvpOpen')?.setAttribute('aria-expanded', 'false');
  toast(t('rsvpThanks'));
}

export function initActions() {
  document.getElementById('calBtn')?.addEventListener('click', addToCalendar);
  document.getElementById('shareBtn')?.addEventListener('click', shareInvitation);

  const form = document.getElementById('rsvpForm');
  const openBtn = document.getElementById('rsvpOpen');
  const nameField = document.getElementById('rsvpName');

  openBtn?.addEventListener('click', () => {
    if (!form) return;
    form.hidden = !form.hidden;
    openBtn.setAttribute('aria-expanded', String(!form.hidden));
    if (!form.hidden) {
      const guest = new URLSearchParams(window.location.search).get('to');
      if (guest && nameField && !nameField.value) {
        nameField.value = guest.replace(/\+/g, ' ').replace(/\s*garu$/i, '').trim();
      }
      window.setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    }
  });

  form?.addEventListener('submit', submitRsvp);
}
