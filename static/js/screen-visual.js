export function screenerRadiusMultiplier(playerData, t) {
  const actions = playerData.actions;
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.type !== "screen") continue;
    const armedAt = action.start_t + action.duration;
    const next = actions[i + 1];
    const disarmedAt = next ? next.start_t : Infinity;
    if (t >= armedAt && t < disarmedAt) return 1.5;
  }
  return 1;
}
