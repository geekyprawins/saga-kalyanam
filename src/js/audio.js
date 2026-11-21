/* Procedural sound: a sannai melam for the ambience and the small noises of the
   card itself. Synthesised at runtime so the invitation ships without audio
   files. */

let ctx = null;
let master = null;
let wet = null;
let ambience = null;
let schedulerId = null;
let ambienceTimer = 0;
let step = 0;
let nextTime = 0;
let soundOn = false;

const STEP = 60 / 94 / 4;

function makeReverb(context) {
  const seconds = 1.6;
  const rate = context.sampleRate;
  const buffer = context.createBuffer(2, rate * seconds, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i += 1) {
      const decay = (1 - i / data.length) ** 2.6;
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  const convolver = context.createConvolver();
  convolver.buffer = buffer;
  return convolver;
}

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.25;

  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(comp);
  comp.connect(ctx.destination);

  wet = ctx.createGain();
  wet.gain.value = 0.32;
  const reverb = makeReverb(ctx);
  wet.connect(reverb);
  reverb.connect(master);

  return ctx;
}

export function isSoundOn() {
  return soundOn;
}

export function setSound(on) {
  if (on) unlockAudio();
  if (!ctx) return false;
  soundOn = on;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, on ? 0.08 : 0.3);
  if (on) {
    if (!ambienceTimer) {
      ambienceTimer = window.setTimeout(() => {
        ambienceTimer = 0;
        startAmbience();
      }, 1600);
    }
  } else {
    window.clearTimeout(ambienceTimer);
    ambienceTimer = 0;
    stopAmbience();
  }
  return soundOn;
}

export function swish() {
  if (!ctx || !soundOn) return;
  const now = ctx.currentTime;
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const p = i / length;
    data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * p) ** 2;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(700, now);
  filter.frequency.exponentialRampToValueAtTime(2600, now + 0.45);
  const g = ctx.createGain();
  g.gain.value = 0.05;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  g.connect(wet);
  src.start(now);
}

export function crack() {
  if (!ctx || !soundOn) return;
  const now = ctx.currentTime + 0.005;

  // brittle snap
  const length = Math.floor(ctx.sampleRate * 0.14);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const p = i / length;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-p * 26);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1100;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.11;
  noise.connect(hp);
  hp.connect(noiseGain);
  noiseGain.connect(master);
  noiseGain.connect(wet);
  noise.start(now);

  // wax body under the snap
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(58, now + 0.16);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.16, now + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(env);
  env.connect(master);
  osc.start(now);
  osc.stop(now + 0.22);
}

function drum(time, { freq = 120, to = 55, decay = 0.22, level = 0.16, type = 'sine' } = {}) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(to, time + decay * 0.9);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  osc.connect(env);
  env.connect(ambience);
  osc.start(time);
  osc.stop(time + decay + 0.02);
}

function tick(time, level = 0.03, freq = 2400) {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(bp);
  bp.connect(g);
  g.connect(ambience);
  src.start(time);
}

/* ── the sannai melam ──────────────────────────────────────────────────
   Mohanam, the bright pentatonic every wedding band opens with: S R G P D.
   The nadaswaram is three detuned saws through a resonant low-pass and a
   nasal peak, each note entering with a jaru slide and settling into a wide
   vibrato. Under it a tavil in adi talam and a shruti drone on Sa and Pa. */

const SA = 293.66;
const RAGA = [0, 2, 4, 7, 9, 12];

const PHRASE_A = [
  [0, 1], [1, 1], [2, 1], [1, 1], [0, 2], [2, 2],
  [3, 1], [4, 1], [5, 1], [4, 1], [3, 2], [2, 2],
  [1, 1], [2, 1], [3, 1], [2, 1], [1, 2], [0, 2],
  [4, 1], [3, 1], [2, 1], [1, 1], [0, 4],
];

const PHRASE_B = [
  [5, 1], [4, 1], [5, 1], [2, 1], [3, 2], [4, 2],
  [5, 1], [2, 1], [3, 1], [4, 1], [3, 2], [2, 2],
  [1, 1], [2, 1], [3, 1], [5, 1], [4, 2], [3, 2],
  [1, 2], [0, 2], [1, 1], [2, 1], [0, 2],
];

let melody = [];
let cycle = 0;
let drone = null;

