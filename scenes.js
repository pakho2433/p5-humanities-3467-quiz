/* v3 animated pixel backgrounds: multi-layer parallax, lighting, ambient life + world map */
(function (G) {
  const H = 180, GROUND = 150;
  const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function mk(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    return [c, x];
  }
  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  function disk(ctx, cx, cy, r, col) {
    ctx.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const hw = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
      ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function bandGrad(ctx, y0, y1, w, cols) {
    const n = cols.length - 1;
    for (let y = y0; y < y1; y++) {
      const f = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n;
      const i = Math.min(n - 1, Math.floor(f));
      const fr = f - i;
      px(ctx, 0, y, w, 1, cols[i]);
      ctx.fillStyle = cols[i + 1];
      for (let x = 0; x < w; x++) if (fr * 16 > BAYER[y & 3][x & 3]) ctx.fillRect(x, y, 1, 1);
    }
  }
  function ridgeY(x, w, base, amps, seed) {
    let y = base;
    amps.forEach((a, k) => { y += a * Math.sin((2 * Math.PI * (k + 1) * (k === 0 ? 2 : k + 2) * x) / w + seed * (k + 1)); });
    return Math.round(y);
  }
  function ridge(ctx, w, base, amps, seed, col, edge, tex) {
    for (let x = 0; x < w; x++) {
      const y = ridgeY(x, w, base, amps, seed);
      px(ctx, x, y, 1, H - y, col);
      if (edge) px(ctx, x, y, 1, 1, edge);
      if (tex && rnd(x * 7 + seed) > 0.7) px(ctx, x, y + 3 + ((rnd(x + seed) * 20) | 0), 1, 2, tex);
    }
  }
  const glowCache = new Map();
  function glow(r, col) {
    const key = r + col;
    if (glowCache.has(key)) return glowCache.get(key);
    const [c, x] = mk(r * 2 + 1, r * 2 + 1);
    const steps = 5;
    for (let s = 0; s < steps; s++) {
      x.globalAlpha = 0.16;
      disk(x, r, r, Math.round(r * (1 - s / steps)), col);
    }
    glowCache.set(key, c);
    return c;
  }
  function drawGlow(ctx, x, y, r, col, a) {
    const g = glow(r, col);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.drawImage(g, Math.round(x - r), Math.round(y - r));
    ctx.restore();
  }
  function wrapDraw(ctx, c, off, W, y) {
    const o = ((off % W) + W) % W;
    ctx.drawImage(c, Math.round(-o), y || 0);
    ctx.drawImage(c, Math.round(W - o), y || 0);
  }
  function vignette(W, strength, col) {
    const [c, x] = mk(W, H);
    const cx = W / 2, cy = H * 0.55;
    const maxd = Math.hypot(cx, cy);
    for (let y = 0; y < H; y += 2) for (let xx = 0; xx < W; xx += 2) {
      const d = Math.hypot((xx - cx) * 0.85, (y - cy) * 1.25) / maxd;
      let a = Math.max(0, (d - 0.5) / 0.5);
      a = Math.round(a * 4) / 4 * strength;
      if (a > 0) { x.fillStyle = col; x.globalAlpha = a; x.fillRect(xx, y, 2, 2); }
    }
    return c;
  }
  function cloudSprite(seed, w, cols) {
    const [c, x] = mk(w + 8, 22);
    const n = 3 + ((rnd(seed) * 3) | 0);
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i < n; i++) {
        const cx = 6 + (i / (n - 1)) * (w - 4);
        const r = 4 + rnd(seed + i) * 5 + (i > 0 && i < n - 1 ? 2 : 0);
        disk(x, cx, 13 - (k ? 1 : 0), Math.round(r - k), cols[k]);
      }
    }
    px(x, 4, 17, w, 3, cols[2]);
    return c;
  }
  function roundTree(ctx, x, base, h, r, cols, seed) {
    px(ctx, x - 1, base - h, 3, h, cols[3]);
    px(ctx, x - 1, base - h, 1, h, cols[4]);
    const top = base - h - r + 2;
    disk(ctx, x, top + 2, r, cols[0]);
    disk(ctx, x - r * 0.5, top + r * 0.5, Math.round(r * 0.7), cols[0]);
    disk(ctx, x + r * 0.5, top + r * 0.6, Math.round(r * 0.7), cols[0]);
    disk(ctx, x - 1, top, Math.round(r * 0.8), cols[1]);
    disk(ctx, x - r * 0.35, top - r * 0.3, Math.round(r * 0.45), cols[2]);
    for (let i = 0; i < 6; i++) px(ctx, x - r + rnd(seed + i) * r * 2, top - r * 0.5 + rnd(seed * 3 + i) * r * 1.5, 1, 1, cols[2]);
  }
  function pine(ctx, x, base, h, cols) {
    px(ctx, x, base - 4, 2, 4, cols[3]);
    for (let y = 0; y < h; y++) {
      const ww = Math.round(((y % 6) + 2 + y * 0.35));
      px(ctx, x + 1 - ww, base - 4 - h + y, ww * 2, 1, y % 6 < 2 ? cols[1] : cols[0]);
      px(ctx, x + 1 - ww, base - 4 - h + y, 1, 1, cols[2]);
    }
  }

  /* ---------------- FOREST ---------------- */
  function buildForest(W) {
    const [sky, s] = mk(W, H);
    bandGrad(s, 0, 130, W, ["#2f7ed0", "#4d9ce4", "#74b8ee", "#a4d4f4", "#d8f0fa"]);
    const [far, f] = mk(W, H);
    ridge(f, W, 96, [10, 6, 3], 1.3, "#7fa6cc", "#b8d4ec", "#6e94ba");
    for (let x = 0; x < W; x++) {
      const y = ridgeY(x, W, 96, [10, 6, 3], 1.3);
      if (y < 90) px(f, x, y, 1, Math.max(1, 90 - y - ((rnd(x) * 3) | 0)), "#eef6ff");
    }
    bandGrad(f, 104, 112, W, ["#7fa6cc00", "#a8cce8"]);
    const [hill, h] = mk(W, H);
    ridge(h, W, 114, [6, 4, 2], 4.1, "#4f9442", "#79c05a", "#43843a");
    for (let i = 0; i < W / 9; i++) {
      const x = (i * 9 + rnd(i) * 6) | 0;
      const y = ridgeY(x, W, 114, [6, 4, 2], 4.1);
      pine(h, x, y + 4, 6 + ((rnd(i * 3) * 6) | 0), ["#2f6e34", "#3a8040", "#5aa050", "#2a1a10"]);
    }
    const [line, l] = mk(W, H);
    const tc = ["#1f5a2a", "#2e7a34", "#52a444", "#4a2c16", "#6a4020"];
    for (let i = 0; i < W / 26 + 1; i++) {
      const x = (i * 26 + rnd(i + 9) * 10) % W;
      [x, x - W, x + W].forEach((xx) => roundTree(l, xx, 132, 10 + rnd(i) * 6, 9 + ((rnd(i * 2) * 4) | 0), tc, i));
    }
    px(l, 0, 130, W, 10, "#2a6a2e");
    const [gnd, g] = mk(W, H);
    px(g, 0, GROUND - 8, W, H - GROUND + 8, "#7a4a2a");
    bandGrad(g, GROUND + 2, H, W, ["#7a4a2a", "#5e3820", "#43281a"]);
    for (let x = 0; x < W; x++) {
      const t = ((rnd(x * 3) * 3) | 0);
      px(g, x, GROUND - 9 - t, 1, 10 + t, x % 7 < 3 ? "#56b244" : "#4aa23c");
      px(g, x, GROUND - 9 - t, 1, 1, "#8ad866");
      px(g, x, GROUND, 1, 2, "#2f7a2e");
      if (rnd(x * 11) > 0.93) px(g, x, GROUND + 6 + rnd(x) * 20, 2, 1, "#9a6a40");
      if (rnd(x * 13) > 0.95) { const y = GROUND + 8 + rnd(x * 5) * 18; px(g, x, y, 3, 2, "#8a8a90"); px(g, x, y, 2, 1, "#c4c4cc"); }
    }
    const flowers = [];
    for (let i = 0; i < W / 18; i++) flowers.push({ x: (rnd(i * 17) * W) | 0, y: GROUND - 8 + ((rnd(i * 5) * 3) | 0), c: ["#ff6a8a", "#ffe14d", "#ffffff", "#b07aff"][i % 4], p: rnd(i) * 6 });
    const blades = [];
    for (let i = 0; i < W / 5; i++) blades.push({ x: i * 5 + ((rnd(i) * 4) | 0), h: 3 + ((rnd(i * 7) * 5) | 0), p: rnd(i * 3) * 6, c: i % 3 ? "#5cc04a" : "#3e9a38" });
    const clouds = [0, 1, 2, 3].map((i) => ({ c: cloudSprite(i + 3, 30 + i * 6, ["#e4f2fc", "#ffffff", "#c8dcee"]), y: 26 + i * 9, sp: 1.6 + i * 0.7, o: rnd(i) * W }));
    const canopy = (() => {
      const [c, x] = mk(90, 44);
      for (let i = 0; i < 9; i++) disk(x, 6 + i * 10, 8 + ((rnd(i) * 10) | 0) - (i > 5 ? (i - 5) * 4 : 0), 9 - Math.max(0, i - 5), "#163e1e");
      for (let i = 0; i < 9; i++) disk(x, 5 + i * 10, 6 + ((rnd(i) * 10) | 0) - (i > 5 ? (i - 5) * 4 : 0), 7 - Math.max(0, i - 5), "#225a28");
      for (let i = 0; i < 8; i++) disk(x, 3 + i * 10, 3 + ((rnd(i) * 10) | 0) - (i > 5 ? (i - 5) * 4 : 0), 3, "#3c8238");
      for (let i = 0; i < 4; i++) { px(x, 10 + i * 12, 16 + ((rnd(i * 5) * 12) | 0), 1, 8 + i * 2, "#2e6a2a"); px(x, 9 + i * 12, 24 + ((rnd(i * 5) * 12) | 0) + i * 2, 3, 2, "#3c8238"); }
      return c;
    })();
    const canopyR = (() => { const [c, x] = mk(90, 44); x.translate(90, 0); x.scale(-1, 1); x.drawImage(canopy, 0, 0); return c; })();
    const vig = vignette(W, 0.38, "#0a1a10");
    return {
      amb: "leaf",
      back(ctx, t, cam) {
        ctx.drawImage(sky, 0, 0);
        const sx = W * 0.8, sy = 44;
        drawGlow(ctx, sx, sy, 26, "#fff4b0", 0.5 + Math.sin(t * 0.002) * 0.08);
        disk(ctx, sx, sy, 9, "#ffe680");
        disk(ctx, sx - 1, sy - 1, 7, "#fff6c8");
        clouds.forEach((c) => wrapDraw(ctx, c.c, c.o - t * 0.001 * c.sp * 3, W + 40, c.y));
        wrapDraw(ctx, far, t * 0.0012 + cam * 0.1, W);
        wrapDraw(ctx, hill, t * 0.0025 + cam * 0.25, W);
        // god rays
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.05 + 0.03 * Math.sin(t * 0.001 + i * 2);
          ctx.fillStyle = "#fff6c0";
          ctx.beginPath();
          const x0 = W * (0.55 + i * 0.13);
          ctx.moveTo(x0, 0); ctx.lineTo(x0 + 14, 0); ctx.lineTo(x0 - 40, 150); ctx.lineTo(x0 - 64, 150);
          ctx.fill();
        }
        ctx.restore();
        wrapDraw(ctx, line, cam * 0.5, W);
        ctx.drawImage(gnd, 0, 0);
        flowers.forEach((fl) => {
          const sw = Math.round(Math.sin(t * 0.003 + fl.p));
          px(ctx, fl.x, fl.y - 3, 1, 3, "#2f7a2e");
          px(ctx, fl.x - 1 + sw, fl.y - 5, 3, 1, fl.c);
          px(ctx, fl.x + sw, fl.y - 6, 1, 3, fl.c);
          px(ctx, fl.x + sw, fl.y - 5, 1, 1, "#ffe680");
        });
      },
      front(ctx, t) {
        blades.forEach((b) => {
          const tip = Math.round(Math.sin(t * 0.0035 + b.p) * 1.6);
          const y = H - 3;
          for (let k = 0; k < b.h; k++) px(ctx, b.x + Math.round(tip * k / b.h), y - k, 1, 1, k === b.h - 1 ? "#9ae070" : b.c);
        });
        const sw = Math.round(Math.sin(t * 0.0016) * 1.5);
        ctx.drawImage(canopy, -14 + sw, 20);
        ctx.drawImage(canopyR, W - 76 - sw, 18);
        ctx.drawImage(vig, 0, 0);
      }
    };
  }

  /* ---------------- CAVE ---------------- */
  function buildCave(W) {
    const [bg, b] = mk(W, H);
    bandGrad(b, 0, H, W, ["#07040e", "#120a20", "#1a1230", "#20163a"]);
    for (let i = 0; i < W * 0.8; i++) {
      const x = (rnd(i) * W) | 0, y = 20 + ((rnd(i * 3) * 110) | 0);
      const w = 4 + ((rnd(i * 5) * 10) | 0);
      px(b, x, y, w, 1, rnd(i * 7) > 0.5 ? "#241a3c" : "#160e26");
    }
    const crystals = [];
    const [far, f] = mk(W, H);
    ridge(f, W, 112, [8, 5, 3], 2.2, "#1c1430", "#2c2248");
    for (let i = 0; i < Math.max(4, W / 70); i++) {
      const x = ((i + 0.5) * W) / Math.max(4, W / 70) + (rnd(i) - 0.5) * 30;
      const y = ridgeY(x, W, 112, [8, 5, 3], 2.2) + 4;
      const col = i % 2 ? ["#3a7ad8", "#7ac8ff", "#d8f4ff"] : ["#6a2ad0", "#a66aff", "#ecdcff"];
      for (let k = 0; k < 4; k++) {
        const cx = x + (k - 1.5) * 4, hh = 8 + ((rnd(i * 4 + k) * 12) | 0);
        for (let yy = 0; yy < hh; yy++) {
          const ww = Math.max(1, Math.round(3 - yy / hh * 2.5 + (yy > hh * 0.7 ? 0 : 0)));
          px(f, cx - ww + 1, y - yy, ww * 2, 1, col[0]);
          px(f, cx, y - yy, 1, 1, col[1]);
        }
        px(f, cx, y - hh, 1, 2, col[2]);
      }
      crystals.push({ x, y: y - 10, col: col[1], p: rnd(i) * 6 });
    }
    const [top, tp] = mk(W, 60);
    for (let i = 0; i < W / 14; i++) {
      const x = i * 14 + ((rnd(i) * 8) | 0), hh = 8 + ((rnd(i * 9) * 26) | 0);
      for (let y = 0; y < hh; y++) {
        const ww = Math.max(0, Math.round(5 * (1 - y / hh)));
        px(tp, x - ww, y, ww * 2 + 1, 1, "#2a2042");
        px(tp, x - ww, y, 1, 1, "#4a3c6a");
      }
    }
    px(tp, 0, 0, W, 4, "#1c1430");
    const tips = [];
    for (let i = 0; i < W / 14; i++) tips.push({ x: i * 14 + ((rnd(i) * 8) | 0), y: 8 + ((rnd(i * 9) * 26) | 0), p: rnd(i * 2) * 3000 });
    const [mid, m] = mk(W, H);
    for (let i = 0; i < W / 60; i++) {
      const x = i * 60 + rnd(i * 4) * 30, hh = 20 + rnd(i) * 22;
      for (let y = 0; y < hh; y++) {
        const ww = Math.round(2 + (y / hh) * 7);
        px(m, x - ww, GROUND - 6 - hh + y, ww * 2, 1, "#2a2040");
        px(m, x - ww, GROUND - 6 - hh + y, 1, 1, "#4a3c6a");
        px(m, x + ww - 1, GROUND - 6 - hh + y, 1, 1, "#160e26");
      }
    }
    const [gnd, g] = mk(W, H);
    bandGrad(g, GROUND - 7, H, W, ["#3a2e54", "#261c3a", "#160e24"]);
    for (let x = 0; x < W; x++) {
      px(g, x, GROUND - 7 - ((rnd(x * 3) * 2) | 0), 1, 1, "#5a4a80");
      if (rnd(x * 7) > 0.9) { const y = GROUND + rnd(x) * 22; px(g, x, y, 4, 2, "#2e2446"); px(g, x, y, 3, 1, "#463a66"); }
    }
    const puddles = [0.2, 0.62, 0.9].map((p, i) => ({ x: W * p, y: GROUND + 10 + i * 6, w: 18 + i * 6 }));
    puddles.forEach((p) => { px(g, p.x, p.y, p.w, 3, "#1a2448"); px(g, p.x + 2, p.y, p.w - 4, 1, "#2a3a6a"); });
    const shrooms = [0.08, 0.45, 0.95].map((p, i) => ({ x: W * p, p: i * 2 }));
    const vig = vignette(W, 0.7, "#05020c");
    const [dark, dk] = mk(W, H);
    const drips = [];
    return {
      amb: "spore",
      back(ctx, t, cam) {
        ctx.drawImage(bg, 0, 0);
        wrapDraw(ctx, far, cam * 0.2, W);
        crystals.forEach((c) => drawGlow(ctx, c.x - cam * 0.2, c.y, 18, c.col, 0.35 + 0.25 * Math.sin(t * 0.003 + c.p)));
        wrapDraw(ctx, mid, cam * 0.4, W);
        ctx.drawImage(top, 0, 0);
        ctx.drawImage(gnd, 0, 0);
        puddles.forEach((p, i) => {
          const sx = p.x + 2 + ((t * 0.01 + i * 7) % (p.w - 6));
          px(ctx, sx, p.y + 1, 3, 1, "#7ac8ff");
        });
        shrooms.forEach((s) => {
          const a = 0.5 + 0.4 * Math.sin(t * 0.004 + s.p);
          px(ctx, s.x, GROUND - 10, 2, 5, "#c8d8e8");
          px(ctx, s.x - 3, GROUND - 13, 8, 3, "#3ae0d0");
          px(ctx, s.x - 2, GROUND - 14, 6, 1, "#9afff0");
          drawGlow(ctx, s.x + 1, GROUND - 12, 12, "#3ae0d0", a * 0.6);
        });
        // drips
        tips.forEach((tp) => {
          const ph = (t + tp.p) % 3000;
          if (ph < 1400) {
            const yy = tp.y + Math.pow(ph / 1400, 2) * (GROUND - tp.y);
            px(ctx, tp.x, yy, 1, 2, "#8ab8ff");
          } else if (ph < 1600) {
            const k = (ph - 1400) / 200;
            px(ctx, tp.x - 2 - k * 2, GROUND - 2 - k * 3, 1, 1, "#8ab8ff");
            px(ctx, tp.x + 2 + k * 2, GROUND - 2 - k * 3, 1, 1, "#8ab8ff");
          }
        });
      },
      front(ctx, t, cam, lights) {
        dk.clearRect(0, 0, W, H);
        dk.globalCompositeOperation = "source-over";
        dk.fillStyle = "rgba(4,2,12,0.5)";
        dk.fillRect(0, 0, W, H);
        dk.globalCompositeOperation = "destination-out";
        (lights || []).concat(crystals.map((c) => ({ x: c.x, y: c.y, r: 30 })), shrooms.map((s) => ({ x: s.x, y: GROUND - 12, r: 18 }))).forEach((L) => {
          const gl = glow(L.r, "#ffffff");
          dk.globalAlpha = 1;
          dk.drawImage(gl, Math.round(L.x - L.r), Math.round(L.y - L.r));
          dk.drawImage(gl, Math.round(L.x - L.r), Math.round(L.y - L.r));
        });
        dk.globalCompositeOperation = "source-over";
        ctx.drawImage(dark, 0, 0);
        ctx.drawImage(vig, 0, 0);
      }
    };
  }

  /* ---------------- LAVA ---------------- */
  function buildLava(W) {
    const [sky, s] = mk(W, H);
    bandGrad(s, 0, 130, W, ["#12020a", "#2e060e", "#5a1210", "#9a2a10", "#d8561a"]);
    const [far, f] = mk(W, H);
    const vx = W * 0.62;
    for (let y = 40; y < 130; y++) {
      const ww = Math.round(10 + (y - 40) * 1.2);
      px(f, vx - ww, y, ww * 2, 1, "#2a0c0e");
      px(f, vx - ww, y, 2, 1, "#4a1a14");
    }
    for (let k = 0; k < 3; k++) {
      let x = vx - 6 + k * 6;
      for (let y = 42; y < 128; y++) { x += Math.round(Math.sin(y * 0.2 + k) * 0.8 + (k - 1) * 0.4); px(f, x, y, 2, 1, y % 9 < 5 ? "#ff6a10" : "#e04008"); }
    }
    ridge(f, W, 118, [6, 4, 2], 0.7, "#200a0c", "#5a1c12");
    const [mid, m] = mk(W, H);
    for (let x = 0; x < W; x++) {
      const y = 126 + Math.round(Math.abs(Math.sin(x * 0.09)) * -14 + Math.sin(x * 0.31) * 3);
      px(m, x, y, 1, H - y, "#140608");
      px(m, x, y, 1, 1, "#c4401a");
      if (x % 3 === 0) px(m, x, y + 1, 1, 1, "#7a200e");
    }
    const [gnd, g] = mk(W, H);
    bandGrad(g, GROUND - 5, H, W, ["#3a1a16", "#24100e", "#160808"]);
    for (let x = 0; x < W; x++) {
      px(g, x, GROUND - 5, 1, 1, "#6a2a1c");
      if (rnd(x * 5) > 0.92) { const y = GROUND + rnd(x) * 22; px(g, x, y, 5, 2, "#1a0a0a"); px(g, x, y, 4, 1, "#4a2018"); }
    }
    const cracks = [];
    for (let i = 0; i < W / 40; i++) {
      const pts = [];
      let x = rnd(i * 3) * W, y = GROUND + 2 + rnd(i) * 14;
      for (let k = 0; k < 9; k++) { pts.push([x | 0, y | 0]); x += 1 + rnd(i * 10 + k) * 2; y += rnd(i * 20 + k) > 0.5 ? 1 : 0; }
      cracks.push({ pts, p: rnd(i) * 6 });
    }
    const smoke = [0, 1, 2].map((i) => ({ c: cloudSprite(i + 20, 40 + i * 8, ["#2a0c10", "#3a1214", "#1e080a"]), y: 24 + i * 12, sp: 1 + i * 0.6, o: rnd(i + 3) * W }));
    const vig = vignette(W, 0.55, "#140204");
    const lakeY = 132;
    return {
      amb: "ember",
      back(ctx, t, cam) {
        ctx.drawImage(sky, 0, 0);
        smoke.forEach((c) => { ctx.globalAlpha = 0.85; wrapDraw(ctx, c.c, c.o - t * 0.001 * c.sp * 3, W + 50, c.y); ctx.globalAlpha = 1; });
        ctx.drawImage(far, -cam * 0.15, 0);
        drawGlow(ctx, vx - cam * 0.15, 42, 30, "#ff7a1a", 0.45 + 0.2 * Math.sin(t * 0.004));
        wrapDraw(ctx, mid, cam * 0.35, W);
        // lava lake
        const wv = Math.round(Math.sin(t * 0.003));
        px(ctx, 0, lakeY + wv, W, GROUND - lakeY - 4, "#c8360c");
        px(ctx, 0, lakeY + wv, W, 2, "#ff8a1a");
        for (let i = 0; i < W / 16; i++) {
          const x = ((i * 16 + t * 0.012 * (1 + (i % 3) * 0.3)) % (W + 20)) - 10;
          const y = lakeY + 3 + (i % 4) * 3 + wv;
          px(ctx, x, y, 6 + (i % 3) * 3, 1, i % 2 ? "#ffd23f" : "#ff9a2a");
        }
        for (let i = 0; i < 5; i++) {
          const ph = ((t * 0.001 + i * 0.37) % 1.6);
          if (ph < 1) {
            const bx = (rnd(i + Math.floor(t * 0.001 / 1.6 + i)) * W) | 0;
            const r = Math.round(ph * 3);
            px(ctx, bx - r, lakeY + 6 - r, r * 2 + 1, r + 1, "#ffb030");
            px(ctx, bx - r + 1, lakeY + 6 - r, Math.max(1, r * 2 - 1), 1, "#fff0a0");
          }
        }
        drawGlow(ctx, W * 0.3, lakeY + 6, 40, "#ff5a00", 0.25);
        drawGlow(ctx, W * 0.8, lakeY + 6, 40, "#ff5a00", 0.25);
        ctx.drawImage(gnd, 0, 0);
        cracks.forEach((c) => {
          const a = 0.55 + 0.45 * Math.sin(t * 0.004 + c.p);
          ctx.globalAlpha = a;
          c.pts.forEach(([x, y]) => px(ctx, x, y, 1, 1, "#ff7a1a"));
          ctx.globalAlpha = 1;
        });
      },
      front(ctx, t) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.08 + 0.03 * Math.sin(t * 0.005);
        ctx.fillStyle = "#ff4a00";
        ctx.fillRect(0, 110, W, 70);
        ctx.restore();
        ctx.drawImage(vig, 0, 0);
      }
    };
  }

  /* ---------------- CASTLE ---------------- */
  function buildCastle(W) {
    const [sky, s] = mk(W, H);
    bandGrad(s, 0, 120, W, ["#04041a", "#0a0a2a", "#16143e", "#2a2050", "#3a2a5a"]);
    const stars = [];
    for (let i = 0; i < W / 6; i++) stars.push({ x: (rnd(i) * W) | 0, y: (rnd(i * 3) * 90) | 0, p: rnd(i * 5) * 6, b: rnd(i * 7) > 0.85 });
    const [far, f] = mk(W, H);
    const cx = W * 0.62;
    const tower = (x, top, w, col, roof) => {
      px(f, x, top, w, 120 - top, col);
      for (let k = 0; k < w; k += 3) px(f, x + k, top - 3, 2, 3, col);
      if (roof) {
        for (let y = 0; y < 14; y++) { const ww = Math.round((y / 14) * (w / 2 + 2)); px(f, x + w / 2 - ww, top - 17 + y, ww * 2, 1, "#2a1a4a"); }
      }
    };
    tower(cx - 50, 60, 14, "#14122e", true);
    tower(cx + 40, 56, 14, "#14122e", true);
    tower(cx - 12, 40, 22, "#18163a", true);
    px(f, cx - 40, 76, 84, 44, "#14122e");
    for (let k = 0; k < 84; k += 5) px(f, cx - 40 + k, 72, 3, 4, "#14122e");
    const wins = [];
    [[cx - 46, 72], [cx + 44, 70], [cx - 4, 54], [cx + 2, 54], [cx - 28, 90], [cx - 10, 92], [cx + 12, 90], [cx + 28, 92], [cx - 2, 74]].forEach(([x, y], i) => wins.push({ x: x | 0, y, p: i * 1.7 }));
    ridge(f, W, 122, [4, 3, 1], 3.3, "#0c0a20", "#1c1a3a");
    const [wall, w] = mk(W, H);
    const wy = 100;
    px(w, 0, wy, W, GROUND - wy, "#2c2a52");
    for (let x = 0; x < W; x += 12) { px(w, x, wy - 7, 8, 7, "#2c2a52"); px(w, x, wy - 7, 8, 1, "#4a4878"); px(w, x + 7, wy - 7, 1, 7, "#1c1a3a"); }
    for (let y = wy; y < GROUND; y += 6) {
      const off = ((y / 6) % 2) * 6;
      px(w, 0, y, W, 1, "#1c1a3a");
      for (let x = -off; x < W; x += 12) { px(w, x, y, 1, 6, "#1c1a3a"); px(w, x + 1, y + 1, 10, 1, "#3a3866"); if (rnd(x * 3 + y) > 0.8) px(w, x + 3, y + 3, 2, 1, "#24224a"); }
    }
    px(w, 0, wy, W, 1, "#5a5890");
    const [gnd, g] = mk(W, H);
    px(g, 0, GROUND - 6, W, H - GROUND + 6, "#2a2850");
    for (let r = 0; r < 5; r++) {
      const y = GROUND - 6 + [0, 5, 11, 18, 26][r];
      const hh = [5, 6, 7, 8, 10][r];
      const tw = 14 + r * 4, off = (r % 2) * tw / 2;
      for (let x = -off; x < W; x += tw) {
        px(g, x + 1, y + 1, tw - 2, hh - 2, (Math.floor(x / tw) + r) % 2 ? "#3c3a6a" : "#34325e");
        px(g, x + 1, y + 1, tw - 2, 1, "#5a5890");
      }
    }
    // carpet
    for (let y = GROUND - 6; y < H; y++) {
      const ww = Math.round(18 + (y - GROUND) * 0.9);
      px(g, W / 2 - ww, y, ww * 2, 1, "#8a1c28");
      px(g, W / 2 - ww, y, 2, 1, "#d4af37");
      px(g, W / 2 + ww - 2, y, 2, 1, "#d4af37");
    }
    const pillars = [W * 0.04, W * 0.96 - 14];
    const vig = vignette(W, 0.55, "#04020e");
    const banners = [W * 0.3, W * 0.5, W * 0.7];
    return {
      amb: "mote",
      back(ctx, t, cam) {
        ctx.drawImage(sky, 0, 0);
        stars.forEach((st) => {
          const a = Math.sin(t * 0.003 + st.p);
          if (a > -0.3) px(ctx, st.x, st.y, 1, 1, a > 0.6 ? "#ffffff" : "#b8b8e8");
          if (st.b && a > 0.7) { px(ctx, st.x - 1, st.y, 3, 1, "#ffffff88"); px(ctx, st.x, st.y - 1, 1, 3, "#ffffff88"); }
        });
        const mx = W * 0.16, my = 44;
        drawGlow(ctx, mx, my, 28, "#c8c8ff", 0.35);
        disk(ctx, mx, my, 9, "#f0ecd0");
        disk(ctx, mx + 3, my - 2, 7, "#d8d4b8");
        px(ctx, mx - 4, my + 2, 2, 2, "#c8c4a8"); px(ctx, mx + 1, my + 4, 3, 2, "#c8c4a8");
        ctx.drawImage(far, -cam * 0.12, 0);
        wins.forEach((wn) => {
          const fl = 0.6 + 0.4 * Math.sin(t * 0.006 + wn.p) * Math.sin(t * 0.0021 + wn.p * 2);
          px(ctx, wn.x - cam * 0.12, wn.y, 3, 5, fl > 0.5 ? "#ffd166" : "#e09a3a");
          drawGlow(ctx, wn.x + 1 - cam * 0.12, wn.y + 2, 6, "#ffb040", 0.25 * fl);
        });
        wrapDraw(ctx, wall, cam * 0.3, W);
        banners.forEach((bx, i) => {
          for (let y = 0; y < 22; y++) {
            const sx = Math.round(Math.sin(t * 0.004 + y * 0.25 + i) * (y / 22) * 2);
            px(ctx, bx - 5 + sx, 104 + y, 10, 1, y < 2 ? "#d4af37" : "#9b2226");
            px(ctx, bx - 5 + sx, 104 + y, 1, 1, "#5a0c14");
            if (y > 6 && y < 15) { const dw = 4 - Math.abs(y - 10.5); px(ctx, bx - Math.round(dw) + sx, 104 + y, Math.round(dw) * 2, 1, "#ffd166"); }
          }
          px(ctx, bx - 4, 126, 2, 2, "#9b2226"); px(ctx, bx + 2, 126, 2, 2, "#9b2226");
        });
        ctx.drawImage(gnd, 0, 0);
        pillars.forEach((x) => {
          px(ctx, x, 70, 14, GROUND - 70, "#3a3866");
          px(ctx, x, 70, 3, GROUND - 70, "#5a5890");
          px(ctx, x + 11, 70, 3, GROUND - 70, "#24224a");
          px(ctx, x - 2, 66, 18, 5, "#4a4878");
          px(ctx, x - 2, GROUND - 6, 18, 5, "#4a4878");
          const fx = x + 7;
          px(ctx, fx - 2, 104, 5, 3, "#5a3418");
          px(ctx, fx - 1, 107, 3, 6, "#3a2010");
          const f1 = Math.sin(t * 0.02 + x) > 0;
          const hh = 6 + Math.round(Math.sin(t * 0.031 + x) * 1.5);
          px(ctx, fx - 2, 103 - hh, 5, hh, "#ff6a00");
          px(ctx, fx - 1 + (f1 ? 0 : 1), 102 - hh, 2, hh - 1, "#ffcc33");
          px(ctx, fx, 103 - 3, 1, 2, "#fff6c0");
          drawGlow(ctx, fx, 98, 34, "#ff9a30", 0.38 + 0.12 * Math.sin(t * 0.017 + x));
        });
      },
      front(ctx) { ctx.drawImage(vig, 0, 0); }
    };
  }

  const cache = new Map();
  function get(stage, W) {
    const key = stage + W;
    if (!cache.has(key)) {
      const b = stage === "cave" ? buildCave : stage === "lava" ? buildLava : stage === "castle" ? buildCastle : buildForest;
      cache.set(key, b(W));
    }
    return cache.get(key);
  }

  /* ---------------- AMBIENT PARTICLES ---------------- */
  function ambient(kind, W, list, t, dt) {
    const want = kind === "leaf" ? 16 : kind === "spore" ? 26 : kind === "ember" ? 34 : 24;
    while (list.length < want) {
      const p = { x: Math.random() * W, y: Math.random() * H, life: Math.random(), ph: Math.random() * 6, k: kind };
      if (kind === "ember") { p.y = H + Math.random() * 30; p.vy = -(10 + Math.random() * 22); p.vx = (Math.random() - 0.3) * 6; }
      else if (kind === "leaf") { p.y = -Math.random() * H; p.vy = 8 + Math.random() * 8; p.vx = -6 - Math.random() * 8; p.fire = Math.random() < 0.45; }
      else if (kind === "spore") { p.vy = -2 - Math.random() * 3; p.vx = (Math.random() - 0.5) * 3; }
      else { p.vy = -3 - Math.random() * 5; p.vx = (Math.random() - 0.5) * 2; }
      list.push(p);
    }
    const s = dt / 1000;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.x += (p.vx + Math.sin(t * 0.002 + p.ph) * (kind === "leaf" ? 8 : 3)) * s;
      p.y += p.vy * s;
      if (p.y < -10 || p.y > H + 40 || p.x < -10 || p.x > W + 10) list.splice(i, 1);
    }
  }
  function drawAmbient(ctx, list, t) {
    list.forEach((p) => {
      if (p.k === "leaf") {
        if (p.fire) {
          const a = 0.5 + 0.5 * Math.sin(t * 0.006 + p.ph);
          if (p.y > 40 && p.y < 150) { px(ctx, p.x, p.y, 1, 1, a > 0.5 ? "#fff6a0" : "#d8f070"); if (a > 0.7) drawGlow(ctx, p.x, p.y, 4, "#f0ff80", 0.4); }
        } else {
          const f = Math.sin(t * 0.008 + p.ph) > 0;
          px(ctx, p.x, p.y, f ? 2 : 1, f ? 1 : 2, p.ph > 3 ? "#e0a030" : "#6ac040");
        }
      } else if (p.k === "spore") {
        const a = 0.5 + 0.5 * Math.sin(t * 0.004 + p.ph);
        px(ctx, p.x, p.y, 1, 1, a > 0.5 ? "#9afff0" : "#5a8ad0");
      } else if (p.k === "ember") {
        const a = Math.sin(t * 0.01 + p.ph);
        px(ctx, p.x, p.y, a > 0.3 ? 2 : 1, 1, a > 0 ? "#ffd23f" : "#ff6a10");
      } else {
        const a = 0.5 + 0.5 * Math.sin(t * 0.003 + p.ph);
        px(ctx, p.x, p.y, 1, 1, p.ph > 3 ? (a > 0.5 ? "#ffe8a0" : "#c8a040") : (a > 0.5 ? "#d8c0ff" : "#8a6ad0"));
      }
    });
  }

  /* ---------------- WORLD MAP ---------------- */
  const mapCache = new Map();
  function mapPoints(W) {
    const base = [[18, 128], [46, 112], [76, 126], [108, 100], [146, 116], [176, 92], [206, 112], [236, 88], [260, 116], [286, 98], [306, 108]];
    return base.map(([x, y]) => [Math.round((x / 320) * W), y]);
  }
  function buildMap(W) {
    const [c, x] = mk(W, H);
    // sea
    bandGrad(x, 0, H, W, ["#1a4a8a", "#2a64a8", "#1e5496"]);
    for (let i = 0; i < W * 0.6; i++) px(x, rnd(i) * W, rnd(i * 3) * H, 3, 1, "#3a7ac0");
    // land mass
    const landTop = (xx) => 34 + Math.round(Math.sin(xx * 0.05) * 6 + Math.sin(xx * 0.13) * 3);
    const landBot = (xx) => 160 + Math.round(Math.sin(xx * 0.07 + 1) * 6 + Math.sin(xx * 0.19) * 2);
    const zone = (xx) => (xx < W * 0.25 ? 0 : xx < W * 0.5 ? 1 : xx < W * 0.75 ? 2 : 3);
    const ZC = [["#5cb048", "#4a9a3c", "#78c860"], ["#7a7088", "#5e566e", "#9a90a8"], ["#5a2a1c", "#3e1a12", "#7a3a24"], ["#4a4a6a", "#3a3a58", "#6a6a8a"]];
    for (let xx = 0; xx < W; xx++) {
      const t0 = landTop(xx), b0 = landBot(xx);
      const z = zone(xx);
      px(x, xx, t0 - 2, 1, b0 - t0 + 4, "#e8d8a0");
      px(x, xx, t0, 1, b0 - t0, ZC[z][0]);
      for (let yy = t0; yy < b0; yy++) {
        if (rnd(xx * 31 + yy * 7) > 0.86) px(x, xx, yy, 1, 1, ZC[z][1]);
        else if (rnd(xx * 17 + yy * 13) > 0.94) px(x, xx, yy, 1, 1, ZC[z][2]);
      }
      px(x, xx, b0, 1, 3, "#c8b880");
    }
    // forest trees
    for (let i = 0; i < W * 0.12; i++) {
      const xx = 6 + rnd(i * 3) * (W * 0.23), yy = 50 + rnd(i * 5) * 90;
      roundTree(x, xx, yy + 6, 2, 4, ["#1f5a2a", "#2e7a34", "#62b450", "#4a2c16", "#4a2c16"], i);
    }
    // mountains
    for (let i = 0; i < 9; i++) {
      const mx = W * 0.27 + rnd(i * 7) * W * 0.21, my = 60 + rnd(i * 11) * 80, hh = 12 + rnd(i) * 10;
      for (let y = 0; y < hh; y++) {
        const ww = Math.round(y * 0.9);
        px(x, mx - ww, my - hh + y, ww * 2 + 1, 1, "#6a6278");
        px(x, mx - ww, my - hh + y, ww + 1, 1, "#8a8298");
        if (y < 4) px(x, mx - ww, my - hh + y, ww * 2 + 1, 1, "#eef0ff");
      }
    }
    // lava rivers + volcano
    const vx = W * 0.62;
    for (let y = 0; y < 26; y++) { const ww = Math.round(4 + y); px(x, vx - ww, 44 + y, ww * 2, 1, y < 2 ? "#ff6a10" : "#2a1010"); px(x, vx - ww, 44 + y, ww, 1, y < 2 ? "#ffd23f" : "#3e1a14"); }
    let rx = vx;
    for (let y = 70; y < 156; y++) { rx += Math.sin(y * 0.15) * 0.9; px(x, rx, y, 3, 1, "#ff6a10"); px(x, rx + 1, y, 1, 1, "#ffd23f"); }
    // castle
    const kx = W * 0.88, ky = 64;
    px(x, kx - 14, ky, 28, 18, "#2a2850"); px(x, kx - 14, ky, 28, 1, "#6a6898");
    px(x, kx - 18, ky - 8, 7, 26, "#34325e"); px(x, kx + 11, ky - 8, 7, 26, "#34325e");
    px(x, kx - 4, ky - 14, 8, 14, "#3a3866");
    for (let k = 0; k < 4; k++) { px(x, kx - 18 + k * 2, ky - 10, 1, 2, "#34325e"); px(x, kx + 11 + k * 2, ky - 10, 1, 2, "#34325e"); }
    px(x, kx - 2, ky + 10, 4, 8, "#140c20");
    px(x, kx - 10, ky + 4, 2, 3, "#ffd166"); px(x, kx + 8, ky + 4, 2, 3, "#ffd166");
    // path base
    const pts = mapPoints(W);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let s = 0; s < n; s++) {
        const f = s / n;
        px(x, a[0] + (b[0] - a[0]) * f - 2, a[1] + (b[1] - a[1]) * f - 1, 5, 3, "#00000030");
      }
    }
    const vig = vignette(W, 0.45, "#06101e");
    return { c, pts, vig, vx, kx, ky };
  }
  function getMap(W) {
    if (!mapCache.has(W)) mapCache.set(W, buildMap(W));
    return mapCache.get(W);
  }

  G.Scenes = { get, getMap, mapPoints, ambient, drawAmbient, drawGlow, disk, px, glow, rnd, mk };
})(window);
