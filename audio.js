/* Self-hosted Web Audio SFX + BGM — no external files */
(function (global) {
  const AudioCtl = {
    ctx: null,
    muted: false,
    unlocked: false,
    welcomePlayed: false,
    bgmOn: false,
    bgmTimer: null,
    bgmBeat: 0,
    master: null,
    sfxGain: null,
    bgmGain: null,
    _wantBgm: false,

    async ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.ctx.destination);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.48;
        this.sfxGain.connect(this.master);
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.44;
        this.bgmGain.connect(this.master);
      }
      if (this.ctx.state === "suspended") {
        try { await this.ctx.resume(); } catch (_) {}
      }
      this.unlocked = this.ctx.state === "running";
      return this.unlocked;
    },

    setMuted(m) {
      this.muted = !!m;
      try { localStorage.setItem("p5hum3467-muted", this.muted ? "1" : "0"); } catch (_) {}
      if (this.master) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
      }
      if (this.muted) this.stopBgm(true);
      else if (this._wantBgm) this.startBgm();
      this.syncMuteBtn();
    },

    toggleMute() { this.setMuted(!this.muted); },

    syncMuteBtn() {
      const b = document.getElementById("muteBtn");
      if (!b) return;
      b.textContent = this.muted ? "🔇" : "🔊";
      b.setAttribute("aria-label", this.muted ? "開啟聲音" : "靜音");
      b.title = this.muted ? "開啟聲音" : "靜音";
    },

    tone(freq, t0, dur, type, gainNode, vol, glide) {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "sine";
      if (glide && glide > 0) {
        o.frequency.setValueAtTime(freq * 0.88, t0);
        o.frequency.exponentialRampToValueAtTime(freq, t0 + Math.min(0.05, dur * 0.3));
      } else {
        o.frequency.setValueAtTime(freq, t0);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol || 0.2), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(gainNode || this.sfxGain);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    },

    noiseHit(t0, dur, vol, hpHz, dest) {
      if (!this.ctx || this.muted) return;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = "highpass";
      filt.frequency.value = hpHz || 800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(dest || this.sfxGain);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    },

    kick(t0) {
      if (!this.ctx || this.muted) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(160, t0);
      o.frequency.exponentialRampToValueAtTime(48, t0 + 0.14);
      g.gain.setValueAtTime(0.5, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g);
      g.connect(this.bgmGain);
      o.start(t0);
      o.stop(t0 + 0.25);
      this.noiseHit(t0, 0.04, 0.1, 200, this.bgmGain);
    },

    snare(t0) {
      this.noiseHit(t0, 0.1, 0.24, 1200, this.bgmGain);
      this.tone(220, t0, 0.06, "triangle", this.bgmGain, 0.07);
    },

    hat(t0, open) {
      this.noiseHit(t0, open ? 0.08 : 0.03, open ? 0.1 : 0.07, open ? 6000 : 8000, this.bgmGain);
    },

    playWelcome() {
      if (this.welcomePlayed || this.muted || !this.ctx) return;
      this.welcomePlayed = true;
      const t = this.ctx.currentTime + 0.05;
      const notes = [392, 523.25, 659.25, 783.99];
      notes.forEach((f, i) => {
        this.tone(f, t + i * 0.11, 0.32, "triangle", this.sfxGain, 0.26);
        this.tone(f * 2, t + i * 0.11, 0.22, "sine", this.sfxGain, 0.08);
      });
      this.tone(1046.5, t + 0.5, 0.4, "sine", this.sfxGain, 0.14);
    },

    startBgm() {
      this._wantBgm = true;
      if (this.muted || !this.ctx || this.bgmOn) return;
      this.bgmOn = true;
      this.bgmBeat = 0;
      const bpm = 136;
      const step = 60 / bpm / 2;
      const lead = [
        392.00, 392.00, 523.25, 659.25, 783.99, 659.25, 523.25, 392.00,
        440.00, 523.25, 659.25, 698.46, 783.99, 880.00, 783.99, 659.25,
        523.25, 659.25, 698.46, 783.99, 880.00, 1046.5, 880.00, 783.99,
        659.25, 698.46, 783.99, 880.00, 1046.5, 1174.7, 1046.5, 783.99,
        783.99, 0, 783.99, 880.00, 1046.5, 0, 880.00, 783.99,
        659.25, 698.46, 783.99, 0, 1046.5, 880.00, 783.99, 659.25,
        523.25, 659.25, 783.99, 1046.5, 1174.7, 1046.5, 783.99, 659.25,
        783.99, 880.00, 1046.5, 1174.7, 1568.0, 1174.7, 1046.5, 0
      ];
      const bass = [
        98.00, 0, 98.00, 0, 146.83, 0, 146.83, 0,
        164.81, 0, 164.81, 0, 130.81, 0, 130.81, 0,
        98.00, 0, 98.00, 0, 146.83, 0, 146.83, 0,
        110.00, 0, 130.81, 0, 146.83, 0, 196.00, 0,
        98.00, 0, 98.00, 0, 146.83, 0, 146.83, 0,
        164.81, 0, 164.81, 0, 130.81, 0, 146.83, 0,
        98.00, 0, 123.47, 0, 146.83, 0, 185.00, 0,
        196.00, 0, 146.83, 0, 98.00, 0, 196.00, 0
      ];
      const tick = () => {
        if (!this.bgmOn || this.muted || !this.ctx) return;
        const t = this.ctx.currentTime + 0.02;
        const mi = this.bgmBeat % lead.length;
        const beatInBar = this.bgmBeat % 8;
        if (beatInBar === 0 || beatInBar === 4) this.kick(t);
        if (beatInBar === 2 || beatInBar === 6) this.snare(t);
        if (beatInBar === 7) this.kick(t);
        this.hat(t, beatInBar === 2 || beatInBar === 6);
        if (this.bgmBeat % 2 === 1) this.hat(t, false);
        const lf = lead[mi];
        if (lf) {
          this.tone(lf, t, step * 1.3, "square", this.bgmGain, 0.11, 1);
          this.tone(lf * 2, t, step * 0.85, "triangle", this.bgmGain, 0.05);
        }
        const bf = bass[mi];
        if (bf) {
          this.tone(bf, t, step * 1.7, "triangle", this.bgmGain, 0.18);
          this.tone(bf * 2, t, step * 1.2, "sine", this.bgmGain, 0.07);
        }
        this.bgmBeat++;
        this.bgmTimer = setTimeout(tick, step * 1000);
      };
      tick();
    },

    stopBgm(keepWant) {
      if (!keepWant) this._wantBgm = false;
      this.bgmOn = false;
      if (this.bgmTimer) { clearTimeout(this.bgmTimer); this.bgmTimer = null; }
    },

    async unlockAndWelcome() {
      const ok = await this.ensure();
      if (!ok) return;
      if (!this.muted) this.playWelcome();
    },

    playSlash() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.noiseHit(t, 0.12, 0.32, 1800);
      this.tone(880, t, 0.1, "sawtooth", this.sfxGain, 0.16, 1);
      this.tone(1400, t + 0.04, 0.08, "square", this.sfxGain, 0.1, 1);
    },

    playHit() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.tone(90, t, 0.16, "sine", this.sfxGain, 0.28);
      this.tone(180, t, 0.12, "square", this.sfxGain, 0.12);
      this.noiseHit(t, 0.1, 0.28, 400);
    },

    playExplode() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.noiseHit(t, 0.28, 0.4, 300);
      this.noiseHit(t + 0.05, 0.22, 0.22, 900);
      this.tone(140, t, 0.28, "sawtooth", this.sfxGain, 0.16, 1);
      this.tone(80, t + 0.04, 0.3, "sine", this.sfxGain, 0.2);
    },

    playCoin() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.tone(988, t, 0.1, "square", this.sfxGain, 0.18);
      this.tone(1318, t + 0.08, 0.16, "square", this.sfxGain, 0.16);
    },

    playHurt() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.tone(220, t, 0.22, "sawtooth", this.sfxGain, 0.2, 1);
      this.tone(110, t + 0.04, 0.28, "square", this.sfxGain, 0.16);
      this.noiseHit(t, 0.18, 0.18, 500);
    },

    playLevelUp() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        this.tone(f, t + i * 0.06, 0.28, "triangle", this.sfxGain, 0.2);
        this.tone(f * 2, t + i * 0.06, 0.18, "sine", this.sfxGain, 0.06);
      });
    },

    playCheer() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.tone(f, t + i * 0.07, 0.28, "triangle", this.sfxGain, 0.2);
      });
    },

    playBoss() {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      this.tone(70, t, 0.45, "sawtooth", this.sfxGain, 0.22, 1);
      this.tone(110, t + 0.1, 0.4, "square", this.sfxGain, 0.12);
      this.noiseHit(t, 0.3, 0.2, 200);
    },

    async onQuizStart() {
      await this.ensure();
      if (this.ctx && this.ctx.state === "suspended") {
        try { await this.ctx.resume(); } catch (_) {}
      }
      if (!this.muted) {
        if (!this.welcomePlayed) this.playWelcome();
        this.startBgm();
      }
    },

    onQuizEnd() { this.stopBgm(false); }
  };

  try { AudioCtl.muted = localStorage.getItem("p5hum3467-muted") === "1"; } catch (_) {}
  global.AudioCtl = AudioCtl;
})(window);
