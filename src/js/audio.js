/* Sound: the wedding track loops under the page, and the small noises of the
   card are synthesised at runtime so they stay in step with the visuals. */

const BGM_URL = './assets/audio/bgm.mp3';
const BGM_LEVEL = 0.45;
const BGM_FADE_IN = 1.4;
const BGM_FADE_OUT = 0.5;

let ctx = null;
let master = null;
let wet = null;
let soundOn = false;

let bgmBytes = null;
let bgmBuffer = null;
let bgmLoad = null;
let bgmSource = null;
let bgmGain = null;

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

/* Fetching the bytes does not touch the AudioContext, so this can run before the
   first gesture without tripping the autoplay warning. */
export function prefetchBgm() {
  if (bgmBytes || bgmBuffer || bgmLoad) return;
  fetch(BGM_URL)
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((bytes) => {
      if (bytes) bgmBytes = bytes;
    })
    .catch(() => {});
}

/** Decode the track once; later calls reuse the buffer. Needs a live context. */
export function loadBgm() {
  if (bgmBuffer) return Promise.resolve(bgmBuffer);
  if (bgmLoad) return bgmLoad;
  const context = unlockAudio();
  if (!context) return Promise.resolve(null);

  const bytes =
    bgmBytes ||
    fetch(BGM_URL).then((res) => {
      if (!res.ok) throw new Error(`bgm ${res.status}`);
      return res.arrayBuffer();
    });

  bgmLoad = Promise.resolve(bytes)
    .then((data) => {
      bgmBytes = null;
      return context.decodeAudioData(data);
    })
    .then((buffer) => {
      bgmBuffer = trimEncoderPad(context, buffer);
      return bgmBuffer;
    })
    .catch(() => {
      bgmLoad = null;
      return null;
    });

  return bgmLoad;
}

/* MP3 encoders pad the file with a few milliseconds of silence, and a looping
   buffer plays that padding on every lap. Trim it so the seam is continuous. */
function trimEncoderPad(context, buffer) {
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) channels.push(buffer.getChannelData(c));

  const loud = (i) => channels.some((data) => Math.abs(data[i]) > 0.01);
  let start = 0;
  while (start < buffer.length && !loud(start)) start += 1;
  let end = buffer.length - 1;
  while (end > start && !loud(end)) end -= 1;
  if (start === 0 && end === buffer.length - 1) return buffer;

  const trimmed = context.createBuffer(buffer.numberOfChannels, end - start + 1, buffer.sampleRate);
  channels.forEach((data, c) => trimmed.copyToChannel(data.subarray(start, end + 1), c));
  return trimmed;
}

function startBgm() {
  if (!ctx || !bgmBuffer || bgmSource) return;
  if (!bgmGain) {
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0;
    bgmGain.connect(master);
  }
  const source = ctx.createBufferSource();
  source.buffer = bgmBuffer;
  source.loop = true;
  source.connect(bgmGain);
  source.start();
  bgmSource = source;

  const now = ctx.currentTime;
  bgmGain.gain.cancelScheduledValues(now);
  bgmGain.gain.setValueAtTime(0, now);
  bgmGain.gain.linearRampToValueAtTime(BGM_LEVEL, now + BGM_FADE_IN);
}

function stopBgm() {
  const source = bgmSource;
  const gain = bgmGain;
  bgmSource = null;
  bgmGain = null;
  if (!source || !ctx) return;

  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + BGM_FADE_OUT);
  source.onended = () => gain.disconnect();
  try {
    source.stop(now + BGM_FADE_OUT + 0.05);
  } catch {
    gain.disconnect();
  }
}

export function setSound(on) {
  if (on) unlockAudio();
  if (!ctx) return false;
  soundOn = on;

  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, on ? 0.08 : 0.3);

  if (on) {
    loadBgm().then(() => {
      if (soundOn) startBgm();
    });
  } else {
    stopBgm();
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

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (soundOn) ctx.resume();
});
