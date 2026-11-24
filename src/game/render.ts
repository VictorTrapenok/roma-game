/**
 * render.ts — all canvas drawing. Unified pixel-art direction:
 * space-nebula backdrop (gradient sky as fallback), a parallax layer of
 * planets spread across the whole map, two parallax hill layers,
 * chunky tiles with grass tops, glowing hero sprite (rect player as fallback)
 * with squash-and-stretch, armed-goose walker sprites (rect fallback),
 * flexed-arm collectibles (coin fallback), animated flag, HUD hearts.
 * Everything is drawn in the logical 960x544 space; boot.ts sets the transform.
 */

import { COLS, LEVEL_H, ROWS, TILE, VIEW_H, VIEW_W, type LevelData } from "./level";
import type { Player, Walker } from "./entities";

export const PALETTE = {
  skyTop: "#1a2a52",
  skyBottom: "#4a7ab5",
  hillFar: "#2c3e6e",
  hillNear: "#22325a",
  dirt: "#7a4a2b",
  dirtDark: "#5e3820",
  grass: "#4fc94f",
  grassDark: "#37963c",
  block: "#a56a3f",
  coin: "#ffd94d",
  coinEdge: "#c9982a",
  spike: "#c7d0d8",
  player: "#ff5a5a",
  playerDark: "#c23a3a",
  enemy: "#8a5cff",
  enemyDark: "#5f3bbf",
  flagPole: "#e8e8e8",
  flag: "#ffd94d",
  hudText: "#ffffff",
} as const;

let bgImage: HTMLImageElement | null = null;
let playerImage: HTMLImageElement | null = null;
let walkerImage: HTMLImageElement | null = null;
let coinImage: HTMLImageElement | null = null;
const planetImages: (HTMLImageElement | null)[] = [];

/** Nebula backdrop loaded by game.ts; the gradient sky below is the fallback until it is ready. */
export function setBackgroundImage(img: HTMLImageElement): void {
  bgImage = img;
}

/** Glowing hero sprite loaded by game.ts; the rect player below is the fallback until it is ready. */
export function setPlayerImage(img: HTMLImageElement): void {
  playerImage = img;
}

/** Armed-goose enemy sprite loaded by game.ts; rect walkers are the fallback until it is ready. */
export function setWalkerImage(img: HTMLImageElement): void {
  walkerImage = img;
}

/** Flexed-arm collectible sprite loaded by game.ts; gold ellipses are the fallback until it is ready. */
export function setCoinImage(img: HTMLImageElement): void {
  coinImage = img;
}

/** Planet sprites for the parallax sky layer, indexed to match PLANET_SPOTS below. */
export function setPlanetImage(i: number, img: HTMLImageElement): void {
  planetImages[i] = img;
}

function drawBackground(ctx: CanvasRenderingContext2D, camX: number, t: number): void {
  const img = bgImage;
  if (img && img.complete && img.naturalWidth > 0) {
    // cover-fit the artwork into the logical view
    const scale = Math.max(VIEW_W / img.naturalWidth, VIEW_H / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (VIEW_W - w) / 2, (VIEW_H - h) / 2, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // sun/moon
    ctx.fillStyle = "#ffe9a3";
    ctx.beginPath();
    ctx.arc(VIEW_W - 140, 90, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // stars (fixed pattern, twinkle)
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137) % VIEW_W;
    const sy = (i * 89) % 220;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i));
    ctx.globalAlpha = tw * 0.7;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  // planets drifting across the whole map on a slow parallax layer
  drawPlanets(ctx, camX);

  // parallax hills
  drawHills(ctx, camX * 0.25, 400, 150, PALETTE.hillFar);
  drawHills(ctx, camX * 0.5, 470, 110, PALETTE.hillNear);
}

const PLANET_PARALLAX = 0.35;
// fx: where along the camera journey the planet is centered (0 = start, 1 = flag)
const PLANET_SPOTS = [
  { i: 0, fx: 0.0, y: 60 },   // earth greets at the start
  { i: 1, fx: 0.2, y: 130 },  // moon
  { i: 2, fx: 0.4, y: 55 },   // jungle
  { i: 3, fx: 0.6, y: 140 },  // lava
  { i: 4, fx: 0.8, y: 70 },   // crystal
  { i: 5, fx: 1.0, y: 120 },  // jupiter at the flag
];

