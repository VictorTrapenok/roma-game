/**
 * particles.ts — tiny pooled particle system (zero allocation in the hot loop).
 * Used for coin sparkles, stomp puffs, landing dust and hurt bursts.
 */

export interface Particle {
  alive: boolean;
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

const POOL_SIZE = 160;

export class Particles {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: "#fff", gravity: 0 });
    }
  }

  private spawn(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, gravity: number): void {
    for (const p of this.pool) {
      if (!p.alive) {
        p.alive = true;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.size = size; p.color = color; p.gravity = gravity;
        return;
      }
    }
  }

  burst(x: number, y: number, count: number, color: string, speed: number, life = 0.5, size = 4, gravity = 500): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (count > 1 ? 0 : 0);
      const s = speed * (0.5 + ((i * 37) % 10) / 18);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - speed * 0.4, life, size, color, gravity);
    }
  }

  dust(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.spawn(x, y, dir * (40 + i * 15), -30 - i * 8, 0.35, 3, "rgba(220,210,190,0.8)", 150);
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX: number): void {
    for (const p of this.pool) {
      if (!p.alive) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - camX - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}
