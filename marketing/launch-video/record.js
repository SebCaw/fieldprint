// Records video.html to an MP4 using Edge (already on Windows) and ffmpeg.
// Usage:  node record.js            -> fieldprint-launch.mp4
//         node record.js --buyer    -> fieldprint-buyer.mp4 (buyer version)
//         add --stills              -> a few JPEG frames in stills/ to check the look
//         add --sound-only          -> remake the soundtrack and re-join it, without re-recording
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FPS = 30, DURATION = 30;
const here = __dirname;
const BUYER = process.argv.includes('--buyer');

const NAME = BUYER ? 'fieldprint-buyer' : 'fieldprint-launch';
const silent = path.join(here, 'build', NAME + '-silent.mp4');

// makes the soundtrack with audio.js and joins it to the silent video
function addSound() {
  execFileSync(process.execPath, [path.join(here, 'audio.js'), ...(BUYER ? ['--buyer'] : [])], { stdio: 'inherit' });
  const wav = path.join(here, 'build', BUYER ? 'audio-buyer.wav' : 'audio-guide.wav');
  const out = path.join(here, NAME + '.mp4');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  console.log('saved', out);
}

(async () => {
  if (process.argv.includes('--sound-only')) return addSound();
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage();
  await page.goto('file:///' + path.join(here, 'video.html').replace(/\\/g, '/') + '?record' + (BUYER ? '&v=buyer' : ''), { waitUntil: 'networkidle0' });
  await page.evaluate(() => window.videoReady);
  const grab = async t => Buffer.from((await page.evaluate(t => window.frame(t), t)).split(',')[1], 'base64');

  if (process.argv.includes('--stills')) {
    fs.mkdirSync(path.join(here, 'stills'), { recursive: true });
    for (const t of [3.5, 8.5, 13, 15.5, 20, 24.5, 29]) fs.writeFileSync(path.join(here, 'stills', `${BUYER ? 'b' : 't'}${t}.jpg`), await grab(t));
    await browser.close();
    console.log('stills saved');
    return;
  }

  fs.mkdirSync(path.join(here, 'build'), { recursive: true });
  const out = silent;
  const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'ignore', 'inherit'] });
  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    const buf = await grab(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  addSound();
})();