function drawPlanets(ctx: CanvasRenderingContext2D, camX: number): void {
  const camMax = COLS * TILE - VIEW_W;
  for (const s of PLANET_SPOTS) {
    const img = planetImages[s.i];
    if (!img || !img.complete || img.naturalWidth === 0) continue;
    const x = VIEW_W / 2 + (s.fx * camMax - camX) * PLANET_PARALLAX;
    if (x < -img.naturalWidth || x > VIEW_W + img.naturalWidth) continue;
    ctx.drawImage(img, x - img.naturalWidth / 2, s.y);
  }
}

function drawHills(ctx: CanvasRenderingContext2D, offset: number, base: number, amp: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, VIEW_H);
  const period = 340;
  const start = -((offset % period) + period) % period - period;
  for (let x = start; x < VIEW_W + period; x += period) {
    ctx.arc(x + period / 2, base + amp, amp, Math.PI, 0);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.closePath();
  ctx.fill();
}

function drawTiles(ctx: CanvasRenderingContext2D, level: LevelData, camX: number): void {
  const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
  const c1 = Math.min(COLS - 1, Math.floor((camX + VIEW_W) / TILE) + 1);
  for (let r = 0; r < ROWS; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = r * COLS + c;
      const x = c * TILE - camX;
      const y = r * TILE;
      if (level.solid[i] === 1) {
        const aboveOpen = r === 0 || level.solid[(r - 1) * COLS + c] !== 1;
        ctx.fillStyle = PALETTE.dirt;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.dirtDark;
        ctx.fillRect(x + 4, y + 10, 6, 6);
        ctx.fillRect(x + 20, y + 20, 6, 6);
        if (aboveOpen) {
          ctx.fillStyle = PALETTE.grass;
          ctx.fillRect(x, y, TILE, 10);
          ctx.fillStyle = PALETTE.grassDark;
          ctx.fillRect(x, y + 8, TILE, 3);
        }
      }
      if (level.spike[i] === 1) {
        ctx.fillStyle = PALETTE.spike;
        for (let s = 0; s < 4; s++) {
          const sx = x + s * 8;
          ctx.beginPath();
          ctx.moveTo(sx, y + TILE);
          ctx.lineTo(sx + 4, y + 12);
          ctx.lineTo(sx + 8, y + TILE);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
}

function drawCoins(ctx: CanvasRenderingContext2D, level: LevelData, camX: number, t: number): void {
  for (const coin of level.coins) {
    if (coin.taken) continue;
    const x = coin.x - camX;
    if (x < -TILE || x > VIEW_W + TILE) continue;
    const y = coin.y + Math.sin(t * 2.4 + coin.phase) * 3;
    const squashX = Math.abs(Math.cos(t * 3 + coin.phase)); // spin

    const img = coinImage;
    if (img && img.complete && img.naturalWidth > 0) {
      const h = 26;
      const w = h * (img.naturalWidth / img.naturalHeight) * Math.max(0.15, squashX);
      ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      continue;
    }

    ctx.fillStyle = PALETTE.coinEdge;
    ctx.beginPath();
    ctx.ellipse(x, y, 9 * squashX + 1, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, 7 * squashX), 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, level: LevelData, camX: number, t: number): void {
  const baseX = level.flag.x - camX;
  const baseY = level.flag.y;
  const top = baseY - 4 * TILE;
  ctx.fillStyle = PALETTE.flagPole;
  ctx.fillRect(baseX - 2, top, 5, 4 * TILE);
  ctx.beginPath();
  ctx.arc(baseX, top - 5, 6, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.coin;
  ctx.fill();
  // waving flag
  ctx.fillStyle = PALETTE.flag;
  ctx.beginPath();
  ctx.moveTo(baseX + 3, top + 4);
  const wave = Math.sin(t * 5) * 4;
  ctx.lineTo(baseX + 42, top + 12 + wave);
  ctx.lineTo(baseX + 3, top + 24);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, camX: number, t: number): void {
  if (p.dead) return;
  if (p.invuln > 0 && Math.floor(t * 14) % 2 === 0) return; // invincibility blink
  const x = p.x - camX;
  const y = p.y;
  // squash & stretch
  const sq = p.squash > 0 ? 1 + p.squash * 2.2 : 1;
  const stretch = !p.onGround ? 1 + Math.min(0.25, Math.abs(p.vy) / 2400) : 1;

  const img = playerImage;
  if (img && img.complete && img.naturalWidth > 0) {
    // sprite is drawn larger than the hitbox, anchored bottom-center
    const baseH = p.h * 1.8;
    const baseW = baseH * (img.naturalWidth / img.naturalHeight);
    const w = (baseW * sq) / stretch;
    const h = (baseH * stretch) / sq;
    const running = p.onGround && Math.abs(p.vx) > 30;
    const tilt = running ? Math.sin(p.runTime * 18) * 0.07 : 0;
    ctx.save();
    ctx.translate(x + p.w / 2, y + p.h);
    if (p.facing === 1) ctx.scale(-1, 1); // artwork faces left
    ctx.rotate(tilt);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    return;
  }

  const w = p.w * sq / stretch;
  const h = p.h * stretch / sq;
  const dx = x + (p.w - w) / 2;
  const dy = y + (p.h - h);

  ctx.fillStyle = PALETTE.player;
  ctx.fillRect(dx, dy, w, h);
  ctx.fillStyle = PALETTE.playerDark;
  ctx.fillRect(dx, dy + h - 6, w, 6); // feet band
  // eyes look toward facing
  ctx.fillStyle = "#fff";
  const ex = p.facing === 1 ? dx + w - 12 : dx + 4;
  ctx.fillRect(ex, dy + 6, 8, 7);
  ctx.fillStyle = "#222";
  ctx.fillRect(ex + (p.facing === 1 ? 4 : 1), dy + 8, 3, 3);
  // run legs
  if (p.onGround && Math.abs(p.vx) > 30) {
    ctx.fillStyle = PALETTE.playerDark;
    const leg = Math.sin(p.runTime * 18) * 4;
    ctx.fillRect(dx + 3, dy + h, 5, 4 + leg);
    ctx.fillRect(dx + w - 8, dy + h, 5, 4 - leg);
  }
}

function drawWalkers(ctx: CanvasRenderingContext2D, walkers: Walker[], camX: number): void {
  for (const w of walkers) {
    if (!w.alive) continue;
    const x = w.x - camX;
    if (x < -TILE * 2 || x > VIEW_W + TILE * 2) continue;
    const bob = Math.abs(Math.sin(w.anim * 8)) * 2;

    const img = walkerImage;
    if (img && img.complete && img.naturalWidth > 0) {
      // sprite is drawn larger than the hitbox, anchored bottom-center
      const baseH = w.h * 2.2;
      const baseW = baseH * (img.naturalWidth / img.naturalHeight);
      const tilt = Math.sin(w.anim * 8) * 0.05;
      ctx.save();
      ctx.translate(x + w.w / 2, w.y + w.h - bob);
      if (w.dir === 1) ctx.scale(-1, 1); // artwork faces left
      ctx.rotate(tilt);
      ctx.drawImage(img, -baseW / 2, -baseH, baseW, baseH);
      ctx.restore();
      continue;
    }

    ctx.fillStyle = PALETTE.enemy;
    ctx.fillRect(x, w.y + bob, w.w, w.h - bob);
    ctx.fillStyle = PALETTE.enemyDark;
    ctx.fillRect(x, w.y + w.h - 5, w.w, 5);
    // angry eyes toward walk direction
    ctx.fillStyle = "#fff";
    const ex = w.dir === 1 ? x + w.w - 11 : x + 3;
    ctx.fillRect(ex, w.y + 5 + bob, 8, 6);
    ctx.fillStyle = "#d22";
    ctx.fillRect(ex + (w.dir === 1 ? 4 : 1), w.y + 7 + bob, 3, 3);
  }
}

export interface HudInfo {
  lives: number;
  coins: number;
  totalCoins: number;
  score: number;
  time: number;
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, filled: boolean): void {
  ctx.fillStyle = filled ? "#ff4d6d" : "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 14);
  ctx.bezierCurveTo(x - 4, y + 4, x + 2, y - 4, x + 8, y + 2);
  ctx.bezierCurveTo(x + 14, y - 4, x + 20, y + 4, x + 8, y + 14);
  ctx.fill();
}

export function drawHud(ctx: CanvasRenderingContext2D, hud: HudInfo): void {
  ctx.save();
  ctx.font = "bold 18px monospace";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (let i = 0; i < 3; i++) drawHeart(ctx, 14 + i * 26, 14, i < hud.lives);
  const img = coinImage;
  if (img && img.complete && img.naturalWidth > 0) {
    const h = 20;
    const w = h * (img.naturalWidth / img.naturalHeight);
    ctx.drawImage(img, 26 - w / 2, 50 - h / 2, w, h);
  } else {
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.ellipse(26, 50, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`× ${hud.coins}/${hud.totalCoins}`, 42, 41);
  ctx.fillText(`СЧЁТ ${hud.score}`, 14, 70);
  const mm = Math.floor(hud.time / 60);
  const ss = Math.floor(hud.time % 60).toString().padStart(2, "0");
  ctx.textAlign = "right";
  ctx.fillText(`${mm}:${ss}`, VIEW_W - 14, 14);
  ctx.restore();
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  level: LevelData,
  player: Player,
  walkers: Walker[],
  camX: number,
  t: number,
  hud: HudInfo,
): void {
  drawBackground(ctx, camX, t);
  ctx.save();
  drawTiles(ctx, level, camX);
  drawFlag(ctx, level, camX, t);
  drawCoins(ctx, level, camX, t);
  drawWalkers(ctx, walkers, camX);
  drawPlayer(ctx, player, camX, t);
  ctx.restore();
  drawHud(ctx, hud);
}

// ---- full-screen overlays (title / pause / gameover / victory) --------------

function panel(ctx: CanvasRenderingContext2D, alpha: number): void {
  ctx.fillStyle = `rgba(8, 12, 24, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function bigText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, color = "#fff"): void {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_W / 2, y);
}

function smallText(ctx: CanvasRenderingContext2D, text: string, y: number, color = "#cdd6f4"): void {
  ctx.font = "18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_W / 2, y);
}

export function drawTitle(ctx: CanvasRenderingContext2D, t: number, best: number): void {
  panel(ctx, 0.45);
  const bob = Math.sin(t * 2) * 6;
  bigText(ctx, "PIXEL JUMPER", 170 + bob, 64, PALETTE.coin);
  smallText(ctx, "Прыгай, топчи врагов, собирай монеты и доберись до флага!", 240);
  smallText(ctx, "A / D или ← → — бег     W / ПРОБЕЛ / ↑ — прыжок", 300);
  smallText(ctx, "ESC — пауза     M — звук", 330);
  if (Math.floor(t * 1.6) % 2 === 0) smallText(ctx, "— НАЖМИ ПРОБЕЛ, ЧТОБЫ НАЧАТЬ —", 400, PALETTE.coin);
  if (best > 0) smallText(ctx, `Рекорд: ${best}`, 460, "#9adcff");
}

export function drawPause(ctx: CanvasRenderingContext2D): void {
  panel(ctx, 0.55);
  bigText(ctx, "ПАУЗА", 220, 56);
  smallText(ctx, "ESC — продолжить     R — заново     M — звук", 300);
}

export function drawGameOver(ctx: CanvasRenderingContext2D, score: number, best: number): void {
  panel(ctx, 0.6);
  bigText(ctx, "ИГРА ОКОНЧЕНА", 200, 52, "#ff6b6b");
  smallText(ctx, `Счёт: ${score}     Рекорд: ${best}`, 270);
  smallText(ctx, "ПРОБЕЛ — попробовать снова", 340, PALETTE.coin);
}

export function drawVictory(ctx: CanvasRenderingContext2D, score: number, bonus: number, best: number, t: number): void {
  panel(ctx, 0.55);
  const bob = Math.sin(t * 2.4) * 5;
  bigText(ctx, "ФЛАГ ВЗЯТ!", 180 + bob, 56, PALETTE.coin);
  smallText(ctx, `Бонус за скорость: +${bonus}`, 250);
  smallText(ctx, `Итог: ${score}     Рекорд: ${best}`, 290);
  smallText(ctx, "ПРОБЕЛ — сыграть ещё раз", 360, PALETTE.coin);
}
