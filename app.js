(function () {
  const $ = (id) => document.getElementById(id);
  const LESSON = { 3: "應對青春期的生理變化", 4: "應對青春期的心理變化", 6: "瞭解自己和面對挑戰", 7: "理財有方" };

  let all = [];
  let qs = [];
  let i = 0;
  let sc = 0;
  let st = {};
  let done = false;
  let busy = false;
  let typed = "";

  function show(id) {
    ["home", "battle", "result"].forEach((s) => {
      const el = $(s);
      if (el) el.classList.toggle("hide", s !== id);
    });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  }

  function normNum(s) {
    return String(s || "").replace(/[\s,，]/g, "");
  }

  function syncHearts() {
    const box = $("hearts");
    if (!box) return;
    box.innerHTML = "";
    for (let n = 0; n < Battle.maxHearts; n++) {
      const s = document.createElement("span");
      s.className = "h" + (n < Battle.hearts ? " on" : "");
      s.textContent = "♥";
      box.appendChild(s);
    }
  }

  function syncHUD() {
    $("prog").textContent = `${i + 1}/${qs.length}`;
    $("score").textContent = String(sc + (Battle.score || 0) - (Battle._scoreShownOffset || 0));
    // show quiz correct + battle loot score: keep simple
    $("score").textContent = String(sc);
    $("fill").style.width = ((i / Math.max(1, qs.length)) * 100) + "%";
    $("lvLab").textContent = "Lv." + (Battle.hero ? Battle.hero.level : 1);
    Battle.syncExpHUD();
    syncHearts();
  }

  function render() {
    const q = qs[i];
    done = false;
    typed = "";
    syncHUD();
    $("src").textContent = "📖 " + (q.source || "");
    $("q").textContent = q.q;
    $("fb").classList.add("hide");
    $("fb").innerHTML = "";
    $("next").classList.add("hide");
    $("opts").classList.remove("dim", "hide");
    $("keypad").classList.add("hide");

    if (q.type === "input") {
      $("opts").classList.add("hide");
      $("keypad").classList.remove("hide");
      $("typed").textContent = "　";
      $("keypad").querySelectorAll("button").forEach((b) => { b.disabled = false; });
    } else {
      const box = $("opts");
      box.innerHTML = "";
      (q.options || []).forEach((t, k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opt";
        b.innerHTML = `<b>${k + 1}</b>`;
        b.append(document.createTextNode(t));
        b.onclick = () => pick(k);
        box.appendChild(b);
      });
    }
  }

  function markStats(q, ok) {
    const s = st[q.lesson] || (st[q.lesson] = [0, 0]);
    s[1]++;
    if (ok) { sc++; s[0]++; }
  }

  function ansText(q) {
    if (q.type === "input") return q.answerValue;
    return q.options[q.answer];
  }

  function showFb(ok, q) {
    $("fb").innerHTML =
      (ok ? "✅ 答對了！" : "❌ 答錯了！正確係：" + ansText(q)) +
      "<br>💡 " + (q.explain || "") +
      `<span class="book">📚 翻書：${q.source || ""}</span>`;
    $("fb").classList.remove("hide");
  }

  async function afterCorrect(q) {
    showFb(true, q);
    $("opts").classList.add("dim");
    const res = await Battle.playCorrect();
    syncHUD();
    if (res.killed) {
      // next monster if more questions remain — spawn after advancing
    }
    $("fill").style.width = (((i + 1) / qs.length) * 100) + "%";
    if (i + 1 < qs.length) {
      await wait(200);
      nextAuto();
    } else {
      $("next").textContent = "看結果 🏆";
      $("next").classList.remove("hide");
      done = true;
      busy = false;
    }
  }

  async function afterWrong(q, pickedEl) {
    showFb(false, q);
    if (q.type !== "input") {
      const bs = $("opts").children;
      if (bs[q.answer]) bs[q.answer].classList.add("ok");
      if (pickedEl) pickedEl.classList.add("bad");
      [...bs].forEach((b) => { b.disabled = true; });
    } else {
      $("keypad").querySelectorAll("button").forEach((b) => { b.disabled = true; });
    }
    await Battle.playWrong();
    syncHUD();
    $("fill").style.width = (((i + 1) / qs.length) * 100) + "%";
    $("next").textContent = i + 1 < qs.length ? "下一題 ➜" : "看結果 🏆";
    $("next").classList.remove("hide");
    done = true;
    busy = false;
  }

  async function pick(k) {
    if (done || busy) return;
    const q = qs[i];
    if (q.type === "input") return;
    done = true;
    busy = true;
    const ok = k === q.answer;
    const bs = $("opts").children;
    [...bs].forEach((b) => { b.disabled = true; });
    if (ok) bs[k].classList.add("ok");
    markStats(q, ok);
    if (ok) await afterCorrect(q);
    else await afterWrong(q, bs[k]);
  }

  async function submitInput() {
    if (done || busy) return;
    const q = qs[i];
    if (q.type !== "input") return;
    if (!typed) return;
    done = true;
    busy = true;
    const ok = normNum(typed) === normNum(q.answerValue);
    markStats(q, ok);
    $("keypad").querySelectorAll("button").forEach((b) => { b.disabled = true; });
    if (ok) await afterCorrect(q);
    else await afterWrong(q, null);
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function nextAuto() {
    const needMap = !!(Battle.mon && Battle.mon.dead);
    const fromLv = Battle.monLevel || 1;
    i++;
    done = false;
    if (i >= qs.length) { busy = false; result(); return; }
    if (needMap) {
      busy = true;
      try { await Battle.playMapTravel(fromLv, fromLv + 1); } catch (e) { console.error(e); }
      Battle.spawnMonster(fromLv + 1);
      busy = false;
    } else if (!Battle.mon || Battle.mon.dead) {
      Battle.spawnMonster((Battle.monLevel || 0) + 1);
    }
    render();
  }

  function next() {
    if (busy) return;
    if (!done) return;
    if (i + 1 >= qs.length) { result(); return; }
    nextAuto();
  }

  function result() {
    if (window.AudioCtl) AudioCtl.onQuizEnd();
    show("result");
    const r = sc / Math.max(1, qs.length);
    const n = r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.4 ? 1 : 0;
    $("resultTitle").textContent = "挑戰完成！";
    $("stars").textContent = "★".repeat(n) + "☆".repeat(3 - n);
    $("final").textContent =
      `答對 ${sc} / ${qs.length} 題（${Math.round(r * 100)}%）　英雄 Lv.${Battle.hero.level}　擊殺 ${Battle.kills} 隻` +
      ["　繼續努力！", "　不錯！", "　很好！", "　太棒了！"][n];
    $("gearGot").innerHTML = Battle.owned.map((it) => `<span>${it.name}</span>`).join("");
    $("per").innerHTML = Object.keys(st).sort().map((l) =>
      `<div><span>第${l}課 ${LESSON[l] || ""}</span><span>${st[l][0]} / ${st[l][1]}</span></div>`
    ).join("");
  }

  async function start() {
    qs = shuffle(all);
    { const cnt = [0, 0, 0, 0, 0, 0];
      qs = qs.map((q) => {
        if (q.type === "input" || !q.options || q.options.length < 2) return q;
        const n = q.options.length;
        let min = Infinity, cand = [];
        for (let p = 0; p < n; p++) { if (cnt[p] < min) { min = cnt[p]; cand = [p]; } else if (cnt[p] === min) cand.push(p); }
        const pos = cand[Math.floor(Math.random() * cand.length)]; cnt[pos]++;
        const wrong = shuffle(q.options.filter((_, k) => k !== q.answer));
        const opts = wrong.slice(); opts.splice(pos, 0, q.options[q.answer]);
        return Object.assign({}, q, { options: opts, answer: pos });
      }); }
    i = 0; sc = 0; st = {}; done = false; busy = false; typed = "";
    show("battle");
    Battle.init($("cv"));
    Battle.reset();
    Battle.spawnMonster(1);
    syncHUD();
    if (window.AudioCtl) await AudioCtl.onQuizStart();
    render();
  }

  function onKey(k) {
    if (k === "back") typed = typed.slice(0, -1);
    else if (k === "ok") { submitInput(); return; }
    else if (typed.length < 8) typed += k;
    $("typed").textContent = typed || "　";
  }

  $("startBtn").onclick = start;
  $("next").onclick = next;
  $("homeBtn").onclick = () => { if (window.AudioCtl) AudioCtl.onQuizEnd(); show("home"); };
  $("again").onclick = start;
  $("home2").onclick = () => show("home");
  $("keypad").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled || done || busy) return;
    onKey(b.dataset.k);
  });

  document.addEventListener("keydown", (e) => {
    if ($("battle").classList.contains("hide")) return;
    if (busy) return;
    const q = qs[i];
    if (!q) return;
    if (q.type === "input" && !done) {
      if (e.key >= "0" && e.key <= "9") onKey(e.key);
      else if (e.key === "Backspace") onKey("back");
      else if (e.key === "Enter") onKey("ok");
      return;
    }
    if (!done && e.key >= "1" && e.key <= "4" && q.options && +e.key <= q.options.length) pick(+e.key - 1);
    else if (done && (e.key === "Enter" || e.key === " ")) next();
  });

  window.__p3quiz = {
    getQs: () => qs,
    getI: () => i,
    getScore: () => sc,
    getHearts: () => Battle.hearts,
    getState: () => Battle.getState(),
    getGear: () => Battle.owned.map((x) => x.name),
    getKills: () => Battle.kills,
    isReady: () => {
      const nxt = document.getElementById('next');
      const keypad = document.getElementById('keypad');
      const opt = document.querySelector('#opts .opt');
      const inputOn = keypad && !keypad.classList.contains('hide');
      const optsReady = opt && !opt.disabled && !document.getElementById('opts').classList.contains('hide');
      return !busy && !done && nxt.classList.contains('hide') && (optsReady || inputOn);
    },
    pick,
    submitInput,
    start,
    next,
    debugSetLevel(n) { Battle.spawnMonster(n); }
  };

  fetch("questions.json?v=20261111v3b")
    .then((r) => r.json())
    .then((data) => {
      all = data;
      const note = $("placeNote");
      if (note && data.some((q) => q.placeholder)) note.classList.remove("hide");
      else if (note) note.classList.add("hide");
    })
    .catch((e) => { console.error(e); });

  (function initAudio() {
    if (!window.AudioCtl) return;
    AudioCtl.syncMuteBtn();
    const muteBtn = $("muteBtn");
    if (muteBtn) {
      muteBtn.onclick = (e) => {
        e.stopPropagation();
        AudioCtl.toggleMute();
        AudioCtl.ensure().then(() => {
          if (!AudioCtl.muted && !AudioCtl.welcomePlayed) AudioCtl.playWelcome();
        });
      };
    }
    let unlockedOnce = false;
    const unlock = () => {
      if (unlockedOnce) return;
      unlockedOnce = true;
      AudioCtl.unlockAndWelcome();
    };
    AudioCtl.ensure().then((ok) => {
      if (ok && !AudioCtl.muted) AudioCtl.playWelcome();
    }).catch(() => {});
    ["pointerdown", "touchstart", "keydown", "click"].forEach((ev) => {
      document.addEventListener(ev, unlock, { once: true, passive: true });
    });
  })();

  function paintHome() {
    const c = $("homeHero");
    if (c && window.Battle) Battle.drawHomePreview(c);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintHome);
  else paintHome();
})();
