import { getLang, greetingFor, guestName, t, wedding } from './content.js';
import { toast } from './actions.js';

const W = 1080;
const H = 1350;
const DISPLAY = '"Cinzel", "Noto Serif Telugu", serif';
const BODY = '"Cormorant Garamond", "Noto Serif Telugu", Georgia, serif';

export function initSaveCard() {
  const btn = document.getElementById('saveInvite');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    btn.classList.add('is-busy');
    try {
      await save();
    } catch (err) {
      console.error(err);
      toast(t('saveFailed'));
    } finally {
      btn.dataset.busy = '';
      btn.classList.remove('is-busy');
    }
  });
}

async function save() {
  const lang = getLang();
  await loadFonts(lang);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  draw(ctx, lang);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('canvas produced no image');

  const file = new File([blob], 'saga-kalyanam-invite.png', { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: wedding.title });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'saga-kalyanam-invite.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 8000);
  toast(t('savedImage'));
}

async function loadFonts(lang) {
  const faces = [
    `500 96px Cinzel`,
    `italic 64px "Cormorant Garamond"`,
    `400 32px "Cormorant Garamond"`,
  ];
  if (lang === 'te') faces.push(`400 32px "Noto Serif Telugu"`);

  await Promise.all(faces.map((face) => document.fonts.load(face).catch(() => {})));
  if (document.fonts.ready) await document.fonts.ready.catch(() => {});
}

function draw(ctx, lang) {
  const cx = W / 2;
  const name = guestName();

  ctx.fillStyle = '#2b0a0f';
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(cx, 90, 0, cx, 90, 820);
  glow.addColorStop(0, 'rgba(201, 162, 74, 0.26)');
  glow.addColorStop(1, 'rgba(201, 162, 74, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const pad = 62;
  const cardW = W - pad * 2;
  const cardH = H - pad * 2;

  rounded(ctx, pad, pad, cardW, cardH, 8);
  const paper = ctx.createLinearGradient(pad, pad, pad + cardW, pad + cardH);
  paper.addColorStop(0, '#fdf8ee');
  paper.addColorStop(1, '#f3e4c8');
  ctx.fillStyle = paper;
  ctx.fill();

  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 2;
  ctx.stroke();

  rounded(ctx, pad + 15, pad + 15, cardW - 30, cardH - 30, 4);
  ctx.strokeStyle = 'rgba(201, 162, 74, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  rosette(ctx, cx, 200, 0.42);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#8a5f22';
  ctx.font = `500 22px ${DISPLAY}`;
  tracked(ctx, 'SAGA KALYANAM', cx, 300, 9);

  ctx.fillStyle = '#3d0d14';
  ctx.font = `500 96px ${DISPLAY}`;
  ctx.fillText(wedding.bride, cx, 462);

  ctx.fillStyle = '#b98a3c';
  ctx.font = `italic 66px ${BODY}`;
  ctx.fillText('&', cx, 542);

  ctx.fillStyle = '#3d0d14';
  ctx.font = `500 96px ${DISPLAY}`;
  ctx.fillText(wedding.groom, cx, 664);

  rule(ctx, cx, 730, 150);

  ctx.fillStyle = '#5b1119';
  ctx.font = `500 25px ${DISPLAY}`;
  tracked(ctx, `${t('weekday')} · ${t('dateShort')}`, cx, 800, 5);

  ctx.fillStyle = '#8a5f22';
  ctx.font = `500 19px ${DISPLAY}`;
  tracked(ctx, t('sumuhurtham'), cx, 858, 6);

  ctx.fillStyle = '#3d0d14';
  ctx.font = `400 62px ${BODY}`;
  ctx.fillText('8:34 PM', cx, 922);

  ctx.fillStyle = '#4a2a22';
  ctx.font = `400 33px ${BODY}`;
  ctx.fillText(wedding.venueName, cx, 1012);

  ctx.fillStyle = 'rgba(74, 42, 34, 0.8)';
  ctx.font = `400 25px ${BODY}`;
  ctx.fillText(t('venueLine'), cx, 1052);

  if (name) {
    ctx.fillStyle = '#8a5f22';
    ctx.font = `italic 34px ${BODY}`;
    ctx.fillText(greetingFor(name), cx, 1156);
  }

  ctx.fillStyle = 'rgba(61, 13, 20, 0.72)';
  ctx.font = `400 23px ${BODY}`;
  ctx.fillText(t('signOff'), cx, 1210);
}

function tracked(ctx, text, x, y, spacing) {
  // Letter-spacing between code points tears Indic conjuncts apart, so only
  // Latin lines get the tracked treatment.
  if (/[^\u0000-\u007F]/.test(text)) {
    ctx.fillText(text, x, y);
    return;
  }

  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, chars.length - 1);
  const previous = ctx.textAlign;
  ctx.textAlign = 'left';
  let cursor = x - total / 2;
  chars.forEach((char, i) => {
    ctx.fillText(char, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = previous;
}

function rule(ctx, cx, y, half) {
  ctx.strokeStyle = 'rgba(138, 95, 34, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - half, y);
  ctx.lineTo(cx - 14, y);
  ctx.moveTo(cx + 14, y);
  ctx.lineTo(cx + half, y);
  ctx.stroke();

  ctx.fillStyle = '#c9a24a';
  ctx.beginPath();
  ctx.moveTo(cx, y - 6);
  ctx.lineTo(cx + 6, y);
  ctx.lineTo(cx, y + 6);
  ctx.lineTo(cx - 6, y);
  ctx.closePath();
  ctx.fill();
}

function rosette(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = 'rgba(201, 162, 74, 0.45)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([2, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 86 * scale * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(201, 162, 74, 0.8)';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 8; i += 1) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(26 * scale, -44 * scale, 0, -86 * scale);
    ctx.quadraticCurveTo(-26 * scale, -44 * scale, 0, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function rounded(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
