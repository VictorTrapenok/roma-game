/**
 * world.ts — AABB physics against the tile grid. Shared by the player and enemies.
 * Entities are rectangles {x, y, w, h, vx, vy}; y grows down, vy < 0 = moving up.
 */

import { TILE, isSolidAt, type LevelData } from "./level";

export interface Body {
  x: number; y: number;   // top-left
  w: number; h: number;
  vx: number; vy: number;
  onGround: boolean;
}

/** Move on X and resolve horizontal collisions against solid tiles. Returns true if a wall was hit. */
export function moveX(body: Body, level: LevelData, dt: number): boolean {
  body.x += body.vx * dt;
  const top = Math.floor(body.y / TILE);
  const bottom = Math.floor((body.y + body.h - 0.01) / TILE);
  if (body.vx > 0) {
    const col = Math.floor((body.x + body.w) / TILE);
    for (let r = top; r <= bottom; r++) {
      if (isSolidAt(level, col, r)) {
        body.x = col * TILE - body.w - 0.01;
        body.vx = 0;
        return true;
      }
    }
  } else if (body.vx < 0) {
    const col = Math.floor(body.x / TILE);
    for (let r = top; r <= bottom; r++) {
      if (isSolidAt(level, col, r)) {
        body.x = (col + 1) * TILE + 0.01;
        body.vx = 0;
        return true;
      }
    }
  }
  return false;
}

/** Move on Y and resolve vertical collisions. Sets body.onGround. Returns "ceiling" | "floor" | null. */
export function moveY(body: Body, level: LevelData, dt: number): "ceiling" | "floor" | null {
  body.y += body.vy * dt;
  body.onGround = false;
  const left = Math.floor((body.x + 1) / TILE);
  const right = Math.floor((body.x + body.w - 1) / TILE);
  if (body.vy > 0) {
    const row = Math.floor((body.y + body.h) / TILE);
    for (let c = left; c <= right; c++) {
      if (isSolidAt(level, c, row)) {
        body.y = row * TILE - body.h - 0.01;
        body.vy = 0;
        body.onGround = true;
        return "floor";
      }
    }
  } else if (body.vy < 0) {
    const row = Math.floor(body.y / TILE);
    for (let c = left; c <= right; c++) {
      if (isSolidAt(level, c, row)) {
        body.y = (row + 1) * TILE + 0.01;
        body.vy = 0;
        return "ceiling";
      }
    }
  }
  return null;
}

export function overlaps(a: { x: number; y: number; w: number; h: number },
                         b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Does this rect overlap any spike cell (with a forgiving inset hitbox)? */
export function touchesSpike(body: Body, level: LevelData): boolean {
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.w) / TILE);
  const top = Math.floor(body.y / TILE);
  const bottom = Math.floor((body.y + body.h) / TILE);
  for (let r = top; r <= bottom; r++) {
    for (let c = left; c <= right; c++) {
      if (c < 0 || c >= 170 || r < 0 || r >= 17) continue;
      if (level.spike[r * 170 + c] === 1) {
        const box = { x: c * TILE + 7, y: r * TILE + 18, w: TILE - 14, h: TILE - 18 };
        if (overlaps(body, box)) return true;
      }
    }
  }
  return false;
}

/** Is there solid ground one pixel below this point? (enemies use it to not walk off ledges) */
export function groundAhead(level: LevelData, x: number, y: number): boolean {
  return isSolidAt(level, Math.floor(x / TILE), Math.floor(y / TILE));
}
