import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = process.argv[2] || 'desktop';
const OUT = process.argv[3] || path.join(ROOT, 'previews');
const PREFIX = PROFILE === 'desktop' ? '' : PROFILE + '_';
fs.mkdirSync(OUT, { recursive: true });
const ctxOpts = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  ipad: { ...devices['iPad (gen 7)'] },
  phone: { ...devices['iPhone 13'] }
}[PROFILE];
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' }[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch(); const context = await browser.newContext(ctxOpts); const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const res = { profile: PROFILE, ok: true, checks: [], shots: [] };
const check = (n, c, d = '') => { res.checks.push({ n, pass: !!c, d }); if (!c) res.ok = false; console.log(c ? 'PASS' : 'FAIL', n, d); };
const shot = async (name) => { const f = path.join(OUT, PREFIX + name + '.png'); await page.screenshot({ path: f }); res.shots.push(f); };
const wait = ms => page.waitForTimeout(ms);
const st = () => page.evaluate(() => window.__p3quiz.getState());
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await wait(700);
  check('ver chip v3', /畫面 v3/.test(await page.textContent('#verChip')));
  await shot('home');
  await page.click('#startBtn'); await wait(1200);
  await shot('battle_idle');
  const lay = await page.evaluate(() => { const o = document.getElementById('opts').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(), c = document.getElementById('cv'); return { below: o.top >= s.bottom - 1, sw: s.width, sh: s.height, cw: c.width, ch: c.height, smooth: c.getContext('2d').imageSmoothingEnabled, dpr: devicePixelRatio, st: window.__p3quiz.getState() }; });
  check('options below battle stage', lay.below, JSON.stringify({ sw: lay.sw, sh: lay.sh }));
  check('canvas integer-scaled backing', lay.cw % lay.st.W === 0 && lay.cw / lay.st.W === lay.st.k, `${lay.cw}x${lay.ch} W=${lay.st.W} k=${lay.st.k} dpr=${lay.dpr}`);
  check('imageSmoothing off', lay.smooth === false);
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  check('frame rate ~60fps', fps > 45, fps.toFixed(1) + ' fps');
  let seen = { kill: false, item: false, lv: false, map: false, boss: false };
  const N = 16;
  for (let n = 0; n < N; n++) {
    await page.waitForFunction(() => window.__p3quiz.isReady(), null, { timeout: 20000 });
    const info = await page.evaluate(() => { const q = window.__p3quiz.getQs()[window.__p3quiz.getI()]; return { a: q.answer, n: q.options.length, src: q.source }; });
    const s0 = await st();
    if (s0.mon && s0.mon.boss && !seen.boss) { await wait(900); await shot('boss'); seen.boss = true; check('boss intro shown', true, s0.mon.kind + ' lv' + s0.monLevel); }
    const wrong = n === 2 || n === 7;
    await page.click(`#opts .opt:nth-child(${(wrong ? (info.a + 1) % info.n : info.a) + 1})`);
    if (wrong) {
      await wait(350); if (n === 2) await shot('hurt');
      await page.waitForSelector('#next:not(.hide)', { timeout: 8000 });
      const fb = await page.textContent('#fb');
      check(`wrong Q${n + 1} cites page`, /翻書：(課本|作業) p\./.test(fb), info.src);
      await page.click('#next'); await wait(300); continue;
    }
    if (!seen.kill) {
      await page.waitForFunction(() => window.__p3quiz.getState().lastAnim === 'explode', null, { timeout: 5000 });
      await wait(140); await shot('kill'); seen.kill = true;
      await page.waitForSelector('#itemToast:not(.hide)', { timeout: 4000 }); await wait(150); await shot('item_popup'); seen.item = true;
      await page.waitForFunction(() => window.__p3quiz.getState().lastAnim === 'levelup', null, { timeout: 5000 });
      await wait(260); await shot('levelup'); seen.lv = true;
    }
    if (!seen.map) {
      await page.waitForFunction(() => window.__p3quiz.getState().mapOn, null, { timeout: 6000 });
      await wait(800); await shot('map'); seen.map = true;
    }
  }
  await page.waitForFunction(() => window.__p3quiz.isReady(), null, { timeout: 20000 });
  const fin = await st();
  console.log(JSON.stringify(fin));
  check('16 questions played', true);
  check('kills happened', fin.kills >= 9, 'kills=' + fin.kills);
  check('gear unlocked (one per slot, replaced on upgrade)', fin.gear.length >= 4 && fin.gear.length === new Set(fin.gear).size, fin.gear.join(','));
  check('levelled up', fin.level >= 3, 'lv=' + fin.level);
  check('hearts lost on wrong', fin.hearts === 3, 'hearts=' + fin.hearts);
  check('boss encountered', seen.boss);
  check('map travel shown', seen.map);
  // multi HP
  await page.evaluate(() => window.__p3quiz.debugSetLevel(40)); await wait(2200);
  const a = await page.evaluate(() => window.__p3quiz.getQs()[window.__p3quiz.getI()].answer);
  await page.click(`#opts .opt:nth-child(${a + 1})`); await wait(700);
  const m = (await st()).mon; check('multi-HP monster survives first hit', m.maxHp >= 2 && m.hp >= 1 && !m.dead, JSON.stringify(m));
  await shot('multi_hp');
  check('questions count 109', (await page.evaluate(() => window.__p3quiz.getQs().length)) === 109);
} catch (e) { res.ok = false; errors.push('EXC ' + e.stack); await shot('error'); }
const real = errors.filter(e => !/favicon/.test(e));
check('no console/page errors', real.length === 0, real.join(' | '));
fs.writeFileSync(path.join(OUT, PREFIX + 'playtest.json'), JSON.stringify(res, null, 2));
console.log('RESULT', PROFILE, res.ok ? 'OK' : 'FAILED', res.checks.filter(c => c.pass).length + '/' + res.checks.length);
await browser.close(); srv.close(); process.exit(res.ok ? 0 : 1);
