export default class AudioManager {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }

    this.master = this.ctx ? this.ctx.createGain() : null;
    if (this.master) {
      this.master.gain.value = 0.18; // Музыка сделана тише для фонового баланса
      this.master.connect(this.ctx.destination);
    }

    // Состояние чёрной дыры (от 0.0 до 1.0)
    this.mass = 0.0; 

    // Space-Delay Bus
    this.delayNode = null;
    this.delayFeedback = null;
    if (this.ctx && this.master) {
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.285;
      
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.35;

      this.delayFilter = this.ctx.createBiquadFilter();
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 1500;

      this.delayNode.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.master);
    }

    // Sequencer
    this.tempo = 105;
    this.lookahead = 25.0; 
    this.scheduleAheadTime = 0.1; 
    this.nextNoteTime = 0.0;
    this.current16th = 0;
    this.timerID = null;
    this.isPlaying = false;

    this.nodes = new Set();
    this.noiseBuffer = null;
    this._prepared = false;
    this.percussionEnabled = true;

    this.arpNotes = [130.81, 155.56, 196.00, 233.08, 261.63, 311.13, 392.00];
  }

  setMass(massValue) {
    this.mass = Math.min(Math.max(massValue, 0.0), 1.0);
    
    if (this.delayFeedback && this.delayFilter) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      this.delayFeedback.gain.setTargetAtTime(0.35 + this.mass * 0.4, now, 0.1);
      this.delayFilter.frequency.setTargetAtTime(1500 - this.mass * 1000, now, 0.1);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') return this.ctx.resume();
  }

  _connectWithDelay(sourceNode, targetNode, delaySendAmount = 0.2) {
    sourceNode.connect(targetNode);
    if (this.delayNode && delaySendAmount > 0) {
      const sendGain = this.ctx.createGain();
      sendGain.gain.value = delaySendAmount * (1 + this.mass * 0.5);
      sourceNode.connect(sendGain);
      sendGain.connect(this.delayNode);
    }
  }

  // ------ SFX ------
  playAbsorb() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();

    const startFreq = 850 * (1 - this.mass * 0.5);
    const endFreq = 120 * (1 - this.mass * 0.6);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.2 + this.mass * 0.15);

    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, now);
    f.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.2 + this.mass * 0.15, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2 + this.mass * 0.15);

    osc.connect(f);
    this._connectWithDelay(f, g, 0.4);
    g.connect(this.master);

    osc.start(now);
    osc.stop(now + 0.25 + this.mass * 0.15);
    this._autoCleanup(osc);
  }

  // Обновленный глухой космический импакт
  playEarthHit() {
  if (!this.ctx) return;
  const now = this.ctx.currentTime;

  // 1. Атакующий хлыст / щелчок (Punch Attack)
  const punch = this.ctx.createOscillator();
  const punchGain = this.ctx.createGain();
  punch.type = 'sawtooth';
  punch.frequency.setValueAtTime(450, now);
  punch.frequency.exponentialRampToValueAtTime(30, now + 0.08);

  punchGain.gain.setValueAtTime(0.0001, now);
  punchGain.gain.linearRampToValueAtTime(0.5 + this.mass * 0.2, now + 0.002);
  punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  punch.connect(punchGain);
  punchGain.connect(this.master);
  punch.start(now);
  punch.stop(now + 0.09);

  // 2. Диссонансный суб-удар (Агрессивное железо)
  const o1 = this.ctx.createOscillator();
  const o2 = this.ctx.createOscillator();
  const bodyGain = this.ctx.createGain();

  o1.type = 'sawtooth';
  o2.type = 'square';

  // Диссонансный интервал (тритон) для создания чувства опасности
  const baseFreq = 110 * (1 - this.mass * 0.3);
  o1.frequency.setValueAtTime(baseFreq, now);
  o2.frequency.setValueAtTime(baseFreq * 1.414, now); // Тритоновый сдвиг

  o1.frequency.exponentialRampToValueAtTime(25, now + 0.4);
  o2.frequency.exponentialRampToValueAtTime(35, now + 0.4);

  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.linearRampToValueAtTime(0.4 + this.mass * 0.2, now + 0.01);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4 + this.mass * 0.1);

  o1.connect(bodyGain);
  o2.connect(bodyGain);

  // 3. Шум взрыва с фильтром
  if (this.noiseBuffer) {
    const noise = this.ctx.createBufferSource();
    const noiseFilter = this.ctx.createBiquadFilter();
    const noiseGain = this.ctx.createGain();

    noise.buffer = this.noiseBuffer;
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.35);
    noiseFilter.Q.setValueAtTime(4, now); // Агрессивный резонанс

    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    // Эхо отправляет шум и тело удара в пространство
    this._connectWithDelay(noiseGain, this.master, 0.4);
    noise.start(now);
    noise.stop(now + 0.37);
    this._autoCleanup(noise);
  }

  this._connectWithDelay(bodyGain, this.master, 0.3);

  o1.start(now);
  o2.start(now);
  o1.stop(now + 0.42 + this.mass * 0.1);
  o2.stop(now + 0.42 + this.mass * 0.1);

  this._autoCleanup(punch, o1, o2);
}


  async _ensurePrepared() {
    if (!this.ctx || this._prepared) return;
    if (!this.noiseBuffer) this._createNoiseBuffer();
    this._prepared = true;
  }

  _createNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * 0.5, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  _autoCleanup(...nodes) {
    nodes.forEach(node => {
      this.nodes.add(node);
      if (typeof node.start === 'function') {
        node.onended = () => {
          try { node.disconnect(); } catch (e) {}
          this.nodes.delete(node);
        };
      }
    });
  }

  // ------ Секвенсор ------
  _nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat;
    this.current16th = (this.current16th + 1) % 16;
  }

  _scheduleNote(time, step) {
    this._scheduleSpaceArp(time, step);

    if (this.percussionEnabled) {
      if (step === 0 || step === 8) this._scheduleDeepKick(time);
      if (step === 4 || step === 12) this._scheduleSoftSnare(time);
      if (step % 2 === 0) this._scheduleSpaceHat(time);
    }

    if (step === 0 || step === 6 || step === 10) {
      this._scheduleSubBass(time);
    }
  }

  _scheduleSpaceArp(time, step) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();

    const noteIdx = (step * 2 + (step % 3)) % this.arpNotes.length;
    let freq = this.arpNotes[noteIdx];

    if (this.mass > 0.5) {
      const detune = (Math.sin(step) * 15) * (this.mass - 0.5) * 2;
      freq += detune;
    }

    o.type = this.mass > 0.7 ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(freq, time);

    f.type = 'lowpass';
    f.frequency.setValueAtTime(900 - this.mass * 400, time);
    f.frequency.exponentialRampToValueAtTime(250, time + 0.1);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.05 + this.mass * 0.02, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

    o.connect(f);
    this._connectWithDelay(f, g, 0.35);
    g.connect(this.master);

    o.start(time);
    o.stop(time + 0.14);
    this._autoCleanup(o);
  }

  _scheduleDeepKick(time) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';

    o.frequency.setValueAtTime(110 + this.mass * 30, time);
    o.frequency.exponentialRampToValueAtTime(32 - this.mass * 10, time + 0.12);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.35 + this.mass * 0.25, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22 + this.mass * 0.1);

    o.connect(g);
    g.connect(this.master);
    o.start(time);
    o.stop(time + 0.24 + this.mass * 0.1);
    this._autoCleanup(o);
  }

  _scheduleSoftSnare(time) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    src.buffer = this.noiseBuffer;
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1400 - this.mass * 500, time);
    f.Q.setValueAtTime(2, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.08, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

    src.connect(f);
    this._connectWithDelay(f, g, 0.25);
    g.connect(this.master);

    src.start(time);
    src.stop(time + 0.16);
    this._autoCleanup(src);
  }

  _scheduleSpaceHat(time) {
    if (!this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    src.buffer = this.noiseBuffer;
    f.type = 'highpass';
    f.frequency.setValueAtTime(6500, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.03, time + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    src.connect(f);
    g.connect(this.master);
    src.start(time);
    src.stop(time + 0.05);
    this._autoCleanup(src);
  }

  _scheduleSubBass(time) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();

    o.type = 'sawtooth';
    const baseFreq = 65.41 * (1 - this.mass * 0.25);
    o.frequency.setValueAtTime(baseFreq, time);

    f.type = 'lowpass';
    f.frequency.setValueAtTime(350 + this.mass * 200, time);

    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.15 + this.mass * 0.1, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

    o.connect(f);
    g.connect(this.master);
    o.start(time);
    o.stop(time + 0.38);
    this._autoCleanup(o);
  }

  _scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this._scheduleNote(this.nextNoteTime, this.current16th);
      this._nextNote();
    }
  }

  // ------ Эмбиент ------
  async playMusic() {
    if (!this.ctx || this.isPlaying) return;
    await this._ensurePrepared();
    const now = this.ctx.currentTime;

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(0.0001, now);
    this.padGain.gain.linearRampToValueAtTime(0.04, now + 1.0);

    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 220;

    this.padOscA = this.ctx.createOscillator();
    this.padOscB = this.ctx.createOscillator();
    this.padOscC = this.ctx.createOscillator();

    this.padOscA.type = 'sawtooth';
    this.padOscB.type = 'sine';
    this.padOscC.type = 'triangle';

    this.padOscA.frequency.value = 32.70;
    this.padOscB.frequency.value = 49.00;
    this.padOscC.frequency.value = 65.41;

    this.padOscA.connect(padFilter);
    this.padOscB.connect(padFilter);
    this.padOscC.connect(padFilter);
    
    this._connectWithDelay(padFilter, this.padGain, 0.2);
    this.padGain.connect(this.master);

    this.padOscA.start(now);
    this.padOscB.start(now);
    this.padOscC.start(now);

    this.current16th = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.timerID = setInterval(() => this._scheduler(), this.lookahead);
    this.isPlaying = true;
  }

  stopMusic() {
    if (!this.ctx || !this.isPlaying) return;
    if (this.timerID) {
      clearInterval(this.timerID);
      this.timerID = null;
    }
    const now = this.ctx.currentTime;
    try {
      if (this.padGain) {
        this.padGain.gain.setValueAtTime(this.padGain.gain.value, now);
        this.padGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      }
    } catch (e) {}

    setTimeout(() => {
      try {
        if (this.padOscA) this.padOscA.stop();
        if (this.padOscB) this.padOscB.stop();
        if (this.padOscC) this.padOscC.stop();
      } catch (e) {}
    }, 500);

    this.isPlaying = false;
  }
}