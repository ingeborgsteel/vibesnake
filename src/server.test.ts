import { describe, test, expect } from "bun:test";
import { move } from "./server";
import { Battlesnake, GameState } from "./types";

function makeSnake(
  id: string,
  body: { x: number; y: number }[],
  health = 100
): Battlesnake {
  return {
    id,
    name: id,
    health,
    body,
    head: body[0],
    length: body.length,
    latency: "0",
    shout: "",
    customizations: { color: "#000", head: "default", tail: "default" },
  };
}

function makeState(
  you: Battlesnake,
  snakes: Battlesnake[],
  food: { x: number; y: number }[] = [],
  boardSize = 11
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
      height: boardSize,
      width: boardSize,
      food,
      hazards: [],
      snakes,
    },
    you,
  };
}

describe("Step 3: head-to-head avoidance with food-adjacent shorter opponents", () => {
  test("avoids opponent 1 unit shorter when food is adjacent to opponent's head", () => {
    // Our snake: length 4, head at (5,5), moving right
    const me = makeSnake("me", [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
    ]);
    // Opponent: length 3, head at (7,5) — 1 unit shorter
    // If opponent moves left to (6,5), and we move right to (6,5), head-to-head
    const opp = makeSnake("opp", [
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
    ]);
    // Food adjacent to opponent's head — opponent could eat and become length 4 (same as us)
    const food = [{ x: 7, y: 6 }];
    const state = makeState(me, [me, opp], food);

    // Run many times; "right" (towards opponent head-to-head zone) should never be chosen
    for (let i = 0; i < 30; i++) {
      const result = move(state);
      expect(result.move).not.toBe("right");
    }
  });

  test("does NOT avoid opponent 1 unit shorter when no food is adjacent", () => {
    // Same setup but no food near opponent
    const me = makeSnake("me", [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
      { x: 2, y: 5 },
    ]);
    const opp = makeSnake("opp", [
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
    ]);
    // Food to the right so "right" is a preferred direction; but NOT adjacent to opponent head
    const food = [{ x: 10, y: 5 }];
    const state = makeState(me, [me, opp], food);

    // "right" should be allowed since opponent is shorter and can't eat
    const moves = new Set<string>();
    for (let i = 0; i < 50; i++) {
      moves.add(move(state).move);
    }
    // "right" should be a valid option (not blocked)
    expect(moves.has("right")).toBe(true);
  });

  test("still avoids equal-length opponents regardless of food", () => {
    // Our snake: length 3, head at (5,5)
    const me = makeSnake("me", [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ]);
    // Opponent: length 3 (equal), head at (7,5)
    const opp = makeSnake("opp", [
      { x: 7, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
    ]);
    const state = makeState(me, [me, opp], []);

    for (let i = 0; i < 30; i++) {
      const result = move(state);
      expect(result.move).not.toBe("right");
    }
  });
});

describe("Step 5: attack logic aborts when food is near opponent", () => {
  test("aborts attack on 2-shorter opponent when food is adjacent to their head", () => {
    // Our snake: length 5, head at (3,5), moving right
    const me = makeSnake("me", [
      { x: 3, y: 5 },
      { x: 2, y: 5 },
      { x: 1, y: 5 },
      { x: 0, y: 5 },
      { x: 0, y: 4 },
    ]);
    // Opponent: length 3, head at (5,5) — exactly 2 shorter
    const opp = makeSnake("opp", [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
    ]);
    // Food adjacent to opponent's head — opponent could eat and become length 4
    // Then our advantage drops to only 1 (5 vs 4), which is not a guaranteed safe attack
    const food = [{ x: 5, y: 6 }];
    const state = makeState(me, [me, opp], food);

    // The attack should be aborted; the move should NOT be an attack move with "Attacking!" shout
    for (let i = 0; i < 30; i++) {
      const result = move(state);
      expect(result.shout).not.toBe("Attacking!");
    }
  });

  test("allows attack on 3-shorter opponent even when food is adjacent", () => {
    // Our snake: length 6, head at (3,5)
    const me = makeSnake("me", [
      { x: 3, y: 5 },
      { x: 2, y: 5 },
      { x: 1, y: 5 },
      { x: 0, y: 5 },
      { x: 0, y: 4 },
      { x: 0, y: 3 },
    ]);
    // Opponent: length 3, head at (5,5) — 3 shorter
    const opp = makeSnake("opp", [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
    ]);
    // Food adjacent to opponent's head — but even after eating (length 4), we're still 6 > 4
    const food = [{ x: 5, y: 6 }];
    const state = makeState(me, [me, opp], food);

    // The attack should proceed (the shout should be "Attacking!")
    let attacked = false;
    for (let i = 0; i < 50; i++) {
      const result = move(state);
      if (result.shout === "Attacking!") {
        attacked = true;
        break;
      }
    }
    expect(attacked).toBe(true);
  });
});
