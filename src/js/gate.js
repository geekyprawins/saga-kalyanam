export function initGate() {
  const scene = document.getElementById('gate');
  let opened = false;

  function open() {
    if (opened) return;
    opened = true;
    scene.classList.add('is-open');
  }

  const onScroll = () => {
    if (opened) return;
    if (window.scrollY > window.innerHeight * 0.08) open();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  return { open, isOpen: () => opened };
}
