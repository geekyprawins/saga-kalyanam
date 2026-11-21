export function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const dots = document.getElementById('carouselDots');
  if (!track || !dots) return;

  const cards = Array.from(track.querySelectorAll('.card'));

  cards.forEach((card, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', card.dataset.caption || `Frame ${i + 1}`);
    dot.addEventListener('click', () => {
      const box = track.getBoundingClientRect();
      const target = card.getBoundingClientRect();
      track.scrollBy({ left: target.left - box.left - box.width / 2 + target.width / 2, behavior: 'smooth' });
    });
    dots.appendChild(dot);
  });

  let queued = false;

  function update() {
    queued = false;
    const box = track.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let active = 0;
    let closest = Infinity;

    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const offset = rect.left + rect.width / 2 - mid;
      const norm = Math.min(1, Math.abs(offset) / (box.width * 0.62));
      const dir = offset > 0 ? -1 : 1;
      card.style.transform = `perspective(900px) translateZ(${(-norm * 80).toFixed(1)}px) rotateY(${(dir * norm * 13).toFixed(2)}deg) scale(${(1 - norm * 0.07).toFixed(3)})`;
      card.style.opacity = (1 - norm * 0.4).toFixed(3);
      if (Math.abs(offset) < closest) {
        closest = Math.abs(offset);
        active = i;
      }
    });

    Array.from(dots.children).forEach((dot, i) => {
      dot.setAttribute('aria-selected', i === active ? 'true' : 'false');
    });
  }

  track.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );

  window.addEventListener('resize', update, { passive: true });
  update();
}

export function initWipes() {
  document.querySelectorAll('[data-wipe]').forEach((wipe) => {
    const handle = document.createElement('span');
    handle.className = 'wipe__handle';
    wipe.appendChild(handle);

    let dragging = false;
    let startX = 0;
    let moved = false;

    const set = (pct) => {
      const p = Math.max(0, Math.min(100, pct));
      wipe.style.setProperty('--wipe', `${p}%`);
      wipe.classList.toggle('is-done', p > 92);
    };

    const pos = (e) => {
      const rect = wipe.getBoundingClientRect();
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      return ((x - rect.left) / rect.width) * 100;
    };

    wipe.addEventListener('pointerdown', (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      set(pos(e));
    });

    wipe.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 5) moved = true;
      set(pos(e));
    });

    const stop = () => {
      dragging = false;
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);

    wipe.addEventListener('click', () => {
      if (moved) {
        moved = false;
        return;
      }
      set(wipe.classList.contains('is-done') ? 0 : 100);
    });
  });
}
