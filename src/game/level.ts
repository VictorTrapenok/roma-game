/**
 * level.ts — level geometry and content for Pixel Jumper.
 * Deterministic hand-designed levels built from data (no Math.random in content).
 * Round 1 is the original course; round 2 is longer, meaner and full of geese.
 *
 * World units are pixels. Tile = 32px. Y grows DOWN (screen convention);
 * gameplay code treats "up" as negative vy.
 */

export const TILE = 32;
export const ROWS = 17;
export const LEVEL_H = ROWS * TILE; // 544
export const VIEW_W = 960;
export const VIEW_H = LEVEL_H;

export const TOTAL_ROUNDS = 2;

export interface Coin { x: number; y: number; taken: boolean; phase: number }
export interface EnemySpawn { x: number; y: number }
export interface Vec2 { x: number; y: number }

export interface LevelData {
  /** grid width in tiles; each round may differ */
  cols: number;
  /** round number this level belongs to (1-based) */
  round: number;
  /** ROWS*cols grid: 1 = solid block. */
  solid: Uint8Array;
  /** ROWS*cols grid: 1 = spikes sitting in this cell. */
  spike: Uint8Array;
  coins: Coin[];
  enemySpawns: EnemySpawn[];
  spawn: Vec2;
  flag: Vec2; // base of the flag pole (on the ground)
  totalCoins: number;
}

export function isSolidAt(level: LevelData, col: number, row: number): boolean {
  if (col < 0 || col >= level.cols) return true; // side walls
  if (row < 0) return false;
  if (row >= ROWS) return false; // below the map = pit, handled as fall-out
  return level.solid[row * level.cols + col] === 1;
}

function setSolid(level: LevelData, col: number, row: number): void {
  if (col >= 0 && col < level.cols && row >= 0 && row < ROWS) level.solid[row * level.cols + col] = 1;
}

function addCoin(level: LevelData, col: number, row: number): void {
  level.coins.push({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2, taken: false, phase: level.coins.length * 0.7 });
}

function emptyLevel(cols: number, round: number, flagCol: number): LevelData {
  return {
    cols,
    round,
    solid: new Uint8Array(ROWS * cols),
    spike: new Uint8Array(ROWS * cols),
    coins: [],
    enemySpawns: [],
    spawn: { x: 2.5 * TILE, y: 13 * TILE },
    flag: { x: flagCol * TILE, y: 15 * TILE },
    totalCoins: 0,
  };
}

export function buildLevel(round = 1): LevelData {
  return round >= 2 ? buildRound2() : buildRound1();
}

function buildRound1(): LevelData {
  const level = emptyLevel(170, 1, 163);

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
    level.spike[14 * level.cols + c] = 1;
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

/**
 * Round 2: ~1.5x longer, eight pits, dense spike clusters, narrow platforms
 * and nearly three times as many, faster geese.
 */
function buildRound2(): LevelData {
  const level = emptyLevel(260, 2, 253);

  // ---- ground with eight pits ----------------------------------------------
  const ground: Array<[number, number]> = [
    [0, 24], [30, 52], [58, 80], [86, 108], [114, 136],
    [142, 164], [170, 193], [199, 222], [228, 259],
  ];
  for (const [a, b] of ground) {
    for (let c = a; c <= b; c++) {
      setSolid(level, c, 15);
      setSolid(level, c, 16);
    }
  }

  // ---- floating platforms ---------------------------------------------------
  const platforms: Array<[col: number, row: number, w: number]> = [
    [25, 12, 3], [29, 11, 3],                              // hop over pit 1
    [40, 12, 4], [47, 10, 3], [54, 12, 3],
    [62, 12, 5], [70, 10, 4], [76, 12, 3], [82, 12, 3],
    [92, 12, 4], [99, 10, 4], [105, 8, 5], [112, 10, 4],   // high road
    [120, 12, 4], [127, 10, 3], [133, 12, 4], [138, 12, 3],
    [148, 12, 5], [156, 10, 4], [162, 12, 3], [166, 11, 3],
    [172, 12, 4], [179, 10, 3], [185, 12, 4], [191, 9, 4],
    [194, 12, 3], [200, 12, 3],
    [205, 12, 5], [213, 10, 4], [220, 12, 3], [224, 12, 3],
    [234, 12, 5],                                          // pre-flag hop
  ];
  for (const [c, r, w] of platforms) {
    for (let i = 0; i < w; i++) setSolid(level, c + i, r);
  }

  // ---- staircase blocks near the flag ---------------------------------------
  for (const [c, topRow, h] of [[243, 14, 1], [246, 13, 2], [249, 12, 3]] as const) {
    for (let r = topRow; r < topRow + h; r++) setSolid(level, c, r);
  }

  // ---- spike clusters --------------------------------------------------------
  for (const c of [
    18, 19, 36, 37, 38, 60, 61, 66, 74, 75, 76, 90, 91, 101, 102, 103,
    118, 119, 126, 144, 145, 146, 152, 153, 154, 160, 175, 176, 182, 183,
    184, 190, 203, 204, 210, 211, 212, 218, 231, 232, 238, 239, 240,
  ]) {
    level.spike[14 * level.cols + c] = 1;
  }

  // ---- coins -----------------------------------------------------------------
  // arcs over every pit
  for (const cx of [25, 53, 81, 109, 137, 165, 194, 223]) {
    for (let i = 0; i < 4; i++) addCoin(level, cx + i, 12 + Math.abs(1.5 - i) * 0.9);
  }
  // rows above platforms
  for (const [c, r, w] of platforms) {
    for (let i = 0; i < w; i += 2) addCoin(level, c + i, r - 2);
  }
  // ground-level trails
  for (const c of [8, 11, 14, 33, 41, 49, 64, 73, 88, 96, 116, 124, 131, 150, 158, 178, 187, 201, 208, 230, 236, 244]) {
    addCoin(level, c, 13);
  }
  // reward line on the high road
  for (const c of [105, 107, 109]) addCoin(level, c, 6);
  level.totalCoins = level.coins.length;

  // ---- enemies: a proper goose army ------------------------------------------
  for (const c of [
    15, 22, 34, 44, 50, 63, 71, 90, 98, 106,
    119, 127, 148, 156, 174, 184, 205, 213, 219, 234, 240,
  ]) {
    level.enemySpawns.push({ x: c * TILE, y: 13 * TILE });
  }

  return level;
}
