/* v3 original 2D pixel battle engine — detailed sprites, parallax stages, juicy combat, world map */
(function (global) {
  let W = 320;
  const H = 180;
  const GROUND = 150;
  const VY = 26, VH = 144; // visible window of the 180px-tall world (zoomed camera)
  const S = global.Sprites, SC = global.Scenes;
  const px = SC.px;

  const ITEMS = [
    { id: "wood_sword", name: "木劍", slot: "weapon", kind: "wood" },
    { id: "leather_cap", name: "皮帽", slot: "head", kind: "leather" },
    { id: "wood_shield", name: "木盾", slot: "shield", kind: "wood" },
    { id: "leather_boots", name: "皮靴", slot: "boots", kind: "leather" },
    { id: "iron_sword", name: "鐵劍", slot: "weapon", kind: "iron" },
    { id: "iron_armour", name: "鐵甲", slot: "body", kind: "iron" },
    { id: "iron_helm", name: "鐵盔", slot: "head", kind: "iron" },
    { id: "iron_shield", name: "鐵盾", slot: "shield", kind: "iron" },
    { id: "fire_sword", name: "炎劍", slot: "weapon", kind: "fire" },
    { id: "staff", name: "法杖", slot: "weapon", kind: "staff" },
    { id: "steel_boots", name: "鋼靴", slot: "boots", kind: "steel" },
    { id: "knight_armour", name: "騎士甲", slot: "body", kind: "knight" },
    { id: "thunder_blade", name: "雷刃", slot: "weapon", kind: "thunder" },
    { id: "cape", name: "魔法斗篷", slot: "cape", kind: "magic" },
    { id: "dragon_shield", name: "龍盾", slot: "shield", kind: "dragon" },
    { id: "crystal_boots", name: "水晶靴", slot: "boots", kind: "crystal" },
    { id: "flame_armour", name: "炎甲", slot: "body", kind: "flame" },
    { id: "hero_crown", name: "英雄冠", slot: "head", kind: "crown" }
  ];

  function itemForKill(kills) {
    if (kills <= 0) return null;
    if (kills <= 10) return ITEMS[kills - 1] || null;
    if ((kills - 10) % 2 === 0) {
      const i = 10 + (kills - 10) / 2 - 1;
      return ITEMS[i] || null;
    }
    return null;
  }

  function monsterHP(level) {
    if (level <= 10) return 1;
    if (level <= 19) return 2;
    if (level === 20) return 3;
    if (level <= 29) return 3;
    if (level === 30) return 4;
    if (level <= 39) return 3;
    if (level === 40) return 5;
    if (level <= 49) return 4;
    if (level === 50) return 5;
    if (level <= 59) return 4;
    return 6;
  }

  function isBoss(level) { return level >= 10 && level % 10 === 0; }
  function stageFor(level) {
    if (level <= 10) return "forest";
    if (level <= 25) return "cave";
    if (level <= 40) return "lava";
    return "castle";
  }
  function monKind(level, boss) {
    if (boss) {
      if (level <= 10) return "ogre";
      if (level <= 20) return "kingSlime";
      if (level <= 30) return "fireOgre";
      if (level <= 40) return "dragon";
      if (level <= 50) return "darkKnight";
      return "dragon";
    }
    const kinds = ["slime", "bat", "spike", "imp", "wolf", "ghost", "beetle", "imp"];
    return kinds[(level - 1) % kinds.length];
  }
  function palFor(kind) {
    const p = S.PAL[kind] || S.PAL.slime;
    return [p.o, p.d, p.m, p.l, p.h || p.l];
  }
  const FLYERS = { bat: 16, ghost: 10 };

  function gearOf(owned) {
    const g = { weapon: "none", head: "none", shield: "none", boots: "none", body: "none", cape: "none" };
    owned.forEach((it) => { g[it.slot] = it.kind; });
    return g;
  }
  const SLEEVE = { none: ["#3a78c8", "#1e4a8a"], iron: ["#9aa6b8", "#5a6474"], knight: ["#6a7290", "#3a3f5a"], flame: ["#d0401c", "#7a1a0a"] };
  const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);

  function pixelRing(ctx, cx, cy, r, col, th) {
    const n = Math.max(12, Math.round(r * 5));
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), th || 1, th || 1);
    }
  }
  function shadow(ctx, x, y, w, a) {
    ctx.globalAlpha = a;
    px(ctx, x - w / 2 + 2, y - 1, w - 4, 3, "#000");
    px(ctx, x - w / 2, y, w, 1, "#000");
    ctx.globalAlpha = 1;
  }

  /* ---------- hero ---------- */
  // pose: 0 idle, 1 windup, 2 slash, 3 hurt ; opts {legs, wAng, glow, flashWhite}
  function drawHero(ctx, x, y, gear, t, o) {
    o = o || {};
    const hx = Math.round(x), hy = Math.round(y);
    const breath = o.legs === "idle" && Math.floor(t / 420) % 2 === 1 ? 1 : 0;
    const blinkOn = (t % 3600) < 130;
    const body = S.heroBody(gear, o.legs || "idle", breath, blinkOn);
    const ox = hx - 10, oy = hy - 28;
    if (!o.noShadow) shadow(ctx, hx, hy, 18, 0.35);
    // cape behind
    if (gear.cape === "magic") {
      const sway = Math.round(Math.sin(t * 0.006) * 2 + (o.legs && o.legs !== "idle" ? -2 : 0));
      const cp = S.capeSprite(Math.max(-3, Math.min(3, sway)));
      ctx.drawImage(cp.c, ox + 1, oy + 15 + breath);
    }
    // back arm
    px(ctx, ox + 4, oy + 18 + breath, 4, 6, "#140c12");
    px(ctx, ox + 5, oy + 19 + breath, 2, 3, (SLEEVE[gear.body] || SLEEVE.none)[1]);
    px(ctx, ox + 5, oy + 22 + breath, 2, 1, "#e0a07a");
    ctx.drawImage(body.c, ox, oy);
    // shield
    if (gear.shield !== "none") {
      const sh = S.shieldSprite(gear.shield);
      const sx = o.pose === 1 ? 2 : o.pose === 2 ? 4 : 1;
      ctx.drawImage(sh.c, ox + sx - 1, oy + 15 + breath);
    }
    // front arm + weapon
    const shX = ox + 12, shY = oy + 18 + breath;
    const wAng = o.wAng !== undefined ? o.wAng : 0.5;
    const armA = wAng * 0.6 + 1.2;
    const hdX = Math.round(shX + Math.sin(armA) * 5), hdY = Math.round(shY - Math.cos(armA) * 5);
    const sl = SLEEVE[gear.body] || SLEEVE.none;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const ax = Math.round(shX + (hdX - shX) * i / steps), ay = Math.round(shY + (hdY - shY) * i / steps);
      px(ctx, ax - 2, ay - 2, 4, 4, "#140c12");
    }
    for (let i = 0; i <= steps; i++) {
      const ax = Math.round(shX + (hdX - shX) * i / steps), ay = Math.round(shY + (hdY - shY) * i / steps);
      px(ctx, ax - 1, ay - 1, 2, 2, i < 3 ? sl[0] : "#ffd2a8");
    }
    let tip = null;
    const wp = gear.weapon !== "none" ? S.weaponSprite(gear.weapon) : null;
    if (wp) {
      ctx.save();
      ctx.translate(hdX, hdY);
      ctx.rotate(wAng);
      ctx.drawImage(wp.c, -Math.round(wp.gripX), -Math.round(wp.gripY));
      ctx.restore();
      const L = wp.gripY;
      tip = { x: hdX + Math.sin(wAng) * L, y: hdY - Math.cos(wAng) * L, gx: hdX, gy: hdY, col: wp.trail, fx: wp.fx };
    }
    px(ctx, hdX - 2, hdY - 2, 4, 4, "#140c12");
    px(ctx, hdX - 1, hdY - 1, 2, 2, "#ffd2a8");
    if (o.glow > 0 || o.flashWhite) {
      ctx.save();
      ctx.globalAlpha = o.flashWhite ? 0.85 : 0.18 + 0.14 * Math.sin(t * 0.03);
      ctx.drawImage(body.white, ox, oy);
      ctx.restore();
    }
    return tip;
  }

  /* ---------- item icons ---------- */
  function drawItemIcon(canvas, item) {
    const c = canvas.getContext("2d");
    const s = canvas.width;
    c.imageSmoothingEnabled = false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, s, s);
    const k = Math.max(1, Math.floor(s / 24));
    c.setTransform(k, 0, 0, k, 0, 0);
    px(c, 0, 0, 24, 24, "#1b1210");
    c.globalAlpha = 0.5;
    SC.disk(c, 12, 12, 10, "#5a3a10");
    SC.disk(c, 12, 12, 7, "#8a5a18");
    c.globalAlpha = 1;
    if (item) {
      const sp = S.iconSprite(item);
      if (sp) {
        if (item.slot === "weapon") {
          c.save();
          c.translate(12, 12);
          c.rotate(Math.PI / 4);
          c.drawImage(sp.c, -Math.round(sp.w / 2), -Math.round(sp.h / 2));
          c.restore();
        } else c.drawImage(sp.c, Math.round(12 - sp.w / 2), Math.round(12 - sp.h / 2));
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- Battle object ---------- */
  const Battle = {
    canvas: null, ctx: null, buf: null, bctx: null,
    running: false, t: 0, gt: 0, lastNow: 0, k: 1,
    state: "idle", pose: 0,
    shake: { x: 0, y: 0, mag: 0 },
    hitStop: 0,
    particles: [], floats: [], slashes: [], amb: [], dust: [], rings: [],
    hearts: 5, maxHearts: 5, score: 0, kills: 0, owned: [],
    monLevel: 0, mon: null,
    heroX: 78, heroY: GROUND, hx: 78,
    heroMode: "idle", wAng: 0.5, trail: [],
    lastAnim: "", lastItem: null, lastKillAt: 0,
    mapOn: false,
    hero: { level: 1, exp: 0, expToNext: 20, atk: 1 },
    glowT: 0, hurtT: 0, lvFxT: 0, bossIntroT: 0, gearFxT: 0,
    toastTimer: 0, texts: [],
    _raf: 0, _resolvers: [],

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      if (!this.buf) {
        this.buf = document.createElement("canvas");
        this.buf.width = W; this.buf.height = H;
        this.bctx = this.buf.getContext("2d");
      }
      this.layout(true);
      if (!this._ro && global.ResizeObserver) {
        const st = document.getElementById("stage");
        if (st) { this._ro = new ResizeObserver(() => this.layout()); this._ro.observe(st); }
      }
      if (!this._onResize) { this._onResize = () => this.layout(); global.addEventListener("resize", this._onResize); }
      if (!this.running) {
        this.running = true;
        const loop = (now) => {
          this._raf = requestAnimationFrame(loop);
          this.step(now);
        };
        this._raf = requestAnimationFrame(loop);
      }
    },

    layout(force) {
      if (!this.canvas) return;
      const st = document.getElementById("stage") || this.canvas;
      const r = st.getBoundingClientRect();
      if (r.width < 20 || r.height < 20) return;
      const dpr = Math.min(3, global.devicePixelRatio || 1);
      let w = Math.round((VH * r.width) / r.height);
      w = Math.max(200, Math.min(400, w));
      w -= w % 2;
      const k = Math.max(1, Math.round((Math.min(r.height, (r.width * VH) / w) * dpr) / VH));
      if (force || w !== W || k !== this.k || this.canvas.width !== w * k) {
        W = w; this.k = k;
        this.buf.width = W; this.buf.height = H;
        this.bctx = this.buf.getContext("2d");
        this.bctx.imageSmoothingEnabled = false;
        this.canvas.width = W * k; this.canvas.height = VH * k;
        this.ctx.imageSmoothingEnabled = false;
      }
      const home = Math.round(W * 0.24);
      if (this.hx === this.heroX || force) this.hx = home;
      this.heroX = home;
      if (this.mon) {
        const tx = Math.round(W * 0.72);
        if (!this.mon.entering && this.state !== "monAttack" && this.state !== "attack") this.mon.x = tx;
        this.mon.tx = tx;
      }
    },

    reset() {
      this.hearts = 5; this.maxHearts = 5; this.score = 0; this.kills = 0;
      this.owned = []; this.monLevel = 0; this.mon = null;
      this.state = "idle"; this.pose = 0;
      this.particles = []; this.floats = []; this.slashes = []; this.dust = []; this.rings = []; this.trail = [];
      this.shake.mag = 0; this.hitStop = 0;
      this.hero = { level: 1, exp: 0, expToNext: 20, atk: 1 };
      this.glowT = 0; this.hurtT = 0; this.lvFxT = 0; this.bossIntroT = 0; this.gearFxT = 0;
      this.heroMode = "idle"; this.hx = this.heroX; this.wAng = 0.5;
      this.lastAnim = ""; this.lastItem = null;
      this.hideToast(); this.hideLvUp(); this.hideBoss();
      this._finishMap(true);
    },

    spawnMonster(level) {
      this.monLevel = level;
      const boss = isBoss(level);
      const kind = monKind(level, boss);
      const hp = monsterHP(level);
      const tx = Math.round(W * 0.72);
      this.mon = {
        level, kind, boss, hp, maxHp: hp, shownHp: hp,
        x: boss ? tx : W + 30, y: GROUND, tx,
        dropY: boss ? -90 : 0, vy: 0,
        scale: 1, flash: 0, shakeX: 0, shakeY: 0, kx: 0,
        dead: false, explodeT: 0, entering: !boss, enterP: 0, falling: boss
      };
      this.state = "monIn";
      this.lastAnim = "monIn";
      if (boss) {
        this.bossIntroT = 1700;
        this.showBoss();
        if (global.AudioCtl) AudioCtl.playBoss();
      } else this.hideBoss();
    },

    gear() { return gearOf(this.owned); },

    addExp(amount) {
      const leveled = [];
      this.hero.exp += amount;
      while (this.hero.exp >= this.hero.expToNext) {
        this.hero.exp -= this.hero.expToNext;
        this.hero.level += 1;
        this.hero.expToNext = 20 + (this.hero.level - 1) * 10;
        this.hero.atk = 1 + Math.floor((this.hero.level - 1) / 3);
        leveled.push(this.hero.level);
      }
      this.syncExpHUD();
      return leveled;
    },

    syncExpHUD() {
      const lab = document.getElementById("lvLab");
      if (lab) lab.textContent = "Lv." + this.hero.level;
      const fill = document.getElementById("expFill");
      if (fill) fill.style.width = Math.min(100, (this.hero.exp / this.hero.expToNext) * 100) + "%";
    },

    showToast(item) {
      const el = document.getElementById("itemToast");
      const name = document.getElementById("itemName");
      const icon = document.getElementById("itemIcon");
      if (!el) return;
      if (name) name.textContent = item.name;
      if (icon) drawItemIcon(icon, item);
      el.classList.remove("hide");
      this.toastTimer = 1400;
    },
    hideToast() { const el = document.getElementById("itemToast"); if (el) el.classList.add("hide"); },
    showBoss() { const el = document.getElementById("bossTag"); if (el) el.classList.remove("hide"); },
    hideBoss() { const el = document.getElementById("bossTag"); if (el) el.classList.add("hide"); },
    showLvUp(lv) {
      const el = document.getElementById("lvUp");
      const num = document.getElementById("lvUpNum");
      if (num) num.textContent = "Lv." + lv;
      if (el) el.classList.remove("hide");
    },
    hideLvUp() { const el = document.getElementById("lvUp"); if (el) el.classList.add("hide"); },

    burst(x, y, colors, n, speed, o) {
      o = o || {};
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (speed || 1.8) * 60 * (0.4 + Math.random());
        this.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up === undefined ? 70 : o.up),
          g: o.g === undefined ? 260 : o.g, life: 1, decay: 0.9 + Math.random() * 1.1,
          color: colors[i % colors.length], size: o.size || 1 + ((Math.random() * 2) | 0),
          floor: o.floor ? GROUND + Math.random() * 10 : 0
        });
      }
    },
    explodeSprite(spr, x0, y0, big, sc) {
      sc = sc || 1;
      const step = 1;
      const cx = x0 + (spr.w * sc) / 2, cy = y0 + (spr.h * sc) / 2;
      for (let i = 0; i < spr.px.length; i += step) {
        let [x, y, col] = spr.px[i];
        x *= sc; y *= sc;
        const dx = x0 + x - cx, dy = y0 + y - cy;
        const d = Math.hypot(dx, dy) || 1;
        const sp = (big ? 110 : 80) * (0.4 + Math.random());
        this.particles.push({
          x: x0 + x, y: y0 + y,
          vx: (dx / d) * sp + (Math.random() - 0.5) * 30, vy: (dy / d) * sp - 90 - Math.random() * 60,
          g: 320, life: 1, decay: 0.55 + Math.random() * 0.6, color: col, size: sc,
          floor: GROUND + Math.random() * 12
        });
      }
    },
    floatText(x, y, text, color) {
      const light = color === "#ffe566" ? "#fffbe0" : color === "#ff6b6b" ? "#ffd0d0" : "#ffffff";
      this.floats.push({ x, y, text, color, light, vy: -38, life: 1, age: 0 });
    },
    addSlash(x, y, col) { this.slashes.push({ x, y, t: 0, col: col || "#fff6c0" }); },

    _hudTarget(id) {
      const el = document.getElementById(id);
      const cr = this.canvas.getBoundingClientRect();
      if (!el || !cr.width) return { x: W - 30, y: 8 };
      const r = el.getBoundingClientRect();
      const sc = Math.min(cr.width / W, cr.height / VH);
      const ox = cr.left + (cr.width - W * sc) / 2, oy = cr.top + (cr.height - VH * sc) / 2;
      return { x: (r.left + r.width / 2 - ox) / sc, y: (r.top + r.height / 2 - oy) / sc + VY, el };
    },
    spawnPickups(x, y, coins, orbs) {
      const tc = this._hudTarget("score"), te = this._hudTarget("expFill");
      const add = (kind, tgt, i) => {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const sp = 70 + Math.random() * 70;
        this.particles.push({
          kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 300, life: 1, decay: 0,
          home: { x: tgt.x, y: tgt.y, el: tgt.el ? (kind === "coin" ? tgt.el : tgt.el.parentElement) : null, delay: 0.42 + i * 0.05 }, age: 0, ph: Math.random() * 4
        });
      };
      for (let i = 0; i < coins; i++) add("coin", tc, i);
      for (let i = 0; i < orbs; i++) add("orb", te, i);
    },
    bump(el) {
      if (!el) return;
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
    },

    /* ---------- world map ---------- */
    playMapTravel(fromLv, toLv) {
      return new Promise((resolve) => {
        if (this.mapOn) this._finishMap(true);
        this.mapOn = true;
        this.mapFrom = Math.max(1, fromLv || 1);
        this.mapTo = Math.max(this.mapFrom + 1, toLv || this.mapFrom + 1);
        this.mapT0 = performance.now();
        this.mapDur = 1500;
        this._mapResolve = resolve;
        this.lastAnim = "map";
        this.dust = [];
        const hint = document.getElementById("mapHint");
        if (hint) hint.classList.remove("hide");
        const skip = () => this._finishMap(false);
        this._mapSkip = skip;
        const el = document.getElementById("stage") || this.canvas;
        if (el) el.addEventListener("pointerdown", skip);
        this._mapTimer = setTimeout(() => this._finishMap(false), 1600);
      });
    },

    _finishMap(silent) {
      if (!this.mapOn && !this._mapResolve) return;
      this.mapOn = false;
      const hint = document.getElementById("mapHint");
      if (hint) hint.classList.add("hide");
      const el = document.getElementById("stage") || this.canvas;
      if (el && this._mapSkip) el.removeEventListener("pointerdown", this._mapSkip);
      this._mapSkip = null;
      if (this._mapTimer) { clearTimeout(this._mapTimer); this._mapTimer = null; }
      const r = this._mapResolve;
      this._mapResolve = null;
      if (!silent) this.lastAnim = "idle";
      if (r) r();
    },

    _levelT(lv) {
      const L = Math.max(1, lv);
      if (L <= 10) return ((L - 1) / 9) * 0.25;
      if (L <= 25) return 0.25 + ((L - 10) / 15) * 0.25;
      if (L <= 40) return 0.50 + ((L - 25) / 15) * 0.25;
      return 0.75 + Math.min(1, (L - 40) / 20) * 0.25;
    },

    _pathPoint(tt) {
      const pts = SC.mapPoints(W);
      const n = pts.length - 1;
      const x = Math.max(0, Math.min(0.999, tt)) * n;
      const i = Math.floor(x);
      const f = x - i;
      return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f };
    },

    drawWorldMap(ctx, now) {
      const pRaw = this.mapT0 ? Math.min(1, (now - this.mapT0) / this.mapDur) : 1;
      const p = pRaw * pRaw * (3 - 2 * pRaw);
      const t0 = this._levelT(this.mapFrom || 1);
      const t1 = this._levelT(this.mapTo || 2);
      const tt = t0 + (t1 - t0) * p;
      const pos = this._pathPoint(tt);
      const M = SC.getMap(W);
      ctx.drawImage(M.c, 0, 0);
      // water shimmer
      for (let i = 0; i < 14; i++) {
        const x = (i * 53 + now * 0.01 * (1 + (i % 3))) % W, y = i % 2 ? 12 + (i * 7) % 18 : 166 + (i * 5) % 12;
        px(ctx, x, y, 4, 1, (Math.sin(now * 0.004 + i) > 0) ? "#9ad0ff" : "#5a9ae0");
      }
      // volcano + lava glow, castle flag
      SC.drawGlow(ctx, M.vx, 46, 16, "#ff7a1a", 0.45 + 0.25 * Math.sin(now * 0.006));
      if (Math.floor(now / 140) % 3 === 0) px(ctx, M.vx - 1 + Math.sin(now) * 3, 38 - (now / 30) % 10, 2, 2, "#ffb030");
      const fw = Math.round(Math.sin(now * 0.012) * 1.5);
      px(ctx, M.kx, M.ky - 24, 1, 10, "#d8d8e8");
      px(ctx, M.kx + 1, M.ky - 24, 6 + fw, 3, "#c1121f");
      px(ctx, M.kx + 1, M.ky - 21, 5 - fw, 2, "#9b2226");
      // drifting cloud shadows
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 3; i++) SC.disk(ctx, ((now * 0.008 * (1 + i * 0.3) + i * 140) % (W + 60)) - 30, 60 + i * 34, 9 + i * 2, "#001020");
      ctx.globalAlpha = 1;
      // birds
      for (let i = 0; i < 3; i++) {
        const bx = ((now * 0.02 + i * 40) % (W + 40)) - 20, by = 22 + i * 6 + Math.sin(now * 0.004 + i) * 3;
        const f = Math.floor(now / 160 + i) % 2;
        px(ctx, bx - 2, by - f, 2, 1, "#f0f0f0"); px(ctx, bx, by, 1, 1, "#f0f0f0"); px(ctx, bx + 1, by - f, 2, 1, "#f0f0f0");
      }
      // path dots
      const pts = M.pts;
      let acc = 0;
      const total = (() => { let s = 0; for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return s; })();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let d = 0; d < len; d += 6) {
          const f = d / len;
          const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
          const gp = (acc + d) / total;
          const done = gp <= tt;
          const sweep = Math.abs(((now * 0.0004) % 1) - gp) < 0.02;
          px(ctx, x - 1, y - 1, 3, 3, "#3a2410");
          px(ctx, x, y, 2, 2, done ? (sweep ? "#ffffff" : "#ffd166") : "#f0e4c4");
        }
        acc += len;
      }
      // nodes
      const nodes = [
        { t: 0.12, name: "第3課", col: "#3fae3c" },
        { t: 0.37, name: "第4課", col: "#8a5aff" },
        { t: 0.62, name: "第6課", col: "#ff6a10" },
        { t: 0.87, name: "第7課", col: "#ffd23f" }
      ];
      const nextNode = nodes.find((n) => n.t > tt + 0.005);
      nodes.forEach((n, i) => {
        const np = this._pathPoint(n.t);
        const reached = tt >= n.t - 0.01;
        const bob = Math.round(Math.sin(now * 0.006 + i) * 1);
        px(ctx, np.x - 6, np.y - 1, 13, 4, "#140c12");
        px(ctx, np.x - 5, np.y, 11, 2, reached ? "#c8b880" : "#8a8070");
        px(ctx, np.x, np.y - 16 + bob, 1, 16 - bob, "#e8e0d0");
        const fw2 = Math.round(Math.sin(now * 0.01 + i) * 1.5);
        px(ctx, np.x + 1, np.y - 16 + bob, 7 + fw2, 5, "#140c12");
        px(ctx, np.x + 1, np.y - 15 + bob, 6 + fw2, 3, reached ? n.col : "#6a6458");
        if (reached && Math.sin(now * 0.01 + i * 2) > 0.6) { px(ctx, np.x + 4, np.y - 20 + bob, 1, 3, "#fff"); px(ctx, np.x + 3, np.y - 19 + bob, 3, 1, "#fff"); }
        if (n === nextNode) {
          const r = 6 + ((now * 0.012) % 6);
          pixelRing(ctx, np.x, np.y, r, "#ffffff");
        }
        this.texts.push({ x: np.x, y: np.y + 10, s: 8, c: reached ? "#fff8e7" : "#d8d0c0", text: n.name });
      });
      // hero walking
      const walkF = ["run0", "run1", "run2", "run1"][Math.floor(now / 90) % 4];
      if (!this._lastDust || now - this._lastDust > 140) {
        this._lastDust = now;
        if (pRaw < 1) this.dust.push({ x: pos.x - 4, y: pos.y, t: 0 });
      }
      this.dust = this.dust.filter((d) => (d.t += 0.05) < 1);
      this.dust.forEach((d) => { ctx.globalAlpha = 1 - d.t; px(ctx, d.x - d.t * 6, d.y - d.t * 4, 2 + Math.round(d.t * 2), 2, "#e8d8b0"); ctx.globalAlpha = 1; });
      drawHero(ctx, pos.x, pos.y + 2, this.gear(), now, { legs: pRaw < 1 ? walkF : "idle", wAng: 0.9 });
      // title ribbon
      const tw = 56;
      const ty = VY + 3;
      px(ctx, W / 2 - tw / 2 - 1, ty - 1, tw + 2, 14, "#140c12");
      px(ctx, W / 2 - tw / 2, ty, tw, 12, "#c8a050");
      px(ctx, W / 2 - tw / 2, ty, tw, 1, "#f0d890");
      px(ctx, W / 2 - tw / 2 - 6, ty + 3, 6, 10, "#8a6a30");
      px(ctx, W / 2 + tw / 2, ty + 3, 6, 10, "#8a6a30");
      this.texts.push({ x: W / 2, y: ty + 6.5, s: 9, c: "#3a1a08", text: "冒險地圖", noStroke: true });
      ctx.drawImage(M.vig, 0, 0);
    },

    /* ---------- combat ---------- */
    playCorrect() {
      return new Promise((resolve) => {
        if (!this.mon || this.mon.dead) {
          resolve({ killed: false, item: null, leveled: [], damage: 0 });
          return;
        }
        this.lastAnim = "attack";
        this.state = "attack";
        this.pose = 1;
        const start = performance.now();
        const fromX = this.hx;
        const target = this.mon.x - (this.mon.boss ? 62 : 30);
        let slashed = false;
        this.trail = [];
        const tick = (now) => {
          const e = now - start;
          if (e < 140) {
            this.heroMode = "dash";
            this.hx = fromX + (target - fromX) * ease(e / 140);
            this.wAng = 0.9;
            this.pose = 0;
            requestAnimationFrame(tick);
            return;
          }
          if (e < 210) {
            this.heroMode = "windup";
            this.pose = 1;
            this.hx = target;
            this.wAng = 0.9 + (-2.2 - 0.9) * ease((e - 140) / 70);
            requestAnimationFrame(tick);
            return;
          }
          if (e < 290) {
            this.heroMode = "slash";
            this.pose = 2;
            if (!slashed) {
              slashed = true;
              if (global.AudioCtl) AudioCtl.playSlash();
            }
            this.wAng = -2.2 + (2.3 + 2.2) * ease((e - 210) / 80);
            requestAnimationFrame(tick);
            return;
          }
          // hit
          this.wAng = 2.3;
          const g = this.gear();
          const wp = g.weapon !== "none" ? S.weaponSprite(g.weapon) : null;
          this.addSlash(this.mon.x - (this.mon.boss ? 26 : 6), this.mon.y - (this.mon.boss ? 30 : 18), wp ? wp.trail : "#fff6c0");
          this.hitStop = this.mon.boss ? 110 : 85;
          this.shake.mag = this.mon.boss ? 6 : 4;
          this.mon.flash = 160;
          this.mon.kx = 7;
          if (global.AudioCtl) AudioCtl.playHit();
          const dmg = this.monLevel <= 10 ? this.mon.hp : Math.max(1, this.hero.atk);
          this.mon.hp = Math.max(0, this.mon.hp - dmg);
          this.floatText(this.mon.x, this.mon.y - (this.mon.boss ? 62 : 40), "-" + dmg, "#ffe566");
          const hitCols = wp && wp.fx === "fire" ? ["#ffd23f", "#ff6a10", "#fff"] : wp && wp.fx === "spark" ? ["#9ae8ff", "#fff", "#3a9ae0"] : wp && wp.fx === "magic" ? ["#c9a8ff", "#fff", "#7a3dff"] : ["#fff6c0", "#ffffff", "#ffd166"];
          this.burst(this.mon.x - 8, this.mon.y - 18, hitCols, 16, 2.4, { up: 30, g: 120 });
          this.rings.push({ x: this.mon.x - 8, y: this.mon.y - 18, t: 0, col: "#ffffff", max: 16 });
          this.lastAnim = "hit";
          setTimeout(() => { this.heroMode = "return"; }, 140);

          const finishHit = async () => {
            if (this.mon.hp <= 0) {
              await this._killAndRewards();
              resolve({ killed: true, item: this.lastItem, leveled: this._lastLeveled || [], damage: dmg, hp: 0, maxHp: this.mon.maxHp });
            } else {
              this.state = "idle";
              this.pose = 0;
              this.lastAnim = "idle";
              const gained = this.addExp(10);
              this.spawnPickups(this.mon.x, this.mon.y - 20, 0, 3);
              this._lastLeveled = gained;
              if (gained.length) await this._levelUpAnim(gained[gained.length - 1]);
              resolve({ killed: false, item: null, leveled: gained, damage: dmg, hp: this.mon.hp, maxHp: this.mon.maxHp });
            }
          };
          setTimeout(finishHit, 220);
        };
        requestAnimationFrame(tick);
      });
    },

    async _killAndRewards() {
      this.mon.dead = true;
      this.mon.explodeT = 0;
      this.state = "explode";
      this.lastAnim = "explode";
      this.lastKillAt = performance.now();
      const fr = this._monSprite(this.mon, this.gt);
      if (fr) this.explodeSprite(fr.spr, fr.x, fr.y, this.mon.boss, fr.sc);
      const cols = palFor(this.mon.kind).slice(1);
      this.burst(this.mon.x, this.mon.y - 16, cols.concat("#ffe566", "#fff"), this.mon.boss ? 30 : 16, 2.6);
      this.rings.push({ x: this.mon.x, y: this.mon.y - 14, t: 0, col: "#fff6c0", max: this.mon.boss ? 46 : 30 });
      this.rings.push({ x: this.mon.x, y: this.mon.y - 14, t: -0.15, col: "#ffd166", max: this.mon.boss ? 34 : 22 });
      this.flashT = 120;
      this.shake.mag = this.mon.boss ? 9 : 5;
      if (global.AudioCtl) AudioCtl.playExplode();
      const pts = this.mon.boss ? 30 : 10;
      this.score += pts;
      this.floatText(this.mon.x + 16, this.mon.y - (this.mon.boss ? 84 : 62), "+" + pts, "#ffd166");
      this.spawnPickups(this.mon.x, this.mon.y - 16, this.mon.boss ? 14 : 6, this.mon.boss ? 8 : 4);
      if (global.AudioCtl) setTimeout(() => AudioCtl.playCoin(), 120);
      this.kills += 1;
      const item = itemForKill(this.kills);
      this.lastItem = item;
      if (item) {
        this.owned = this.owned.filter((o) => o.slot !== item.slot);
        this.owned.push(item);
        setTimeout(() => {
          this.showToast(item);
          this.gearFxT = 700;
          this.burst(this.hx, this.heroY - 16, ["#ffd166", "#fff", "#ffe08a"], 22, 1.6, { up: 40, g: 40 });
          this.rings.push({ x: this.hx, y: this.heroY - 14, t: 0, col: "#ffd166", max: 22 });
          if (global.AudioCtl) AudioCtl.playLevelUp();
        }, 280);
      }
      const exp = 10 + 10 + (this.mon.boss ? 20 : 0);
      const gained = this.addExp(exp);
      this._lastLeveled = gained;
      await this._wait(700);
      this.pose = 0;
      this.state = "idle";
      if (gained.length) await this._levelUpAnim(gained[gained.length - 1]);
      await this._wait(item ? 500 : 200);
      this.hideToast();
    },

    _levelUpAnim(lv) {
      return new Promise((resolve) => {
        this.lastAnim = "levelup";
        this.glowT = 900;
        this.lvFxT = 1000;
        this.showLvUp(lv);
        this.burst(this.hx, this.heroY - 24, ["#ffd166", "#fff", "#ffe08a", "#ff6a00"], 36, 2.4);
        for (let i = 0; i < 3; i++) this.rings.push({ x: this.hx, y: this.heroY - 14, t: -i * 0.18, col: i % 2 ? "#ffffff" : "#ffd166", max: 34 + i * 6 });
        if (global.AudioCtl) AudioCtl.playLevelUp();
        setTimeout(() => { this.hideLvUp(); resolve(); }, 900);
      });
    },

    playWrong() {
      return new Promise((resolve) => {
        if (!this.mon || this.mon.dead) { resolve({ heartsLost: 0 }); return; }
        this.lastAnim = "monAttack";
        this.state = "monAttack";
        const from = this.mon.x;
        const to = this.heroX + (this.mon.boss ? 56 : 30);
        const start = performance.now();
        const dmg = (this.mon.boss || this.monLevel >= 30) ? 2 : 1;
        const tick = (now) => {
          const e = now - start;
          if (e < 280) {
            const f = e / 280;
            this.mon.x = from - (from - to) * (f < 0.3 ? -f * 0.3 : ease((f - 0.3) / 0.7));
            this.mon.lunge = Math.sin(f * Math.PI) * 8;
            requestAnimationFrame(tick);
            return;
          }
          this.mon.lunge = 0;
          this.pose = 3;
          this.heroMode = "hurt";
          this.hurtT = 420;
          this.shake.mag = 5;
          this.hitStop = 70;
          this.redT = 300;
          if (global.AudioCtl) AudioCtl.playHurt();
          this.hearts = Math.max(0, this.hearts - dmg);
          this.floatText(this.heroX, this.heroY - 40, "-" + dmg, "#ff6b6b");
          this.slashes.push({ x: this.heroX + 2, y: this.heroY - 16, t: 0, col: "#ff4a4a", claw: true });
          this.burst(this.heroX + 4, this.heroY - 16, ["#ff4a4a", "#ffffff", "#ffb0b0"], 12, 1.8, { up: 30 });
          const backStart = performance.now();
          const back = (n2) => {
            const e2 = n2 - backStart;
            if (e2 < 280) {
              this.mon.x = to + (from - to) * ease(e2 / 280);
              requestAnimationFrame(back);
              return;
            }
            this.mon.x = from;
            this.pose = 0;
            this.heroMode = "idle";
            this.state = "idle";
            this.lastAnim = "idle";
            resolve({ heartsLost: dmg });
          };
          setTimeout(() => requestAnimationFrame(back), 180);
        };
        requestAnimationFrame(tick);
      });
    },

    _wait(ms) { return new Promise((r) => setTimeout(r, ms)); },

    _monSprite(mon, gt) {
      const F = S.monFrames(mon.kind);
      let idx;
      if (mon.kind === "bat") idx = Math.floor(gt / 90) % 4;
      else if (mon.kind === "ghost") idx = Math.floor(gt / 320) % 2;
      else idx = [0, 0, 1, 1][Math.floor(gt / 230) % 4];
      const bl = !F.wingFrames && ((gt + mon.level * 777) % 3400) < 140;
      const spr = (bl ? F.blink : F.frames)[idx] || F.frames[0];
      const sc = mon.boss ? 2 : 1;
      const sw = spr.w * sc, sh = spr.h * sc;
      const fly = FLYERS[mon.kind] || 0;
      const bob = fly ? Math.round(Math.sin(gt * 0.005 + mon.level) * 3) : 0;
      const hop = mon.entering ? -Math.round(Math.abs(Math.sin(mon.enterP * Math.PI * 3)) * 6) : 0;
      const x = Math.round(mon.x + mon.shakeX + (mon.kx || 0) - (mon.lunge || 0) - sw / 2);
      const y = Math.round(mon.y + (mon.dropY || 0) - sh - fly + bob + hop + sc);
      return { spr, x, y, F, fly, sc, sw, sh };
    },

    drawMonster(ctx, mon, gt) {
      if (mon.dead) return;
      const r = this._monSprite(mon, gt);
      const { spr, x, y, F, sc, sw, sh } = r;
      const midX = x + sw / 2;
      shadow(ctx, midX, GROUND + 1, Math.round(sw * (r.fly ? 0.5 : 0.85)), mon.dropY < -20 ? 0.15 : 0.35);
      // aura for strong monsters / bosses
      if (mon.boss || mon.level > 10) {
        const col = mon.boss ? "#ff3040" : mon.level > 25 ? "#ff7a1a" : "#a87cff";
        SC.drawGlow(ctx, midX, y + sh / 2, Math.min(60, Math.round(sw * 0.7)), col, (mon.boss ? 0.35 : 0.18) + 0.1 * Math.sin(gt * 0.006));
      }
      if (F.wings) {
        const wi = Math.floor(gt / 160) % 2;
        const wg = F.wings[wi];
        ctx.drawImage(wg.c, x + 17 * sc, y + (17 - wg.h) * sc + (wi ? 3 * sc : 0), wg.w * sc, wg.h * sc);
      }
      ctx.drawImage(spr.c, x, y, sw, sh);
      if (mon.kind === "fireOgre" || mon.kind === "dragon") {
        for (let i = 0; i < 4; i++) {
          const fx = mon.kind === "dragon" ? x - 2 : x + sw / 2 - 8 + i * 5;
          const fy = mon.kind === "dragon" ? y + 11 * sc : y + 2;
          const hh = 3 + Math.round(Math.abs(Math.sin(gt * 0.02 + i * 1.7)) * 4);
          if (mon.kind === "dragon") { if (i < 2 && Math.sin(gt * 0.004) > 0.3) px(ctx, fx - 4 - i * 3, fy + (i % 2), 3, 2, i ? "#ffd23f" : "#ff6a10"); }
          else { px(ctx, fx, fy - hh, 2, hh, "#ff6a10"); px(ctx, fx, fy - hh, 1, Math.max(1, hh - 2), "#ffd23f"); }
        }
      }
      if (mon.kind === "darkKnight") {
        const sx = x - 4, sy = y + 6;
        px(ctx, sx - 1, sy - 1, 6, 46, "#06060c");
        px(ctx, sx, sy, 4, 40, "#b8c0e0");
        px(ctx, sx + 1, sy, 1, 40, "#ffffff");
        px(ctx, sx - 4, sy + 36, 12, 4, "#b81c2c");
        px(ctx, sx + 1, sy + 40, 2, 5, "#3a2010");
        SC.drawGlow(ctx, sx + 1, sy + 10, 10, "#ff3040", 0.2 + 0.15 * Math.sin(gt * 0.01));
      }
      if (mon.flash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, mon.flash / 100);
        ctx.drawImage(spr.white, x, y, sw, sh);
        ctx.restore();
      }
      // HP pips
      if (mon.maxHp > 1) {
        const pw = 6, gap = 1;
        const bw = mon.maxHp * (pw + gap) + 1;
        const bx = Math.round(midX - bw / 2), by = Math.max(VY + 22, y - 8);
        px(ctx, bx - 1, by - 1, bw + 2, 6, "#140c12");
        for (let i = 0; i < mon.maxHp; i++) {
          const on = i < mon.hp, ghost = !on && i < mon.shownHp;
          px(ctx, bx + 1 + i * (pw + gap), by + 1, pw, 3, on ? "#e63946" : ghost ? "#ffffff" : "#4a1a22");
          if (on) px(ctx, bx + 1 + i * (pw + gap), by + 1, pw, 1, "#ff9aa8");
        }
      }
    },

    step(now) {
      if (!this.bctx) return;
      const dt = Math.min(50, Math.max(0, now - (this.lastNow || now)));
      this.lastNow = now;
      if (this.canvas && (this._layoutAcc = (this._layoutAcc || 0) + dt) > 600) { this._layoutAcc = 0; this.layout(); }
      if (this.hitStop > 0) {
        this.hitStop -= dt;
        this.draw(now);
        return;
      }
      this.t = now;
      this.gt += dt;
      const s = dt / 1000;
      if (this.shake.mag > 0) {
        this.shake.x = Math.round((Math.random() - 0.5) * 2 * this.shake.mag);
        this.shake.y = Math.round((Math.random() - 0.5) * 2 * this.shake.mag);
        this.shake.mag *= Math.pow(0.84, dt / 16);
        if (this.shake.mag < 0.4) { this.shake.mag = 0; this.shake.x = 0; this.shake.y = 0; }
      }
      // hero movement
      if (this.heroMode === "return" || this.heroMode === "idle" || this.heroMode === "hurt") {
        const home = this.heroX + (this.hurtT > 0 ? -6 * (this.hurtT / 420) : 0);
        this.hx += (home - this.hx) * Math.min(1, dt * 0.014);
        if (this.heroMode === "return" && Math.abs(this.hx - this.heroX) < 1) { this.hx = this.heroX; this.heroMode = "idle"; }
        const tgtA = this.heroMode === "hurt" ? -0.5 : 0.5;
        this.wAng += (tgtA - this.wAng) * Math.min(1, dt * 0.015);
      }
      if (this.hurtT > 0) this.hurtT -= dt;
      if (this.redT > 0) this.redT -= dt;
      if (this.flashT > 0) this.flashT -= dt;
      if (this.bossIntroT > 0) this.bossIntroT -= dt;
      if (this.lvFxT > 0) this.lvFxT -= dt;
      if (this.gearFxT > 0) this.gearFxT -= dt;
      if (this.mon) {
        const m = this.mon;
        if (m.entering) {
          m.enterP = Math.min(1, m.enterP + dt / 520);
          const startX = W + 30;
          m.x = startX + (m.tx - startX) * ease(m.enterP);
          if (m.enterP >= 1) {
            m.x = m.tx; m.entering = false;
            if (this.state === "monIn") this.state = "idle";
            this.burst(m.x, GROUND, ["#d8c8a0", "#a89878"], 6, 0.8, { up: 20, g: 80 });
          }
        }
        if (m.falling) {
          if (this.bossIntroT < 1250) {
            m.vy += 900 * s;
            m.dropY += m.vy * s;
            if (m.dropY >= 0) {
              m.dropY = 0; m.falling = false;
              if (this.state === "monIn") this.state = "idle";
              this.shake.mag = 8;
              this.burst(m.x, GROUND, ["#d8c8a0", "#a89878", "#ffffff"], 26, 1.6, { up: 40, g: 120 });
              this.rings.push({ x: m.x, y: GROUND - 2, t: 0, col: "#ffffff", max: 44, flat: true });
              if (global.AudioCtl) AudioCtl.playHit();
            }
          }
        }
        if (m.flash > 0) m.flash -= dt;
        if (m.kx) m.kx *= Math.pow(0.8, dt / 16);
        if (m.shownHp > m.hp) m.shownHp = Math.max(m.hp, m.shownHp - s * 2.5);
        if (m.dead) m.explodeT += 0.03;
        if (this.state !== "monAttack") m.shakeX = m.flash > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
      }
      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) this.hideToast();
      }
      if (this.glowT > 0) this.glowT -= dt;
      // particles
      this.particles = this.particles.filter((p) => {
        if (p.home) {
          p.age += s;
          if (p.age > p.home.delay) {
            const dx = p.home.x - p.x, dy = p.home.y - p.y;
            const d = Math.hypot(dx, dy);
            const sp = 160 + (p.age - p.home.delay) * 900;
            if (d < 6) { this.bump(p.home.el); return false; }
            p.x += (dx / d) * Math.min(d, sp * s);
            p.y += (dy / d) * Math.min(d, sp * s);
          } else {
            p.vy += p.g * s; p.x += p.vx * s; p.y += p.vy * s;
            if (p.y > GROUND - 2 && p.vy > 0) { p.y = GROUND - 2; p.vy *= -0.45; p.vx *= 0.6; }
          }
          return p.age < 4;
        }
        p.vy += p.g * s; p.x += p.vx * s; p.y += p.vy * s;
        if (p.floor && p.y > p.floor && p.vy > 0) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.5; }
        p.life -= p.decay * s;
        return p.life > 0;
      });
      this.floats = this.floats.filter((f) => {
        f.age += s;
        f.y += f.vy * s; f.vy *= Math.pow(0.9, dt / 16);
        f.life -= s * 1.1;
        return f.life > 0;
      });
      this.slashes = this.slashes.filter((sl) => (sl.t += s * 6) < 1);
      this.rings = this.rings.filter((r) => (r.t += s * 2.6) < 1);
      if (this.lvFxT > 0 && Math.random() < 0.6) this.particles.push({ x: this.hx + (Math.random() - 0.5) * 22, y: this.heroY - Math.random() * 6, vx: 0, vy: -50 - Math.random() * 40, g: 0, life: 1, decay: 1.6, color: Math.random() < 0.5 ? "#ffd166" : "#ffffff", size: 1 });
      const stage = stageFor(this.monLevel || 1);
      const scene = SC.get(stage, W);
      if (this._ambKind !== scene.amb || this._ambW !== W) { this._ambKind = scene.amb; this._ambW = W; this.amb = []; }
      SC.ambient(scene.amb, W, this.amb, this.gt, dt);
      this.draw(now);
    },

    draw(now) {
      const ctx = this.bctx;
      const gt = this.gt;
      ctx.imageSmoothingEnabled = false;
      this.texts = [];
      if (this.mapOn) {
        this.drawWorldMap(ctx, now);
      } else {
        const stage = stageFor(this.monLevel || 1);
        const scene = SC.get(stage, W);
        const cam = (this.hx - this.heroX) * 0.4;
        scene.back(ctx, gt, cam);
        // level-up pillar behind hero
        if (this.lvFxT > 0) {
          const a = Math.min(1, this.lvFxT / 400) * 0.45;
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = a;
          px(ctx, this.hx - 9, 0, 18, GROUND, "#ffd166");
          ctx.globalAlpha = a * 0.8;
          px(ctx, this.hx - 4, 0, 8, GROUND, "#ffffff");
          ctx.restore();
        }
        // boss intro darkening
        if (this.bossIntroT > 0) {
          ctx.globalAlpha = Math.min(0.55, this.bossIntroT / 1700);
          px(ctx, 0, 0, W, H, "#0a0004");
          ctx.globalAlpha = 1;
        }
        // monster
        if (this.mon) this.drawMonster(ctx, this.mon, gt);
        // hero
        const legs = this.heroMode === "dash" || (this.heroMode === "return" && Math.abs(this.hx - this.heroX) > 2)
          ? ["run0", "run1", "run2", "run1"][Math.floor(gt / 70) % 4]
          : this.heroMode === "hurt" || this.heroMode === "slash" ? "hurt" : "idle";
        const flashHero = this.hurtT > 0 && Math.floor(gt / 60) % 2 === 0;
        const tip = drawHero(ctx, this.hx, this.heroY, this.gear(), gt, { legs, wAng: this.wAng, pose: this.pose, glow: this.glowT > 0 || this.gearFxT > 0 ? 1 : 0, flashWhite: flashHero });
        // weapon trail
        if (tip && (this.heroMode === "slash" || this.heroMode === "windup")) {
          this.trail.push(tip);
          if (this.trail.length > 7) this.trail.shift();
        } else if (this.trail.length) this.trail.shift();
        if (this.trail.length > 1) {
          ctx.save();
          for (let i = 1; i < this.trail.length; i++) {
            const a = this.trail[i - 1], b = this.trail[i];
            ctx.globalAlpha = (i / this.trail.length) * 0.75;
            ctx.fillStyle = b.col;
            ctx.beginPath();
            ctx.moveTo(a.gx + (a.x - a.gx) * 0.35, a.gy + (a.y - a.gy) * 0.35);
            ctx.lineTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(b.gx + (b.x - b.gx) * 0.35, b.gy + (b.y - b.gy) * 0.35);
            ctx.fill();
          }
          ctx.restore();
        }
        if (tip && tip.fx && this.heroMode === "idle") {
          if (tip.fx === "fire" && Math.random() < 0.3) this.particles.push({ x: tip.x + (Math.random() - 0.5) * 3, y: tip.y + Math.random() * 8, vx: 0, vy: -20, g: 0, life: 1, decay: 2.5, color: Math.random() < 0.5 ? "#ffd23f" : "#ff6a10", size: 1 });
          if (tip.fx === "spark" && Math.random() < 0.12) this.particles.push({ x: tip.x + (Math.random() - 0.5) * 6, y: tip.y + Math.random() * 10, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, g: 0, life: 1, decay: 5, color: "#ffffff", size: 1 });
          if (tip.fx === "magic") SC.drawGlow(ctx, tip.x, tip.y + 2, 7, "#a87cff", 0.4 + 0.2 * Math.sin(gt * 0.008));
        }
        // slashes
        this.slashes.forEach((sl) => {
          const a = 1 - sl.t;
          ctx.globalAlpha = a;
          if (sl.claw) {
            for (let k = 0; k < 3; k++) for (let j = 0; j < 12; j++) {
              const f = j / 11;
              if (f > sl.t * 2.2) continue;
              px(ctx, sl.x - 7 + k * 5 + f * 8, sl.y - 8 + f * 16, 2, 1, sl.col);
            }
          } else {
            const r = 8 + sl.t * 14;
            for (let j = 0; j < 22; j++) {
              const an = -1.3 + (j / 21) * 2.6;
              const th = Math.max(1, Math.round(3 * Math.sin((j / 21) * Math.PI)));
              px(ctx, sl.x + Math.cos(an) * r, sl.y + Math.sin(an) * r, th, th, j % 3 ? sl.col : "#ffffff");
            }
          }
          ctx.globalAlpha = 1;
        });
        // rings
        this.rings.forEach((r) => {
          if (r.t < 0) return;
          ctx.globalAlpha = 1 - r.t;
          if (r.flat) {
            const rr = r.t * r.max;
            px(ctx, r.x - rr, r.y, 3, 1, r.col); px(ctx, r.x + rr - 3, r.y, 3, 1, r.col);
            px(ctx, r.x - rr * 0.7, r.y - 2, 2, 1, r.col); px(ctx, r.x + rr * 0.7, r.y - 2, 2, 1, r.col);
          } else pixelRing(ctx, r.x, r.y, 3 + ease(r.t) * r.max, r.col, r.t < 0.5 ? 2 : 1);
          ctx.globalAlpha = 1;
        });
        // particles
        const coins = S.coinFrames();
        this.particles.forEach((p) => {
          if (p.kind === "coin") {
            const c = coins[Math.floor(gt / 70 + p.ph) % 4];
            ctx.drawImage(c.c, Math.round(p.x - c.w / 2), Math.round(p.y - c.h / 2));
          } else if (p.kind === "orb") {
            const o = S.orbSprite("#5af0a0");
            SC.drawGlow(ctx, p.x, p.y, 5, "#5af0a0", 0.5);
            ctx.drawImage(o.c, Math.round(p.x - 2), Math.round(p.y - 2));
          } else {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
            px(ctx, p.x, p.y, p.size, p.size, p.color);
          }
        });
        ctx.globalAlpha = 1;
        // ambient + foreground
        SC.drawAmbient(ctx, this.amb, gt);
        const lights = [{ x: this.hx, y: this.heroY - 14, r: 34 }];
        if (this.mon && !this.mon.dead) lights.push({ x: this.mon.x, y: this.mon.y - 16, r: 30 });
        scene.front(ctx, gt, 0, lights);
        // floats (pixel font)
        this.floats.forEach((f) => {
          const sp = S.textSprite(f.text, f.color, f.light);
          const sc = f.age < 0.12 ? 3 : 2;
          ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
          ctx.drawImage(sp.c, Math.round(f.x - (sp.w * sc) / 2), Math.round(f.y - sp.h * sc), sp.w * sc, sp.h * sc);
          ctx.globalAlpha = 1;
        });
        // boss intro stripes
        if (this.bossIntroT > 0) {
          const k = Math.min(1, this.bossIntroT / 300, (1700 - this.bossIntroT) / 200);
          const bh = Math.round(14 * k);
          px(ctx, 0, VY, W, bh, "#140004");
          px(ctx, 0, VY + VH - bh, W, bh, "#140004");
          const off = Math.floor(gt / 20) % 12;
          for (let x = -12; x < W + 12; x += 12) {
            for (let y = 0; y < bh - 3; y++) {
              px(ctx, x + off + y, VY + 1 + y, 5, 1, "#c8102e");
              px(ctx, x - off + y, VY + VH - bh + 2 + y, 5, 1, "#c8102e");
            }
          }
          if (Math.floor(gt / 120) % 2 === 0) { ctx.globalAlpha = 0.12 * k; px(ctx, 0, 0, W, H, "#ff0020"); ctx.globalAlpha = 1; }
        }
        if (this.redT > 0) {
          ctx.globalAlpha = (this.redT / 300) * 0.35;
          px(ctx, 0, 0, 6, H, "#ff0020"); px(ctx, W - 6, 0, 6, H, "#ff0020");
          px(ctx, 0, VY, W, 4, "#ff0020"); px(ctx, 0, VY + VH - 4, W, 4, "#ff0020");
          ctx.globalAlpha = 1;
        }
        if (this.flashT > 0) {
          ctx.globalAlpha = (this.flashT / 120) * 0.35;
          px(ctx, 0, 0, W, H, "#ffffff");
          ctx.globalAlpha = 1;
        }
      }

      // blit (integer upscale)
      const out = this.ctx;
      const k = this.k;
      out.imageSmoothingEnabled = false;
      out.fillStyle = "#05030a";
      out.fillRect(0, 0, this.canvas.width, this.canvas.height);
      out.drawImage(this.buf, 0, VY, W, VH, this.shake.x * k, this.shake.y * k, W * k, VH * k);
      if (this.texts.length) {
        out.textAlign = "center";
        out.textBaseline = "middle";
        this.texts.forEach((tx) => {
          out.font = `900 ${Math.round(tx.s * k)}px "PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif`;
          if (!tx.noStroke) {
            out.lineWidth = Math.max(2, k * 1.2);
            out.strokeStyle = "#140c12";
            out.strokeText(tx.text, tx.x * k + this.shake.x * k, (tx.y - VY) * k + this.shake.y * k);
          }
          out.fillStyle = tx.c;
          out.fillText(tx.text, tx.x * k + this.shake.x * k, (tx.y - VY) * k + this.shake.y * k);
        });
      }
    },

    drawHomePreview(canvas) {
      const c = canvas.getContext("2d");
      const L = 48;
      const k = Math.max(2, Math.round((canvas.clientWidth || 96) * Math.min(3, global.devicePixelRatio || 1) / L));
      canvas.width = L * k; canvas.height = L * k;
      const [buf, b] = SC.mk(L, L);
      const draw = (now) => {
        b.clearRect(0, 0, L, L);
        b.fillStyle = "#4d9ce4"; b.fillRect(0, 0, L, 20);
        b.fillStyle = "#74b8ee"; b.fillRect(0, 20, L, 10);
        b.fillStyle = "#a4d4f4"; b.fillRect(0, 30, L, 6);
        SC.disk(b, 38, 9, 4, "#fff6c8");
        b.fillStyle = "#4aa23c"; b.fillRect(0, 36, L, 3);
        b.fillStyle = "#7a4a2a"; b.fillRect(0, 39, L, 9);
        b.fillStyle = "#8ad866"; b.fillRect(0, 36, L, 1);
        drawHero(b, 14, 40, gearOf([ITEMS[0], ITEMS[1]]), now, { legs: "idle", wAng: 0.5 + Math.sin(now * 0.004) * 0.15 });
        const F = S.monFrames("slime");
        const f = F.frames[Math.floor(now / 230) % 2];
        const hop = Math.round(Math.abs(Math.sin(now * 0.004)) * -3);
        b.drawImage(f.c, 22, 40 - f.h + 1 + hop);
        c.imageSmoothingEnabled = false;
        c.clearRect(0, 0, canvas.width, canvas.height);
        c.drawImage(buf, 0, 0, L * k, L * k);
      };
      const loop = (now) => {
        const home = document.getElementById("home");
        if (home && !home.classList.contains("hide")) draw(now);
        requestAnimationFrame(loop);
      };
      if (!this._homeLoop) { this._homeLoop = true; requestAnimationFrame(loop); }
      draw(performance.now());
    },

    getState() {
      return {
        state: this.state,
        lastAnim: this.lastAnim,
        kills: this.kills,
        hearts: this.hearts,
        score: this.score,
        monLevel: this.monLevel,
        mon: this.mon ? { hp: this.mon.hp, maxHp: this.mon.maxHp, kind: this.mon.kind, boss: this.mon.boss, dead: this.mon.dead } : null,
        gear: this.owned.map((i) => i.name),
        level: this.hero.level,
        exp: this.hero.exp,
        atk: this.hero.atk,
        mapOn: !!this.mapOn,
        W, k: this.k
      };
    }
  };

  Battle.ITEMS = ITEMS;
  global.Battle = Battle;
})(window);
