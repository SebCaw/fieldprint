// Makes the soundtrack (music + sound effects) for the launch videos from scratch,
// so there is nothing copyrighted in it. Timings match video.html.
// Usage: node audio.js [--buyer]  -> audio-guide.wav or audio-buyer.wav
const fs = require('fs');
const path = require('path');

const BUYER = process.argv.includes('--buyer');
const NO_MUSIC = process.argv.includes('--no-music'); // effects only, for adding a trending sound inside Instagram
const SR = 48000, LEN = 30.5, N = Math.floor(SR * LEN);
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
const verbIn = [new Float32Array(N), new Float32Array(N)];

// ---------- helpers ----------
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
function add(bus, i, l, r, send = 0) {
  if (i < 0 || i >= N) return;
  bus[0][i] += l; bus[1][i] += r;
  if (send) { verbIn[0][i] += l * send; verbIn[1][i] += r * send; }
}
const pan = p => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
function biquad(type, f, q) {
  let b0, b1, b2, a0, a1, a2;
  const set = f => {
    const w = TAU * f / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  };
  set(f);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const run = x => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  run.set = set;
  return run;
}
// fade the whole music bed in and out
const musicEnv = t => Math.min(1, t / 1.2) * Math.min(1, Math.max(0, (30 - t) / 2.2));

// ---------- music: 96 bpm, D major, gentle and warm ----------
const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4;
// chords, two bars each: Dmaj9, Bm7, Gmaj7, A6
const CHORDS = [[50, 54, 57, 61, 64], [47, 50, 54, 57, 62], [43, 50, 54, 59, 62], [45, 52, 57, 61, 64]];
const chordAt = t => CHORDS[Math.floor(t / (BAR * 2)) % 4];

