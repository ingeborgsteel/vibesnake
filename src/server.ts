import { Coord, GameState, InfoResponse, MoveResponse } from "./types";
import { getAdjacentCells, hasJustEaten, manhattenDistance } from "./utils";

export function info(): InfoResponse {
  console.log("INFO");
  return {
    apiversion: "1",
    author: "Bubblun",
    color: "#ead00a",
    head: "smart-caterpillar",
    tail: "coffee",
  };
}

export function start(gameState: GameState): void {
  console.log(`${gameState.game.id} START`);
}

export function end(gameState: GameState): void {
  console.log(`${gameState.game.id} END\n`);
}

export function move(gameState: GameState): MoveResponse {
  let isMoveSafe: { [key: string]: boolean } = {
    up: true,
    down: true,
    left: true,
    right: true,
  };

  const myHead = gameState.you.head;
  const myNeck = gameState.you.body[1];
  const myLength = gameState.you.length;
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;

  // Step 0: Don't move backwards
  if (myNeck.x < myHead.x) {
    isMoveSafe.left = false;
  } else if (myNeck.x > myHead.x) {
    isMoveSafe.right = false;
  } else if (myNeck.y < myHead.y) {
    isMoveSafe.down = false;
  } else if (myNeck.y > myHead.y) {
    isMoveSafe.up = false;
  }

  // Step 1: Prevent moving out of bounds
  if (myHead.x === 0) {
    isMoveSafe.left = false;
  }
  if (myHead.x === boardWidth - 1) {
    isMoveSafe.right = false;
  }
  if (myHead.y === 0) {
    isMoveSafe.down = false;
  }
  if (myHead.y === boardHeight - 1) {
    isMoveSafe.up = false;
  }

  // Step 2: Prevent colliding with any snake's body (own or opponents)
  // The tail will move away next turn unless the snake just ate (last two segments identical)
  gameState.board.snakes.forEach((snake) => {
    const segments = hasJustEaten(snake) ? snake.body : snake.body.slice(0, -1);
    segments.forEach((segment) => {
      if (myHead.x + 1 === segment.x && myHead.y === segment.y) {
        isMoveSafe.right = false;
      }
      if (myHead.x - 1 === segment.x && myHead.y === segment.y) {
        isMoveSafe.left = false;
      }
      if (myHead.y + 1 === segment.y && myHead.x === segment.x) {
        isMoveSafe.up = false;
      }
      if (myHead.y - 1 === segment.y && myHead.x === segment.x) {
        isMoveSafe.down = false;
      }
    });
  });

  // Step 3: Avoid head-to-head collisions with snakes of equal or greater length
  gameState.board.snakes
    .filter((snake) => snake.id !== gameState.you.id)
    .forEach((opponent) => {
      if (opponent.length >= myLength) {
        // Cells the opponent's head could move to next turn
        getAdjacentCells(opponent.head).forEach((cell) => {
          if (myHead.x + 1 === cell.x && myHead.y === cell.y) {
            isMoveSafe.right = false;
          }
          if (myHead.x - 1 === cell.x && myHead.y === cell.y) {
            isMoveSafe.left = false;
          }
          if (myHead.y + 1 === cell.y && myHead.x === cell.x) {
            isMoveSafe.up = false;
          }
          if (myHead.y - 1 === cell.y && myHead.x === cell.x) {
            isMoveSafe.down = false;
          }
        });
      }
    });

  const safeMoves = Object.keys(isMoveSafe).filter((key) => isMoveSafe[key]);

  if (safeMoves.length === 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    return { move: "down", shout: "Take down Magnus!" };
  }

  // Map each safe move to its resulting coordinate
  const nextPositions: { [key: string]: Coord } = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y },
  };

  // Step 4: Prefer moves that avoid hazard squares when possible
  const hazardSet = new Set(
    gameState.board.hazards.map((h) => `${h.x},${h.y}`)
  );
  const nonHazardMoves = safeMoves.filter(
    (m) =>
      !hazardSet.has(`${nextPositions[m].x},${nextPositions[m].y}`)
  );
  const candidateMoves = nonHazardMoves.length > 0 ? nonHazardMoves : safeMoves;

  // Step 5: Move towards the closest food
  const food = gameState.board.food;
  let closestFood: Coord | undefined;
  let minDistance = Infinity;

  food.forEach((f) => {
    const distance = manhattenDistance(myHead, f);
    if (distance < minDistance) {
      minDistance = distance;
      closestFood = f;
    }
  });

  let nextMove =
    candidateMoves[Math.floor(Math.random() * candidateMoves.length)];

  if (closestFood !== undefined) {
    const preferredMoves: string[] = [];
    if (myHead.x < closestFood.x) {
      preferredMoves.push("right");
    } else if (myHead.x > closestFood.x) {
      preferredMoves.push("left");
    }
    if (myHead.y < closestFood.y) {
      preferredMoves.push("up");
    } else if (myHead.y > closestFood.y) {
      preferredMoves.push("down");
    }

    const safePreferredMoves = preferredMoves.filter((m) =>
      candidateMoves.includes(m)
    );
    if (safePreferredMoves.length > 0) {
      nextMove =
        safePreferredMoves[
          Math.floor(Math.random() * safePreferredMoves.length)
        ];
    }
  }

  console.log(`MOVE ${gameState.turn}: ${nextMove}`);
  return { move: nextMove, shout: "Take down Magnus!" };
}
