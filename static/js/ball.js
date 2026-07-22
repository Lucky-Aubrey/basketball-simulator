export function ballStateAt(play, t) {
  let holder = play.ball.start_holder;
  let lastEvent = null;
  for (const event of play.ball.events) {
    if (event.t > t) break;
    if (event.action === "pass" || event.action === "handoff") {
      holder = event.to;
    }
    lastEvent = event;
  }
  return { holder, lastEvent };
}
