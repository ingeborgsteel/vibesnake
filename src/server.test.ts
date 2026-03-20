import { move } from "./server";
import { GameState, Coord, Battlesnake, Board } from "./types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function makeSnake(id: string, body: Coord[]): Battlesnake {
  return {
    id,
    name: id,
    health: 100,
    body,
    head: body[0],
    length: body.length,
    latency: "0",
    shout: "",
    customizations: { color: "#000", head: "default", tail: "default" },
  };
}

function makeGameState(
  you: Battlesnake,
  snakes: Battlesnake[],
  board: Partial<Board>,
): GameState {
  return {
    game: {
      id: "test",
      ruleset: {
        name: "standard",
        version: "1",
        settings: { foodSpawnChance: 15, minimumFood: 1, hazardDamagePerTurn: 0 },
      },
      map: "standard",
      source: "test",
      timeout: 500,
    },
    turn: 1,
    board: {
      height: board.height ?? 11,
      width: board.width ?? 11,
      food: board.food ?? [],
      hazards: board.hazards ?? [],
      snakes,
    },
    you,
  };
}

// Test 1: Snake avoids entering a small pocket (trap) and chooses the move with more space
// 5x3 board (width=5, height=3)
// Our snake (length 5): head=(2,1), body going left and wrapping down
// Opponent wall across top row: (3,2),(2,2),(1,2),(0,2)
//
// Board visualization (y increases upward):
// y=2: [0,2_tail] [1,2_opp] [2,2_opp] [3,2_oppH] [4,2]
// y=1: [0,1_body] [1,1]     [2,1_HEAD] [3,1]      [4,1]
// y=0: [0,0_body] [1,0_body] [2,0_neck] [3,0]     [4,0]
//
// Safe moves: left to (1,1) and right to (3,1)
// Left (1,1): flood fill reaches (1,1),(0,1),(0,2) = 3 cells < 5 (TRAP)
// Right (3,1): flood fill reaches (3,1),(4,1),(3,0),(4,0),(4,2) = 5 cells >= 5 (SAFE)
{
  const me = makeSnake("me", [
    { x: 2, y: 1 },  // head
    { x: 2, y: 0 },  // neck
    { x: 1, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 1 },
  ]);
  const opponent = makeSnake("opp", [
    { x: 3, y: 2 },  // head
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },  // tail
  ]);
  const gs = makeGameState(me, [me, opponent], {
    width: 5,
    height: 3,
    food: [],
    hazards: [],
  });

  const result = move(gs);
  assert(
    result.move === "right",
    `Snake avoids pocket: expected 'right', got '${result.move}'`
  );
}

// Test 2: Normal behavior — snake still moves towards food on open board
{
  const me = makeSnake("me", [
    { x: 5, y: 5 },
    { x: 5, y: 4 },
    { x: 5, y: 3 },
  ]);
  const gs = makeGameState(me, [me], {
    width: 11,
    height: 11,
    food: [{ x: 8, y: 5 }],
    hazards: [],
  });

  const result = move(gs);
  assert(
    result.move === "right",
    `Snake moves towards food: expected 'right', got '${result.move}'`
  );
}

// Test 3: When all moves are traps, pick the one with the most space
// 3x3 board, snake takes up most of it
{
  const me = makeSnake("me", [
    { x: 1, y: 1 },  // head (center)
    { x: 0, y: 1 },  // neck
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
  ]);
  // Length 7, board has 9 cells, only up to (1,2) is open
  const gs = makeGameState(me, [me], {
    width: 3,
    height: 3,
    food: [],
    hazards: [],
  });

  const result = move(gs);
  assert(
    result.move === "up",
    `Snake picks best trap option: expected 'up', got '${result.move}'`
  );
}

console.log("\nAll server integration tests passed!");