function nadaswaram(time, freq, dur, level = 0.15) {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, time);
  bus.gain.linearRampToValueAtTime(level, time + 0.03);
  bus.gain.setValueAtTime(level, time + Math.max(0.08, dur * 0.78));
  bus.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.12);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 4.5;
  lp.frequency.setValueAtTime(freq * 1.9, time);
  lp.frequency.linearRampToValueAtTime(freq * 5.4, time + 0.06);

  const nasal = ctx.createBiquadFilter();
  nasal.type = 'peaking';
  nasal.frequency.value = 1250;
  nasal.Q.value = 1.1;
  nasal.gain.value = 7;

  lp.connect(nasal);
  nasal.connect(bus);
  bus.connect(ambience);
  bus.connect(wet);

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0, time);
  lfoGain.gain.linearRampToValueAtTime(freq * 0.0075, time + 0.2);
  lfo.connect(lfoGain);
  lfo.start(time);
  lfo.stop(time + dur + 0.2);

  const voices = [
    ['sawtooth', 1, 0, 0.5],
    ['sawtooth', 1, 8, 0.34],
    ['square', 2, -5, 0.09],
  ];

  voices.forEach(([type, mul, detune, gain]) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    const target = freq * mul;
    osc.frequency.setValueAtTime(target * 0.944, time);
    osc.frequency.exponentialRampToValueAtTime(target, time + 0.05);
    osc.detune.value = detune;
    lfoGain.connect(osc.frequency);

    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(lp);
    osc.start(time);
    osc.stop(time + dur + 0.22);
  });
}

function startDrone() {
  if (drone) return;
  const bus = ctx.createGain();
  bus.gain.value = 0;
  bus.connect(ambience);
  bus.gain.setTargetAtTime(1, ctx.currentTime, 1.4);

  const breathe = ctx.createOscillator();
  breathe.frequency.value = 0.12;
  breathe.start();
  const nodes = [breathe, bus];

  [[SA / 2, 0.05, 'sine'], [SA * 0.75, 0.026, 'sine'], [SA / 4, 0.03, 'triangle']].forEach(
    ([freq, level, type]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 5;

      const g = ctx.createGain();
      g.gain.value = level;

      const depth = ctx.createGain();
      depth.gain.value = level * 0.35;
      breathe.connect(depth);
      depth.connect(g.gain);

      osc.connect(g);
      g.connect(bus);
      osc.start();
      nodes.push(osc, g, depth);
    },
  );

  drone = { bus, nodes };
}

function buildMelody(baseStep, index) {
  const phrase = index % 2 === 0 ? PHRASE_A : PHRASE_B;
  let at = baseStep;
  return phrase.map(([deg, len]) => {
    const note = { step: at, deg, steps: len };
    at += len;
    return note;
  });
}

const TAVIL = new Map([
  [0, { freq: 132, to: 46, decay: 0.32, level: 0.19 }],
  [8, { freq: 188, to: 74, decay: 0.15, level: 0.12 }],
  [16, { freq: 132, to: 46, decay: 0.3, level: 0.16 }],
  [24, { freq: 188, to: 74, decay: 0.15, level: 0.11 }],
]);

function scheduleStep(absStep, time) {
  const at = absStep % 32;

  if (at === 0) melody = buildMelody(absStep, cycle);

  const hit = TAVIL.get(at);
  if (hit) drum(time, hit);

  if (at === 4 || at === 12 || at === 20) tick(time, 0.03, 2600);
  if (at >= 28) tick(time, 0.028, 3000);
  if (at % 8 === 2) tick(time, 0.016, 3600);

  const note = melody.find((entry) => entry.step === absStep);
  if (note) {
    nadaswaram(time, SA * 2 ** (RAGA[note.deg] / 12), note.steps * STEP * 0.92);
  }
}

function pump() {
  if (!ctx || !soundOn) return;
  while (nextTime < ctx.currentTime + 0.2) {
    scheduleStep(step, nextTime);
    nextTime += STEP;
    step += 1;
    if (step % 32 === 0) cycle += 1;
  }
}

function startAmbience() {
  if (!ctx || ambience) return;
  ambience = ctx.createGain();
  ambience.gain.value = 0;
  ambience.connect(master);
  ambience.gain.setTargetAtTime(0.5, ctx.currentTime, 1.1);
  startDrone();
  nextTime = ctx.currentTime + 0.12;
  step = 0;
  cycle = 0;
  melody = [];
  schedulerId = setInterval(pump, 40);
  pump();
}

function stopAmbience() {
  if (schedulerId) clearInterval(schedulerId);
  schedulerId = null;
  if (drone) {
    const { bus, nodes } = drone;
    drone = null;
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => {
      nodes.forEach((node) => {
        if (node.stop) node.stop();
        node.disconnect();
      });
      bus.disconnect();
    }, 1800);
  }
  if (!ambience) return;
  const node = ambience;
  ambience = null;
  node.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  setTimeout(() => node.disconnect(), 1800);
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (soundOn) ctx.resume();
});
