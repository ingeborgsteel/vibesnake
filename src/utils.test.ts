import { floodFillCount, getAdjacentCells, hasJustEaten } from "./utils";
import { Coord } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

// Test 1: Open 3x3 board, start in center — should reach all 9 cells
{
  const blocked = new Set<string>();
  const count = floodFillCount({ x: 1, y: 1 }, blocked, 3, 3);
  assert(count === 9, `Open 3x3 board from center: expected 9, got ${count}`);
}

// Test 2: 3x3 board with center blocked, start at corner — should reach 8 cells
{
  const blocked = new Set<string>(["1,1"]);
  const count = floodFillCount({ x: 0, y: 0 }, blocked, 3, 3);
  assert(count === 8, `3x3 with center blocked from corner: expected 8, got ${count}`);
}

// Test 3: Start on a blocked cell — should return 0
{
  const blocked = new Set<string>(["0,0"]);
  const count = floodFillCount({ x: 0, y: 0 }, blocked, 3, 3);
  assert(count === 0, `Start on blocked cell: expected 0, got ${count}`);
}

// Test 4: 1x1 board, no blocks — should reach 1 cell
{
  const blocked = new Set<string>();
  const count = floodFillCount({ x: 0, y: 0 }, blocked, 1, 1);
  assert(count === 1, `1x1 board: expected 1, got ${count}`);
}

// Test 5: Pocket scenario — snake body creates a small pocket
// 5x5 board, wall of blocked cells separating two regions
// Blocked: column x=2 for y=0..3, leaving a gap at y=4
// Start at (0,0) — left pocket has cells x=0..1, y=0..4 = 10 cells, plus x=2,y=4 = 11
// Actually let's be more precise:
{
  // 5x5 board, wall at x=2 for y=0..3 (blocking 4 cells)
  const blocked = new Set<string>(["2,0", "2,1", "2,2", "2,3"]);
  // Start at (0,0) — can reach left side (x=0,1 for all y) + the gap at (2,4) + right side via (2,4)
  const count = floodFillCount({ x: 0, y: 0 }, blocked, 5, 5);
  // Left side: 2*5=10, gap (2,4)=1, right side x=3,4 for all y=0..4 = 10, total = 21 = 25-4
  assert(count === 21, `5x5 with wall gap: expected 21, got ${count}`);
}

// Test 6: Fully enclosed pocket — small dead end
// 5x5 board, (0,0) is surrounded on two sides by walls and two sides by blocked cells
{
  // Block (1,0) and (0,1) to trap (0,0)
  const blocked = new Set<string>(["1,0", "0,1"]);
  const count = floodFillCount({ x: 0, y: 0 }, blocked, 5, 5);
  assert(count === 1, `Trapped in corner (0,0): expected 1, got ${count}`);
}

// Test 7: Large open board
{
  const blocked = new Set<string>();
  const count = floodFillCount({ x: 5, y: 5 }, blocked, 11, 11);
  assert(count === 121, `Open 11x11 board: expected 121, got ${count}`);
}

console.log("\nAll floodFillCount tests passed!");
