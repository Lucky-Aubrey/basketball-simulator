import { playerPositionAt } from "./offense.js";
import { ballStateAt } from "./ball.js";

export function simulateFrame(play, t) {
  const offense = {};
  for (const p of play.offense) offense[p.id] = playerPositionAt(p, t);
  const ball = ballStateAt(play, t);
  return { offense, ball: { holder: ball.holder, pos: offense[ball.holder] } };
}
