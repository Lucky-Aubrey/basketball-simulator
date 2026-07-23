export function screenerRadiusMultiplier(playerData, t) {
  return activeScreenAction(playerData, t) ? 1.5 : 1;
}

// Returns the screen action that is currently "armed" for this player at time
// t (start_t + duration <= t, and before their next action's start_t if any),
// or null. Shared by the enlarge-radius effect (screenerRadiusMultiplier) and
// the facing-line rendering so both visual effects turn on/off together.
export function activeScreenAction(playerData, t) {
  const actions = playerData.actions;
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.type !== "screen") continue;
    const armedAt = action.start_t + action.duration;
    const next = actions[i + 1];
    const disarmedAt = next ? next.start_t : Infinity;
    if (t >= armedAt && t < disarmedAt) return action;
  }
  return null;
}
