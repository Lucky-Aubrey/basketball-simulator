import { playerPositionAt } from "../offense.js";
import { ballStateAt } from "../ball.js";
import { distance, lerpPoint } from "../geometry.js";

export const ZONE_PRESETS = {
  "2-3": { D1: [-10, 18], D2: [10, 18], D3: [-15, 4], D4: [0, 3], D5: [15, 4] },
  "3-2": { D1: [-15, 20], D2: [0, 22], D3: [15, 20], D4: [-8, 5], D5: [8, 5] },
  "1-3-1": { D1: [0, 22], D2: [-14, 14], D3: [0, 12], D4: [14, 14], D5: [0, 3] },
  "box-and-1": { D1: [-8, 10], D2: [8, 10], D3: [-8, 3], D4: [8, 3], D5: null },
};

function clampToMaxShade(home, target, maxShade) {
  const d = distance(home, target);
  if (d <= maxShade) return target;
  return lerpPoint(home, target, maxShade / d);
}

// NOTE: gap-shade currently shades toward the offensive player nearest THIS
// defender's home point (i.e., already-covered), not toward an "uncovered"
// player as the design doc describes. See
// docs/superpowers/specs/2026-07-22-play-simulator-spec1-design.md "Zone"
// section. Needs reconciliation: either the design doc or this
// implementation should change.
export function zoneDefenderTargets(play, t) {
  const { ball_shade_weight, gap_shade_weight, max_shade } = play.defense.zone.params;
  const { holder } = ballStateAt(play, t);
  const ballHandler = play.offense.find((p) => p.id === holder);
  const ballPos = playerPositionAt(ballHandler, t);
  const offensePositions = play.offense.map((p) => ({ id: p.id, pos: playerPositionAt(p, t) }));

  const targets = {};
  for (const [defenderId, home] of Object.entries(play.defense.zone.home_points)) {
    if (home === null) continue;
    const nearest = offensePositions.reduce((best, o) =>
      distance(home, o.pos) < distance(home, best.pos) ? o : best
    );
    const shaded = [
      home[0] + ball_shade_weight * (ballPos[0] - home[0]) + gap_shade_weight * (nearest.pos[0] - home[0]),
      home[1] + ball_shade_weight * (ballPos[1] - home[1]) + gap_shade_weight * (nearest.pos[1] - home[1]),
    ];
    targets[defenderId] = clampToMaxShade(home, shaded, max_shade);
  }

  if (play.defense.zone.type === "box-and-1" && play.defense.zone.man_mark) {
    for (const [defenderId, offenseId] of Object.entries(play.defense.zone.man_mark)) {
      const offPlayer = play.offense.find((p) => p.id === offenseId);
      targets[defenderId] = playerPositionAt(offPlayer, t);
    }
  }

  return targets;
}
