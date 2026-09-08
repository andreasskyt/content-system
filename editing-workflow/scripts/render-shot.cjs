/* render-shot.cjs — render a local HTML file via Playwright + installed Chrome.
   Two modes:
     node render-shot.cjs <html> <png> <w> <h> [scale]            -> single screenshot (final state)
     node render-shot.cjs seq <html> <outdir> <w> <h> <fps> <dur> -> frame sequence, driving the
        page's window.__setProgress(t) each frame (for staggered element-by-element animation).
   The bundled chromium is version-mismatched here, so we launch installed Google Chrome. */
const PW_CANDIDATES = [
  'playwright',
  require('path').join(__dirname, '..', 'node_modules', 'playwright'),
];
let chromium = null;
for (const p of PW_CANDIDATES) {
  try { ({ chromium } = require(p)); break; } catch (e) { /* try next */ }
}
if (!chromium) { console.error('ERR no playwright found'); process.exit(2); }
const fs = require('fs');

(async () => {
  const argv = process.argv.slice(2);
  const seq = argv[0] === 'seq';
  const b = await chromium.launch({ channel: 'chrome' });

  if (!seq) {
    const [htmlPath, outPath, w, h, scale] = argv;
    const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: scale ? +scale : 2 });
    await p.goto('file://' + htmlPath);
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => window.__setProgress && window.__setProgress(999)); // final state
    await p.waitForTimeout(250);
    await p.screenshot({ path: outPath, omitBackground: true });
    await b.close();
    console.log('shot ok ->', outPath);
    return;
  }

  const [, htmlPath, outDir, w, h, fps, dur] = argv;
  fs.mkdirSync(outDir, { recursive: true });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await p.goto('file://' + htmlPath);
  await p.evaluate(() => document.fonts.ready);
  const n = Math.max(1, Math.round(+fps * +dur));
  for (let i = 0; i < n; i++) {
    const t = i / +fps;
    await p.evaluate((tt) => window.__setProgress && window.__setProgress(tt), t);
    const name = outDir + '/frame_' + String(i + 1).padStart(5, '0') + '.png';
    await p.screenshot({ path: name });
  }
  await b.close();
  console.log('seq ok ->', outDir, n, 'frames');
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
