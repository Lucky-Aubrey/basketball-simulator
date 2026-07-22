# Play Editor v2 — Click-Based Interaction, Velocity Model, Combined Timeline, Orientation Fix

## Scope

This spec addresses usability feedback gathered from actually using Spec 1's
editor: coordinate-typing is impractical, pass/handoff don't move the ball,
duration-as-a-raw-number is confusing, screens have no direction, and the
per-player action view hides the big picture. It is a UX and data-model
refinement of the existing play editor — no new offense action types, no
defense logic changes, no Spec 2 (screen-reaction) behavior. Everything here
composes with the existing pure simulation functions (`offense.js`,
`ball.js`, `defense/man.js`, `defense/zone.js`, `simulate.js`) unchanged;
this spec only touches the editor UI, the play data model's action shape,
and the court's pixel-mapping direction.

## Bug fix: pass/handoff possession

Today, adding a `pass` or `handoff` action does not create a corresponding
`ball.events` entry, so `ballStateAt` never sees the ball change hands —
the action is visually indistinguishable from a `relocate`. The editor must
create the matching event automatically when such an action is added:

```json
{"t": <action.start_t>, "action": "pass" | "handoff", "from": <acting player id>, "to": <action.target_player>}
```

removed/edited in lockstep if the action is later removed or its
`start_t`/`target_player` is edited (removal deletes the matching event;
editing target_player or start_t updates the matching event's `to`/`t`).

## Data model changes

Action shape (per player, in `play.offense[i].actions`) splits by action
type into two targeting styles:

- **Position-targeted** (`cut`, `relocate`, `dribble`): unchanged —
  `{type, start_t, duration, target_pos: [x,y]}`.
- **Screen**: `{type: "screen", start_t, duration, target_pos: [x,y], facing_pos: [x,y]}`.
  `target_pos` is the plant location; `facing_pos` is a second point whose
  direction from `target_pos` defines which way the screen faces (used only
  for rendering in this spec — Spec 2 will use it for screen-navigation
  geometry). `target_player` (which teammate the screen is set for) is
  explicitly **not** captured yet — deferred to Spec 2, since nothing
  consumes it until screen-reaction defense logic exists.
- **Player-targeted** (`pass`, `handoff`): `{type, start_t, duration, target_player: <offense id>}`.
  No `target_pos` — the passer does not move to a court position as part of
  a pass/handoff action itself (if they also need to move, that's a
  separate `relocate`/`cut` action).
- **Shot**: unchanged from Spec 1 (no special handling added by this spec).

`duration` remains an explicit, stored field on every action — the
simulation code (`playerPositionAt`, `simulateFrame`, etc.) requires no
changes. What changes is *how the editor fills it in* (see below).

## Editor interaction: click-based targeting

Adding an action becomes a small sequence instead of a single form:

1. Pick player (dropdown, unchanged) + action type (dropdown, unchanged) +
   start time (numeric input, unchanged).
2. Click a new "Set target" button. The editor enters a "placing" mode
   (visually indicated, e.g. a status line: "Click the court to set
   O2's cut target").
3. The next click(s) on the canvas are interpreted based on action type:
   - `cut` / `relocate` / `dribble`: **one click** anywhere on the court →
     `target_pos`.
   - `screen`: **two clicks** — first sets `target_pos` (plant spot),
     second sets `facing_pos` (a point defining orientation; rendered as a
     short line/arrow from `target_pos` toward it once both are set).
   - `pass` / `handoff`: **one click on a teammate's dot** (hit-tested:
     nearest offensive player dot within a small pixel radius, excluding
     the acting player) → `target_player`.
4. Once the click sequence for that type completes, duration auto-fills:
   - Position-targeted and screen: `distance(currentPos, target_pos) / DEFAULT_SPEED`,
     where `currentPos` is the acting player's position at `start_t`
     computed against their *already-committed* actions (reuse
     `playerPositionAt`-style logic against the in-progress action list,
     excluding the action being added).
   - Pass/handoff: a fixed default (`DEFAULT_PASS_DURATION = 0.3` seconds),
     independent of distance.
   - The duration input remains visible and editable after auto-fill, so
     the user can override before committing.
5. "Add action" commits the action (and, for pass/handoff, the matching
   ball event per the bug fix above) to the play.

`DEFAULT_SPEED` is a single constant (e.g. `10` ft/s) shared by every
position-targeted/screen action type — no per-type speed variation in this
spec.

Placement mode can be cancelled (e.g. an "Cancel" affordance or pressing
Escape) without committing a partial action, returning to the idle state.

## Combined Gantt-style timeline

A new view, positioned above the existing per-player action list/form, shows
all 5 offensive players' actions on a shared horizontal time axis:

- 5 rows, one per player (`O1`-`O5`), labeled.
- Each action renders as a colored block: horizontal position = `start_t`,
  width = `duration`, color coded by action `type` (a small fixed palette,
  one color per type, with a legend).
- Clicking a block selects that player in the existing per-player dropdown
  (switching the detail list/form below to that player) — this view is a
  navigational/at-a-glance layer on top of the existing editing UI, not a
  replacement for it. No new add/remove/reorder logic lives in the Gantt
  view itself; it purely visualizes what the existing per-player action
  lists already contain, plus click-to-select routing.

## Playback timer

- A text readout (e.g. `2.4s`) next to the existing transport controls,
  updated every frame from the playback controller's current time.
- A "Reset" button that calls the existing `scrubTo(0)`, distinct from
  "Step -" (which nudges backward by a small increment).

## Screener visual size

Once a screen action's movement completes (`t >= start_t + duration`) and
until the screener's *next* action begins (`start_t` of their next action,
if any — otherwise for the rest of the play), the screener's dot renders at
1.5x the normal player-dot radius in `render.js`'s drawing function, to
visually represent the physical obstacle. Outside that window (still
moving toward the screen, or after they've started their next action), the
dot renders at normal size.

## Court orientation flip

`static/js/geometry.js`'s `courtToPixel`/`pixelToCourt` currently map
`y=0` (the basket) to the bottom of the canvas and `y=47` (half-court
line) to the top — so offense driving toward the basket moves *down* the
screen. This spec flips the pixel-mapping direction only: `y=0` renders at
the top, `y=47` at the bottom. No other coordinate values, zone presets, or
semantic meanings change — this is purely which edge of the canvas
corresponds to which court `y` value. `court.js`'s drawing (which computes
its own pixel positions via `courtToPixel`) requires no changes beyond this
— the half-court line, lane, and arc will render flipped automatically
since they already go through the shared transform.

## Testing approach

- `courtToPixel`/`pixelToCourt`'s existing unit tests get updated expected
  values reflecting the flip (pure function, straightforward to re-derive
  and re-assert).
- New pure-function unit tests for: duration-from-distance computation,
  ball-event creation/removal/update in lockstep with pass/handoff actions,
  and the screener-enlarged-window predicate (`isScreenerEnlarged(player, t)`
  or equivalent pure function extracted for testability).
- Click-sequence state machine, hit-testing for teammate dots, the Gantt
  view's rendering, and the timer readout are DOM-dependent and verified
  manually (per existing project convention), not unit tested.