// pad: soft additive voices, slow swell per chord
function pad() {
  const chordLen = BAR * 2;
  for (let c = 0; c * chordLen < LEN; c++) {
    const notes = CHORDS[c % 4], t0 = c * chordLen;
    notes.forEach((m, vi) => {
      for (const det of [-0.06, 0.06]) {
        const f = mtof(m + 12) * Math.pow(2, det / 12), [pl, pr] = pan(det * 8 * (vi % 2 ? 1 : -1) * .6);
        let ph = rnd() * TAU;
        const s0 = Math.floor(t0 * SR), s1 = Math.min(N, Math.floor((t0 + chordLen + 1.2) * SR));
        for (let i = s0; i < s1; i++) {
          const lt = (i - s0) / SR, t = i / SR;
          const env = Math.min(1, lt / 1.4) * Math.min(1, Math.max(0, (chordLen + 1.2 - lt) / 1.4));
          ph += TAU * f * (1 + .002 * Math.sin(TAU * .3 * t + vi)) / SR;
          const v = Math.sin(ph) + .35 * Math.sin(2 * ph) + .12 * Math.sin(3 * ph);
          const g = .018 * env * musicEnv(t);
          add(music, i, v * g * pl, v * g * pr, .5);
        }
      }
    });
  }
}
// kalimba: sine with a bright inharmonic partial and a quick decay
function kalimba(t, m, vel, p = 0) {
  const f = mtof(m), [pl, pr] = pan(p), s0 = Math.floor(t * SR), len = Math.floor(1.6 * SR);
  for (let k = 0; k < len; k++) {
    const lt = k / SR;
    const v = Math.sin(TAU * f * lt) * Math.exp(-lt * 3.2) + .35 * Math.sin(TAU * f * 5.4 * lt) * Math.exp(-lt * 22)
      + .15 * Math.sin(TAU * f * 2 * lt) * Math.exp(-lt * 6);
    const g = vel * Math.min(1, lt / .002) * musicEnv(t + lt);
    add(music, s0 + k, v * g * pl, v * g * pr, .35);
  }
}
function kalimbaLine(from, to) {
  const pattern = [0, 2, 1, 3, 2, 4, 3, 1];
  for (let b = Math.ceil(from / (BEAT / 2)); b * BEAT / 2 < to; b++) {
    const t = b * BEAT / 2, ch = chordAt(t), step = b % 8;
    if (step === 5 && b % 16 > 8) continue; // little gap so it breathes
    const m = ch[pattern[step] % ch.length] + 24;
    const ramp = Math.min(1, (t - from) / 2);
    kalimba(t, m, (.07 + (step % 2 ? 0 : .025)) * ramp, step % 2 ? .35 : -.35);
  }
}
function shaker(from, to) {
  const hp = [biquad('hp', 6000, .7), biquad('hp', 6000, .7)];
  for (let b = Math.ceil(from / (BEAT / 4)); b * BEAT / 4 < to; b++) {
    const t = b * BEAT / 4, acc = b % 4 === 2 ? 1 : b % 2 ? .45 : .7;
    const s0 = Math.floor(t * SR), len = Math.floor(.07 * SR), ramp = Math.min(1, (t - from) / 1.5);
    for (let k = 0; k < len; k++) {
      const lt = k / SR, e = Math.min(1, lt / .006) * Math.exp(-lt * 55) * acc * .05 * ramp * musicEnv(t);
      add(music, s0 + k, hp[0](rnd()) * e * .8, hp[1](rnd()) * e, .1);
    }
  }
}
function drum(t, f0, decay, g) {
  const s0 = Math.floor(t * SR), len = Math.floor(.5 * SR);
  let ph = 0;
  for (let k = 0; k < len; k++) {
    const lt = k / SR, f = f0 * (1 + 1.6 * Math.exp(-lt * 30));
    ph += TAU * f / SR;
    const v = Math.sin(ph) * Math.exp(-lt * decay) * g * musicEnv(t);
    add(music, s0 + k, v, v, .05);
  }
}
function groove(from, to) {
  for (let b = Math.ceil(from / BEAT); b * BEAT < to; b++) {
    const t = b * BEAT;
    if (b % 4 === 0) drum(t, 55, 9, .22);
    if (b % 4 === 2) drum(t, 55, 11, .15);
    if (b % 8 === 7) drum(t + BEAT / 2, 140, 18, .08); // hand drum
    if (b % 4 === 3) drum(t + BEAT / 2, 180, 22, .05);
  }
}
function bass(from, to) {
  for (let t = Math.ceil(from / BEAT) * BEAT; t < to; t += BEAT * 2) {
    const m = chordAt(t)[0] - 12, f = mtof(m), s0 = Math.floor(t * SR), len = Math.floor(BEAT * 1.9 * SR);
    const ramp = Math.min(1, (t - from) / 2);
    for (let k = 0; k < len; k++) {
      const lt = k / SR, e = Math.min(1, lt / .01) * Math.exp(-lt * 1.2) * .11 * ramp * musicEnv(t);
      const v = (Math.sin(TAU * f * lt) + .25 * Math.sin(TAU * f * 2 * lt)) * e;
      add(music, s0 + k, v, v);
    }
  }
}
// evening crickets under the opening shot
function crickets(from, to) {
  for (let c = 0; c < 3; c++) {
    const f = 4300 + c * 700, rate = 2.2 + c * .7, [pl, pr] = pan(c - 1);
    for (let i = Math.floor(from * SR); i < to * SR; i++) {
      const t = i / SR, fade = Math.min(1, (t - from) / .8) * Math.min(1, (to - t) / 1.2);
      const chirp = Math.max(0, Math.sin(TAU * rate * t + c * 2)) ** 8 * (Math.sin(TAU * 38 * t) > 0 ? 1 : .2);
      const v = Math.sin(TAU * f * t) * chirp * .012 * fade;
      add(music, i, v * pl, v * pr, .3);
    }
  }
}

