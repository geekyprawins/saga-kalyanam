import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Points,
  CanvasTexture,
  Color,
} from 'three';

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vRot;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * aSpeed, 26.0) - 6.0;
    p.x += sin(uTime * 0.5 + aPhase) * 0.85;
    p.z += cos(uTime * 0.38 + aPhase * 1.4) * 0.55;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (16.0 / max(0.001, -mv.z));
    vColor = aColor;
    vRot = uTime * (0.5 + aPhase * 0.02) + aPhase;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  varying vec3 vColor;
  varying float vRot;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot);
    float s = sin(vRot);
    uv = mat2(c, -s, s, c) * uv;
    vec4 tex = texture2D(uMap, uv + 0.5);
    if (tex.a < 0.03) discard;
    gl_FragColor = vec4(vColor, tex.a);
  }
`;

function petalTexture() {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const grd = g.createRadialGradient(size * 0.42, size * 0.36, 2, size * 0.5, size * 0.5, size * 0.5);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(size * 0.5, size * 0.08);
  g.bezierCurveTo(size * 0.92, size * 0.26, size * 0.92, size * 0.74, size * 0.5, size * 0.94);
  g.bezierCurveTo(size * 0.08, size * 0.74, size * 0.08, size * 0.26, size * 0.5, size * 0.08);
  g.fill();
  // soft crease
  g.strokeStyle = 'rgba(180,150,110,0.18)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(size * 0.5, size * 0.16);
  g.lineTo(size * 0.5, size * 0.86);
  g.stroke();
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const PALETTE = ['#fffdf6', '#f6e7c8', '#e0c084', '#c22b3a', '#a3202c', '#f3d9d4'];

export function createPetalField(canvas) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(52, 1, 0.1, 80);
  camera.position.z = 13;

  const count = window.innerWidth < 640 ? 230 : 380;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 19;
    positions[i * 3 + 1] = Math.random() * 26;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    sizes[i] = 5 + Math.random() * 9;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.35 + Math.random() * 0.5;
    const c = new Color(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  geometry.setAttribute('aSpeed', new BufferAttribute(speeds, 1));
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3));

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uMap: { value: petalTexture() },
    },
    transparent: true,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  scene.add(points);

  let width = 0;
  let height = 0;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(material.uniforms.uPixelRatio.value);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize', resize);

  let raf = 0;
  const clock = { t: 0, last: performance.now() };

  function frame(now) {
    const dt = Math.min(0.05, (now - clock.last) / 1000);
    clock.last = now;
    clock.t = (clock.t + dt) % 3600;
    material.uniforms.uTime.value = clock.t;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf) {
      clock.last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  start();

  return { start, stop };
}

/* A short, physical petal shower built from DOM nodes — cheap and precise. */
export function showerPetals(count = 26) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'shower';
  document.body.appendChild(layer);
  const tints = ['#fffdf6', '#f3d9d4', '#e0c084', '#c22b3a', '#f6e7c8'];

  for (let i = 0; i < count; i += 1) {
    const petal = document.createElement('i');
    const tint = tints[i % tints.length];
    const size = 8 + Math.random() * 10;
    petal.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size * 1.35}px;background:${tint};`;
    layer.appendChild(petal);

    const drift = (Math.random() - 0.5) * 140;
    const duration = 3200 + Math.random() * 2600;
    petal.animate(
      [
        { transform: `translate3d(0, -12vh, 0) rotate(0deg)`, opacity: 0 },
        { opacity: 0.95, offset: 0.08 },
        { transform: `translate3d(${drift * 0.5}px, 45vh, 0) rotate(${180 + Math.random() * 180}deg)`, opacity: 0.95, offset: 0.55 },
        { transform: `translate3d(${drift}px, 112vh, 0) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 },
      ],
      { duration, delay: Math.random() * 900, easing: 'cubic-bezier(0.35,0.1,0.6,1)', fill: 'both' },
    );
  }

  setTimeout(() => layer.remove(), 7600);
}
