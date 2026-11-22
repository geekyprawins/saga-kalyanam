/* Sound: the wedding track loops under the page, and the small noises of the
   card are synthesised at runtime so they stay in step with the visuals. */

const BGM_URL = './assets/audio/bgm.mp3';
const BGM_LEVEL = 0.45;
const BGM_FADE_IN = 1.4;
const BGM_FADE_OUT = 0.5;

let ctx = null;
let master = null;
let wet = null;
let soundOn = true;
let mutedByUser = false;

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

/* iOS only unlocks Web Audio from a source started inside the gesture. Play one
   silent sample so later, real playback is allowed even when the track is not
   decoded yet or is started from a promise callback. Harmless elsewhere. */
let primed = false;

function primeAudio() {
  if (!ctx || primed) return;
  primed = true;
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    /* context not ready; the gesture's resume() will still try */
    primed = false;
  }
}

export function isSoundOn() {
  return soundOn;
}

/* True once the graph can actually make noise. `soundOn` is the intended state
   (it starts "on"), so this is what tells the button whether a tap should start
   playback or toggle it. */
export function isAudioRunning() {
  return Boolean(ctx) && ctx.state === 'running';
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
  mutedByUser = !on;
  if (on) {
    unlockAudio();
    if (ctx && ctx.state !== 'running') primeAudio();
  }
  if (!ctx) {
    soundOn = false;
    return false;
  }
  soundOn = on;

  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, on ? 0.08 : 0.3);

  if (!on) {
    stopBgm();
    return soundOn;
  }

  // iOS silently drops a buffer source that was started while the context was
  // suspended, so wait until it is running before starting the track.
  const start = () => {
    if (!soundOn || ctx.state !== 'running') return;
    if (bgmBuffer) startBgm();
    else loadBgm().then(() => {
      if (soundOn && ctx.state === 'running') startBgm();
    });
  };

  if (ctx.state === 'running') start();
  else {
    const resumed = ctx.resume();
    if (resumed && typeof resumed.then === 'function') resumed.then(start).catch(() => {});
    else start();
  }
  return soundOn;
}

/* Browsers refuse to start audio before a gesture, so the track waits for the
   first interaction. Scrolling opens the gate, so wheel/scroll/touchmove count
   too — otherwise a guest who scrolls in (rather than taps) never hears music
   while the icon still reads "on". Where the browser allows audio at load
   (prior engagement, permissive policy) it starts immediately. */
export function armSound() {
  const events = [
    'pointerdown',
    'pointerup',
    'mousedown',
    'mouseup',
    'click',
    'touchstart',
    'touchend',
    'touchmove',
    'keydown',
    'wheel',
    'scroll',
  ];

  // Only these count as a user activation; wheel/scroll/touchmove may start the
  // gate but cannot unlock audio on their own.
  const activation = new Set([
    'pointerdown',
    'pointerup',
    'mousedown',
    'mouseup',
    'click',
    'touchstart',
    'touchend',
    'keydown',
  ]);

  const start = (event) => {
    if (event?.target?.closest?.('#soundBtn')) return; // the button owns that tap
    if (mutedByUser) {
      events.forEach((name) => window.removeEventListener(name, start, true));
      return;
    }
    const context = unlockAudio();
    if (!context) return;

    // Unlock iOS synchronously. A wheel or scroll is not a user activation in
    // Chrome, so only drop the listeners once the context is actually running;
    // otherwise a later click/tap must still be able to start the track.
    if (activation.has(event.type)) primeAudio();
    const unlock = () => {
      if (context.state !== 'running') return;
      events.forEach((name) => window.removeEventListener(name, start, true));
      if (!mutedByUser) setSound(true);
    };

    if (context.state === 'running') {
      unlock();
    } else {
      const resumed = context.resume();
      if (resumed && typeof resumed.then === 'function') resumed.then(unlock).catch(() => {});
      else unlock();
    }
  };

  events.forEach((name) => window.addEventListener(name, start, { capture: true, passive: true }));

  // Create the context now and decode the track ahead of the first gesture. Decoding
  // works while the context is suspended, so the gesture can start without an await.
  const context = unlockAudio();
  if (context) loadBgm();

  const beginIfAllowed = () => {
    if (!context || context.state !== 'running') return;
    events.forEach((name) => window.removeEventListener(name, start, true));
    setSound(true);
  };

  if (!context || context.state === 'running') {
    beginIfAllowed();
  } else {
    // Best effort: browsers that allow autoplay for this site (prior engagement,
    // permissive policy) resolve this and start on open; strict ones stay suspended
    // until the gesture listeners above resume the context.
    const resumed = context.resume();
    if (resumed && typeof resumed.then === 'function') resumed.then(beginIfAllowed).catch(() => {});
    else beginIfAllowed();
  }
}

export function swish() {
  if (!ctx || !soundOn || ctx.state !== 'running') return;
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
  if (!ctx || !soundOn || ctx.state !== 'running') return;
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