// ---------- sound effects ----------
function noiseBurst(t, dur, filt, gain, attack = .002, decay = 30, p = 0, send = .1) {
  const s0 = Math.floor(t * SR), len = Math.floor(dur * SR), [pl, pr] = pan(p);
  for (let k = 0; k < len; k++) {
    const lt = k / SR, e = Math.min(1, lt / attack) * Math.exp(-lt * decay) * gain;
    const v = filt(rnd()) * e;
    add(sfx, s0 + k, v * pl, v * pr, send);
  }
}
function shutter(t) {
  noiseBurst(t, .06, biquad('bp', 3200, 1.2), 1.0, .001, 70);
  noiseBurst(t + .075, .09, biquad('bp', 2400, 1.0), .8, .001, 50);
  blip(t + .005, 180, .05, .25, 60);
}
function whoosh(tc) {
  const t0 = tc - .45, dur = .8, s0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const fl = biquad('bp', 300, .9), fr = biquad('bp', 300, .9);
  for (let k = 0; k < len; k++) {
    const x = k / len, f = 300 + 3500 * Math.sin(Math.PI * Math.min(1, x * 1.1)) ** 2;
    if (k % 32 === 0) { fl.set(f); fr.set(f * 1.08); }
    const e = Math.sin(Math.PI * x) ** 2 * .22;
    add(sfx, s0 + k, fl(rnd()) * e * (1 - x * .5), fr(rnd()) * e * (.5 + x * .5), .25);
  }
}
function blip(t, f, dur, g, decay = 25, p = 0, send = .2) {
  const s0 = Math.floor(t * SR), len = Math.floor(dur * SR), [pl, pr] = pan(p);
  for (let k = 0; k < len; k++) {
    const lt = k / SR, v = Math.sin(TAU * f * lt) * Math.min(1, lt / .002) * Math.exp(-lt * decay) * g;
    add(sfx, s0 + k, v * pl, v * pr, send);
  }
}
function tap(t) {
  noiseBurst(t, .03, biquad('bp', 1800, 2), .5, .0005, 120);
  blip(t, 880, .25, .12, 18);
}
function tick(t, i) {
  blip(t, 1320 * Math.pow(2, i * 2 / 12), .35, .14, 14, (i - 2) * .2, .35);
  blip(t, 2640 * Math.pow(2, i * 2 / 12), .15, .05, 30, 0, .35);
}
function chime(t, notes, g = .14) {
  notes.forEach((m, i) => {
    const f = mtof(m), s0 = Math.floor((t + i * .06) * SR), len = Math.floor(3 * SR), [pl, pr] = pan((i - 1) * .3);
    for (let k = 0; k < len; k++) {
      const lt = k / SR;
      const v = (Math.sin(TAU * f * lt) * Math.exp(-lt * 1.6) + .4 * Math.sin(TAU * f * 2.76 * lt) * Math.exp(-lt * 4)
        + .2 * Math.sin(TAU * f * 5.4 * lt) * Math.exp(-lt * 9)) * Math.min(1, lt / .002) * g;
      add(sfx, s0 + k, v * pl, v * pr, .45);
    }
  });
}
function counter(from, to) {
  // fast ticks that slow down, like a counter settling
  let t = from, gap = .045;
  while (t < to) { blip(t, 2400, .03, .045, 80, .3, .1); t += gap; gap *= 1.07; }
}
function boom(t) {
  let ph = 0;
  const s0 = Math.floor(t * SR), len = Math.floor(2 * SR);
  for (let k = 0; k < len; k++) {
    const lt = k / SR, f = 48 * (1 + .8 * Math.exp(-lt * 8));
    ph += TAU * f / SR;
    const v = Math.sin(ph) * Math.min(1, lt / .01) * Math.exp(-lt * 2.2) * .35;
    add(sfx, s0 + k, v, v, .2);
  }
}

// ---------- arrange ----------
if (!NO_MUSIC) pad();
crickets(0, 5.6);
if (!NO_MUSIC) {
kalimbaLine(5.0, 26);
shaker(10.2, 25.6);
bass(10.2, 25.6);
groove(16.2, 25.6);
kalimbaLine(25.8, 29); // softer tail over the end card
chime(28.6, [74, 78, 81, 86], .05);
}

shutter(.75);
for (const c of [5.25, 10.25, 16.25, 21.25, 25.75]) whoosh(c);
tap(14.4);
for (let i = 0; i < 5; i++) tick(17.4 + .8 * i, i);
if (BUYER) {
  [22.2, 22.65, 23.1].forEach((t, i) => tick(t, i + 1));
} else {
  counter(22.1, 23.7);
  chime(23.75, [81, 85, 88]);
}
boom(25.82);
chime(25.85, [62, 69, 74, 78], .1);
tap(27.0);

// ---------- reverb (Schroeder style) on the send ----------
function reverb(inp, delays, ap) {
  const out = new Float32Array(N);
  const combs = delays.map(d => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * .7 + c.lp * .3;
      c.buf[c.i] = inp[i] + c.lp * .82;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    out[i] = s / combs.length;
  }
  for (const d of ap) {
    const buf = new Float32Array(d); let j = 0;
    for (let i = 0; i < N; i++) { const b = buf[j]; const y = -out[i] + b; buf[j] = out[i] + b * .5; out[i] = y; j = (j + 1) % d; }
  }
  return out;
}
const rvL = reverb(verbIn[0], [1557, 1617, 1491, 1422, 1277, 1356], [225, 556]);
const rvR = reverb(verbIn[1], [1580, 1640, 1514, 1445, 1300, 1379], [248, 579]);

// ---------- mix and write ----------
const out = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
for (let i = 0; i < N; i++) {
  for (let c = 0; c < 2; c++) {
    const v = music[c][i] * .9 + sfx[c][i] * .8 + (c ? rvR[i] : rvL[i]) * .55;
    out[c][i] = Math.tanh(v * 1.1) / 1.1; // gentle soft clip
    peak = Math.max(peak, Math.abs(out[c][i]));
  }
}
const norm = .89 / peak; // about -1 dB
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[c][i] * norm)) * 32767), 44 + i * 4 + c * 2);
const file = path.join(__dirname, 'build', (BUYER ? 'audio-buyer' : 'audio-guide') + (NO_MUSIC ? '-nomusic' : '') + '.wav');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, buf);
console.log('saved', file);
