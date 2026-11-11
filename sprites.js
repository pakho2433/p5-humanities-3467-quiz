/* v3 pixel sprite kit — original hand-authored pixel maps, baked with auto outline + shading */
(function (G) {
  const cache = new Map();
  function rgba(hex) {
    let s = hex.replace("#", "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
    const a = s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255;
    return [r, g, b, a];
  }
  const EMPTY = (c) => c === undefined || c === "." || c === " ";

  function sym(half) {
    return half.map((r) => r + r.split("").reverse().join("").replace(/h/g, "m"));
  }
  function squash(rows, split) {
    // compress the part above `split` by 1px (breathing frame)
    const w = rows[0].length;
    const out = rows.slice();
    out.splice(split, 1);
    out.unshift(".".repeat(w));
    return out;
  }
  function blink(rows) { return rows.map((r) => r.replace(/[ek]/g, (c) => (c === "e" ? "m" : "o"))); }
  function overlay(base, top, ox, oy) {
    const out = base.map((r) => r.split(""));
    top.forEach((row, y) => {
      const yy = y + (oy || 0);
      if (yy < 0 || yy >= out.length) return;
      row.split("").forEach((c, x) => {
        const xx = x + (ox || 0);
        if (c === "." || xx < 0 || xx >= out[yy].length) return;
        out[yy][xx] = c === "_" ? "." : c;
      });
    });
    return out.map((r) => r.join(""));
  }
  function blank(w, h) { return Array.from({ length: h }, () => ".".repeat(w)); }

  function bake(rows, pal, opt) {
    opt = opt || {};
    const h = rows.length;
    const w = rows.reduce((a, r) => Math.max(a, r.length), 0);
    const g = rows.map((r) => r.padEnd(w, ".").split(""));
    const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? "." : g[y][x]);
    const filled = (c) => !EMPTY(c) && pal[c] !== undefined;
    if (opt.shade !== false) {
      const out = g.map((r) => r.slice());
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (g[y][x] !== "m") continue;
        if (!filled(at(x, y + 1)) || !filled(at(x + 1, y))) out[y][x] = pal.d ? "d" : "m";
        else if (!filled(at(x, y - 1)) || !filled(at(x - 1, y))) out[y][x] = pal.l ? "l" : "m";
        else if (h > 14 && !filled(at(x, y + 2)) && pal.d) out[y][x] = "n";
      }
      for (let y = 0; y < h; y++) g[y] = out[y];
    }
    const P = opt.outline === false ? 0 : 1;
    const cw = w + 2 * P, ch = h + 2 * P;
    const cv = document.createElement("canvas");
    cv.width = cw; cv.height = ch;
    const wv = document.createElement("canvas");
    wv.width = cw; wv.height = ch;
    const id = cv.getContext("2d").createImageData(cw, ch);
    const wd = wv.getContext("2d").createImageData(cw, ch);
    const pixels = [];
    const occ = new Uint8Array(cw * ch);
    const put = (x, y, col) => {
      const [r, gg, b, a] = rgba(col);
      const i = (y * cw + x) * 4;
      id.data[i] = r; id.data[i + 1] = gg; id.data[i + 2] = b; id.data[i + 3] = a;
      wd.data[i] = 255; wd.data[i + 1] = 255; wd.data[i + 2] = 255; wd.data[i + 3] = a;
    };
    const midShade = pal.n || pal.d;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = g[y][x];
      if (EMPTY(c)) continue;
      let col = c === "n" ? mixHex(pal.m, pal.d) : pal[c];
      if (col === undefined) continue;
      put(x + P, y + P, col);
      occ[(y + P) * cw + x + P] = 1;
      pixels.push([x + P, y + P, col]);
    }
    if (P) {
      const oc = pal.o || "#140c12";
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        if (occ[y * cw + x]) continue;
        const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < cw && yy < ch && occ[yy * cw + xx] === 1;
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) {
          put(x, y, oc);
          occ[y * cw + x] = 2;
        }
      }
    }
    cv.getContext("2d").putImageData(id, 0, 0);
    wv.getContext("2d").putImageData(wd, 0, 0);
    return { c: cv, white: wv, w: cw, h: ch, px: pixels };
  }
  function mixHex(a, b) {
    if (!a || !b) return a || b;
    const A = rgba(a), B = rgba(b);
    const h2 = (v) => Math.round(v).toString(16).padStart(2, "0");
    return "#" + h2((A[0] + B[0]) / 2) + h2((A[1] + B[1]) / 2) + h2((A[2] + B[2]) / 2);
  }
  function cached(key, fn) {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
  }

  /* ================= MONSTERS ================= */
  const MON = {};
  const PAL = {
    slime: { o: "#0e2a14", d: "#1f6b2c", m: "#3fae3c", l: "#7ddc5a", h: "#d8ffc0", e: "#ffffff", k: "#10151a", r: "#7a1830", t: "#ffffff", a: "#ffe066", A: "#b8860b", g: "#ff5577" },
    kingSlime: { o: "#0c1838", d: "#2244a0", m: "#3d7ae0", l: "#8cc4ff", h: "#e8f6ff", e: "#ffffff", k: "#0c1020", r: "#5a1030", t: "#ffffff", a: "#ffd23f", A: "#b07a10", g: "#ff3366" },
    bat: { o: "#120a1c", d: "#3a2160", m: "#6a46a8", l: "#9c7ad8", h: "#e2d4ff", a: "#b15d8f", e: "#ffe14d", k: "#ff3030", r: "#3a0a1a", t: "#ffffff" },
    spike: { o: "#1c0c08", d: "#6a3420", m: "#a8603a", l: "#d8955c", h: "#ffe0b0", a: "#f2e6c8", A: "#9a8c70", e: "#ffffff", k: "#120808", r: "#5a0c10", t: "#ffffff" },
    imp: { o: "#1c0606", d: "#7a1a10", m: "#c8361e", l: "#ff7040", h: "#ffc4a0", a: "#f4e2b8", A: "#8a7050", e: "#ffe14d", k: "#1a0606", r: "#3a0606", t: "#ffffff" },
    wolf: { o: "#101218", d: "#3c4250", m: "#6c7688", l: "#a4aec0", h: "#e8eef8", a: "#2a2e38", A: "#1a1c22", e: "#ffd23f", k: "#101010", r: "#7a1020", t: "#ffffff" },
    ghost: { o: "#0c1a34", d: "#5a86c8", m: "#a8d0ff", l: "#d8ecff", h: "#ffffff", e: "#7af0ff", k: "#0a1230", r: "#2a1040", t: "#ffffff" },
    beetle: { o: "#081408", d: "#1c4a24", m: "#2f8a3a", l: "#5cc25a", h: "#c8ffb0", a: "#3a2a1a", A: "#22160c", e: "#ffe14d", k: "#200808", r: "#601010", t: "#ffffff" },
    ogre: { o: "#14160a", d: "#4a5a24", m: "#7c9438", l: "#a8c45c", h: "#e0f0a8", a: "#8a5a30", A: "#5a3418", e: "#ffffff", k: "#c01818", r: "#3a1010", t: "#fff4d0", g: "#ffd23f" },
    fireOgre: { o: "#1c0604", d: "#7a1c08", m: "#c84418", l: "#ff8440", h: "#ffd0a0", a: "#3a2a2a", A: "#1e1414", e: "#fff4a0", k: "#ff2a00", r: "#2a0404", t: "#fff4d0", g: "#ffd23f" },
    dragon: { o: "#120624", d: "#3c1c86", m: "#6a3ad0", l: "#a07cff", h: "#e4d8ff", a: "#ffcf4a", A: "#c08410", e: "#ffe14d", k: "#200404", r: "#8a1030", t: "#ffffff", g: "#ff6a00" },
    darkKnight: { o: "#06060c", d: "#22243a", m: "#40445e", l: "#6c7294", h: "#b8c0e0", a: "#b81c2c", A: "#6a0c18", e: "#ff3040", k: "#06060a", g: "#ff4050", r: "#300", t: "#fff" }
  };

  MON.slime = sym([
    "........mmm",
    ".....mmmmmm",
    "...mmhhmmmm",
    "..mmhhmmmmm",
    ".mmmhmmmmmm",
    ".mmmmmmmmmm",
    "mmmmeekmmmm",
    "mmmmekkmmmm",
    "mmmmmmmmmmm",
    "mmgmmmmmrrr",
    "mmmmmmmmmrt",
    "mmmmmmmmmmm",
    "mmmmmhmmmmm",
    ".mmmmmmmmmm",
    "..mmmmmmmmm"
  ]);
  MON.kingSlime = sym([
    "...............A...A",
    "..............AaA.Aa",
    "..............Aaaaaa",
    "..............Aaagaa",
    "..............AAAAAA",
    "..........mmmmmmmmmm",
    ".......mmmmmmmmmmmmm",
    ".....mmmhhmmmmmmmmmm",
    "....mmmhhmmmmmmmmmmm",
    "...mmmhhmmmmmmmmmmmm",
    "..mmmmhmmmmmmmmmmmmm",
    "..mmmmmmmmmmmmmmmmmm",
    ".mmmmmmmmmeeekmmmmmm",
    ".mmmmmmmmmeekkmmmmmm",
    ".mmmmmmmmmekkkmmmmmm",
    "mmmmmmmmmmmmmmmmmmmm",
    "mmmmmmmmmmmmmmmrrrrr",
    "mmmmmmmmmmmmmmrrtrtr",
    "mmmmmmmmmmmmmmmrrrrr",
    "mmmmhmmmmmmmmmmmmmmm",
    "mmmmmmmmmmmmmmmmmmmm",
    "mmmmmmmmmmmmhmmmmmmm",
    "mmmmmmmmmmmmmmmmmmmm",
    ".mmmmmmmmmmmmmmmmmmm",
    "..mmmmmmmmmmmmmmmmmm",
    "....mmmmmmmmmmmmmmmm"
  ]);
  MON.batUp = sym([
    "d............",
    "dd...........",
    "dad.......m..",
    "daad.....mmm.",
    ".daad...mmmmm",
    "..daaddmmmmmm",
    "...daadmmeekm",
    "....dddmmekkm",
    ".......mmmmmm",
    ".......mmmmtr",
    "........mmmmm",
    ".........mm.."
  ]);
  MON.batDown = sym([
    ".............",
    ".............",
    "..........m..",
    ".........mmm.",
    "........mmmmm",
    ".......mmmmmm",
    "....dddmmeekm",
    "..ddaadmmekkm",
    ".daaaadmmmmmm",
    "daaaad.mmmmtr",
    "dad.....mmmmm",
    "d........mm.."
  ]);
  MON.batMid = sym([
    ".............",
    ".............",
    "..........m..",
    ".........mmm.",
    "........mmmmm",
    "ddd....mmmmmm",
    "daaddddmmeekm",
    ".daaaadmmekkm",
    "..daaadmmmmmm",
    "...ddd.mmmmtr",
    "........mmmmm",
    ".........mm.."
  ]);
  MON.spike = sym([
    ".....a......",
    "....aA...a..",
    "..a.Am..aA..",
    "..aAmmmmAm.a",
    "...mmmmmmmaA",
    ".aAmmhmmmmmm",
    "..mmhmmmmmmm",
    "aAmmmmmmmmmm",
    ".mmmmeekmmmm",
    "..mmmekkmmmm",
    "aAmmmmmmmmmm",
    ".mmmmmmmmrrr",
    "..mmmmmmmmtr",
    "...mmmmmmmmm",
    "....mmmmmmmm",
    ".....AA...AA"
  ]);
  MON.imp = sym([
    "..A.........",
    "..aA........",
    "...aA.......",
    "...aAmmmmmmm",
    "....mmmmmmmm",
    "...mmmmmmmmm",
    "..mmhmmmmmmm",
    "..mmmeekmmmm",
    "..mmmekkmmmm",
    "..mmmmmmmmmm",
    "...mmmmmrrrr",
    "...mmmmrtrtr",
    "....mmmmmmmm",
    ".....mmmmmmm",
    "..mm.mmmmmmm",
    ".mmmmmmmmlll",
    ".mm..mmmmlll",
    ".mm..mmmmmll",
    "aaa..mmmmmmm",
    ".a....mmmmmm",
    "......mmmmmm",
    "......mmm..m",
    "......mmm...",
    ".....AAAA..."
  ]);
  MON.wolf = [
    "...A..A.....................",
    "..AmAAmA....................",
    "..Ammmmm....................",
    ".mmmmmmmm...................",
    "mmmekmmmmm..................",
    "mmmkkmmmmmmmmmmmmmmmmmmm.....",
    "kmmmmmmmmmmmmmmmmmmmmmmmm..mm",
    "rrrmmmmmmmmmmmmmmmmmmmmmmmmmm",
    "tttmmmmmhhhmmmmmmmmmmmmmmmmm.",
    ".rrmmmmlllllllmmmmmmmmmmmm...",
    "...mmmmlllllllllmmmmmmmmm....",
    "....mmmmmmmmmmmmmmmmmmmmm....",
    "....mmmm..mmmmmmmmmmmmmmm....",
    "....mmm...mmm.......mmmmm....",
    "....mmm...mmm.......mm.mm....",
    "....mm....mm........mm..mm...",
    "...AAA...AAA.......AAA.AAA..."
  ];
  MON.ghost = sym([
    "......mmmmm",
    "....mmmmmmm",
    "...mmhhmmmm",
    "..mmhmmmmmm",
    "..mhmmmmmmm",
    ".mmmmmmmmmm",
    ".mmmkkkmmmm",
    ".mmkkkkkmmm",
    ".mmkekkkmmm",
    ".mmmkkkmmmm",
    "mmmmmmmmmmm",
    "mmmmmmmmkkk",
    "mmmmmmmmkrr",
    "mmmmmmmmmkk",
    "mmmmmmmmmmm",
    "mmmmmmmmmmm",
    "mmmmmmmmmmm",
    "mmmmmmmmmmm",
    "mmm.mmmmm.m",
    "mm...mmm...",
    "m.....m...."
  ]);
  MON.ghost2 = MON.ghost.slice(0, 18).concat(sym([
    "m.mmmmm.mmm",
    "...mmm...mm",
    "....m.....m"
  ]));
  MON.beetle = sym([
    "...A........",
    "....A.......",
    ".....A..aaaa",
    "......aaaaaa",
    ".....aaeekaa",
    "....mmmmmmmA",
    "...mmhhmmmmA",
    "..mmhmmmmmmA",
    ".mmhmmmlmmmA",
    ".mmmmmlllmmA",
    "AmmmmmmlmmmA",
    ".mmmmmmmmmmA",
    "Ammmmmmmmmma",
    ".mmmmmmmmmmA",
    "..mmmmmmmmmA",
    ".A.aammmmmmA",
    "A....aa.aaaa"
  ]);
  MON.ogre = sym([
    "...........mmmmmmm",
    ".........mmmmmmmmm",
    "........mmhhmmmmmm",
    ".......mmhmmmmmmmm",
    ".......mmmmmmmmmmm",
    ".......mmmAAAmmmmm",
    ".......mmmeekmmmmm",
    ".......mmmekkmmmmm",
    ".......mmmmmmmmmmm",
    ".......mmmmmmmmlll",
    "........mmtmmmrrrr",
    "........mmtmrrrrrr",
    ".........mmmmmmmmm",
    ".....mmmmmmmmmmmmm",
    "...mmmmmmmmmmmmmmm",
    "..mmmhmmmmmmmmmmmm",
    ".mmmhmmmmmmmlllmmm",
    ".mmmmm.mmmmllllllm",
    "mmmmm..mmmmmllllll",
    "mmmmm..mmmmmmlllll",
    "mmmm...mmmmmmmmmmm",
    "mmmm...mmmmmmmmmmm",
    "dmmd...AAAAAAAAAAA",
    "llll...AAAAAAAAgAA",
    "llll...aaaaaaaaaaa",
    ".ll....aaaaaaaaaaa",
    ".......aaaaa..aaaa",
    ".......mmmmm..mmmm",
    ".......mmmmm...mmm",
    "......mmmmmm...mmm",
    ".....AAAAAAA...AAA"
  ]);
  MON.dragon = [
    "..........AA..........................",
    ".........AmA..........................",
    "........AmmA..........................",
    "...AA..Ammm...........................",
    "..AmmAAmmmmm..........................",
    "..mmmmmmmmmmm.........................",
    ".mmmeekmmmmmmm........................",
    "mmmmekkmmmmmmmm.......................",
    "mmmmmmmmmmmmmmmm......................",
    "rtmmmmmmmmmmmmmmm.....................",
    "rrrrrmmmm.mmmmmmmm....................",
    ".ttrrr.....mmmmmmmm...................",
    "............mmmmmmmmm.................",
    ".............mmmmmmmmmmmmmmmmm........",
    "..............mmmlllmmmmmmmmmmmm......",
    "..............mmllllllmmmmmmmmmmmm....",
    ".............mmlllllllmmmmmmmmmmmmmm..",
    ".............mmlllllllmmmmmmmmmmmmmmm.",
    ".............mmmllllllmmmmmmmmm.mmmmmm",
    "..............mmmllllmmmmmmmmmm...mmmm",
    "..............mmmmmmmmmmmmmmmm.....mmm",
    "..............aammm..mmmmmmm.......mmA",
    "...............ammm...mmmmm.......AAA.",
    "...............mmm.....mmmm...........",
    "..............mmmm.....mmmm...........",
    ".............AAAA.....AAAAA..........."
  ];
  MON.dragonWingUp = [
    ".....................d",
    "...................ddm",
    ".................ddmmd",
    "...............ddmmmmd",
    ".............ddmmmmmmd",
    "...........ddmmmmmmmmd",
    ".........ddmmmmmmmmmmd",
    ".......ddmmmmmmmmmmmmd",
    ".....ddmmmmmmmmmmmmmmd",
    "...ddmmmmmmmmmmmmmmmmd",
    "..dmmmmlmmmmlmmmmlmmmd",
    ".dmmmmld.mmld.mmmldmmd",
    "dmmmld....ld....ld.dmd",
    "dmld......d.....d...dd",
    "dd...................d"
  ];
  MON.dragonWingDown = [
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "......................",
    "...........ddddddddddd",
    "......ddddddmmmmmmmmmd",
    "..dddmmmmmmmmmmmmmmmmd",
    ".dmmmmmlmmmmlmmmmlmmmd",
    "..dmmmld.mmld.mmlmmmd.",
    "...dmld...ld...ldmmd..",
    "....dd.....d....dmd...",
    "................dd...."
  ];
  MON.darkKnight = sym([
    "..............aa",
    ".............aaa",
    "............aaaa",
    "..........mmmmmm",
    ".........mmhmmmm",
    "........mmhmmmmm",
    "........mmmmmmmm",
    "........mmkkkkkk",
    "........mmkekkkk",
    "........mmkkkkkk",
    "........mmmmmmAm",
    ".........mmmmmAm",
    "....mmmmmAAAAAmm",
    "..mmmhmmmmmmmmmm",
    ".mmmhmmmmmmmmmmm",
    ".mmmmmmAmmmmlmma",
    ".AmmmmAmmmmmlmaa",
    "..AmmAmmmmmmmmma",
    "..mmm.Ammmmmmmmm",
    "..mmm.Ammmmmmmmm",
    "..mmm.AAAAAAAAAA",
    "..lll.AmmmmmmmAg",
    "..lll.Ammmmmmmmm",
    ".......mmmmmmm..",
    ".......mmmmmm...",
    ".......mmmmmm...",
    ".......mmmmmm...",
    "......AAAAAAA..."
  ]);

  (function () {
    const d = MON.dragon.map((r) => r.split(""));
    [[12, 22], [12, 25], [12, 28], [11, 22], [11, 25], [10, 15], [11, 18], [12, 31], [13, 33]].forEach(([y, x]) => { if (d[y] && d[y][x] === ".") d[y][x] = "a"; });
    MON.dragon = d.map((r) => r.join(""));
  })();

  function monFrames(kind) {
    return cached("mon:" + kind, () => {
      const pal = PAL[kind] || PAL.slime;
      let base;
      let frames = [];
      if (kind === "bat") {
        frames = [MON.batUp, MON.batMid, MON.batDown, MON.batMid].map((m) => bake(m, pal));
        return { frames, blink: frames.map((f) => f), pal, wingFrames: true };
      }
      if (kind === "ghost") {
        frames = [MON.ghost, MON.ghost2].map((m) => bake(m, pal));
        return { frames, blink: [bake(blink(MON.ghost), pal), bake(blink(MON.ghost2), pal)], pal };
      }
      if (kind === "fireOgre") base = MON.ogre;
      else base = MON[kind] || MON.slime;
      const split = Math.floor(base.length * 0.55);
      const f0 = base, f1 = squash(base, split);
      frames = [bake(f0, pal), bake(f1, pal)];
      const bl = [bake(blink(f0), pal), bake(blink(f1), pal)];
      const extra = {};
      if (kind === "dragon") {
        const wp = { o: pal.o, d: "#4a2aa0", m: "#9a6af0", l: "#d0b8ff" };
        extra.wings = [bake(MON.dragonWingUp, wp), bake(MON.dragonWingDown, wp)];
      }
      return Object.assign({ frames, blink: bl, pal }, extra);
    });
  }

  /* ================= HERO ================= */
  const HERO_UP = [
    "....HHHHH.......",
    "...HhhhhhHH.....",
    "..HhhhhhhhhH....",
    ".HhhhhhhhhhhH...",
    ".HhhhhhhhhhhhH..",
    ".HhhhhhHhhHhhH..",
    ".HhhhHssHsssH...",
    ".HHhSssssswes...",
    "..HhSssssswes...",
    "..HSSssssssccs..",
    "...SSsssssqss...",
    "....SSSssss.....",
    ".....BbbbbB.....",
    "....BbLbbbbB....",
    "....BbLbbbbB....",
    "....BbbbbbbB....",
    "....BttytttB....",
    "....BbbbbbbB...."
  ];
  const HERO_LEGS = {
    idle: [
      ".....pppPpp.....",
      ".....ppP.ppP....",
      ".....ppP.ppP....",
      ".....kkK.kkK....",
      ".....kkkKkkkK..."
    ],
    run0: [
      ".....pppPpp.....",
      "....ppP...ppP...",
      "...ppP.....ppP..",
      "..kkK.......kkK.",
      "..kkK.......kkkK"
    ],
    run1: [
      ".....pppPpp.....",
      ".....ppPppP.....",
      ".....ppkkkK.....",
      ".....kkKkkkK....",
      "................"
    ],
    run2: [
      ".....pppPpp.....",
      "....ppP...ppP...",
      "....pP.....ppP..",
      "...kkK......kkK.",
      "...kkkK.....kkkK"
    ],
    hurt: [
      ".....pppPpp.....",
      "....ppP..ppP....",
      "...ppP....ppP...",
      "..kkK......kkK..",
      "..kkkK.....kkkK."
    ]
  };
  const HEAD_GEAR = {
    leather: { oy: -1, m: [
      ".....CCCCC......",
      "...CCcccccCC....",
      "..CcvvvvvvccC...",
      ".CcvccccccccC...",
      ".CcccccccccccC..",
      ".CCCCCCCCCCCCCCC",
      ".Cc.............",
      ".Cc............."
    ] },
    iron: { oy: -1, m: [
      ".....IIIII......",
      "...IIijjjiII....",
      "..IijjiiiiiiI...",
      ".IijiiiiiiiiiI..",
      ".IiiiiiiiiiiiI..",
      ".IIIIIIIIIIIIIx.",
      ".IiiI...........",
      ".IiiI...........",
      "..IiI...........",
      "..II............"
    ] },
    crown: { oy: -4, m: [
      "...G...G...G....",
      "...gG.GgG.Gg....",
      "...ggGgggGgg....",
      "...gjggrggjg....",
      "...GGGGGGGGG...."
    ] }
  };
  const SHIELD = [
    "..WWWWW..",
    ".WwvvvwW.",
    "WwvwwwwwW",
    "WvwwnwwwW",
    "WwwnnnwwW",
    "WwwwnwwwW",
    "WwwwwwwwW",
    "WwwwwwwwW",
    ".WwwwwwW.",
    "..WwwwW..",
    "...WWW..."
  ];
  const SHIELD_PAL = {
    wood: { o: "#1a0e06", W: "#6a3c18", w: "#a8642c", v: "#d89650", n: "#c8c8d0" },
    iron: { o: "#0e1018", W: "#5a6474", w: "#9aa6b8", v: "#dce4f0", n: "#3a7ae0" },
    dragon: { o: "#1c0604", W: "#8a1c0c", w: "#d0401c", v: "#ff8a4a", n: "#ffd23f" }
  };
  const CAPE = [
    "cc.....",
    "cvc....",
    "cvcc...",
    "cvccc..",
    "cvcccc.",
    "Ccvcccc",
    "Ccvcccc",
    "Ccccccc",
    "CCcccccc",
    ".CCCcccc",
    ".C..CCc."
  ];
  const WEAPON = {
    wood: { m: [
      "..v..",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      "GgggG",
      "..h..",
      "..H..",
      "..h..",
      ".hHh."
    ], pal: { o: "#1a0e06", v: "#f0d090", w: "#c08a48", W: "#7a4a20", g: "#8a5a30", G: "#5a3418", h: "#6a3c20", H: "#3a2010" }, trail: "#ffe8b0" },
    iron: { m: [
      "..v..",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      ".vwW.",
      "GgggggG",
      "...h...",
      "...H...",
      "...h...",
      "..gGg.."
    ], pal: { o: "#0c0e14", v: "#ffffff", w: "#c4ccda", W: "#7a8494", g: "#d4af37", G: "#8a6a1c", h: "#6a3c20", H: "#3a2010" }, trail: "#e8f4ff" },
    fire: { m: [
      "...v..",
      "..vw..",
      "..vwW.",
      ".vwwW.",
      ".vwW..",
      ".vwwW.",
      "..vwW.",
      ".vwwW.",
      ".vwW..",
      ".vwwW.",
      "..vwW.",
      ".vwwW.",
      "GgggggG",
      "...h...",
      "...H...",
      "...h...",
      "..gxg.."
    ], pal: { o: "#2a0602", v: "#fff4a0", w: "#ffb030", W: "#e04a10", g: "#c41c10", G: "#6a0c06", h: "#3a2a2a", H: "#1e1414", x: "#ffd23f" }, trail: "#ffb030", fx: "fire" },
    staff: { m: [
      "..ooo..",
      ".oxxxo.",
      "oxvxxxo",
      "oxxxxxo",
      ".oxxxo.",
      "..gGg..",
      "...h...",
      "...H...",
      "...h...",
      "...H...",
      "...h...",
      "...H...",
      "...h...",
      "...H...",
      "...h...",
      "...H...",
      "...h...",
      "..gGg.."
    ], pal: { o: "#4a1a9a", x: "#a87cff", v: "#ffffff", g: "#d4af37", G: "#8a6a1c", h: "#8a5a30", H: "#5a3418" }, trail: "#c9a8ff", fx: "magic" },
    thunder: { m: [
      "...v...",
      "..vwW..",
      "..vwW..",
      "...vwW.",
      "...vwW.",
      "..vwW..",
      ".vwW...",
      "..vwW..",
      "...vwW.",
      "...vwW.",
      "..vwW..",
      "..vwW..",
      "GgggggG",
      "...h...",
      "...H...",
      "...h...",
      "..gxg.."
    ], pal: { o: "#081830", v: "#ffffff", w: "#9ae8ff", W: "#3a9ae0", g: "#2a4a8a", G: "#14244a", h: "#2a2e38", H: "#14161c", x: "#ffe14d" }, trail: "#9ae8ff", fx: "spark" }
  };

  const BODY_PAL = {
    none: { b: "#3a78c8", B: "#1e4a8a", L: "#8cc4ff", t: "#6a3c20", y: "#ffd23f" },
    iron: { b: "#9aa6b8", B: "#5a6474", L: "#e8f0fa", t: "#3a3f4a", y: "#c4ccda" },
    knight: { b: "#6a7290", B: "#3a3f5a", L: "#ffd23f", t: "#8a1c28", y: "#ffd23f" },
    flame: { b: "#d0401c", B: "#7a1a0a", L: "#ffd23f", t: "#3a1a10", y: "#ff9a30" }
  };
  const BOOT_PAL = {
    none: { k: "#7a5038", K: "#4a2c1c" },
    leather: { k: "#a86a34", K: "#5a3418" },
    steel: { k: "#a8b4c4", K: "#5a6474" },
    crystal: { k: "#7ae0ff", K: "#2a7ac0" }
  };

  function heroPal(gear) {
    return Object.assign({
      o: "#140c12",
      H: "#3a2010", h: "#6a3c1c",
      s: "#ffd2a8", S: "#e0a07a", c: "#ff9a8a", q: "#a0503a", w: "#ffffff", e: "#1a1020",
      p: "#2a3450", P: "#161c30",
      C: "#5a3418", c2: "#8a5a30",
      I: "#5a6474", i: "#a8b4c4", j: "#eef4ff", x: "#2a3038",
      G: "#a0781c", g: "#ffd23f", r: "#ff3a5a"
    }, BODY_PAL[gear.body] || BODY_PAL.none, BOOT_PAL[gear.boots] || BOOT_PAL.none);
  }

  function heroBody(gear, legs, breath, blinkOn) {
    const key = ["hero", gear.body, gear.boots, gear.head, legs, breath, blinkOn].join("|");
    return cached(key, () => {
      const GW = 18, GH = 28;
      let g = blank(GW, GH);
      const upY = 4 + (breath ? 1 : 0);
      let up = HERO_UP.slice();
      if (blinkOn) up = up.map((r) => r.replace("we", "SS"));
      g = overlay(g, HERO_LEGS[legs] || HERO_LEGS.idle, 1, 22);
      g = overlay(g, up, 1, upY);
      const hg = HEAD_GEAR[gear.head];
      if (hg) {
        // leather cap uses C/c/v — remap to avoid clashing with skin/cheek chars
        let m = hg.m;
        if (gear.head === "leather") m = m.map((r) => r.replace(/c/g, "1").replace(/v/g, "2"));
        g = overlay(g, m, 1, upY + hg.oy);
      }
      const pal = heroPal(gear);
      pal["1"] = "#a86a34"; pal["2"] = "#d89650"; pal.C = "#5a3418";
      return bake(g, pal, { shade: false });
    });
  }

  function shieldSprite(kind) { return cached("shield:" + kind, () => bake(SHIELD, SHIELD_PAL[kind] || SHIELD_PAL.wood, { shade: false })); }
  function capeSprite(sway) {
    return cached("cape:" + sway, () => {
      const m = CAPE.map((r, y) => {
        const s = y > 5 ? Math.round(sway * (y - 5) / 9) : 0;
        return s > 0 ? ".".repeat(s) + r : s < 0 ? r.slice(-s) : r;
      });
      return bake(m, { o: "#12062a", c: "#7a3dff", C: "#4a1fa0", v: "#c9a8ff" }, { shade: false });
    });
  }
  function weaponSprite(kind) {
    return cached("wpn:" + kind, () => {
      const W = WEAPON[kind];
      if (!W) return null;
      const s = bake(W.m, W.pal, { shade: false });
      s.trail = W.trail; s.fx = W.fx;
      s.gripX = s.w / 2; s.gripY = s.h - 4;
      return s;
    });
  }

  /* ================= PIXEL FONT ================= */
  const FONT = {
    "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "011", "001", "111"],
    "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
    "+": ["000", "010", "111", "010", "000"], "-": ["000", "000", "111", "000", "000"],
    "!": ["010", "010", "010", "000", "010"], "E": ["111", "100", "111", "100", "111"],
    "X": ["101", "101", "010", "101", "101"], "P": ["111", "101", "111", "100", "100"],
    "L": ["100", "100", "100", "100", "111"], "V": ["101", "101", "101", "101", "010"],
    "U": ["101", "101", "101", "101", "111"], " ": ["000", "000", "000", "000", "000"]
  };
  function textSprite(str, color, light) {
    return cached("txt:" + str + color, () => {
      const rows = ["", "", "", "", ""];
      str.split("").forEach((ch, i) => {
        const gl = FONT[ch] || FONT[" "];
        for (let y = 0; y < 5; y++) rows[y] += (i ? "." : "") + gl[y].replace(/1/g, y < 2 ? "l" : "m").replace(/0/g, ".");
      });
      return bake(rows, { o: "#140c12", m: color, l: light || color }, { shade: false });
    });
  }

  /* ================= PICKUPS ================= */
  const COIN = [
    ["..ooo..", ".oyyyo.", "oyhyyyo", "oyhyAyo", "oyyyAyo", ".oyAAo.", "..ooo.."],
    ["..oo..", ".oyyo.", "oyhyyo", "oyhyAo", "oyyyAo", ".oyAo.", "..oo.."],
    ["..o..", ".oyo.", ".ohA.", ".oyA.", ".oyA.", ".oAo.", "..o.."],
    ["..oo..", ".oyyo.", "oyyhyo", "oAyhyo", "oAyyyo", ".oAyo.", "..oo.."]
  ];
  function coinFrames() {
    return cached("coin", () => COIN.map((m) => bake(m, { o: "#6a4210", y: "#ffd23f", h: "#fff6c0", A: "#d08a10" }, { shade: false, outline: false })));
  }
  function orbSprite(col) {
    return cached("orb" + col, () => bake([".m.", "mhm", ".m."], { m: col, h: "#ffffff", o: "#0a2a20" }, { shade: false }));
  }

  /* ================= ITEM ICONS ================= */
  const ICON = {
    boots: [
      "..kkkk.....",
      "..kKKk.....",
      "..kkkk.....",
      "..kkkk.....",
      "..kkkk.....",
      "..kkkkkkk..",
      ".kkkkkkkkk.",
      ".KKKKKKKKK."
    ],
    body: [
      "..BB...BB..",
      ".BbbBBBbbB.",
      "BbLbbbbbbbB",
      "BbLbbbbbbbB",
      ".BbLbbbbbB.",
      ".BbbbybbbB.",
      ".BtttytttB.",
      ".BbbbbbbbB.",
      "..BBBBBBB.."
    ]
  };
  function iconSprite(item) {
    return cached("icon:" + item.slot + item.kind, () => {
      if (item.slot === "weapon") return weaponSprite(item.kind);
      if (item.slot === "shield") return shieldSprite(item.kind);
      if (item.slot === "cape") return capeSprite(0);
      if (item.slot === "boots") return bake(ICON.boots, Object.assign({ o: "#140c12" }, BOOT_PAL[item.kind] || BOOT_PAL.leather), { shade: false });
      if (item.slot === "body") return bake(ICON.body, Object.assign({ o: "#140c12" }, BODY_PAL[item.kind] || BODY_PAL.iron), { shade: false });
      if (item.slot === "head") {
        const hg = HEAD_GEAR[item.kind];
        let m = hg.m.map((r) => r.replace(/c/g, "1").replace(/v/g, "2"));
        const pal = heroPal({}); pal["1"] = "#a86a34"; pal["2"] = "#d89650";
        return bake(m, pal, { shade: false });
      }
      return bake(["m"], { m: "#fff" });
    });
  }

  G.Sprites = { bake, sym, squash, monFrames, heroBody, shieldSprite, capeSprite, weaponSprite, textSprite, coinFrames, orbSprite, iconSprite, PAL, cached };
})(window);
