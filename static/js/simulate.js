import { playerPositionAt } from "./offense.js";
import { ballStateAt } from "./ball.js";
import { manDefenderTargets } from "./defense/man.js";
import { zoneDefenderTargets } from "./defense/zone.js";

export function simulateFrame(play, t) {
  const offense = {};
  for (const p of play.offense) offense[p.id] = playerPositionAt(p, t);
  const ball = ballStateAt(play, t);

  let defenseTargets = {};
  if (play.defense.mode === "man") {
    defenseTargets = manDefenderTargets(play, t);
  } else if (play.defense.mode === "zone") {
    defenseTargets = zoneDefenderTargets(play, t);
  }

  return { offense, ball: { holder: ball.holder, pos: offense[ball.holder] }, defenseTargets };
}
