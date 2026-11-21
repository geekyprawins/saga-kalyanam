/* Photos are optional. Drop files named after each slot into /public/assets/photos
   (e.g. bride.webp) and they appear in place of the ornamental fallbacks. */

const EXTENSIONS = ['webp', 'avif', 'jpg', 'jpeg', 'png'];

function attempt(el, name, index = 0) {
  if (index >= EXTENSIONS.length) return;
  const url = `./assets/photos/${name}.${EXTENSIONS[index]}`;
  const probe = new Image();
  probe.onload = () => {
    el.style.backgroundImage = `url("${url}")`;
    el.classList.add('has-photo');
  };
  probe.onerror = () => attempt(el, name, index + 1);
  probe.src = url;
}

export function loadPhotos() {
  document.querySelectorAll('[data-photo]').forEach((el) => {
    attempt(el, el.dataset.photo);
  });
}
