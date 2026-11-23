/**
 * level.ts — level geometry and content for Pixel Jumper.
 * Deterministic hand-designed level built from data (no Math.random in content).
 *
 * World units are pixels. Tile = 32px. Y grows DOWN (screen convention);
 * gameplay code treats "up" as negative vy.
 */

export const TILE = 32;
export const ROWS = 17;
export const COLS = 170;
export const LEVEL_W = COLS * TILE; // 5440
export const LEVEL_H = ROWS * TILE; // 544
export const VIEW_W = 960;
export const VIEW_H = LEVEL_H;

export interface Coin { x: number; y: number; taken: boolean; phase: number }
export interface EnemySpawn { x: number; y: number }
export interface Vec2 { x: number; y: number }

export interface LevelData {
  /** ROWS*COLS grid: 1 = solid block. */
  solid: Uint8Array;
  /** ROWS*COLS grid: 1 = spikes sitting in this cell. */
  spike: Uint8Array;
  coins: Coin[];
  enemySpawns: EnemySpawn[];
  spawn: Vec2;
  flag: Vec2; // base of the flag pole (on the ground)
  totalCoins: number;
}

export function isSolidAt(level: LevelData, col: number, row: number): boolean {
  if (col < 0 || col >= COLS) return true; // side walls
  if (row < 0) return false;
  if (row >= ROWS) return false; // below the map = pit, handled as fall-out
  return level.solid[row * COLS + col] === 1;
}

function setSolid(level: LevelData, col: number, row: number): void {
  if (col >= 0 && col < COLS && row >= 0 && row < ROWS) level.solid[row * COLS + col] = 1;
}

function addCoin(level: LevelData, col: number, row: number): void {
  level.coins.push({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2, taken: false, phase: level.coins.length * 0.7 });
}

export function buildLevel(): LevelData {
  const level: LevelData = {
    solid: new Uint8Array(ROWS * COLS),
    spike: new Uint8Array(ROWS * COLS),
    coins: [],
    enemySpawns: [],
    spawn: { x: 2.5 * TILE, y: 13 * TILE },
    flag: { x: 163 * TILE, y: 15 * TILE },
    totalCoins: 0,
  };

  // ---- ground (rows 15-16) with three pits --------------------------------
  const ground: Array<[number, number]> = [[0, 27], [32, 57], [62, 94], [100, 169]];
  for (const [a, b] of ground) {
    for (let c = a; c <= b; c++) {
      setSolid(level, c, 15);
      setSolid(level, c, 16);
    }
  }

  // ---- floating platforms --------------------------------------------------
  const platforms: Array<[col: number, row: number, w: number]> = [
    [34, 12, 4], [40, 10, 4], [46, 12, 4],           // staircase over pit 1
    [64, 12, 5], [72, 10, 4], [79, 12, 4],           // mid section
    [104, 12, 4], [110, 10, 4], [116, 8, 5], [124, 10, 4], // high road
    [135, 12, 6],                                     // pre-flag hop
  ];
  for (const [c, r, w] of platforms) {
    for (let i = 0; i < w; i++) setSolid(level, c + i, r);
  }

  // ---- staircase blocks near the flag --------------------------------------
  for (const [c, topRow, h] of [[146, 14, 1], [149, 13, 2], [152, 12, 3]] as const) {
    for (let r = topRow; r < topRow + h; r++) setSolid(level, c, r);
  }

  // ---- spikes (sit in row 14, on top of ground row 15) ---------------------
  for (const c of [21, 22, 51, 68, 87, 88, 130, 131, 141]) {
    level.spike[14 * COLS + c] = 1;
  }

  // ---- coins ----------------------------------------------------------------
  // arcs over the three pits
  for (const [cx, topRow] of [[28, 12], [58, 12], [95, 12]] as const) {
    for (let i = 0; i < 4; i++) addCoin(level, cx + i, topRow + Math.abs(1.5 - i) * 0.9);
  }
  // rows above platforms
  for (const [c, r, w] of platforms) {
    for (let i = 0; i < w; i += 2) addCoin(level, c + i, r - 2);
  }
  // ground-level trails
  for (const c of [8, 10, 12, 37, 43, 74, 90, 106, 120, 138, 155, 158]) addCoin(level, c, 13);
  // reward line on the high road
  for (const c of [117, 118, 119, 120]) addCoin(level, c, 6);
  level.totalCoins = level.coins.length;

  // ---- enemies (walkers on the ground) --------------------------------------
  for (const c of [19, 48, 70, 84, 108, 127, 139, 157]) {
    level.enemySpawns.push({ x: c * TILE, y: 13 * TILE });
  }

  return level;
}
