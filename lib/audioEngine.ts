export interface ClothAudioFrameInput {
  /** Pointer velocity magnitude across the shower curtain (0..3+) */
  pointerSpeed: number;
  /** Whether the pointer is hovering over the cloth curtain */
  isHovering: boolean;
  /** Whether the user is actively grabbing/dragging the cloth */
  isDragging: boolean;
  /** Current touch-reactive glitch energy (0..1.35) */
  glitchEnergy: number;
  /** Horizontal normalized UV position of interaction (0..1) for subtle stereo panning */
  touchU: number;
  /** Overall cloth motion displacement (0..1+) */
  displacement: number;
  /** Global mute state */
  muted: boolean;
}

export interface ClothAudioParams {
  masterGain: number;
  swishGain: number;
  swishFilterFreq: number;
  swishFilterQ: number;
  swishPan: number;
  neonHumGain: number;
  neonBuzzGain: number;
  neonDetuneCents: number;
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return v < min ? min : v > max ? max : v;
}

/**
 * Pure deterministic parameter mapping from real-time cloth interaction telemetry
 * to subtle Web Audio synthesis parameters ('fabric swishing' + 'neon humming').
 */
export function computeClothAudioParams(input: ClothAudioFrameInput): ClothAudioParams {
  if (input.muted) {
    return {
      masterGain: 0,
      swishGain: 0,
      swishFilterFreq: 680,
      swishFilterQ: 1.4,
      swishPan: 0,
      neonHumGain: 0,
      neonBuzzGain: 0,
      neonDetuneCents: 0,
    };
  }

  const speed = clamp(input.pointerSpeed, 0, 3.5);
  const normSpeed = clamp(speed / 2.2, 0, 1);
  const glitch = clamp(input.glitchEnergy, 0, 1.35);
  const normGlitch = clamp(glitch / 1.1, 0, 1);
  const disp = clamp(input.displacement, 0, 1.2);
  const touchU = clamp(input.touchU, 0, 1);

  // 1. Subtle silky/vinyl fabric swish voice: driven by cursor speed on cloth + gentle billow
  const interactionActive = input.isHovering || input.isDragging;
  const cursorSwish = interactionActive
    ? (input.isDragging ? 0.032 : 0.012) + Math.pow(normSpeed, 0.78) * (input.isDragging ? 0.145 : 0.105)
    : 0;
  // Soft cloth rustle tail when curtain is actively rippling/gusting even after pointer leaves
  const billowRustle = disp > 0.14 ? clamp((disp - 0.14) * 0.055, 0, 0.04) : 0;
  const swishGain = clamp(cursorSwish + billowRustle, 0, 0.18);

  // Sweeping bandpass filter frequency: deeper velvet/vinyl brush when slow, crisp rustle when fast
  const swishFilterFreq = clamp(
    520 + normSpeed * 1450 + (input.isDragging ? 220 : 0) + normGlitch * 180,
    460,
    2400
  );
  const swishFilterQ = clamp(1.15 + normSpeed * 0.95 + (input.isDragging ? 0.25 : 0), 1.0, 2.6);
  const swishPan = clamp((touchU - 0.5) * 0.7, -0.55, 0.55);

  // 2. Dim neon bathroom tube hum & electric reactive buzz
  const baseHum = 0.018;
  const interactionHumBoost = interactionActive ? 0.016 + normSpeed * 0.022 : 0;
  const glitchHumBoost = normGlitch * 0.034;
  const neonHumGain = clamp(baseHum + interactionHumBoost + glitchHumBoost, 0, 0.088);

  // Crisp harmonic buzz + electric micro-crackle when brushing/dragging or glitching
  const neonBuzzGain = clamp(
    (interactionActive ? 0.008 + normSpeed * 0.02 : 0) + normGlitch * 0.044,
    0,
    0.068
  );

  // Subtle neon ballast voltage sag / pitch shimmer tied to glitch & fast drag
  const neonDetuneCents = clamp((normGlitch * 14 + (input.isDragging ? normSpeed * 6 : 0)), -24, 24);

  return {
    masterGain: 0.85,
    swishGain,
    swishFilterFreq,
    swishFilterQ,
    swishPan,
    neonHumGain,
    neonBuzzGain,
    neonDetuneCents,
  };
}

export type AudioEngineState = 'idle' | 'running' | 'suspended' | 'muted' | 'unsupported';

