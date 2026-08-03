// Web Audio API Synthesizer for retro arcade sound effects

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.sirenInterval = null;
    this.wakaToggle = false;
    this.lastWakaTime = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser", e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopSiren();
    }
    return this.muted;
  }

  // Helper to create oscillators with gain envelopes
  playTone(freq, type, duration, startVol, endVol, delay = 0) {
    if (this.muted || !this.ctx) return null;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    
    gainNode.gain.setValueAtTime(startVol, this.ctx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + delay + duration);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);

    return { osc, gainNode };
  }

  // Play the classic Pac-Man intro music
  playStart() {
    if (this.muted) return;
    this.resume();

    const notes = [
      { f: 494, d: 0.1 }, { f: 988, d: 0.1 }, { f: 740, d: 0.1 }, { f: 622, d: 0.1 },
      { f: 988, d: 0.08 }, { f: 740, d: 0.08 }, { f: 622, d: 0.15 }, { f: 0, d: 0.05 },
      
      { f: 523, d: 0.1 }, { f: 1047, d: 0.1 }, { f: 784, d: 0.1 }, { f: 659, d: 0.1 },
      { f: 1047, d: 0.08 }, { f: 784, d: 0.08 }, { f: 659, d: 0.15 }, { f: 0, d: 0.05 },
      
      { f: 494, d: 0.1 }, { f: 988, d: 0.1 }, { f: 740, d: 0.1 }, { f: 622, d: 0.1 },
      { f: 988, d: 0.08 }, { f: 740, d: 0.08 }, { f: 622, d: 0.15 }, { f: 0, d: 0.05 },
      
      { f: 622, d: 0.05 }, { f: 659, d: 0.05 }, { f: 698, d: 0.05 },
      { f: 740, d: 0.05 }, { f: 784, d: 0.05 }, { f: 831, d: 0.05 },
      { f: 880, d: 0.05 }, { f: 988, d: 0.2 }
    ];

    let timeOffset = 0;
    notes.forEach(note => {
      if (note.f > 0) {
        this.playTone(note.f, 'triangle', note.d, 0.15, 0.01, timeOffset);
      }
      timeOffset += note.d + 0.02;
    });
  }

  // Play the waka waka eating dot sound
  playWaka() {
    const now = Date.now();
    // Throttle waka sounds to prevent overlapping overlaps
    if (now - this.lastWakaTime < 80) return;
    this.lastWakaTime = now;

    if (this.muted) return;
    this.resume();

    // Alternate frequency pitch to create the "wa" and "ka"
    const startFreq = this.wakaToggle ? 320 : 220;
    const endFreq = this.wakaToggle ? 220 : 320;
    this.wakaToggle = !this.wakaToggle;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Play sound when Pacman eats a power pellet
  playPowerPellet() {
    if (this.muted) return;
    this.resume();
    
    // Quick dual sine sweeps
    this.playTone(600, 'square', 0.15, 0.1, 0.01);
    setTimeout(() => {
      this.playTone(800, 'square', 0.15, 0.1, 0.01);
    }, 80);
  }

  // Play ghost eaten (returning eyes) sound
  playGhostEat() {
    if (this.muted) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Play Pac-Man death sound
  playDeath() {
    if (this.muted) return;
    this.resume();

    // Fades pitch downwards with repeating cycles
    let delay = 0;
    for (let i = 0; i < 11; i++) {
      const freq = 600 - (i * 50);
      const dur = 0.08;
      this.playTone(freq, 'sawtooth', dur, 0.15, 0.01, delay);
      delay += dur;
    }
    
    // Ending "foomp"
    setTimeout(() => {
      this.playTone(80, 'triangle', 0.25, 0.2, 0.01);
    }, delay * 1000);
  }

  // Continuous background siren
  startSiren(speedFactor = 1) {
    if (this.muted || this.sirenInterval) return;
    this.resume();

    let step = 0;
    const playSirenStep = () => {
      if (this.muted || !this.ctx) return;
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      
      // Siren sound frequency modulates up and down
      const baseFreq = 220 + (speedFactor * 30);
      const modFreq = baseFreq + Math.sin(step) * 40;
      osc.frequency.setValueAtTime(modFreq, now);
      osc.frequency.linearRampToValueAtTime(modFreq + 20, now + 0.15);

      gainNode.gain.setValueAtTime(0.03, now);
      gainNode.gain.linearRampToValueAtTime(0.005, now + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.15);
      
      step += 0.5;
    };

    // Trigger every 160ms
    this.sirenInterval = setInterval(playSirenStep, 160);
  }

  stopSiren() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
  }

  // Siren sound for when ghosts are Frightened (power pellet eaten)
  startFrightenedSiren() {
    this.stopSiren();
    if (this.muted) return;
    this.resume();

    let toggle = false;
    const playFrightenedStep = () => {
      if (this.muted || !this.ctx) return;
      const freq = toggle ? 180 : 130;
      toggle = !toggle;
      this.playTone(freq, 'square', 0.2, 0.04, 0.005);
    };

    this.sirenInterval = setInterval(playFrightenedStep, 250);
  }
}

export const gameAudio = new AudioEngine();
export default gameAudio;
