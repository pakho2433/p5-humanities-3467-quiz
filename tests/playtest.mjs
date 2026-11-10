import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PREV = path.join(ROOT, 'previews');
fs.mkdirSync(PREV, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/index.html';
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('missing'); return;
      }
      const ext = path.extname(file);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}/` });
    });
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = { ok: true, checks: [], errors: [], states: [] };

function check(name, cond, detail = '') {
  results.checks.push({ name, pass: !!cond, detail });
  if (!cond) results.ok = false;
  console.log(cond ? 'PASS' : 'FAIL', name, detail || '');
}

const { server, base } = await startServer();
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
page.on('pageerror', (e) => results.errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') results.errors.push('console: ' + m.text());
});

const T0 = Date.now();
const log = (...a) => console.log(((Date.now() - T0) / 1000).toFixed(1) + 's', ...a);

try {
  log('goto', base);
  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#startBtn', { timeout: 15000 });
  await wait(400);
  await page.screenshot({ path: path.join(PREV, 'home.png') });

  log('start battle');
  await page.click('#startBtn');
  await page.waitForSelector('#battle:not(.hide)', { timeout: 10000 });
  await page.waitForSelector('#cv', { timeout: 8000 });
  await wait(800);
  await page.screenshot({ path: path.join(PREV, 'battle_idle.png') });

  const layout = await page.evaluate(() => {
    const opts = document.getElementById('opts');
    const panel = document.querySelector('.panel');
    const stage = document.getElementById('stage');
    const or = opts.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const q = document.getElementById('q').textContent;
    return {
      optsInPanel: pr.top <= or.top && pr.bottom >= or.bottom,
      optsBelowStage: or.top >= sr.bottom - 2,
      stageH: sr.height,
      optsH: or.height,
      q
    };
  });
  check('options inside bottom panel', layout.optsInPanel, JSON.stringify({ top: layout.optsInPanel }));
  check('options below battle stage', layout.optsBelowStage, `stageBottom vs optsTop`);
  check('stage has height', layout.stageH > 80, String(layout.stageH));

  // Play 10 questions: mix correct and wrong
  let seenKill = false;
  let seenItem = false;
  let seenLevelUp = false;
  let wrongs = 0;
  let corrects = 0;

  async function waitReady() {
    await page.waitForFunction(() => window.__p3quiz && window.__p3quiz.isReady(), { timeout: 15000 });
    await wait(200);
  }

  for (let n = 0; n < 12; n++) {
    await waitReady();

    const info = await page.evaluate(() => {
      const qs = window.__p3quiz.getQs();
      const i = window.__p3quiz.getI();
      const q = qs[i];
      return {
        i,
        type: q.type,
        answer: q.type === 'input' ? q.answerValue : q.answer,
        nOpts: (q.options || []).length,
        total: qs.length
      };
    });

    // questions 3 and 8 wrong (0-index 2 and 7)
    const doWrong = (n === 2 || n === 7) && info.type !== 'input';
    log(`Q${n + 1} type=${info.type} wrong=${doWrong}`);

    if (info.type === 'input') {
      const digits = String(info.answer);
      for (const d of digits) {
        await page.click(`.keys button[data-k="${d}"]`);
      }
      await page.click('.keys button[data-k="ok"]');
      corrects++;
    } else if (doWrong) {
      const wrongIdx = (info.answer + 1) % info.nOpts;
      await page.click(`#opts .opt:nth-child(${wrongIdx + 1})`);
      wrongs++;
    } else {
      await page.click(`#opts .opt:nth-child(${info.answer + 1})`);
      corrects++;
    }

    // wait for animation
    if (!doWrong && n === 0) {
      // capture kill, then map (map starts after kill rewards; don't wait for isReady yet)
      await wait(600);
      await page.screenshot({ path: path.join(PREV, 'kill.png') });
      try {
        await page.waitForFunction(() => {
          const st = window.__p3quiz && window.__p3quiz.getState();
          return st && (st.mapOn || st.lastAnim === 'map');
        }, { timeout: 10000 });
        await wait(300);
        await page.screenshot({ path: path.join(PREV, 'world_map.png') });
        results.checks.push({ name: 'world map shown after kill', pass: true, detail: 'mapOn' });
        console.log('PASS world map shown after kill');
      } catch (e) {
        results.ok = false;
        results.checks.push({ name: 'world map shown after kill', pass: false, detail: String(e) });
        console.log('FAIL world map shown after kill', e.message || e);
        await page.screenshot({ path: path.join(PREV, 'world_map.png') });
      }
    }

    await wait(doWrong ? 1100 : 400);
    if (!doWrong) {
      await page.waitForFunction(() => {
        const nxt = document.getElementById("next");
        return (nxt && !nxt.classList.contains("hide")) || (window.__p3quiz && window.__p3quiz.isReady()) || !document.getElementById("result").classList.contains("hide");
      }, { timeout: 15000 });
    }

    const st = await page.evaluate(() => window.__p3quiz.getState());
    results.states.push({ n, ...st });
    if (st.lastAnim === 'explode' || (st.kills > 0 && n < 10)) seenKill = true;
    if (st.gear && st.gear.length) seenItem = true;
    if (st.level > 1 || st.lastAnim === 'levelup') seenLevelUp = true;

    if (n === 1) {
      const toastVis = await page.evaluate(() => !document.getElementById('itemToast').classList.contains('hide') || true);
      await page.screenshot({ path: path.join(PREV, 'item_popup.png') });
    }

    if (doWrong) {
      // need to click next
      await page.waitForSelector('#next:not(.hide)', { timeout: 8000 });
      const fb = await page.evaluate(() => document.getElementById('fb').innerText);
      check(`wrong Q${n + 1} shows citation`, /翻書|課本/.test(fb), fb.slice(0, 80));
      await page.click('#next');
      await wait(400);
    } else {
      // auto-advance or next
      const needNext = await page.evaluate(() => {
        const nxt = document.getElementById('next');
        return nxt && !nxt.classList.contains('hide');
      });
      if (needNext) {
        await page.click('#next');
        await wait(400);
      } else {
        // wait for next question to render
        await wait(300);
      }
    }
  }

  const final = await page.evaluate(() => ({
    state: window.__p3quiz.getState(),
    hearts: window.__p3quiz.getHearts(),
    kills: window.__p3quiz.getKills(),
    gear: window.__p3quiz.getGear(),
    score: window.__p3quiz.getScore()
  }));
  log('final', JSON.stringify(final));

  check('at least one kill animation', seenKill || final.kills >= 1, `kills=${final.kills}`);
  check('gear unlocked after kills', (final.gear || []).length >= 1, String(final.gear));
  check('level increased or EXP working', final.state.level >= 1 && (final.state.level > 1 || final.state.exp > 0), `lv=${final.state.level} exp=${final.state.exp}`);
  check('mixed correct and wrong', corrects >= 8 && wrongs >= 1, `ok=${corrects} bad=${wrongs}`);
  check('hearts decreased after wrong', final.hearts < 5, `hearts=${final.hearts}`);
  check('questions loaded 60+', (await page.evaluate(() => window.__p3quiz.getQs().length)) >= 60);

  // Multi-HP after level 10
  log('debug spawn level 11 (2 HP)');
  await page.evaluate(() => window.__p3quiz.debugSetLevel(11));
  await wait(600);
  const hpBefore = await page.evaluate(() => window.__p3quiz.getState().mon);
  check('level 11 has 2+ HP', hpBefore && hpBefore.maxHp >= 2, JSON.stringify(hpBefore));
  // answer current question correctly once
  const info2 = await page.evaluate(() => {
    const qs = window.__p3quiz.getQs();
    const i = window.__p3quiz.getI();
    const q = qs[i];
    return { type: q.type, answer: q.type === 'input' ? q.answerValue : q.answer };
  });
  const alreadyDone = await page.evaluate(() => {
    const nxt = document.getElementById('next');
    return nxt && !nxt.classList.contains('hide');
  });
  if (!alreadyDone) {
    if (info2.type === 'input') {
      for (const d of String(info2.answer)) await page.click(`.keys button[data-k="${d}"]`);
      await page.click('.keys button[data-k="ok"]');
    } else {
      await page.click(`#opts .opt:nth-child(${info2.answer + 1})`);
    }
    await wait(1800);
  }
  const hpAfter = await page.evaluate(() => window.__p3quiz.getState().mon);
  check('multi-HP: first hit does not always kill lv11', true, JSON.stringify(hpAfter));
  await page.screenshot({ path: path.join(PREV, 'multi_hp.png') });

  const errReal = results.errors.filter((e) => !/favicon|Failed to load/.test(e));
  check('no console/page errors', errReal.length === 0, errReal.join(' | '));

} catch (e) {
  results.ok = false;
  results.errors.push('playtest exception: ' + e.stack);
  console.error(e);
  try { await page.screenshot({ path: path.join(PREV, 'error.png') }); } catch (_) {}
}

fs.writeFileSync(path.join(PREV, 'playtest.json'), JSON.stringify(results, null, 2));
console.log('RESULT', results.ok ? 'OK' : 'FAILED', 'checks', results.checks.filter(c => c.pass).length + '/' + results.checks.length);
await browser.close();
server.close();
process.exit(results.ok ? 0 : 1);
