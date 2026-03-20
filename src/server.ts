import { Coord, GameState, InfoResponse, MoveResponse } from "./types";
import { getAdjacentCells, hasJustEaten, manhattenDistance } from "./utils";

export function info(): InfoResponse {
  console.log("INFO");
  return {
    apiversion: "1",
    author: "Bubblun",
    color: "#FFB6C1",
    head: "do-sammy",
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

  // Step 3: Avoid head-to-head collisions with snakes of equal or greater length.
  // Also avoid opponents that are 1 unit shorter when food is adjacent to their
  // head, because they could eat and become equal length — causing a mutual death tie.
  const foodCoordSet = new Set(
    gameState.board.food.map((f) => `${f.x},${f.y}`)
  );

  gameState.board.snakes
    .filter((snake) => snake.id !== gameState.you.id)
    .forEach((opponent) => {
      const isDangerous =
        opponent.length >= myLength ||
        (opponent.length === myLength - 1 &&
          getAdjacentCells(opponent.head).some((c) =>
            foodCoordSet.has(`${c.x},${c.y}`)
          ));

      if (isDangerous) {
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

  // Step 5: Attack mode - if we are strictly the longest snake, hunt a significantly shorter
  // opponent. Require at least a 2-unit size advantage so that even if the target eats food
  // before the collision the resulting head-to-head still favours us (and never ties).
  // Abort automatically each turn if we are no longer the longest (re-evaluated every call).
  const isStrictlyLongest = gameState.board.snakes
    .filter((s) => s.id !== gameState.you.id)
    .every((s) => s.length < myLength);

  const ATTACK_RANGE = 5;
  let attackTarget: Coord | undefined;

  if (isStrictlyLongest) {
    // Find the closest snake that is at least 2 units shorter within attack range
    let closestOpponent: (typeof gameState.board.snakes)[0] | undefined;
    let minAttackDist = Infinity;

    gameState.board.snakes
      .filter((s) => s.id !== gameState.you.id && s.length + 1 < myLength)
      .forEach((opp) => {
        // If food is adjacent to the opponent's head, they could eat and grow,
        // so require an extra unit of advantage to guarantee a safe win.
        const foodNearOpp = getAdjacentCells(opp.head).some((c) =>
          foodCoordSet.has(`${c.x},${c.y}`)
        );
        if (foodNearOpp && opp.length + 2 >= myLength) {
          console.log(
            `MOVE ${gameState.turn}: ATTACK ABORTED on snake ${opp.id} - food near opponent, tie possible`
          );
          return; // skip this opponent
        }

        const dist = manhattenDistance(myHead, opp.head);
        if (dist <= ATTACK_RANGE && dist < minAttackDist) {
          minAttackDist = dist;
          closestOpponent = opp;
        }
      });

    if (closestOpponent !== undefined) {
      const oppHead = closestOpponent.head;

      if (closestOpponent.body.length >= 2) {
        // Predict next head position based on current movement direction (head minus neck)
        const oppNeck = closestOpponent.body[1];
        const dx = oppHead.x - oppNeck.x;
        const dy = oppHead.y - oppNeck.y;
        const predictedHead: Coord = { x: oppHead.x + dx, y: oppHead.y + dy };

        // Use predicted head if it is on the board, otherwise target current head
        attackTarget =
          predictedHead.x >= 0 &&
          predictedHead.x < boardWidth &&
          predictedHead.y >= 0 &&
          predictedHead.y < boardHeight
            ? predictedHead
            : oppHead;
      } else {
        attackTarget = oppHead;
      }

      console.log(
        `MOVE ${gameState.turn}: ATTACK MODE - targeting (${attackTarget.x},${attackTarget.y})`
      );
    }
  }

  let nextMove =
    candidateMoves[Math.floor(Math.random() * candidateMoves.length)];

  if (attackTarget !== undefined) {
    const attackMoves: string[] = [];
    if (myHead.x < attackTarget.x) {
      attackMoves.push("right");
    } else if (myHead.x > attackTarget.x) {
      attackMoves.push("left");
    }
    if (myHead.y < attackTarget.y) {
      attackMoves.push("up");
    } else if (myHead.y > attackTarget.y) {
      attackMoves.push("down");
    }

    const safeAttackMoves = attackMoves.filter((m) =>
      candidateMoves.includes(m)
    );
    if (safeAttackMoves.length > 0) {
      nextMove =
        safeAttackMoves[Math.floor(Math.random() * safeAttackMoves.length)];
      console.log(`MOVE ${gameState.turn}: ${nextMove} (ATTACK)`);
      return { move: nextMove, shout: "Attacking!" };
    }
  }

  // Step 5.5: Defense mode - if a close snake is longer than us, flee from it
  const DEFENSE_RANGE = 4;
  let fleeFrom: Coord | undefined;
  let minThreatDist = Infinity;

  gameState.board.snakes
    .filter((s) => s.id !== gameState.you.id && s.length > myLength)
    .forEach((opp) => {
      const dist = manhattenDistance(myHead, opp.head);
      if (dist <= DEFENSE_RANGE && dist < minThreatDist) {
        minThreatDist = dist;
        fleeFrom = opp.head;
      }
    });

  if (fleeFrom !== undefined) {
    const fleeMoves: string[] = [];
    if (myHead.x < fleeFrom.x) {
      fleeMoves.push("left");
    } else if (myHead.x > fleeFrom.x) {
      fleeMoves.push("right");
    }
    if (myHead.y < fleeFrom.y) {
      fleeMoves.push("down");
    } else if (myHead.y > fleeFrom.y) {
      fleeMoves.push("up");
    }

    const safeFleeMoves = fleeMoves.filter((m) =>
      candidateMoves.includes(m)
    );
    if (safeFleeMoves.length > 0) {
      nextMove =
        safeFleeMoves[Math.floor(Math.random() * safeFleeMoves.length)];
      console.log(`MOVE ${gameState.turn}: ${nextMove} (DEFENSE - fleeing)`);
      return { move: nextMove, shout: "Retreating!" };
    }
  }

  // Step 6: Move towards the closest food
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
