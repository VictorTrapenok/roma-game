/**
 * game.ts — Pixel Jumper game controller: state machine + scoring + camera.
 * Runs on the canvas 2D API inside GameCanvas.web.tsx. All game content and
 * physics live in the platform-agnostic modules (level/world/entities/particles).
 */

import { Asset } from "expo-asset";
import { GameLoop } from "./loop";
import { input, bindKeyboard } from "./input";
import { AudioSystem } from "./audio";
import { buildLevel, TOTAL_ROUNDS, TILE, VIEW_W, VIEW_H, type LevelData } from "./level";
import { Player, Walker, type PlayerEvent } from "./entities";
import { Particles } from "./particles";
import { drawWorld, drawTitle, drawPause, drawGameOver, drawVictory, drawRoundClear, setBackgroundImage, setPlayerImage, setWalkerImage, setCoinImage, setPlanetImage, PALETTE } from "./render";
import bgNebula from "../../assets/bg-nebula.jpg";
import bgDesert from "../../assets/bg-desert.jpg";
import heroSprite from "../../assets/hero.png";
import snakeSprite from "../../assets/hero-snake.png";
import gooseSprite from "../../assets/enemy-goose.png";
import muscleSprite from "../../assets/coin-muscle.png";
import planetTreadmill from "../../assets/planet-treadmill.png";
import planetMoon from "../../assets/planet-moon.png";
import planetJungle from "../../assets/planet-jungle.png";
import planetLava from "../../assets/planet-lava.png";
import planetCrystal from "../../assets/planet-crystal.png";
import planetJupiter from "../../assets/planet-jupiter.png";

export type GameState = "title" | "playing" | "paused" | "gameover" | "victory" | "roundclear";

const DEBUG = typeof location !== "undefined" && location.search.includes("debug=1");
const START_LIVES = 3;
const COIN_SCORE = 10;
const STOMP_SCORE = 50;
const ROUND_CLEAR_BONUS = 250;
const GOOSE_SPEED: Record<number, number> = { 1: 55, 2: 78 };
const BEST_KEY = "pixeljumper.best";

