// Dapur Kilat — WebAudio sound effects, synthesized in code, no audio files.
// The context is created lazily on the first user gesture (browsers refuse audio
// before one), and every effect is a short oscillator or filtered-noise burst, so
// the game stays silent until the player touches it and stays offline.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sizzleGain = null;
    this.sizzleNodes = null;
    this.muted = false;
    try {
      this.muted = window.localStorage.getItem('dapur-kilat.muted') === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Create the context on a user gesture; safe to call more than once. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      window.localStorage.setItem('dapur-kilat.muted', muted ? '1' : '0');
    } catch { /* storage unavailable: the flag still works for this visit */ }
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** One short tone: frequency, duration, wave shape and volume. */
  tone(freq, seconds, type = 'sine', volume = 0.25, when = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  /** A tone that slides from one frequency to another. */
  slide(from, to, seconds, type = 'sine', volume = 0.25) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(to, t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  /** A burst of filtered noise, for chops, sizzles and thuds. */
  noise(seconds, filterFreq, volume = 0.3, type = 'bandpass') {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  /** Picking an ingredient off the counter. */
  pop() { this.tone(520, 0.09, 'sine', 0.22); this.tone(780, 0.07, 'sine', 0.14, 0.03); }

  /** Dropping something onto a station or the plate. */
  place() { this.noise(0.08, 900, 0.25, 'lowpass'); this.tone(180, 0.08, 'triangle', 0.2); }

  /** A dish finished cooking: a bright two-note ding. */
  ding() { this.tone(880, 0.18, 'sine', 0.22); this.tone(1318, 0.28, 'sine', 0.18, 0.1); }

  /** A new order arrives on the board. */
  bell() { this.tone(1046, 0.12, 'triangle', 0.2); this.tone(1568, 0.2, 'triangle', 0.16, 0.08); }

  /** Serving a dish: a rising happy arpeggio. */
  chime() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.22, i * 0.07));
  }

  /** Something went wrong: a low buzz. */
  buzz() { this.slide(220, 110, 0.25, 'sawtooth', 0.16); }

  /** A knife chop: a short noise snap. */
  chop() { this.noise(0.06, 2400, 0.3); }

  /** Trash: a soft thud. */
  thud() { this.noise(0.12, 300, 0.3, 'lowpass'); }

  /** Level up: a quick fanfare. */
  fanfare() {
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'square', 0.1, i * 0.06));
    this.tone(1046, 0.3, 'square', 0.1, 0.26);
  }

  /**
   * The grill/wok sizzle: a looping filtered-noise bed whose gain follows how
   * many things are cooking. Call with 0 to stop it.
   */
  setSizzle(count) {
    if (!this.ctx || !this.master) return;
    if (count > 0 && !this.sizzleNodes) {
      const len = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3800;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      this.sizzleNodes = { src, gain };
    }
    if (this.sizzleNodes) {
      const target = count > 0 ? Math.min(0.05, 0.015 + count * 0.012) : 0;
      this.sizzleNodes.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
      if (count === 0) {
        const nodes = this.sizzleNodes;
        this.sizzleNodes = null;
        window.setTimeout(() => { try { nodes.src.stop(); } catch { /* already stopped */ } }, 600);
      }
    }
  }
}

