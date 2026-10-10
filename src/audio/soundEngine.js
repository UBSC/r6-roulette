// Web Audio API procedural tactical sound engine for Siege UI
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.7;
    this.voiceEnabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Tactical subtle UI hover chirp
  playHover() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(1900, now + 0.035);

      gain.gain.setValueAtTime(0.04 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // AudioContext policy
    }
  }

  // Crisp mechanical button click
  playClick() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);

      gain.gain.setValueAtTime(0.12 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  // Tab / Mode switch mechanical slide sound
  playModeSwitch() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      
      // Dual frequencies for tactical cyber feel
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'square';
      osc2.type = 'sawtooth';
      
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      osc2.frequency.setValueAtTime(220, now);
      osc2.frequency.exponentialRampToValueAtTime(440, now + 0.08);

      gain.gain.setValueAtTime(0.05 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.08);
      osc2.stop(now + 0.08);
    } catch (e) {}
  }

  // Spin start sound: Heavy tactical bass whoosh & electronic charge
  playSpinStart() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;

      // Sub-bass sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // Noise burst for air / pneumatic effect
      this.playPneumaticHiss(0.2);
    } catch (e) {}
  }

  // Ticking ratchet for roulette reel
  playReelTick(pitchMultiplier = 1.0) {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = 950 * pitchMultiplier;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.025);

      gain.gain.setValueAtTime(0.09 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }

  // Reveal slam on roulette stop
  playReveal(tier = 'legendary') {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;

      // Heavy sub slam
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);

      // Radio chirp
      setTimeout(() => this.playRadioChirp(), 150);

      if (tier === 'blackice') {
        this.playBlackIce();
      } else if (tier === 'legendary') {
        this.playLegendaryFanfare();
      }
    } catch (e) {}
  }

  // Black ice crystal sound
  playBlackIce() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0]; // High crystal arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.08 * this.volume, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.45);
      });
    } catch (e) {}
  }

  // Legendary fanfare
  playLegendaryFanfare() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C major chord
      chords.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      });
    } catch (e) {}
  }

  // Tactical radio squelch
  playRadioChirp() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.setValueAtTime(1800, now + 0.03);

      gain.gain.setValueAtTime(0.03 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  playPneumaticHiss(duration = 0.15) {
    if (this.muted || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Filter high pass
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
    } catch (e) {}
  }

  // Tactical flashbang ear-ringing tinnitus tone
  playTinnitus(duration = 2.8) {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(3800, now);
      osc.frequency.linearRampToValueAtTime(3600, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  // Metallic grenade bounce clink
  playGrenadeBounce() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);

      gain.gain.setValueAtTime(0.12 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  // Concussive flashbang blast
  playFlashbangDetonation() {
    if (this.muted) return;
    try {
      this.init();
      const now = this.ctx.currentTime;

      // Heavy sub-punch
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

      oscGain.gain.setValueAtTime(0.35 * this.volume, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);

      // Noise burst crack
      this.playPneumaticHiss(0.28);
      // Tinnitus immediately follows!
      this.playTinnitus(3.0);
    } catch (e) {}
  }

  // Speech announce with customizable moods & voice caching
  speakTactical(text, mood = 'announcer') {
    if (this.muted || !this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = this.volume;

      // Select pitch and rate based on mood
      switch (mood) {
        case 'lord': // Tachanka / Skuf
          utterance.pitch = 0.65;
          utterance.rate = 0.95;
          break;
        case 'screamer': // GOYDA / White Mask panic
          utterance.pitch = 1.35;
          utterance.rate = 1.25;
          break;
        case 'zoomer': // Ash / Blitz / Amaru / TikTok
          utterance.pitch = 1.2;
          utterance.rate = 1.3;
          break;
        case 'deadinside': // Jager / Vigil / Caveira
          utterance.pitch = 0.75;
          utterance.rate = 0.9;
          break;
        case 'hype': // Round victory
          utterance.pitch = 1.15;
          utterance.rate = 1.15;
          break;
        case 'announcer':
        default:
          utterance.pitch = 0.95;
          utterance.rate = 1.1;
          break;
      }

      // Try finding Russian voice
      const voices = window.speechSynthesis.getVoices();
      const ruVoice = voices.find(v => v.lang.startsWith('ru') || v.name.toLowerCase().includes('russian'));
      if (ruVoice) {
        utterance.voice = ruVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
}

// Pre-fetch voices when available
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export const sound = new SoundEngine();
