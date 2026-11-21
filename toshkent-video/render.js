// Usage: node render.js out.mp4 [audio.mp4]   |   node render.js --frames 1,5,10  (stills only)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const FPS = 30;
(async () => {
  const args = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'toshkent.html') + '?render');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const D = await p.evaluate(() => window.DURATION);
  if (args[0] === '--frames') {
    for (const s of args[1].split(',').map(Number)) { await p.evaluate(t => seek(t), s);
      await p.screenshot({ path: `${args[2] || '.'}/f_${s}.jpg`, type: 'jpeg', quality: 80 }); }
  } else {
    const out = args[0] || 'toshkent.mp4', audio = args[1];
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-af', `afade=t=out:st=${D - 1.5}:d=1.5`, '-c:a', 'aac', '-b:a', '160k', '-shortest'] : []),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const N = Math.round(D * FPS);
    for (let i = 0; i < N; i++) {
      await p.evaluate(t => seek(t), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${N}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  console.log('errors:', errs); await b.close();
})();
