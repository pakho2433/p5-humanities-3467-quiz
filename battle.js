/* Original 2D pixel battle engine — hero, gear, monsters, stages, VFX */
(function (global) {
  const W = 320, H = 180;
  const GROUND = 150;

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

  function px(ctx, x, y, w, h, c) {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, w, h);
  }

  /* ---------- backgrounds ---------- */
  function drawForest(ctx, t, shake) {
    const sx = shake.x, sy = shake.y;
    const sky = ["#7ec8e3", "#8fd3ea", "#a6dcf0", "#c8ecf8"];
    for (let i = 0; i < 4; i++) px(ctx, 0, i * 28, W, 28, sky[i]);
    // sun
    const sunX = 250 + Math.sin(t * 0.00015) * 4;
    px(ctx, sunX, 18 + sy * 0.2, 18, 18, "#ffe566");
    px(ctx, sunX + 3, 21, 12, 12, "#fff3a0");
    // far hills (parallax)
    const p1 = ((t * 0.008) % W);
    ctx.fillStyle = "#6aa84f";
    for (let i = -1; i < 4; i++) {
      const x = i * 110 - p1 * 0.3 + sx * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, 110);
      ctx.lineTo(x + 55, 78);
      ctx.lineTo(x + 110, 110);
      ctx.fill();
    }
    ctx.fillStyle = "#4e7d3a";
    for (let i = -1; i < 5; i++) {
      const x = i * 90 - (t * 0.012 % 90) + sx * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, 125);
      ctx.lineTo(x + 45, 92);
      ctx.lineTo(x + 90, 125);
      ctx.fill();
    }
    // clouds (slow parallax)
    for (let i = 0; i < 3; i++) {
      const cx = ((t * 0.01 * (0.4 + i * 0.15) + i * 110) % (W + 50)) - 20;
      const cy = 14 + i * 10;
      px(ctx, cx, cy, 22, 7, "#ffffffcc");
      px(ctx, cx + 6, cy - 4, 14, 6, "#ffffff");
      px(ctx, cx + 10, cy + 2, 16, 5, "#f2fbff");
    }
    // trees mid, canopy sways
    for (let i = 0; i < 6; i++) {
      const x = (i * 64 + 10 - (t * 0.02 % 64)) + sx * 0.6;
      const sw = Math.round(Math.sin(t * 0.004 + i) * 2);
      px(ctx, x + 10, 108, 5, 22, "#5a3310");
      px(ctx, x + 2 + sw, 96, 21, 16, "#2d6a1e");
      px(ctx, x + 5 + sw, 88, 15, 12, "#3d8a28");
      px(ctx, x + 8 + sw, 82, 9, 8, "#4ca333");
    }
    // ground
    px(ctx, 0, GROUND - 8, W, H - (GROUND - 8), "#5c3a1e");
    px(ctx, 0, GROUND - 8, W, 6, "#3d7a28");
    px(ctx, 0, GROUND - 4, W, 3, "#2f5e1e");
    // swaying grass
    for (let i = 0; i < 36; i++) {
      const gx = (i * 9 + 2) % W;
      const gh = 4 + (i % 3) * 2;
      const tip = Math.round(Math.sin(t * 0.01 + i * 0.7) * 2);
      px(ctx, gx, GROUND - 8 - gh, 1, gh, i % 2 ? "#6fbf3a" : "#4ca333");
      px(ctx, gx + tip, GROUND - 10 - gh, 1, 3, "#8fd15a");
    }
  }

  function drawCave(ctx, t, shake) {
    px(ctx, 0, 0, W, H, "#120c18");
    px(ctx, 0, 0, W, 40, "#0c0812");
    // crystals far
    for (let i = 0; i < 8; i++) {
      const x = (i * 48 + Math.sin(t * 0.001 + i) * 4) + shake.x * 0.2;
      const glow = (Math.sin(t * 0.004 + i) + 1) * 0.5;
      px(ctx, x + 16, 50, 6, 18, glow > 0.5 ? "#7a3dff" : "#4a1fa0");
      px(ctx, x + 18, 46, 2, 8, "#c9a8ff");
    }
    // stalactites
    ctx.fillStyle = "#2a2236";
    for (let i = 0; i < 12; i++) {
      const x = i * 30 - (t * 0.01 % 30) + shake.x * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 8, 20 + (i % 3) * 10);
      ctx.lineTo(x + 16, 0);
      ctx.fill();
    }
    px(ctx, 0, 90, W, 70, "#1a1424");
    // mid rocks
    for (let i = 0; i < 5; i++) {
      const x = i * 80 - (t * 0.015 % 80) + shake.x * 0.5;
      px(ctx, x + 10, 118, 36, 16, "#2c2438");
      px(ctx, x + 16, 112, 24, 8, "#3a3148");
    }
    px(ctx, 0, GROUND - 6, W, H - (GROUND - 6), "#1e1828");
    px(ctx, 0, GROUND - 6, W, 4, "#3a3148");
    // floor glints
    for (let i = 0; i < 6; i++) {
      if (((t * 0.004 + i) % 2) > 1) px(ctx, 30 + i * 50, GROUND + 6, 3, 2, "#7a3dff");
    }
  }

  function drawLava(ctx, t, shake) {
    px(ctx, 0, 0, W, 80, "#2a0a0a");
    px(ctx, 0, 80, W, 50, "#3a1010");
    // far volcano
    ctx.fillStyle = "#1a0808";
    ctx.beginPath();
    ctx.moveTo(180, 120);
    ctx.lineTo(240, 50);
    ctx.lineTo(300, 120);
    ctx.fill();
    px(ctx, 232, 48, 16, 8, "#ff5a00");
    px(ctx, 236, 42, 8, 8, "#ffcc33");
    // lava river
    const wave = Math.sin(t * 0.006) * 2;
    px(ctx, 0, GROUND - 18 + wave, W, 22, "#c43c00");
    px(ctx, 0, GROUND - 14 + wave, W, 10, "#ff6a00");
    px(ctx, 0, GROUND - 10 + wave, W, 5, "#ffcc33");
    for (let i = 0; i < 10; i++) {
      const x = (i * 36 + t * 0.04) % W;
      px(ctx, x, GROUND - 20 + wave - (i % 3), 8, 3, "#ffe566");
    }
    // embers + lava bubbles
    for (let i = 0; i < 12; i++) {
      const x = (i * 29 + t * 0.03 * (1 + i % 3)) % W;
      const y = (GROUND - 30 - ((t * 0.05 + i * 17) % 90));
      px(ctx, x, y, 2, 2, i % 2 ? "#ffcc33" : "#ff6a00");
    }
    for (let i = 0; i < 6; i++) {
      const bx = (i * 53 + 10 + Math.sin(t * 0.003 + i) * 8) % W;
      const bo = (Math.sin(t * 0.008 + i * 1.3) + 1) * 3;
      px(ctx, bx, GROUND - 16 - bo, 5, 4, "#ffe566");
      px(ctx, bx + 1, GROUND - 18 - bo, 3, 2, "#fff3a0");
    }
    px(ctx, 0, GROUND - 4, W, H - (GROUND - 4), "#2a1210");
    px(ctx, 0, GROUND - 4, W, 3, "#5a2018");
  }

  function drawCastle(ctx, t, shake) {
    px(ctx, 0, 0, W, H, "#14122a");
    // stars
    for (let i = 0; i < 18; i++) {
      const x = (i * 37 + 13) % W;
      const y = (i * 11 + 8) % 70;
      if (((t * 0.004 + i) % 2) > 0.4) px(ctx, x, y, 2, 2, "#ffe9a8");
    }
    // moon
    px(ctx, 42, 16, 16, 16, "#f0e6c0");
    px(ctx, 48, 18, 10, 10, "#14122a");
    // castle silhouette
    const cx = 200 + shake.x * 0.2;
    px(ctx, cx, 70, 90, 80, "#1c1a38");
    px(ctx, cx + 10, 50, 16, 30, "#1c1a38");
    px(ctx, cx + 64, 46, 16, 34, "#1c1a38");
    px(ctx, cx + 36, 40, 18, 40, "#1c1a38");
    // merlons
    for (let i = 0; i < 6; i++) px(ctx, cx + i * 16, 64, 8, 8, "#1c1a38");
    // windows
    const lit = "#ffd166";
    px(ctx, cx + 16, 88, 8, 12, lit);
    px(ctx, cx + 40, 82, 8, 14, ((t * 0.003) % 2 > 1) ? lit : "#ffaa44");
    px(ctx, cx + 66, 90, 8, 12, lit);
    px(ctx, cx + 40, 50, 6, 8, lit);
    // waving banners
    const bsw = Math.round(Math.sin(t * 0.012) * 2);
    px(ctx, cx + 22, 70, 3, 6, "#6a1808");
    px(ctx, cx + 25, 72, 7 + bsw, 8, "#9b2226");
    px(ctx, cx + 25 + bsw, 80, 6, 6, "#c1121f");
    px(ctx, cx + 70, 70, 3, 6, "#6a1808");
    px(ctx, cx + 73, 72, 7 - bsw, 8, "#9b2226");
    px(ctx, cx + 73 - bsw, 80, 6, 6, "#c1121f");
    // pillars
    px(ctx, 8, 100, 14, 50, "#2a2850");
    px(ctx, 298, 100, 14, 50, "#2a2850");
    // torches with rising flicker
    const flick = (Math.sin(t * 0.02) + 1) * 0.5;
    const rise = 2 + Math.round(Math.sin(t * 0.03) * 2);
    px(ctx, 11, 118, 4, 6, "#5a3310");
    px(ctx, 12, 108 - rise, 6, 10 + rise, flick > 0.4 ? "#ffcc33" : "#ff6a00");
    px(ctx, 14, 106 - rise, 3, 4, "#fff3a0");
    px(ctx, 301, 118, 4, 6, "#5a3310");
    px(ctx, 302, 108 - rise, 6, 10 + rise, flick > 0.5 ? "#ffcc33" : "#ff6a00");
    px(ctx, 304, 106 - rise, 3, 4, "#fff3a0");
    px(ctx, 0, GROUND - 6, W, H - (GROUND - 6), "#2a2850");
    px(ctx, 0, GROUND - 6, W, 4, "#4a4878");
    for (let i = 0; i < 16; i++) px(ctx, i * 20, GROUND + 4, 18, 2, "#1c1a38");
  }

  function drawStage(ctx, stage, t, shake) {
    if (stage === "cave") drawCave(ctx, t, shake);
    else if (stage === "lava") drawLava(ctx, t, shake);
    else if (stage === "castle") drawCastle(ctx, t, shake);
    else drawForest(ctx, t, shake);
  }

  /* ---------- hero (procedural, gear layers) ---------- */
  function gearOf(owned) {
    const g = { weapon: "none", head: "none", shield: "none", boots: "none", body: "none", cape: "none" };
    owned.forEach((it) => { g[it.slot] = it.kind; });
    return g;
  }

  function drawHero(ctx, x, y, gear, t, pose, flash, glow) {
    // pose: 0 idle, 1 windup, 2 slash, 3 hurt
    const breath = pose === 0 ? Math.round(Math.sin(t * 0.008) * 1) : 0;
    const lunge = pose === 1 ? 6 : pose === 2 ? 16 : pose === 3 ? -4 : 0;
    const hx = (x + lunge) | 0;
    const hy = (y + breath) | 0;
    if (flash) { ctx.save(); ctx.globalCompositeOperation = "lighter"; }

    const OUT = "#1b1210";
    const skinD = "#d4a07a", skin = "#f0c4a0", skinL = "#ffe0c4";
    const hairD = "#2c1810", hair = "#4a2c18", hairL = "#6b3f22";

    let bodyD = "#2a4d74", body = "#3a6ea5", bodyL = "#7eb6e0";
    if (gear.body === "iron") { bodyD = "#3a3f4a"; body = "#7a8494"; bodyL = "#c0c8d4"; }
    if (gear.body === "knight") { bodyD = "#2a3040"; body = "#6a7384"; bodyL = "#d4af37"; }
    if (gear.body === "flame") { bodyD = "#6a1808"; body = "#c43c00"; bodyL = "#ffcc33"; }

    let bootD = "#4a3728", boot = "#6b5344";
    if (gear.boots === "leather") { bootD = "#3a2418"; boot = "#8a5a30"; }
    if (gear.boots === "steel") { bootD = "#2a3038"; boot = "#8a949e"; }
    if (gear.boots === "crystal") { bootD = "#1a3860"; boot = "#6ec8ff"; }

    // cape
    if (gear.cape === "magic") {
      const sway = Math.round(Math.sin(t * 0.01) * 2);
      px(ctx, hx - 12 + sway, hy - 24, 8, 20, "#4a1fa0");
      px(ctx, hx - 11 + sway, hy - 22, 5, 16, "#7a3dff");
      px(ctx, hx - 10 + sway, hy - 18, 3, 4, "#c9a8ff");
    }

    // shadow
    px(ctx, hx - 8, y + 1, 18, 3, "#00000055");

    // legs + boots
    px(ctx, hx - 6, hy - 10, 5, 8, "#1d3557");
    px(ctx, hx + 1, hy - 10, 5, 8, "#1d3557");
    px(ctx, hx - 7, hy - 4, 7, 5, boot);
    px(ctx, hx + 1, hy - 4, 7, 5, boot);
    px(ctx, hx - 7, hy - 1, 7, 2, bootD);
    px(ctx, hx + 1, hy - 1, 7, 2, bootD);
    px(ctx, hx - 7, hy - 4, 7, 1, OUT);
    px(ctx, hx + 1, hy - 4, 7, 1, OUT);

    // torso
    px(ctx, hx - 7, hy - 22, 15, 13, body);
    px(ctx, hx - 7, hy - 22, 15, 2, bodyL);
    px(ctx, hx - 7, hy - 11, 15, 2, bodyD);
    px(ctx, hx - 7, hy - 22, 1, 13, OUT);
    px(ctx, hx + 7, hy - 22, 1, 13, OUT);
    if (gear.body === "knight" || gear.body === "flame") {
      px(ctx, hx - 1, hy - 20, 3, 8, bodyL);
    }

    // head
    px(ctx, hx - 6, hy - 32, 13, 11, skin);
    px(ctx, hx - 6, hy - 32, 13, 3, skinL);
    px(ctx, hx - 6, hy - 24, 13, 2, skinD);
    px(ctx, hx - 6, hy - 32, 13, 1, OUT);
    px(ctx, hx - 6, hy - 32, 1, 11, OUT);
    px(ctx, hx + 6, hy - 32, 1, 11, OUT);
    // eyes
    if (pose === 3) {
      px(ctx, hx - 3, hy - 27, 3, 2, OUT);
      px(ctx, hx + 2, hy - 27, 3, 2, OUT);
    } else {
      px(ctx, hx - 2, hy - 27, 2, 2, OUT);
      px(ctx, hx + 3, hy - 27, 2, 2, OUT);
      px(ctx, hx - 2, hy - 27, 1, 1, "#fff");
    }
    // smile
    px(ctx, hx, hy - 24, 3, 1, "#c07860");

    // hair / helmet
    if (gear.head === "none") {
      px(ctx, hx - 6, hy - 34, 13, 5, hair);
      px(ctx, hx - 5, hy - 35, 11, 2, hairL);
      px(ctx, hx - 7, hy - 32, 2, 6, hairD);
      px(ctx, hx + 6, hy - 31, 2, 5, hair);
    } else if (gear.head === "leather") {
      px(ctx, hx - 7, hy - 35, 15, 6, "#8a5a30");
      px(ctx, hx - 6, hy - 36, 13, 2, "#c4884a");
      px(ctx, hx - 7, hy - 35, 15, 1, OUT);
    } else if (gear.head === "iron") {
      px(ctx, hx - 7, hy - 36, 15, 8, "#8a949e");
      px(ctx, hx - 6, hy - 37, 13, 2, "#c0c8d4");
      px(ctx, hx - 2, hy - 33, 5, 4, "#2a3038");
      px(ctx, hx - 7, hy - 36, 15, 1, OUT);
    } else if (gear.head === "crown") {
      px(ctx, hx - 6, hy - 34, 13, 4, hair);
      px(ctx, hx - 7, hy - 38, 15, 5, "#d4af37");
      px(ctx, hx - 7, hy - 41, 3, 4, "#d4af37");
      px(ctx, hx, hy - 42, 3, 5, "#d4af37");
      px(ctx, hx + 7, hy - 41, 3, 4, "#d4af37");
      px(ctx, hx + 1, hy - 43, 2, 2, "#7ec8ff");
    }

    // back arm
    px(ctx, hx - 10, hy - 20, 4, 8, skin);
    // shield (left)
    if (gear.shield !== "none") {
      const sy = hy - 20;
      const sx2 = hx - 14;
      if (gear.shield === "wood") {
        px(ctx, sx2, sy, 8, 12, "#8a5a30");
        px(ctx, sx2 + 1, sy + 1, 6, 10, "#c4884a");
        px(ctx, sx2 + 3, sy + 4, 2, 4, "#5a3310");
        px(ctx, sx2, sy, 8, 1, OUT);
      } else if (gear.shield === "iron") {
        px(ctx, sx2, sy, 8, 12, "#8a949e");
        px(ctx, sx2 + 1, sy + 1, 6, 10, "#c0c8d4");
        px(ctx, sx2 + 3, sy + 4, 2, 4, "#4a80d0");
        px(ctx, sx2, sy, 8, 1, OUT);
      } else if (gear.shield === "dragon") {
        px(ctx, sx2 - 1, sy - 1, 10, 14, "#6a1808");
        px(ctx, sx2, sy, 8, 12, "#c43c00");
        px(ctx, sx2 + 2, sy + 3, 4, 6, "#ffcc33");
        px(ctx, sx2, sy - 1, 10, 1, OUT);
      }
    }

    // front arm
    const armX = pose === 2 ? hx + 8 : pose === 1 ? hx + 4 : hx + 6;
    const armY = pose === 2 ? hy - 24 : pose === 1 ? hy - 28 : hy - 20;
    px(ctx, armX, armY, 4, 8, skin);
    px(ctx, armX, armY, 4, 2, skinL);

    // weapon
    drawWeapon(ctx, gear.weapon, armX + 3, armY, pose, t);

    if (glow) {
      ctx.fillStyle = "rgba(255,209,102,0.25)";
      ctx.fillRect(hx - 16, hy - 46, 34, 50);
    }
    if (flash) ctx.restore();
  }

  function drawWeapon(ctx, kind, x, y, pose, t) {
    const angUp = pose === 1;
    const ext = pose === 2;
    const ox = ext ? 6 : angUp ? 2 : 0;
    const oy = ext ? -4 : angUp ? -10 : -2;
    const bx = x + ox, by = y + oy;
    if (kind === "none") {
      // fist
      px(ctx, x, y + 6, 4, 4, "#f0c4a0");
      return;
    }
    if (kind === "wood") {
      px(ctx, bx, by - 10, 3, 16, "#c4884a");
      px(ctx, bx - 1, by - 12, 5, 4, "#e8d5a3");
      px(ctx, bx, by + 4, 3, 4, "#5a3310");
    } else if (kind === "iron") {
      px(ctx, bx, by - 14, 3, 18, "#c0c8d4");
      px(ctx, bx - 1, by - 16, 5, 4, "#e8eef5");
      px(ctx, bx, by + 2, 3, 5, "#5a3310");
      px(ctx, bx - 1, by - 8, 5, 2, "#8a949e");
    } else if (kind === "fire") {
      px(ctx, bx, by - 14, 3, 18, "#ff6a00");
      px(ctx, bx + 1, by - 16, 2, 14, "#ffcc33");
      px(ctx, bx - 1, by - 12, 1, 6, "#ff3a00");
      px(ctx, bx, by + 2, 3, 5, "#5a3310");
      if ((t * 0.02 | 0) % 2 === 0) px(ctx, bx + 3, by - 16, 2, 3, "#ffe566");
    } else if (kind === "staff") {
      px(ctx, bx, by - 8, 3, 20, "#6b3f22");
      const pulse = (Math.sin(t * 0.012) + 1) * 0.5;
      px(ctx, bx - 2, by - 14, 7, 7, pulse > 0.5 ? "#c9a8ff" : "#7a3dff");
      px(ctx, bx, by - 12, 3, 3, "#fff");
    } else if (kind === "thunder") {
      px(ctx, bx, by - 16, 3, 20, "#b8f0ff");
      px(ctx, bx + 1, by - 18, 2, 16, "#fff");
      px(ctx, bx - 2, by - 10, 7, 2, "#7ec8ff");
      px(ctx, bx, by + 2, 3, 5, "#3a3f4a");
      if ((t * 0.03 | 0) % 2 === 0) {
        px(ctx, bx + 4, by - 14, 3, 1, "#fff");
        px(ctx, bx - 4, by - 8, 3, 1, "#7ec8ff");
      }
    }
  }

  /* ---------- monsters ---------- */
  function palFor(kind, level) {
    const packs = {
      slime: ["#1b1210", "#1e6b2a", "#3d8a28", "#6fbf3a", "#c8f0a0"],
      bat: ["#1b1210", "#2a1a40", "#4a3080", "#7a5ab0", "#c9a8ff"],
      spike: ["#1b1210", "#5a2018", "#8a4030", "#c4884a", "#e8d5a3"],
      imp: ["#1b1210", "#6a1808", "#c43c00", "#ff6a00", "#ffcc33"],
      wolf: ["#1b1210", "#3a3f4a", "#6a7384", "#a0a8b4", "#e8eef5"],
      ghost: ["#1b1210", "#1a3860", "#3a6ea5", "#7ec8ff", "#e0f4ff"],
      beetle: ["#1b1210", "#1e3a18", "#2d6a1e", "#4ca333", "#ffe566"],
      ogre: ["#1b1210", "#3d5a20", "#6a8a30", "#a0c050", "#d4af37"],
      kingSlime: ["#1b1210", "#1a3860", "#2a60c0", "#7ec8ff", "#ffd166"],
      fireOgre: ["#1b1210", "#6a1808", "#c43c00", "#ff6a00", "#ffcc33"],
      dragon: ["#1b1210", "#4a1fa0", "#7a3dff", "#c9a8ff", "#ffd166"],
      darkKnight: ["#1b1210", "#1c1a38", "#3a3f4a", "#8a949e", "#9b2226"]
    };
    const p = packs[kind] || packs.slime;
    // tint shift by level
    return p;
  }

  function drawMonster(ctx, mon, t, flash) {
    if (mon.dead && mon.explodeT > 0.35) return;
    const bob = Math.round(Math.sin(t * 0.01 + mon.level) * (mon.boss ? 2 : 1));
    const x = (mon.x + mon.shakeX) | 0;
    const y = (mon.y + bob + mon.shakeY) | 0;
    const sc = mon.scale || 1;
    if (flash || mon.flash > 0) {
      ctx.save();
      ctx.filter = "brightness(3)";
    }
    ctx.save();
    ctx.translate(x, y);
    if (sc !== 1) ctx.scale(sc, sc);

    const C = palFor(mon.kind, mon.level);
    const k = mon.kind;
    if (k === "slime" || k === "kingSlime") {
      const w = k === "kingSlime" ? 36 : 24;
      const h = k === "kingSlime" ? 28 : 18;
      px(ctx, -w / 2, -h, w, h, C[2]);
      px(ctx, -w / 2 + 3, -h + 2, w - 6, 6, C[3]);
      px(ctx, -w / 2 + 4, -h / 2, w - 8, 5, C[1]);
      px(ctx, -w / 2, -h, w, 1, C[0]);
      px(ctx, -6, -h + 7, 4, 4, C[0]);
      px(ctx, 4, -h + 7, 4, 4, C[0]);
      px(ctx, -5, -h + 8, 2, 2, "#fff");
      px(ctx, 5, -h + 8, 2, 2, "#fff");
      px(ctx, -3, -h + 14, 8, 2, C[0]);
      if (k === "kingSlime") {
        px(ctx, -8, -h - 8, 16, 8, C[4]);
        px(ctx, -2, -h - 12, 4, 5, C[4]);
        px(ctx, -1, -h - 13, 2, 2, "#7ec8ff");
      }
    } else if (k === "bat") {
      const fl = Math.sin(t * 0.02) > 0;
      px(ctx, -4, -14, 10, 10, C[2]);
      px(ctx, -3, -16, 8, 4, C[3]);
      px(ctx, -2, -12, 2, 2, C[0]);
      px(ctx, 3, -12, 2, 2, C[0]);
      px(ctx, fl ? -18 : -16, fl ? -18 : -12, 14, 8, C[1]);
      px(ctx, fl ? 6 : 4, fl ? -18 : -12, 14, 8, C[1]);
      px(ctx, fl ? -16 : -14, fl ? -16 : -10, 10, 4, C[2]);
      px(ctx, fl ? 8 : 6, fl ? -16 : -10, 10, 4, C[2]);
    } else if (k === "spike") {
      px(ctx, -10, -16, 20, 16, C[2]);
      px(ctx, -8, -14, 16, 6, C[3]);
      px(ctx, -4, -24, 3, 10, C[4]);
      px(ctx, 2, -22, 3, 8, C[4]);
      px(ctx, -8, -20, 3, 6, C[3]);
      px(ctx, 6, -20, 3, 6, C[3]);
      px(ctx, -4, -10, 3, 3, C[0]);
      px(ctx, 3, -10, 3, 3, C[0]);
    } else if (k === "imp" || k === "fireOgre" || k === "ogre") {
      const big = k !== "imp";
      const s = big ? 1.4 : 1;
      ctx.save();
      if (big) ctx.scale(s, s);
      // horns
      px(ctx, -10, -30, 4, 8, C[4]);
      px(ctx, 7, -30, 4, 8, C[4]);
      // head
      px(ctx, -10, -24, 21, 14, C[2]);
      px(ctx, -8, -22, 6, 5, C[4]);
      px(ctx, 3, -22, 6, 5, C[4]);
      px(ctx, -6, -20, 3, 3, C[0]);
      px(ctx, 4, -20, 3, 3, C[0]);
      px(ctx, -2, -16, 6, 2, C[0]);
      // body
      px(ctx, -11, -12, 23, 16, C[1]);
      px(ctx, -9, -10, 19, 6, C[2]);
      // arms
      px(ctx, -16, -10, 6, 10, C[2]);
      px(ctx, 11, -10, 6, 10, C[2]);
      // legs
      px(ctx, -8, 3, 6, 8, C[1]);
      px(ctx, 3, 3, 6, 8, C[1]);
      if (k === "fireOgre") {
        px(ctx, -6, -32, 3, 6, "#ffcc33");
        px(ctx, 4, -34, 3, 8, "#ff6a00");
      }
      ctx.restore();
    } else if (k === "wolf") {
      px(ctx, -14, -16, 26, 14, C[2]);
      px(ctx, 8, -20, 14, 10, C[2]);
      px(ctx, 18, -16, 6, 4, C[1]);
      px(ctx, -4, -12, 3, 3, C[0]);
      px(ctx, 12, -16, 3, 3, C[0]);
      px(ctx, -16, -8, 4, 6, C[3]);
      px(ctx, -10, -2, 6, 8, C[1]);
      px(ctx, 4, -2, 6, 8, C[1]);
    } else if (k === "ghost") {
      const w = Math.round(Math.sin(t * 0.012) * 2);
      px(ctx, -10, -24, 20, 22, C[3]);
      px(ctx, -8, -22, 16, 6, C[4]);
      px(ctx, -6, -16, 4, 5, C[0]);
      px(ctx, 4, -16, 4, 5, C[0]);
      px(ctx, -4, -10, 8, 2, C[1]);
      px(ctx, -10 + w, -4, 5, 6, C[3]);
      px(ctx, -2, -4, 5, 6, C[3]);
      px(ctx, 6 - w, -4, 5, 6, C[3]);
    } else if (k === "beetle") {
      px(ctx, -12, -14, 24, 14, C[2]);
      px(ctx, -10, -16, 20, 6, C[3]);
      px(ctx, -2, -12, 4, 10, C[0]);
      px(ctx, -6, -10, 3, 3, C[4]);
      px(ctx, 4, -10, 3, 3, C[4]);
      px(ctx, -16, -8, 5, 2, C[1]);
      px(ctx, 12, -8, 5, 2, C[1]);
    } else if (k === "dragon") {
      px(ctx, -16, -22, 32, 20, C[2]);
      px(ctx, 10, -28, 18, 14, C[2]);
      px(ctx, 24, -24, 10, 6, C[1]);
      px(ctx, -6, -16, 4, 4, "#ffcc33");
      px(ctx, 16, -22, 4, 4, C[0]);
      px(ctx, 18, -22, 2, 2, "#fff");
      const wing = Math.sin(t * 0.012) > 0;
      px(ctx, -28, wing ? -36 : -24, 20, 14, C[1]);
      px(ctx, -24, wing ? -32 : -20, 14, 8, C[3]);
      px(ctx, -10, -2, 8, 8, C[1]);
      px(ctx, 6, -2, 8, 8, C[1]);
      px(ctx, 0, -30, 6, 8, C[4]);
    } else if (k === "darkKnight") {
      px(ctx, -12, -28, 24, 16, C[2]);
      px(ctx, -8, -36, 16, 10, C[3]);
      px(ctx, -4, -32, 8, 5, C[0]);
      px(ctx, -14, -16, 28, 18, C[1]);
      px(ctx, -2, -14, 4, 12, C[4]);
      px(ctx, -10, 1, 8, 10, C[2]);
      px(ctx, 4, 1, 8, 10, C[2]);
      px(ctx, 12, -24, 4, 22, C[3]);
      px(ctx, 10, -28, 8, 6, C[4]);
    } else {
      // fallback blob
      px(ctx, -12, -18, 24, 18, C[2]);
      px(ctx, -4, -12, 3, 3, C[0]);
      px(ctx, 4, -12, 3, 3, C[0]);
    }
    ctx.restore();
    if (flash || mon.flash > 0) ctx.restore();

    // HP bar if maxHp > 1 and alive
    if (!mon.dead && mon.maxHp > 1) {
      const bw = Math.max(24, 10 * mon.maxHp);
      const bx = mon.x - bw / 2;
      const by = mon.y - (mon.boss ? 52 : 36) * (mon.scale || 1);
      px(ctx, bx - 1, by - 1, bw + 2, 6, "#1b1210");
      px(ctx, bx, by, bw, 4, "#4a1510");
      px(ctx, bx, by, Math.max(0, (bw * mon.hp) / mon.maxHp), 4, "#e63946");
      px(ctx, bx, by, Math.max(0, (bw * mon.hp) / mon.maxHp), 1, "#ff8fa0");
    }
  }

  /* ---------- item icons ---------- */
  function drawItemIcon(canvas, item) {
    const c = canvas.getContext("2d");
    const s = canvas.width;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, s, s);
    const scale = s / 16;
    c.setTransform(scale, 0, 0, scale, 0, 0);
    const k = item ? item.kind : "wood";
    const slot = item ? item.slot : "weapon";
    c.fillStyle = "#1b1210";
    c.fillRect(0, 0, 16, 16);
    if (slot === "weapon") {
      if (k === "wood") { px(c, 7, 1, 2, 12, "#c4884a"); px(c, 6, 1, 4, 3, "#e8d5a3"); px(c, 7, 12, 2, 3, "#5a3310"); }
      else if (k === "iron") { px(c, 7, 0, 2, 12, "#c0c8d4"); px(c, 6, 0, 4, 3, "#fff"); px(c, 7, 12, 2, 3, "#5a3310"); }
      else if (k === "fire") { px(c, 7, 0, 2, 12, "#ff6a00"); px(c, 8, 0, 2, 10, "#ffcc33"); px(c, 7, 12, 2, 3, "#5a3310"); }
      else if (k === "staff") { px(c, 7, 5, 2, 10, "#6b3f22"); px(c, 5, 2, 6, 6, "#7a3dff"); px(c, 7, 4, 2, 2, "#fff"); }
      else if (k === "thunder") { px(c, 7, 0, 2, 12, "#b8f0ff"); px(c, 8, 0, 1, 10, "#fff"); px(c, 5, 6, 6, 2, "#7ec8ff"); }
    } else if (slot === "head") {
      if (k === "leather") { px(c, 3, 6, 10, 6, "#8a5a30"); px(c, 4, 4, 8, 3, "#c4884a"); }
      else if (k === "iron") { px(c, 3, 5, 10, 7, "#8a949e"); px(c, 4, 3, 8, 3, "#c0c8d4"); px(c, 6, 8, 4, 3, "#2a3038"); }
      else { px(c, 3, 6, 10, 4, "#d4af37"); px(c, 3, 3, 2, 4, "#d4af37"); px(c, 7, 2, 2, 5, "#d4af37"); px(c, 11, 3, 2, 4, "#d4af37"); }
    } else if (slot === "shield") {
      if (k === "wood") { px(c, 4, 2, 8, 12, "#8a5a30"); px(c, 5, 3, 6, 10, "#c4884a"); }
      else if (k === "iron") { px(c, 4, 2, 8, 12, "#8a949e"); px(c, 5, 3, 6, 10, "#c0c8d4"); }
      else { px(c, 3, 1, 10, 14, "#6a1808"); px(c, 4, 2, 8, 12, "#c43c00"); px(c, 6, 5, 4, 6, "#ffcc33"); }
    } else if (slot === "boots") {
      const col = k === "crystal" ? "#6ec8ff" : k === "steel" ? "#8a949e" : "#8a5a30";
      px(c, 2, 8, 5, 6, col); px(c, 9, 8, 5, 6, col);
    } else if (slot === "body") {
      const col = k === "flame" ? "#c43c00" : k === "knight" ? "#6a7384" : "#8a949e";
      px(c, 4, 3, 8, 11, col); px(c, 5, 4, 6, 3, "#e8eef5");
    } else if (slot === "cape") {
      px(c, 5, 2, 6, 12, "#4a1fa0"); px(c, 6, 3, 4, 10, "#7a3dff");
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- Battle object ---------- */
  const Battle = {
    canvas: null,
    ctx: null,
    buf: null,
    bctx: null,
    running: false,
    t: 0,
    state: "idle",
    pose: 0,
    shake: { x: 0, y: 0, mag: 0 },
    hitStop: 0,
    particles: [],
    floats: [],
    slashes: [],
    hearts: 5,
    maxHearts: 5,
    score: 0,
    kills: 0,
    owned: [],
    monLevel: 0,
    mon: null,
    heroX: 78,
    heroY: GROUND,
    lastAnim: "",
    lastItem: null,
    lastKillAt: 0,
    mapOn: false,
    hero: { level: 1, exp: 0, expToNext: 20, atk: 1 },
    glowT: 0,
    toastTimer: 0,
    _raf: 0,
    _resolvers: [],

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.buf = document.createElement("canvas");
      this.buf.width = W;
      this.buf.height = H;
      this.bctx = this.buf.getContext("2d");
      this.ctx.imageSmoothingEnabled = false;
      this.bctx.imageSmoothingEnabled = false;
      if (!this.running) {
        this.running = true;
        const loop = (now) => {
          this._raf = requestAnimationFrame(loop);
          this.step(now);
        };
        this._raf = requestAnimationFrame(loop);
      }
    },

    reset() {
      this.hearts = 5;
      this.maxHearts = 5;
      this.score = 0;
      this.kills = 0;
      this.owned = [];
      this.monLevel = 0;
      this.mon = null;
      this.state = "idle";
      this.pose = 0;
      this.particles = [];
      this.floats = [];
      this.slashes = [];
      this.shake.mag = 0;
      this.hitStop = 0;
      this.hero = { level: 1, exp: 0, expToNext: 20, atk: 1 };
      this.glowT = 0;
      this.lastAnim = "";
      this.lastItem = null;
      this.hideToast();
      this.hideLvUp();
      this.hideBoss();
      this._finishMap(true);
    },

    spawnMonster(level) {
      this.monLevel = level;
      const boss = isBoss(level);
      const kind = monKind(level, boss);
      const hp = monsterHP(level);
      this.mon = {
        level, kind, boss,
        hp, maxHp: hp,
        x: W + 30,
        y: GROUND,
        tx: 230,
        scale: boss ? 1.35 : 1 + Math.min(0.25, (level - 1) * 0.015),
        flash: 0,
        shakeX: 0, shakeY: 0,
        dead: false,
        explodeT: 0,
        entering: true
      };
      this.state = "monIn";
      this.lastAnim = "monIn";
      if (boss) {
        this.showBoss();
        if (global.AudioCtl) AudioCtl.playBoss();
      } else this.hideBoss();
    },

    gear() { return gearOf(this.owned); },

    addExp(amount) {
      let leveled = [];
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
    hideToast() {
      const el = document.getElementById("itemToast");
      if (el) el.classList.add("hide");
    },
    showBoss() {
      const el = document.getElementById("bossTag");
      if (el) el.classList.remove("hide");
    },
    hideBoss() {
      const el = document.getElementById("bossTag");
      if (el) el.classList.add("hide");
    },
    showLvUp(lv) {
      const el = document.getElementById("lvUp");
      const num = document.getElementById("lvUpNum");
      if (num) num.textContent = "Lv." + lv;
      if (el) el.classList.remove("hide");
    },
    hideLvUp() {
      const el = document.getElementById("lvUp");
      if (el) el.classList.add("hide");
    },

    burst(x, y, colors, n, speed) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (speed || 1.8) * (0.4 + Math.random());
        this.particles.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 1.2,
          g: 0.12,
          life: 1,
          decay: 0.018 + Math.random() * 0.02,
          color: colors[i % colors.length],
          size: 1 + (Math.random() * 3 | 0)
        });
      }
    },

    floatText(x, y, text, color) {
      this.floats.push({ x, y, text, color, vy: -0.7, life: 1 });
    },

    addSlash(x, y) {
      this.slashes.push({ x, y, t: 0 });
    },


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
      const pts = [
        [18, 118], [48, 108], [80, 122],
        [112, 96], [148, 112], [178, 90],
        [208, 108], [236, 86], [258, 114],
        [284, 96], [306, 108]
      ];
      const n = pts.length - 1;
      const x = Math.max(0, Math.min(0.999, tt)) * n;
      const i = Math.floor(x);
      const f = x - i;
      return {
        x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f,
        y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f
      };
    },

    drawWorldMap(ctx, now) {
      const pRaw = this.mapT0 ? Math.min(1, (now - this.mapT0) / this.mapDur) : 1;
      const p = pRaw * pRaw * (3 - 2 * pRaw);
      const t0 = this._levelT(this.mapFrom || 1);
      const t1 = this._levelT(this.mapTo || 2);
      const tt = t0 + (t1 - t0) * p;
      const pos = this._pathPoint(tt);

      // four biome columns
      px(ctx, 0, 0, 80, H, "#7ec8e3");
      px(ctx, 0, 90, 80, 90, "#4e7d3a");
      px(ctx, 80, 0, 80, H, "#120c18");
      px(ctx, 80, 90, 80, 90, "#1e1828");
      px(ctx, 160, 0, 80, H, "#2a0a0a");
      px(ctx, 160, 90, 80, 90, "#c43c00");
      px(ctx, 240, 0, 80, H, "#14122a");
      px(ctx, 240, 90, 80, 90, "#2a2850");
      // sky details
      px(ctx, 50, 16, 12, 12, "#ffe566");
      const cld = ((now * 0.012) % 90);
      px(ctx, 8 + cld * 0.2, 22, 16, 5, "#fff");
      // cave crystals
      const cg = (Math.sin(now * 0.006) + 1) * 0.5;
      px(ctx, 110, 40, 5, 14, cg > 0.5 ? "#7a3dff" : "#4a1fa0");
      px(ctx, 132, 48, 4, 12, cg > 0.4 ? "#c9a8ff" : "#7a3dff");
      // lava glow + bubbles
      const lv = Math.round(Math.sin(now * 0.008) * 2);
      px(ctx, 160, 100 + lv, 80, 8, "#ff6a00");
      px(ctx, 180, 96 + lv, 6, 4, "#ffe566");
      // moon + torch
      px(ctx, 260, 16, 10, 10, "#f0e6c0");
      const fl = (Math.sin(now * 0.02) + 1) * 0.5;
      px(ctx, 300, 70, 5, 8, fl > 0.4 ? "#ffcc33" : "#ff6a00");
      // swaying grass in forest column
      for (let i = 0; i < 10; i++) {
        const tip = Math.round(Math.sin(now * 0.01 + i) * 2);
        px(ctx, 6 + i * 7, 130, 1, 8, "#6fbf3a");
        px(ctx, 6 + i * 7 + tip, 126, 1, 4, "#8fd15a");
      }
      // little trees
      px(ctx, 22, 100, 3, 12, "#5a3310");
      px(ctx, 16 + Math.round(Math.sin(now * 0.004) * 1), 90, 14, 14, "#2d6a1e");
      px(ctx, 58, 108, 3, 10, "#5a3310");
      px(ctx, 53, 98, 12, 12, "#3d8a28");

      // path
      const pts = [
        [18, 118], [48, 108], [80, 122],
        [112, 96], [148, 112], [178, 90],
        [208, 108], [236, 86], [258, 114],
        [284, 96], [306, 108]
      ];
      ctx.fillStyle = "#e8d5a3";
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const f = s / steps;
          const x = a[0] + (b[0] - a[0]) * f;
          const y = a[1] + (b[1] - a[1]) * f;
          px(ctx, x - 2, y - 1, 4, 3, "#c4884a");
          px(ctx, x - 1, y, 2, 2, "#e8d5a3");
        }
      }

      // stage nodes
      const nodes = [
        { t: 0.12, name: "第3課", col: "#3d8a28" },
        { t: 0.37, name: "第4課", col: "#7a3dff" },
        { t: 0.62, name: "第6課", col: "#ff6a00" },
        { t: 0.87, name: "第7課", col: "#d4af37" }
      ];
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      nodes.forEach((n) => {
        const np = this._pathPoint(n.t);
        const reached = tt >= n.t - 0.01;
        px(ctx, np.x - 5, np.y - 5, 10, 10, "#1b1210");
        px(ctx, np.x - 4, np.y - 4, 8, 8, reached ? n.col : "#5a5348");
        if (reached) px(ctx, np.x - 2, np.y - 2, 4, 4, "#fff");
        ctx.fillStyle = "#1b1210";
        ctx.fillText(n.name, np.x + 1, np.y + 14);
        ctx.fillStyle = reached ? "#fff8e7" : "#bbb";
        ctx.fillText(n.name, np.x, np.y + 13);
      });

      // title
      ctx.textAlign = "center";
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#1b1210";
      ctx.fillText("冒險地圖", 161, 16);
      ctx.fillStyle = "#ffd166";
      ctx.fillText("冒險地圖", 160, 15);

      // running hero
      const bob = Math.round(Math.sin(now * 0.02) * 2);
      const runPose = ((now / 120) | 0) % 2 === 0 ? 1 : 2;
      ctx.save();
      ctx.translate(pos.x, pos.y + bob);
      ctx.scale(0.85, 0.85);
      drawHero(ctx, 0, 0, this.gear(), now, runPose, false, false);
      ctx.restore();
    },

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
        const tick = (now) => {
          const elapsed = now - start;
          if (elapsed < 180) {
            this.pose = 1;
            requestAnimationFrame(tick);
            return;
          }
          if (elapsed < 200) {
            this.pose = 2;
            if (global.AudioCtl) AudioCtl.playSlash();
            this.addSlash(this.mon.x - 20, this.mon.y - 20);
            requestAnimationFrame(tick);
            return;
          }
          // hit
          this.hitStop = 90;
          this.shake.mag = this.mon.boss ? 6 : 4;
          this.mon.flash = 160;
          if (global.AudioCtl) AudioCtl.playHit();
          const dmg = this.monLevel <= 10 ? this.mon.hp : Math.max(1, this.hero.atk);
          this.mon.hp = Math.max(0, this.mon.hp - dmg);
          this.floatText(this.mon.x, this.mon.y - 40, "-" + dmg, "#ffe566");
          this.lastAnim = "hit";

          const finishHit = async () => {
            if (this.mon.hp <= 0) {
              await this._killAndRewards();
              resolve({
                killed: true,
                item: this.lastItem,
                leveled: this._lastLeveled || [],
                damage: dmg,
                hp: 0,
                maxHp: this.mon.maxHp
              });
            } else {
              this.state = "idle";
              this.pose = 0;
              this.lastAnim = "idle";
              const gained = this.addExp(10);
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
      const cols = palFor(this.mon.kind, this.mon.level).slice(1);
      this.burst(this.mon.x, this.mon.y - 16, cols.concat("#ffe566", "#fff"), this.mon.boss ? 48 : 28, 2.6);
      if (global.AudioCtl) AudioCtl.playExplode();
      const pts = this.mon.boss ? 30 : 10;
      this.score += pts;
      this.floatText(this.mon.x, this.mon.y - 50, "+" + pts, "#ffd166");
      if (global.AudioCtl) setTimeout(() => AudioCtl.playCoin(), 120);
      this.kills += 1;
      const item = itemForKill(this.kills);
      this.lastItem = item;
      if (item) {
        // replace same slot
        this.owned = this.owned.filter((o) => o.slot !== item.slot);
        this.owned.push(item);
        setTimeout(() => {
          this.showToast(item);
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
        this.showLvUp(lv);
        this.burst(this.heroX, this.heroY - 24, ["#ffd166", "#fff", "#ffe08a", "#ff6a00"], 36, 2.4);
        if (global.AudioCtl) AudioCtl.playLevelUp();
        setTimeout(() => {
          this.hideLvUp();
          resolve();
        }, 900);
      });
    },

    playWrong() {
      return new Promise((resolve) => {
        if (!this.mon || this.mon.dead) {
          resolve({ heartsLost: 0 });
          return;
        }
        this.lastAnim = "monAttack";
        this.state = "monAttack";
        const from = this.mon.x;
        const start = performance.now();
        const dmg = (this.mon.boss || this.monLevel >= 30) ? 2 : 1;
        const tick = (now) => {
          const e = now - start;
          if (e < 280) {
            this.mon.x = from - (from - 120) * (e / 280);
            requestAnimationFrame(tick);
            return;
          }
          this.pose = 3;
          this.shake.mag = 5;
          this.hitStop = 70;
          if (global.AudioCtl) AudioCtl.playHurt();
          this.hearts = Math.max(0, this.hearts - dmg);
          this.floatText(this.heroX, this.heroY - 40, "-" + dmg, "#ff6b6b");
          const backStart = performance.now();
          const back = (n2) => {
            const e2 = n2 - backStart;
            if (e2 < 280) {
              this.mon.x = 120 + (from - 120) * (e2 / 280);
              requestAnimationFrame(back);
              return;
            }
            this.mon.x = from;
            this.pose = 0;
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

    step(now) {
      if (!this.bctx) return;
      if (this.hitStop > 0) {
        this.hitStop -= 16;
        this.draw(now);
        return;
      }
      this.t = now;
      if (this.shake.mag > 0) {
        this.shake.x = (Math.random() - 0.5) * 2 * this.shake.mag;
        this.shake.y = (Math.random() - 0.5) * 2 * this.shake.mag;
        this.shake.mag *= 0.84;
        if (this.shake.mag < 0.3) { this.shake.mag = 0; this.shake.x = 0; this.shake.y = 0; }
      }
      if (this.mon) {
        if (this.mon.entering) {
          this.mon.x += (this.mon.tx - this.mon.x) * 0.12;
          if (Math.abs(this.mon.x - this.mon.tx) < 0.8) {
            this.mon.x = this.mon.tx;
            this.mon.entering = false;
            if (this.state === "monIn") this.state = "idle";
          }
        }
        if (this.mon.flash > 0) this.mon.flash -= 16;
        if (this.mon.dead) this.mon.explodeT += 0.03;
        if (this.state !== "monAttack") {
          this.mon.shakeX = this.mon.flash > 0 ? (Math.random() - 0.5) * 4 : 0;
        }
      }
      if (this.toastTimer > 0) {
        this.toastTimer -= 16;
        if (this.toastTimer <= 0) this.hideToast();
      }
      if (this.glowT > 0) this.glowT -= 16;
      // particles
      this.particles = this.particles.filter((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= p.decay;
        return p.life > 0;
      });
      this.floats = this.floats.filter((f) => {
        f.y += f.vy; f.life -= 0.018;
        return f.life > 0;
      });
      this.slashes = this.slashes.filter((s) => {
        s.t += 0.12;
        return s.t < 1;
      });
      this.draw(now);
    },

    draw(now) {
      const ctx = this.bctx;
      const stage = stageFor(this.monLevel || 1);
      ctx.imageSmoothingEnabled = false;
      if (this.mapOn) {
        this.drawWorldMap(ctx, now);
      } else {
      drawStage(ctx, stage, now, this.shake);

      // hero
      const flashHero = this.pose === 3 && ((now / 60) | 0) % 2 === 0;
      drawHero(ctx, this.heroX, this.heroY, this.gear(), now, this.pose, flashHero, this.glowT > 0);

      // monster
      if (this.mon) drawMonster(ctx, this.mon, now, false);

      // slashes
      this.slashes.forEach((s) => {
        const a = 1 - s.t;
        ctx.strokeStyle = "rgba(255,255,220," + a + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 8 + s.t * 16, -0.8, 1.1);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,209,102," + a * 0.8 + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x + 4, s.y + 2, 5 + s.t * 12, -0.6, 1.0);
        ctx.stroke();
      });

      // particles
      this.particles.forEach((p) => {
        ctx.globalAlpha = Math.max(0, p.life);
        px(ctx, p.x, p.y, p.size, p.size, p.color);
        ctx.globalAlpha = 1;
      });

      // floats
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      this.floats.forEach((f) => {
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.fillStyle = "#1b1210";
        ctx.fillText(f.text, f.x + 1, f.y + 1);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      });

      } // end battle (non-map) layer

      // blit
      const out = this.ctx;
      const cw = this.canvas.width, ch = this.canvas.height;
      out.imageSmoothingEnabled = false;
      out.clearRect(0, 0, cw, ch);
      out.drawImage(this.buf, this.shake.x, this.shake.y, cw, ch);
    },

    drawHomePreview(canvas) {
      const c = canvas.getContext("2d");
      const w = canvas.width, h = canvas.height;
      const buf = document.createElement("canvas");
      buf.width = 48; buf.height = 48;
      const b = buf.getContext("2d");
      b.imageSmoothingEnabled = false;
      px(b, 0, 0, 48, 48, "#7ec8e3");
      px(b, 0, 36, 48, 12, "#3d8a28");
      const fake = this;
      // mini slime + hero
      const mon = { x: 34, y: 36, kind: "slime", level: 1, boss: false, hp: 1, maxHp: 1, scale: 0.7, flash: 0, shakeX: 0, shakeY: 0, dead: false };
      // reuse draw functions with offset - drawMonster uses mon.x as absolute in current ctx after no translate of world
      // We'll just draw hero
      drawHero(b, 16, 36, gearOf([]), performance.now(), 0, false, false);
      const slime = { ...mon };
      // simple slime
      px(b, 26, 22, 16, 14, "#3d8a28");
      px(b, 28, 24, 12, 5, "#6fbf3a");
      px(b, 30, 26, 3, 3, "#1b1210");
      px(b, 36, 26, 3, 3, "#1b1210");
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, w, h);
      c.drawImage(buf, 0, 0, w, h);
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
        mapOn: !!this.mapOn
      };
    }
  };

  Battle.ITEMS = ITEMS;
  global.Battle = Battle;
})(window);
