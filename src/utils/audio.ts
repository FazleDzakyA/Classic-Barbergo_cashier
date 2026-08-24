// Web Audio API Synthesizer for BarberFlow POS (Zero external files, 100% offline, ultra-fast & responsive)

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private isUnlocked: boolean = false;

  constructor() {
    this.enabled = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('barberflow_sound_enabled', 'true');
      
      const unlockAudio = () => {
        try {
          const ctx = this.getContext();
          if (ctx && ctx.state === 'suspended') {
            ctx.resume();
          }
          this.isUnlocked = true;
        } catch (_e) {}
      };
      
      ['click', 'keydown', 'touchstart', 'pointerdown', 'mousedown'].forEach(evt => {
        window.addEventListener(evt, unlockAudio, { passive: true });
      });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public setEnabled(value: boolean): void {
    this.enabled = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('barberflow_sound_enabled', String(value));
    }
  }

  public toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    if (next) {
      this.playNav();
    }
    return next;
  }

  /**
   * Helper: create noise buffer for mechanical / coin texture
   */
  private createNoiseBuffer(ctx: AudioContext, duration: number = 0.05): AudioBuffer {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * SHORT TACTILE UI CLICK (Crisp button, toggle, or select)
   */
  public playBeep(freq: number = 880, duration: number = 0.05): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.debug('Audio error:', e);
    }
  }

  /**
   * PAGE NAVIGATION / MENU TAB CLICK (Sleek, soft modern iOS/macOS pop)
   */
  public playNav(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.04);

      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.debug('Audio error:', e);
    }
  }

  /**
   * 🌟 SOUND UANG MASUK KASIR SUPER RAME (Full Mechanical Drawer + Cascading Coin Shower + Grand Bell Chimes)
   */
  public playKaching(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Mechanical Cash Drawer Latch ("THUD-CLACK")
      const drawerOsc = ctx.createOscillator();
      const drawerGain = ctx.createGain();
      drawerOsc.type = 'triangle';
      drawerOsc.frequency.setValueAtTime(160, now);
      drawerOsc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      drawerGain.gain.setValueAtTime(0.20, now);
      drawerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      drawerOsc.connect(drawerGain);
      drawerGain.connect(ctx.destination);
      drawerOsc.start(now);
      drawerOsc.stop(now + 0.08);

      // Noise burst for mechanical slide friction
      try {
        const noiseBuffer = this.createNoiseBuffer(ctx, 0.07);
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(3, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseNode.start(now);
      } catch {}

      // Helper for metallic bells / coin rings
      const playBell = (freq: number, start: number, dur: number, vol: number = 0.16) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(vol, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      };

      // 2. Cascading Shower of Coins (Multi-Coin RAME Clinking & Jingle!)
      const coinFrequencies = [
        2100, 2480, 2850, 3200, 3600, 4100, 4700, 5200, 
        2300, 2700, 3350, 3900, 4450, 5050
      ];

      coinFrequencies.forEach((freq, idx) => {
        const delay = 0.06 + idx * 0.038 + (Math.random() * 0.015);
        const dur = 0.12 + Math.random() * 0.18;
        const vol = 0.10 + Math.random() * 0.08;
        playBell(freq, now + delay, dur, vol);
      });

      // 3. Vintage Double Bell Ring ("KA-CHING!")
      playBell(2093.00, now + 0.10, 0.65, 0.22); // C7 Primary Bell
      playBell(3135.96, now + 0.16, 0.75, 0.25); // G7 Harmony Bell
      playBell(4186.01, now + 0.22, 0.85, 0.20); // C8 Glisten

      // 4. Celebratory Warm Major Chord Fanfare (Ascending Jackpot Finish)
      const chordNotes = [
        { f: 523.25, d: 0.12 },  // C5
        { f: 659.25, d: 0.18 },  // E5
        { f: 783.99, d: 0.24 },  // G5
        { f: 1046.50, d: 0.30 }, // C6
        { f: 1318.51, d: 0.38 }  // E6
      ];

      chordNotes.forEach(({ f, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + d);

        gain.gain.setValueAtTime(0.14, now + d);
        gain.gain.exponentialRampToValueAtTime(0.001, now + d + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + d);
        osc.stop(now + d + 0.45);
      });

    } catch (e) {
      console.debug('Kaching error:', e);
    }
  }

  /**
   * 🚀 UPLIFTING LOGIN FANFARE (Welcoming, premium, golden startup chime)
   */
  public playLogin(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // D Major ascending arpeggio with golden resonance
      const notes = [
        { f: 293.66, delay: 0.00, dur: 0.35, vol: 0.14 }, // D4
        { f: 369.99, delay: 0.08, dur: 0.38, vol: 0.15 }, // F#4
        { f: 440.00, delay: 0.16, dur: 0.42, vol: 0.16 }, // A4
        { f: 587.33, delay: 0.24, dur: 0.50, vol: 0.18 }, // D5
        { f: 1174.66, delay: 0.32, dur: 0.70, vol: 0.15 } // D6 Sparkle Bell
      ];

      notes.forEach(({ f, delay, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = f > 1000 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now + delay);

        gain.gain.setValueAtTime(vol, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    } catch (e) {
      console.debug('Login sound error:', e);
    }
  }

  /**
   * 💤 SMOOTH LOGOUT POWER-DOWN (Gentle descending goodbye chime)
   */
  public playLogout(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { f: 587.33, delay: 0.00, dur: 0.25 }, // D5
        { f: 440.00, delay: 0.08, dur: 0.28 }, // A4
        { f: 369.99, delay: 0.16, dur: 0.32 }, // F#4
        { f: 293.66, delay: 0.24, dur: 0.45 }  // D4
      ];

      notes.forEach(({ f, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + delay);

        gain.gain.setValueAtTime(0.12, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur);
      });
    } catch (e) {
      console.debug('Logout sound error:', e);
    }
  }

  /**
   * 🖨️ THERMAL PRINTER SOUND (Printing receipt)
   */
  public playPrint(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Motor stepping pulse
      for (let i = 0; i < 4; i++) {
        const stepTime = now + i * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380 + (i % 2) * 60, stepTime);
        gain.gain.setValueAtTime(0.08, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(stepTime);
        osc.stop(stepTime + 0.04);
      }

      // Finish Ding!
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(1760, now + 0.28); // A6
      bellGain.gain.setValueAtTime(0.15, now + 0.28);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      bell.connect(bellGain);
      bellGain.connect(ctx.destination);
      bell.start(now + 0.28);
      bell.stop(now + 0.65);

    } catch (e) {
      console.debug('Print sound error:', e);
    }
  }

  /**
   * SUCCESS CHIME (Ascending 3-tone chime for save/update/actions)
   */
  public playSuccess(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;
        const dur = 0.22;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.13, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      });
    } catch (e) {
      console.debug('Success sound error:', e);
    }
  }

  /**
   * ERROR / ALERT TONE
   */
  public playError(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.09);

      gain.gain.setValueAtTime(0.13, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {
      console.debug('Error sound error:', e);
    }
  }

  /**
   * DELETE / TRASH / CLEAR (Crisp downward sweep)
   */
  public playDelete(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.debug('Delete sound error:', e);
    }
  }

  /**
   * SHIFT REGISTER OPEN / CLOSE
   */
  public playShift(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Mechanical turn
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(320, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.06);
      gain2.gain.setValueAtTime(0.12, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.debug('Shift sound error:', e);
    }
  }
}

export const sound = new SoundManager();
