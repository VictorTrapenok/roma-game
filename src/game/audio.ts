/**
 * audio.ts — Web Audio synthesized SFX, no asset files. Web-only (guarded);
 * on native it silently does nothing. Mute persisted in localStorage.
 */

export type SfxId = "jump" | "coin" | "stomp" | "hurt" | "lose" | "win" | "ui";

const MUTE_KEY = "pixeljumper.muted";

function readMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = readMuted();

  private ensureCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext | undefined =
          globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** Browsers require a user gesture before audio can start — call from a tap/click. */
  unlock(): void {
    this.ensureCtx();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      globalThis.localStorage?.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch { /* storage optional */ }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  sfx(id: SfxId): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const spec: Record<SfxId, [OscillatorType, number, number, number, number]> = {
      jump: ["triangle", 260, 520, 0.12, 0.2],
      coin: ["sine", 660, 990, 0.12, 0.25],
      stomp: ["square", 200, 70, 0.14, 0.3],
      hurt: ["sawtooth", 140, 40, 0.35, 0.35],
      lose: ["sawtooth", 220, 55, 0.6, 0.3],
      win: ["sine", 523, 1046, 0.5, 0.3],
      ui: ["sine", 440, 520, 0.05, 0.15],
    };
    const [type, f0, f1, dur, g] = spec[id];
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env.gain.setValueAtTime(g, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + dur);
  }

  dispose(): void {
    const ctx = this.ctx;
    this.ctx = null;
    this.master = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }
}
