import { playerPositionAt } from "./offense.js";
import { ballStateAt } from "./ball.js";
import { manDefenderTargets } from "./defense/man.js";

export function simulateFrame(play, t) {
  const offense = {};
  for (const p of play.offense) offense[p.id] = playerPositionAt(p, t);
  const ball = ballStateAt(play, t);
  const defenseTargets = play.defense.mode === "man" ? manDefenderTargets(play, t) : {};
  return { offense, ball: { holder: ball.holder, pos: offense[ball.holder] }, defenseTargets };
}
