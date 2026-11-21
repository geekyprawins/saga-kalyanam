/* Procedural sound: a temple bell, a hand-drum pulse and a soft card swish.
   Synthesised at runtime so the invitation ships without audio files. */

const BELL_BASE = 470;
const PARTIALS = [
  [1.0, 0.34, 7.0],
  [2.0, 0.17, 5.2],
  [2.39, 0.13, 4.4],
  [3.0, 0.1, 3.6],
  [4.16, 0.065, 2.8],
  [5.43, 0.045, 2.2],
  [6.79, 0.028, 1.8],
];

let ctx = null;
let master = null;
let wet = null;
let ambience = null;
let schedulerId = null;
let ambienceTimer = 0;
let step = 0;
let nextTime = 0;
let soundOn = false;

const STEP = 60 / 96 / 4;

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

export function ringBell({ gain = 1, detune = 0 } = {}) {
  if (!ctx || !soundOn) return;
  const now = ctx.currentTime + 0.01;
  const bus = ctx.createGain();
  bus.gain.value = gain;
  bus.connect(master);
  bus.connect(wet);

  PARTIALS.forEach(([ratio, level, decay], i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = BELL_BASE * ratio + detune + (Math.random() - 0.5) * 1.6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(level, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(env);
    env.connect(bus);
    osc.start(now);
    osc.stop(now + decay + 0.05);
    if (i === 0) {
      const partial = ctx.createOscillator();
      partial.type = 'sine';
      partial.frequency.value = BELL_BASE * 0.5;
      const env2 = ctx.createGain();
      env2.gain.setValueAtTime(0, now);
      env2.gain.linearRampToValueAtTime(level * 0.5, now + 0.008);
      env2.gain.exponentialRampToValueAtTime(0.0001, now + decay * 0.8);
      partial.connect(env2);
      env2.connect(bus);
      partial.start(now);
      partial.stop(now + decay);
    }
  });

  // metal strike
  const noise = ctx.createBufferSource();
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  noise.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3200;
  bp.Q.value = 0.9;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.09;
  noise.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(bus);
  noise.start(now);
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

function drum(time, { freq = 120, to = 55, decay = 0.22, level = 0.16, type = 'sine' } = {}) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(to, time + decay * 0.9);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(level, time + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  osc.connect(env);
  env.connect(ambience);
  osc.start(time);
  osc.stop(time + decay + 0.02);
}

function tick(time, level = 0.035) {
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
  bp.frequency.value = 2400;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(bp);
  bp.connect(g);
  g.connect(ambience);
  src.start(time);
}

const LOW = [0, 3, 6, 10, 12];
const HIGH = [2, 4, 8, 9, 14];
const TICKS = [5, 13];

function scheduleStep(i, time) {
  if (LOW.includes(i)) {
    drum(time, { freq: i === 0 ? 132 : 112, to: 52, decay: i === 0 ? 0.3 : 0.2, level: i === 0 ? 0.18 : 0.12 });
  }
  if (HIGH.includes(i)) {
    drum(time, { freq: 330, to: 250, decay: 0.07, level: 0.05, type: 'triangle' });
    tick(time, 0.02);
  }
  if (TICKS.includes(i)) tick(time, 0.025);
  if (i === 0 && Math.random() > 0.45) ringBell({ gain: 0.14, detune: -180 });
}

function pump() {
  if (!ctx || !soundOn) return;
  while (nextTime < ctx.currentTime + 0.15) {
    scheduleStep(step, nextTime);
    nextTime += STEP;
    step = (step + 1) % 16;
  }
}

function startAmbience() {
  if (!ctx || ambience) return;
  ambience = ctx.createGain();
  ambience.gain.value = 0;
  ambience.connect(master);
  ambience.gain.setTargetAtTime(0.55, ctx.currentTime, 0.9);
  nextTime = ctx.currentTime + 0.1;
  step = 0;
  schedulerId = setInterval(pump, 40);
  pump();
}

function stopAmbience() {
  if (schedulerId) clearInterval(schedulerId);
  schedulerId = null;
  if (!ambience) return;
  const node = ambience;
  ambience = null;
  node.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  setTimeout(() => node.disconnect(), 1600);
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (soundOn) ctx.resume();
});