function readBest(): number {
  try {
    return Number(globalThis.localStorage?.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function writeBest(v: number): void {
  try {
    globalThis.localStorage?.setItem(BEST_KEY, String(v));
  } catch { /* storage optional */ }
}

export interface GameHandle {
  stop: () => void;
  toggleMute: () => boolean;
  /** called from the touch overlay: tapping the canvas confirms on menu screens */
  tap: () => void;
}

export function startGame(canvas: HTMLCanvasElement, onMuteChange?: (muted: boolean) => void): GameHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const audio = new AudioSystem();
  const particles = new Particles();
  const unbind = bindKeyboard();

  const bg = new Image();
  bg.onload = () => setBackgroundImage(1, bg);
  bg.src = Asset.fromModule(bgNebula).uri;

  const desert = new Image();
  desert.onload = () => setBackgroundImage(2, desert);
  desert.src = Asset.fromModule(bgDesert).uri;

  const hero = new Image();
  hero.onload = () => setPlayerImage(1, hero);
  hero.src = Asset.fromModule(heroSprite).uri;

  const snake = new Image();
  snake.onload = () => setPlayerImage(2, snake);
  snake.src = Asset.fromModule(snakeSprite).uri;

  const goose = new Image();
  goose.onload = () => setWalkerImage(goose);
  goose.src = Asset.fromModule(gooseSprite).uri;

  const muscle = new Image();
  muscle.onload = () => setCoinImage(muscle);
  muscle.src = Asset.fromModule(muscleSprite).uri;

  const planetSprites = [planetTreadmill, planetMoon, planetJungle, planetLava, planetCrystal, planetJupiter];
  planetSprites.forEach((mod, i) => {
    const img = new Image();
    img.onload = () => setPlanetImage(i, img);
    img.src = Asset.fromModule(mod).uri;
  });

  let state: GameState = "title";
  let round = 1;
  let level: LevelData = buildLevel(1);
  const player = new Player();
  let walkers: Walker[] = [];
  let lives = START_LIVES;
  let score = 0;
  let coinsCollected = 0;
  let runTime = 0;
  let victoryBonus = 0;
  let roundBonus = 0;
  let best = readBest();
  let camX = 0;
  let clock = 0;
  let deathFlash = 0;

  function spawnWalkers(lv: LevelData): Walker[] {
    const speed = GOOSE_SPEED[lv.round] ?? 55;
    return lv.enemySpawns.map((s, i) => new Walker(s, i % 2 === 0 ? 1 : -1, speed));
  }

  function loadRound(n: number): void {
    round = n;
    level = buildLevel(round);
    player.reset(level.spawn);
    walkers = spawnWalkers(level);
    coinsCollected = 0;
    camX = 0;
  }

  function resetRun(): void {
    loadRound(1);
    lives = START_LIVES;
    score = 0;
    runTime = 0;
    victoryBonus = 0;
    roundBonus = 0;
  }

  resetRun();
  // dev-only: ?debug=1&round=2 boots straight into a given round (verification aid)
  if (DEBUG) {
    const urlRound = Number(new URLSearchParams(location.search).get("round")) || 1;
    if (urlRound >= 1 && urlRound <= TOTAL_ROUNDS) loadRound(urlRound);
  }

  function transition(next: GameState): void {
    state = next;
    input.clearPressed(); // a press that opened the screen must not leak into it
  }

  function saveBest(): void {
    if (score > best) {
      best = score;
      writeBest(best);
    }
  }

  function onPlayerEvent(e: PlayerEvent, x: number, y: number): void {
    switch (e) {
      case "jump":
        audio.sfx("jump");
        particles.dust(x, y, 4);
        break;
      case "land":
        particles.dust(x, y, 3);
        break;
      case "stomp":
        score += STOMP_SCORE;
        audio.sfx("stomp");
        particles.burst(x, y, 10, PALETTE.enemy, 160);
        break;
      case "hurt":
        lives -= 1;
        deathFlash = 0.25;
        audio.sfx("hurt");
        particles.burst(x, y, 12, PALETTE.player, 200);
        if (lives <= 0) {
          player.dead = true;
          audio.sfx("lose");
          saveBest();
          transition("gameover");
        }
        break;
      case "die":
        lives -= 1;
        deathFlash = 0.3;
        audio.sfx("lose");
        particles.burst(x, Math.min(y, VIEW_H - 20), 14, PALETTE.player, 220);
        if (lives <= 0) {
          player.dead = true;
          saveBest();
          transition("gameover");
        } else {
          player.reset(level.spawn);
          player.invuln = 1.5;
        }
        break;
      case "flag": {
        if (round < TOTAL_ROUNDS) {
          roundBonus = ROUND_CLEAR_BONUS;
          score += roundBonus;
          audio.sfx("win");
          particles.burst(x, y, 20, PALETTE.coin, 220, 0.8, 4);
          transition("roundclear");
          break;
        }
        victoryBonus = Math.max(0, 1500 - Math.floor(runTime) * 10);
        score += victoryBonus;
        saveBest();
        audio.sfx("win");
        particles.burst(x, y, 24, PALETTE.coin, 260, 0.9, 5);
        transition("victory");
        break;
      }
    }
  }

  const loop = new GameLoop({
    update: (dt) => {
      clock += dt;

      if (input.consume("mute")) onMuteChange?.(audio.toggleMute());

      switch (state) {
        case "title":
          if (input.consume("confirm")) {
            resetRun();
            transition("playing");
            audio.sfx("ui");
          }
          return;

        case "paused":
          if (input.consume("pause")) { transition("playing"); audio.sfx("ui"); }
          else if (input.consume("restart")) { resetRun(); transition("playing"); audio.sfx("ui"); }
          return;

        case "gameover":
        case "victory":
          if (input.consume("confirm")) {
            resetRun();
            transition("playing");
            audio.sfx("ui");
          }
          return;

        case "roundclear":
          if (input.consume("confirm")) {
            loadRound(round + 1);
            transition("playing");
            audio.sfx("ui");
          }
          return;

        case "playing": {
          if (input.consume("pause")) {
            transition("paused");
            audio.sfx("ui");
            return;
          }
          runTime += dt;
          deathFlash = Math.max(0, deathFlash - dt);

          // dev-only: ?debug=1 in the URL enables teleport-to-flag on G (verification aid)
          if (DEBUG && input.consume("debug")) {
            player.x = level.flag.x - 30;
            player.y = level.flag.y - 64;
            player.vx = 0; player.vy = 0;
          }

          const wantJump = input.consume("jump");
          player.update(dt, level, input.moveX, wantJump, input.jumpHeld, onPlayerEvent);

          for (const w of walkers) {
            w.update(dt, level);
            w.collide(player, onPlayerEvent);
          }

          for (const coin of level.coins) {
            if (coin.taken) continue;
            if (Math.abs(coin.x - player.cx) < 24 && Math.abs(coin.y - player.cy) < 28) {
              coin.taken = true;
              coinsCollected += 1;
              score += COIN_SCORE;
              audio.sfx("coin");
              particles.burst(coin.x, coin.y, 8, PALETTE.coin, 120, 0.4, 3, 250);
            }
          }

          for (const heart of level.hearts) {
            if (heart.taken) continue;
            if (Math.abs(heart.x - player.cx) < 24 && Math.abs(heart.y - player.cy) < 28) {
              heart.taken = true;
              if (lives < START_LIVES) lives += 1;
              else score += 100; // full health converts the medkit into points
              audio.sfx("coin");
              particles.burst(heart.x, heart.y, 10, "#ff4d6d", 140, 0.5, 3, 250);
            }
          }

          particles.update(dt);

          const target = player.cx + player.facing * 60 - VIEW_W * 0.45;
          const clamped = Math.max(0, Math.min(level.cols * TILE - VIEW_W, target));
          camX += (clamped - camX) * Math.min(1, dt * 8);
          return;
        }
      }
    },

    render: () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      const bw = Math.round(cw * dpr);
      const bh = Math.round(ch * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
      const ox = (cw - VIEW_W * scale) / 2;
      const oy = (ch - VIEW_H * scale) / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b0e12";
      ctx.fillRect(0, 0, cw, ch);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
      ctx.imageSmoothingEnabled = false;

      drawWorld(ctx, level, player, walkers, camX, clock, {
        lives, coins: coinsCollected, totalCoins: level.totalCoins, score, time: runTime,
        round, rounds: TOTAL_ROUNDS,
      });
      particles.draw(ctx, camX);

      if (deathFlash > 0) {
        ctx.fillStyle = `rgba(255,60,60,${deathFlash * 1.2})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      switch (state) {
        case "title": drawTitle(ctx, clock, best); break;
        case "paused": drawPause(ctx); break;
        case "gameover": drawGameOver(ctx, score, best); break;
        case "victory": drawVictory(ctx, score, victoryBonus, best, clock); break;
        case "roundclear": drawRoundClear(ctx, round, roundBonus, clock); break;
        default: break;
      }
    },
  });
  loop.start();

  return {
    stop: () => {
      loop.stop();
      unbind();
      audio.dispose();
    },
    toggleMute: () => {
      const m = audio.toggleMute();
      onMuteChange?.(m);
      return m;
    },
    tap: () => {
      audio.unlock();
      if (state === "title" || state === "gameover" || state === "victory" || state === "roundclear") {
        input.press("confirm");
      }
    },
  };
}
