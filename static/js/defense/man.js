import { playerPositionAt } from "../offense.js";
import { ballStateAt } from "../ball.js";
import { lerpPoint } from "../geometry.js";

const RIM = [0, 0];

function passesAwayRank(play, t, ballHandlerId) {
  const ballHandler = play.offense.find((p) => p.id === ballHandlerId);
  const ballPos = playerPositionAt(ballHandler, t);
  const ranked = play.offense
    .filter((p) => p.id !== ballHandlerId)
    .map((p) => ({ id: p.id, d: Math.hypot(...playerPositionAt(p, t).map((v, i) => v - ballPos[i])) }))
    .sort((a, b) => a.d - b.d);
  const rank = {};
  ranked.forEach((entry, i) => { rank[entry.id] = i + 1; });
  return rank;
}

export function manDefenderTargets(play, t) {
  const { lag, help_weight, rim_bias } = play.defense.man.params;
  const { holder } = ballStateAt(play, t);
  const ballHandler = play.offense.find((p) => p.id === holder);
  const ballPos = playerPositionAt(ballHandler, t);
  const rank = passesAwayRank(play, t, holder);

  const targets = {};
  for (const [offenseId, defenderId] of Object.entries(play.defense.man.assignments)) {
    const offPlayer = play.offense.find((p) => p.id === offenseId);
    const trackPos = playerPositionAt(offPlayer, Math.max(0, t - lag));
    const currentPos = playerPositionAt(offPlayer, t);

    let weight = help_weight;
    if (offenseId === holder) {
      weight = 0;
    } else if (play.defense.man.help_scheme === "tiered") {
      weight = rank[offenseId] === 1 ? help_weight * 0.4 : help_weight;
    }

    const rimDenialPoint = lerpPoint(RIM, currentPos, 0.5);
    targets[defenderId] = [
      trackPos[0] + weight * (ballPos[0] - trackPos[0]) + rim_bias * (rimDenialPoint[0] - trackPos[0]),
      trackPos[1] + weight * (ballPos[1] - trackPos[1]) + rim_bias * (rimDenialPoint[1] - trackPos[1]),
    ];
  }
  return targets;
}
