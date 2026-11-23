/**
 * entities.ts — the player and the walker enemies.
 * Physics tuning lives in PHYS; gameplay feel features: coyote time, jump buffering,
 * variable jump height, landing squash, hurt knockback + invincibility.
 */

import { TILE, LEVEL_H, type LevelData, type EnemySpawn } from "./level";
import { moveX, moveY, overlaps, touchesSpike, groundAhead, type Body } from "./world";

export const PHYS = {
  GRAVITY: 1900,
  MOVE_SPEED: 265,
  AIR_CONTROL: 0.85,
  JUMP_VEL: 640,
  JUMP_CUT: 0.45,        // releasing jump early cuts upward speed
  COYOTE_TIME: 0.1,      // can still jump this long after leaving a ledge
  JUMP_BUFFER: 0.12,     // jump pressed just before landing still fires
  MAX_FALL: 900,
} as const;

export type PlayerEvent = "jump" | "land" | "coin" | "stomp" | "hurt" | "die" | "flag";

export class Player implements Body {
  x = 0; y = 0;
  readonly w = 22; readonly h = 30;
  vx = 0; vy = 0;
  onGround = false;
  facing: 1 | -1 = 1;
  coyote = 0;
  jumpBuffer = 0;
  jumpHeld = false;
  invuln = 0;            // seconds of post-hit invincibility
  squash = 0;            // landing squash animation timer
  runTime = 0;           // drives the run cycle animation
  dead = false;
  finished = false;

  reset(spawn: { x: number; y: number }): void {
    this.x = spawn.x; this.y = spawn.y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.coyote = 0; this.jumpBuffer = 0; this.jumpHeld = false;
    this.invuln = 0; this.squash = 0; this.runTime = 0;
    this.dead = false; this.finished = false;
  }

  get cx(): number { return this.x + this.w / 2; }
  get cy(): number { return this.y + this.h / 2; }

  update(
    dt: number,
    level: LevelData,
    moveAxis: number,       // -1..1 from A/D or arrows
    wantJump: boolean,      // jump pressed this step (buffered here)
    jumpDown: boolean,      // jump currently held
    emit: (e: PlayerEvent, x: number, y: number) => void,
  ): void {
    if (this.dead || this.finished) return;

    // --- horizontal ---
    const control = this.onGround ? 1 : PHYS.AIR_CONTROL;
    const target = moveAxis * PHYS.MOVE_SPEED * control;
    // snappy acceleration, slight glide when stopping
    this.vx += (target - this.vx) * Math.min(1, dt * 14);
    if (Math.abs(moveAxis) > 0.1) {
      this.facing = moveAxis > 0 ? 1 : -1;
      if (this.onGround) this.runTime += dt;
    }

    // --- jump: buffer + coyote ---
    if (wantJump) this.jumpBuffer = PHYS.JUMP_BUFFER;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.onGround ? PHYS.COYOTE_TIME : Math.max(0, this.coyote - dt);

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -PHYS.JUMP_VEL;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.onGround = false;
      emit("jump", this.cx, this.y + this.h);
    }
    // variable jump height
    if (!jumpDown && this.vy < 0) this.vy *= Math.pow(PHYS.JUMP_CUT, dt * 60);

    // --- gravity + integrate ---
    this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
    const wasAirborne = !this.onGround;
    moveX(this, level, dt);
    moveY(this, level, dt);
    if (wasAirborne && this.onGround) {
      this.squash = 0.12;
      emit("land", this.cx, this.y + this.h);
    }

    this.invuln = Math.max(0, this.invuln - dt);
    this.squash = Math.max(0, this.squash - dt);

    // --- hazards ---
    if (this.invuln <= 0 && touchesSpike(this, level)) {
      emit("die", this.cx, this.cy);
      return;
    }
    if (this.y > LEVEL_H + 40) {
      emit("die", this.cx, this.y);
      return;
    }

    // --- flag ---
    if (overlaps(this, { x: level.flag.x - 40, y: level.flag.y - 4.2 * TILE, w: 88, h: 4.2 * TILE })) {
      this.finished = true;
      this.vx = 0;
      emit("flag", this.cx, this.cy);
    }
  }

  hurt(emit: (e: PlayerEvent, x: number, y: number) => void): boolean {
    if (this.invuln > 0 || this.dead || this.finished) return false;
    this.invuln = 1.4;
    this.vy = -320;
    this.vx = -this.facing * 200;
    emit("hurt", this.cx, this.cy);
    return true;
  }
}

export class Walker implements Body {
  x: number; y: number;
  readonly w = 26; readonly h = 24;
  vx = 0; vy = 0;
  onGround = false;
  dir: 1 | -1;
  alive = true;
  anim = 0;

  constructor(spawn: EnemySpawn, dir: 1 | -1) {
    this.x = spawn.x; this.y = spawn.y;
    this.dir = dir;
  }

  private static readonly SPEED = 55;

  update(dt: number, level: LevelData): void {
    if (!this.alive) return;
    this.anim += dt;
    this.vy = Math.min(this.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);
    this.vx = this.dir * Walker.SPEED;

    const hitWall = moveX(this, level, dt);
    moveY(this, level, dt);

    // turn around at walls and at ledge edges
    if (hitWall) {
      this.dir = this.dir === 1 ? -1 : 1;
    } else if (this.onGround) {
      const aheadX = this.dir === 1 ? this.x + this.w + 2 : this.x - 2;
      if (!groundAhead(level, aheadX, this.y + this.h + 4)) {
        this.dir = this.dir === 1 ? -1 : 1;
      }
    }
  }

  /** Interaction with the player: stomp kills the walker, side contact hurts the player. */
  collide(player: Player, emit: (e: PlayerEvent, x: number, y: number) => void): void {
    if (!this.alive || player.dead || player.finished) return;
    if (!overlaps(player, this)) return;
    const playerFalling = player.vy > 60;
    const playerAbove = player.y + player.h - this.y < 14;
    if (playerFalling && playerAbove) {
      this.alive = false;
      player.vy = -430; // stomp bounce
      emit("stomp", this.x + this.w / 2, this.y);
    } else if (player.invuln <= 0) {
      player.facing = player.cx < this.x + this.w / 2 ? 1 : -1; // knocked away from the enemy
      player.hurt(emit);
    }
  }
}
