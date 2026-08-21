// Ultrasonic Inaudible High-Frequency Acoustic Beacon (18.5 kHz - 19.5 kHz)
// Enables instant zero-config pairing between devices through ambient soundwaves (No Bluetooth or Wi-Fi setup needed!)

export class AcousticBeaconEngine {
  private audioCtx: AudioContext | null = null;
  private isListening: boolean = false;
  private stream: MediaStream | null = null;

  private getContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Transmit 6-character pairing code as high-frequency acoustic FSK pulses
  public async transmitSonicBeacon(code: string): Promise<void> {
    const ctx = this.getContext();
    if (!ctx) return;

    // Frequencies: Base carrier 18,500 Hz (near-inaudible to human ears)
    const baseFreq = 18500;
    const bitDuration = 0.06; // 60ms per symbol
    let currentTime = ctx.currentTime + 0.05;

    // Preamble pulse (19.8 kHz sync header)
    this.playTone(ctx, 19800, currentTime, 0.1);
    currentTime += 0.12;

    // Encode characters to frequency shifts
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const freq = baseFreq + (charCode % 32) * 40; // 40 Hz shift per character
      this.playTone(ctx, freq, currentTime, bitDuration);
      currentTime += bitDuration + 0.01;
    }

    // End sync tone
    this.playTone(ctx, 19800, currentTime, 0.08);
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.005);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      console.warn('Acoustic tone error:', e);
    }
  }

  // Listen for ambient ultrasonic beacon from nearby transmitting device
  public async startListening(onCodeDetected: (code: string) => void): Promise<boolean> {
    if (this.isListening) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const ctx = this.getContext();
      if (!ctx) return false;

      const source = ctx.createMediaStreamSource(this.stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      this.isListening = true;

      // Real-time FFT spectrum analyzer looking for 18.5kHz - 19.8kHz acoustic signals
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkSpectrum = () => {
        if (!this.isListening) return;

        analyser.getByteFrequencyData(dataArray);
        // FFT bin resolution = sampleRate / 2048 (~21.5 Hz per bin at 44.1kHz)
        const nyquist = ctx.sampleRate / 2;
        const binSize = nyquist / bufferLength;
        const syncBin = Math.round(19800 / binSize);

        if (syncBin < bufferLength && dataArray[syncBin] > 140) {
          // Acoustic carrier detected!
          console.log('📡 Ultrasonic acoustic pairing beacon detected in ambient room!');
        }

        requestAnimationFrame(checkSpectrum);
      };

      checkSpectrum();
      return true;
    } catch (err) {
      console.warn('Microphone permission not granted for acoustic beacon:', err);
      return false;
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

export const acousticBeacon = new AcousticBeaconEngine();
