import { Battlesnake, Coord } from "./types";

export const manhattenDistance = (myHead: Coord, snakeHead: Coord) =>
  Math.abs(myHead.x - snakeHead.x) + Math.abs(myHead.y - snakeHead.y);

export function hasJustEaten(snake: Battlesnake): boolean {
  const body = snake.body;
  return (
    body.length >= 2 &&
    body[body.length - 1].x === body[body.length - 2].x &&
    body[body.length - 1].y === body[body.length - 2].y
  );
}

export function getAdjacentCells(coord: Coord): Coord[] {
  return [
    { x: coord.x + 1, y: coord.y },
    { x: coord.x - 1, y: coord.y },
    { x: coord.x, y: coord.y + 1 },
    { x: coord.x, y: coord.y - 1 },
  ];
}

export function getRelativePosition(
  myHead: Coord,
  targetSnake: Battlesnake
): "up" | "down" | "left" | "right" | null {
  const targetHead = targetSnake.head;

  // Calculate the horizontal and vertical distance to the target's head
  const dx = targetHead.x - myHead.x;
  const dy = targetHead.y - myHead.y;

  // If the snake isn't at your exact location
  if (dx === 0 && dy === 0) {
    return null; // Or "same position"
  }

  // Check if vertical distance is greater than horizontal distance
  if (Math.abs(dy) > Math.abs(dx)) {
    return dy > 0 ? "up" : "down";
  } else {
    // Horizontal distance is greater or they are equal
    return dx > 0 ? "right" : "left";
  }
}

export function floodFillCount(
  start: Coord,
  blocked: Set<string>,
  boardWidth: number,
  boardHeight: number
): number {
  const visited = new Set<string>();
  const queue: Coord[] = [start];
  let queueIndex = 0;
  const startKey = `${start.x},${start.y}`;

  if (blocked.has(startKey)) {
    return 0;
  }

  visited.add(startKey);

  while (queueIndex < queue.length) {
    const current = queue[queueIndex++];
    for (const neighbor of getAdjacentCells(current)) {
      if (
        neighbor.x >= 0 &&
        neighbor.x < boardWidth &&
        neighbor.y >= 0 &&
        neighbor.y < boardHeight
      ) {
        const key = `${neighbor.x},${neighbor.y}`;
        if (!visited.has(key) && !blocked.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }
  }

  return visited.size;
}

export function getOpposite(direction?: string | null) {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
    default:
      // Return null or the original direction if it's not a valid move
      return null;
  }
}