/**
 * Procedural Web Audio API sound engine synthesizing:
 *  - Subtle filtered stereo fabric swishing when brushing or dragging the shower curtain
 *  - Warm 60Hz/120Hz/240Hz bathroom neon tube humming & electric glitch buzz on interaction
 *  - Soft tactile grab snap & steam-gust whoosh cues
 */
export class ViceAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Fabric swish voice nodes
  private swishFilter: BiquadFilterNode | null = null;
  private swishGain: GainNode | null = null;
  private swishPanner: StereoPannerNode | null = null;

  // Neon hum & electric buzz voice nodes
  private neonOsc60: OscillatorNode | null = null;
  private neonOsc120: OscillatorNode | null = null;
  private neonOsc240: OscillatorNode | null = null;
  private neonHumGain: GainNode | null = null;
  private neonBuzzGain: GainNode | null = null;
  private neonCrackleGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private disposed = false;

  public getState(): AudioEngineState {
    if (this.muted) return 'muted';
    if (typeof window === 'undefined') return 'unsupported';
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return 'unsupported';
    if (!this.ctx) return 'idle';
    return this.ctx.state === 'running' ? 'running' : 'suspended';
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, now, 0.06);
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Lazily initializes and resumes the Web Audio graph on user interaction.
   * Safely handles browser autoplay restrictions without throwing.
   */
  public unlock(): void {
    if (this.disposed || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.buildAudioGraph(this.ctx);
      }
      if (this.ctx.state === 'suspended' && !this.muted) {
        void this.ctx.resume().catch(() => {
          // Will retry on next explicit pointerdown/click/keydown gesture
        });
      }
    } catch {
      // Ignore Web Audio creation failures in restricted environments
    }
  }

  private buildAudioGraph(ctx: AudioContext): void {
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.85;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Create a smooth looping 2.5s pink-tilted fabric noise buffer with edge crossfade
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 2.5);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);

    // Voss-McCartney / Paul Kellet pink noise filter for natural silky fabric texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      channel[i] = clamp(pink, -1, 1);
    }

    // Crossfade last 2048 samples into first 2048 samples for clickless seamless looping
    const fadeLen = Math.min(2048, Math.floor(length * 0.05));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const endIdx = length - fadeLen + i;
      channel[endIdx] = channel[endIdx] * (1 - t) + channel[i] * t;
    }
    this.noiseBuffer = buffer;

    // --- VOICE 1: Fabric Swishing ---
    const swishSource = ctx.createBufferSource();
    swishSource.buffer = buffer;
    swishSource.loop = true;

    const swishHP = ctx.createBiquadFilter();
    swishHP.type = 'highpass';
    swishHP.frequency.value = 240;

    const swishBP = ctx.createBiquadFilter();
    swishBP.type = 'bandpass';
    swishBP.frequency.value = 780;
    swishBP.Q.value = 1.35;

    const swishGain = ctx.createGain();
    swishGain.gain.value = 0;

    const swishPanner = ctx.createStereoPanner();
    swishPanner.pan.value = 0;

    swishSource.connect(swishHP);
    swishHP.connect(swishBP);
    swishBP.connect(swishGain);
    swishGain.connect(swishPanner);
    swishPanner.connect(master);
    swishSource.start();

    this.swishFilter = swishBP;
    this.swishGain = swishGain;
    this.swishPanner = swishPanner;

    // --- VOICE 2: Dim Bathroom Neon Tube Hum & Electric Reactive Buzz ---
    const neonLP = ctx.createBiquadFilter();
    neonLP.type = 'lowpass';
    neonLP.frequency.value = 540;
    neonLP.Q.value = 0.9;

    const neonHumGain = ctx.createGain();
    neonHumGain.gain.value = 0;
    neonLP.connect(neonHumGain);
    neonHumGain.connect(master);

    // Fundamental 60Hz warm ballast hum
    const osc60 = ctx.createOscillator();
    osc60.type = 'sine';
    osc60.frequency.value = 60;
    const g60 = ctx.createGain();
    g60.gain.value = 0.65;
    osc60.connect(g60);
    g60.connect(neonLP);
    osc60.start();

    // 120Hz fluorescent/neon transformer harmonic
    const osc120 = ctx.createOscillator();
    osc120.type = 'triangle';
    osc120.frequency.value = 120;
    const g120 = ctx.createGain();
    g120.gain.value = 0.35;
    osc120.connect(g120);
    g120.connect(neonLP);
    osc120.start();

    // 240Hz + high-band electric buzz voice (swells during touch/glitch)
    const neonBuzzBP = ctx.createBiquadFilter();
    neonBuzzBP.type = 'bandpass';
    neonBuzzBP.frequency.value = 480;
    neonBuzzBP.Q.value = 2.1;

    const neonBuzzGain = ctx.createGain();
    neonBuzzGain.gain.value = 0;
    neonBuzzBP.connect(neonBuzzGain);
    neonBuzzGain.connect(master);

    const osc240 = ctx.createOscillator();
    osc240.type = 'sawtooth';
    osc240.frequency.value = 240;
    const g240 = ctx.createGain();
    g240.gain.value = 0.28;
    osc240.connect(g240);
    g240.connect(neonBuzzBP);
    osc240.start();

    // High-frequency neon arc sizzle/crackle layer driven by noise + glitch energy
    const crackleSource = ctx.createBufferSource();
    crackleSource.buffer = buffer;
    crackleSource.loop = true;

    const crackleBP = ctx.createBiquadFilter();
    crackleBP.type = 'bandpass';
    crackleBP.frequency.value = 3100;
    crackleBP.Q.value = 4.2;

    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;

    crackleSource.connect(crackleBP);
    crackleBP.connect(crackleGain);
    crackleGain.connect(master);
    crackleSource.start(0, 0.7);

    this.neonOsc60 = osc60;
    this.neonOsc120 = osc120;
    this.neonOsc240 = osc240;
    this.neonHumGain = neonHumGain;
    this.neonBuzzGain = neonBuzzGain;
    this.neonCrackleGain = crackleGain;
  }

  public update(input: Omit<ClothAudioFrameInput, 'muted'>): void {
    if (this.disposed || !this.ctx || this.ctx.state !== 'running') return;
    if (
      !this.masterGain ||
      !this.swishGain ||
      !this.swishFilter ||
      !this.swishPanner ||
      !this.neonHumGain ||
      !this.neonBuzzGain ||
      !this.neonCrackleGain
    ) {
      return;
    }

    const params = computeClothAudioParams({ ...input, muted: this.muted });
    const now = this.ctx.currentTime;

    this.masterGain.gain.setTargetAtTime(params.masterGain, now, 0.08);
    this.swishGain.gain.setTargetAtTime(params.swishGain, now, 0.055);
    this.swishFilter.frequency.setTargetAtTime(params.swishFilterFreq, now, 0.065);
    this.swishFilter.Q.setTargetAtTime(params.swishFilterQ, now, 0.08);
    this.swishPanner.pan.setTargetAtTime(params.swishPan, now, 0.07);

    this.neonHumGain.gain.setTargetAtTime(params.neonHumGain, now, 0.11);
    this.neonBuzzGain.gain.setTargetAtTime(params.neonBuzzGain, now, 0.06);
    this.neonCrackleGain.gain.setTargetAtTime(params.neonBuzzGain * 0.42, now, 0.05);

    if (this.neonOsc120 && this.neonOsc240 && this.neonOsc60) {
      this.neonOsc60.detune.setTargetAtTime(params.neonDetuneCents * 0.35, now, 0.07);
      this.neonOsc120.detune.setTargetAtTime(params.neonDetuneCents * 0.7, now, 0.06);
      this.neonOsc240.detune.setTargetAtTime(params.neonDetuneCents, now, 0.05);
    }
  }

  /** Soft tactile cloth grab rustle + neon voltage flick when grabbing the curtain or switching sheets */
  public triggerGrabCue(touchU = 0.5): void {
    if (this.disposed || this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.frequency.exponentialRampToValueAtTime(520, now + 0.16);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = clamp((touchU - 0.5) * 0.7, -0.5, 0.5);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    src.start(now, Math.random() * 1.4, 0.22);
  }

  /** Soft humid steam vent gust whoosh across the shower curtain */
  public triggerGustWhoosh(): void {
    if (this.disposed || this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.exponentialRampToValueAtTime(1280, now + 0.28);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.92);
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now, Math.random() * 0.8, 1.0);
  }

  public dispose(): void {
    this.disposed = true;
    if (this.ctx) {
      void this.ctx.close().catch(() => {
        // ignore close errors
      });
      this.ctx = null;
    }
    this.masterGain = null;
    this.swishFilter = null;
    this.swishGain = null;
    this.swishPanner = null;
    this.neonOsc60 = null;
    this.neonOsc120 = null;
    this.neonOsc240 = null;
    this.neonHumGain = null;
    this.neonBuzzGain = null;
    this.neonCrackleGain = null;
    this.noiseBuffer = null;
  }
}
