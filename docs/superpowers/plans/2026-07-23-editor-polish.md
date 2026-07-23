# Editor Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four independent usability fixes found from using the editor-v2 build, per `docs/superpowers/specs/2026-07-23-editor-polish-design.md`: a visible Gantt time axis, a reliable pass/handoff receiver dropdown (alongside the existing click-to-target), a coarser start-time step, and delete-via-double-click on Gantt blocks.

**Architecture:** All changes are additive/modifying within the existing editor codebase (backend untouched). No data model changes. DOM-dependent pieces verified manually — in this project, that means a real headless-Chromium Playwright session wherever an implementer has that capability (this branch's history has demonstrated it works reliably; check for an existing setup — e.g. a `pw`-named directory under a jobs/tmp scratch area — before installing a fresh one).

**Tech Stack:** Same as before — plain HTML/Canvas/vanilla JS (ES modules), Node's built-in `node --test` runner, FastAPI/uvicorn backend (untouched by this plan).

## Global Constraints

- Frontend is plain HTML/Canvas/vanilla JS — no framework, no build step.
- Backend (`backend/`) is not touched by this plan.
- No changes to the play JSON schema or to any simulation code (`playerPositionAt`, `simulateFrame`, `ball.js`, `defense/man.js`, `defense/zone.js`).
- `static/js/action-placement.js`'s click-to-target flow for pass/handoff keeps working exactly as before — the new dropdown is an addition, not a replacement.
- Gantt block deletion must behave identically to the existing per-player list's "Remove" button: immediate, no confirmation dialog, pushes to `history` first (so Undo works).

---

## File Structure

```
static/index.html            # MODIFY: action-start-t step 0.1->0.5; add #pass-target-select
static/js/gantt.js           # MODIFY: time axis row; dblclick-to-delete on blocks; signature gains history/onChange
static/js/timeline.js        # MODIFY: wire the pass/handoff receiver dropdown
static/js/main.js            # MODIFY: pass history/onChange into createGanttView's new signature
static/style.css             # MODIFY: minor styling for the gantt time axis ticks
```

---

### Task 1: Coarser start-time step

**Files:**
- Modify: `static/index.html`

**Interfaces:** None — this is a single HTML attribute change with no JS interface impact.

- [ ] **Step 1: Change the step attribute**

In `static/index.html`, change:
```html
      <input id="action-start-t" type="number" step="0.1" placeholder="start_t" required>
```
to:
```html
      <input id="action-start-t" type="number" step="0.5" placeholder="start_t" required>
```

- [ ] **Step 2: Manually verify**

If real-browser capability is available: open the app, click into the start-time field, use the up/down spinner arrows (or up/down keyboard arrows while focused), and confirm the value changes in increments of 0.5 rather than 0.1. Confirm typing an arbitrary value (e.g. `2.3`) is still accepted on blur/submit — `step` only affects the spinner increment and constraint-validation snapping when the browser auto-corrects, not what can be typed. If real-browser capability is not available, note that in the report and rely on the fact that this is a single, unambiguous attribute change.

- [ ] **Step 3: Commit**

```bash
git add static/index.html
git commit -m "fix: use 0.5s increments for action start time instead of 0.1s"
```

---

### Task 2: Gantt time axis

**Files:**
- Modify: `static/js/gantt.js`
- Modify: `static/style.css`

**Interfaces:**
- `createGanttView`'s exported signature and return shape (`{refresh()}`) are unchanged in this task — only its internal rendering gains a time-axis row. (Task 4 changes the signature; this task does not.)

- [ ] **Step 1: Add the time-axis rendering function**

In `static/js/gantt.js`, add a constant and a new render helper near the top (alongside the existing `ACTION_COLORS`/`PIXELS_PER_SECOND`/`ROW_HEIGHT`/`LABEL_WIDTH` constants):

```javascript
const MAX_SECONDS = 30; // matches #scrub's max attribute in index.html

function renderTimeAxis() {
  const axis = document.createElement("div");
  axis.className = "gantt-axis";
  for (let s = 0; s <= MAX_SECONDS; s++) {
    const tick = document.createElement("div");
    tick.className = "gantt-tick";
    tick.style.left = `${LABEL_WIDTH + s * PIXELS_PER_SECOND}px`;
    tick.textContent = `${s}s`;
    axis.appendChild(tick);
  }
  return axis;
}
```

- [ ] **Step 2: Insert the axis into render()**

In `createGanttView`'s `render()` function, add the axis as the first child appended, before the player rows loop:

```javascript
  function render() {
    container.innerHTML = "";
    container.appendChild(renderTimeAxis());
    for (const player of play.offense) {
```

(The rest of `render()` — the per-player row loop and the `renderLegend()` call at the end — stays exactly as-is in this task.)

- [ ] **Step 3: Add CSS for the axis**

Append to `static/style.css`:

```css
.gantt-axis {
  position: relative;
  height: 16px;
  margin-bottom: 2px;
}

.gantt-tick {
  position: absolute;
  top: 0;
  font-size: 9px;
  color: #666;
  border-left: 1px solid #999;
  padding-left: 2px;
  height: 100%;
}
```

- [ ] **Step 4: Run the full JS test suite to confirm no regressions**

Run: `node --test static/js/tests/*.test.js`
Expected: PASS, all tests (this task is DOM-dependent, no new automated tests — `gantt.js` has never had unit tests since it's DOM-rendering code).

- [ ] **Step 5: Manually verify**

If real-browser capability is available: add an action with `start_t = 5` for some player, confirm the action's Gantt block's left edge lines up exactly under the `5s` tick label. If real-browser capability is not available, verify by tracing that both use the identical `LABEL_WIDTH + n * PIXELS_PER_SECOND` formula and say so explicitly in the report.

- [ ] **Step 6: Commit**

```bash
git add static/js/gantt.js static/style.css
git commit -m "feat: add a visible time axis to the gantt chart"
```

---

### Task 3: Pass/handoff receiver dropdown

**Files:**
- Modify: `static/index.html`
- Modify: `static/js/timeline.js`

**Interfaces:**
- `createTimelineEditor`'s exported signature and return shape (`{selectPlayer, refresh}`) are unchanged.
- No changes to `action-placement.js` — click-to-target for pass/handoff keeps working exactly as before, as an alternative to the new dropdown.

- [ ] **Step 1: Add the dropdown element to index.html**

In `static/index.html`, add a new `<select>` right after `#action-type` inside `#add-action-form`, hidden by default:

```html
      <select id="action-type">
        <option>relocate</option>
        <option>cut</option>
        <option>dribble</option>
        <option>pass</option>
        <option>screen</option>
        <option>handoff</option>
        <option>shot</option>
      </select>
      <select id="pass-target-select" style="display:none"></select>
```

- [ ] **Step 2: Wire the dropdown in timeline.js**

In `static/js/timeline.js`, add a function to populate/toggle the dropdown, and hook it into the existing `player-select`/`action-type` change listeners plus the initial setup at the bottom. Read the current file in full before editing — you're adding to it, not rewriting it wholesale. The additions:

```javascript
function refreshPassTargetOptions() {
  const select = document.getElementById("pass-target-select");
  const actionType = document.getElementById("action-type").value;
  const isPassType = actionType === "pass" || actionType === "handoff";
  select.style.display = isPassType ? "" : "none";
  if (!isPassType) return;
  select.innerHTML = '<option value="">Select receiver...</option>';
  for (const p of play.offense) {
    if (p.id === selectedPlayerId) continue;
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.id;
    select.appendChild(option);
  }
}
```

(This function reads `selectedPlayerId`, the module-scoped `let` already declared at the top of `createTimelineEditor` — it must be defined inside `createTimelineEditor`, alongside `refresh`, not as a free top-level function, since it needs access to that closure variable and to `play`.)

Update the existing `player-select` change listener to also refresh the dropdown:

```javascript
  document.getElementById("player-select").addEventListener("change", (event) => {
    selectedPlayerId = event.target.value;
    refresh();
    refreshPassTargetOptions();
  });
```

Add a new listener for `action-type` changes (there isn't one currently):

```javascript
  document.getElementById("action-type").addEventListener("change", refreshPassTargetOptions);
```

Add the dropdown's own change handler — selecting a receiver immediately sets the pending target and duration, the same way the click-based capture's callback does, and cancels any in-flight canvas-click capture so the two paths can't both be waiting at once:

```javascript
  document.getElementById("pass-target-select").addEventListener("change", (event) => {
    const targetId = event.target.value;
    if (!targetId) return;
    const actionType = document.getElementById("action-type").value;
    const startT = parseFloat(document.getElementById("action-start-t").value);
    const statusEl = document.getElementById("target-status");
    if (Number.isNaN(startT)) {
      statusEl.textContent = "Set a start time first";
      return;
    }
    actionPicker.cancel();
    setDropdownsDisabled(false);

    pendingTarget = { target_player: targetId };
    pendingAction = { actingPlayerId: selectedPlayerId, actionType, startT };
    statusEl.textContent = describeTarget(pendingTarget);

    const actingPlayer = play.offense.find((p) => p.id === selectedPlayerId);
    const fromPos = playerPositionAt(actingPlayer, startT);
    const duration = computeDuration(actionType, fromPos, fromPos);
    document.getElementById("action-duration").value = duration.toFixed(2);
  });
```

(`computeDuration(actionType, fromPos, fromPos)` passes `fromPos` as both arguments — for `"pass"`/`"handoff"`, `computeDuration` ignores its position arguments entirely and returns the flat `DEFAULT_PASS_DURATION`, so this matches exactly how the existing click-based flow already calls it.)

Finally, call `refreshPassTargetOptions()` once at setup time, alongside the existing initial `refresh()` call near the bottom of `createTimelineEditor` (right before the `return` statement):

```javascript
  refresh();
  refreshPassTargetOptions();
  return {
```

- [ ] **Step 3: Run the full JS test suite to confirm no regressions**

Run: `node --test static/js/tests/*.test.js`
Expected: PASS, all tests (this task adds no new automated tests — DOM-dependent).

- [ ] **Step 4: Manually verify**

If real-browser capability is available: select a player, set `action-type` to `pass`, confirm the receiver dropdown appears and lists every other offense player (not the acting one); pick a receiver from it, confirm the status text and duration auto-fill exactly as the click-based flow would; submit and confirm the action is added with the correct `target_player`. Switch `action-type` back to something else (e.g. `cut`) and confirm the dropdown hides again. Confirm the existing click-a-teammate's-dot flow still works as an alternative. If real-browser capability is not available, verify by careful code-tracing and say so explicitly.

- [ ] **Step 5: Commit**

```bash
git add static/index.html static/js/timeline.js
git commit -m "feat: add a receiver dropdown for pass/handoff actions alongside click-to-target"
```

---

### Task 4: Delete action via Gantt double-click

**Files:**
- Modify: `static/js/gantt.js`
- Modify: `static/js/main.js`

**Interfaces:**
- `createGanttView(play, container, history, onSelectPlayer, onChange)` — signature grows from `(play, container, onSelectPlayer)` to include `history` (third parameter) and `onChange` (fifth parameter, called after a delete so the caller can refresh other UI that mirrors the same actions, e.g. the per-player list). Return shape (`{refresh()}`) is unchanged.

- [ ] **Step 1: Update createGanttView's signature and delete wiring**

In `static/js/gantt.js`, add the import and update the function per below. Read the current file in full first — you're modifying the existing `render()` loop, not rewriting the whole file.

```javascript
import { removeAction } from "./state.js";
```

Change the player-actions loop from a `for...of` (which doesn't give you an index) to an indexed `forEach`, and add a `dblclick` listener alongside the existing `click` listener:

```javascript
export function createGanttView(play, container, history, onSelectPlayer, onChange) {
  function render() {
    container.innerHTML = "";
    container.appendChild(renderTimeAxis());
    for (const player of play.offense) {
      const row = document.createElement("div");
      row.className = "gantt-row";
      row.style.height = `${ROW_HEIGHT}px`;

      const label = document.createElement("span");
      label.textContent = player.id;
      label.style.position = "absolute";
      label.style.left = "0";
      label.style.top = `${(ROW_HEIGHT - 12) / 2}px`;
      row.appendChild(label);

      player.actions.forEach((action, index) => {
        const block = document.createElement("div");
        block.className = "gantt-block";
        block.textContent = action.type;
        block.style.position = "absolute";
        block.style.left = `${LABEL_WIDTH + action.start_t * PIXELS_PER_SECOND}px`;
        block.style.top = "2px";
        block.style.width = `${Math.max(4, action.duration * PIXELS_PER_SECOND)}px`;
        block.style.height = `${ROW_HEIGHT - 4}px`;
        block.style.background = ACTION_COLORS[action.type] || "#ccc";
        block.style.cursor = "pointer";
        block.addEventListener("click", () => onSelectPlayer(player.id));
        block.addEventListener("dblclick", () => {
          history.push(play);
          removeAction(play, player.id, index);
          render();
          onChange();
        });
        row.appendChild(block);
      });

      container.appendChild(row);
    }
    container.appendChild(renderLegend());
  }

  render();
  return { refresh: render };
}
```

- [ ] **Step 2: Update main.js's call site**

In `static/js/main.js`, update the `createGanttView` construction to pass `history` and an `onChange` that refreshes the timeline editor's per-player list (note: `gantt` is constructed before `timelineEditor` in the existing code, same as before — the `onChange`/`onSelectPlayer` callbacks are only invoked later, after `timelineEditor` is assigned, so this forward reference remains safe, consistent with how `onSelectPlayer` already works today):

```javascript
const gantt = createGanttView(
  play,
  document.getElementById("gantt"),
  history,
  (id) => timelineEditor.selectPlayer(id),
  () => timelineEditor.refresh()
);
```

- [ ] **Step 3: Run the full JS test suite to confirm no regressions**

Run: `node --test static/js/tests/*.test.js`
Expected: PASS, all tests (this task adds no new automated tests — DOM-dependent).

- [ ] **Step 4: Manually verify**

If real-browser capability is available: add a couple of actions for a player, double-click one of its Gantt blocks, and confirm it disappears from both the Gantt view and the per-player list immediately (no confirmation dialog), and that Undo restores it. Confirm single-clicking a block still just selects the player (doesn't delete). If real-browser capability is not available, verify by careful code-tracing and say so explicitly.

- [ ] **Step 5: Commit**

```bash
git add static/js/gantt.js static/js/main.js
git commit -m "feat: delete an action by double-clicking its gantt block"
```

---

### Task 5: Full manual playtest

**Files:** None created/modified unless polish issues are found during the playtest.

**Interfaces:** None — this task exercises everything built in Tasks 1-4 together.

- [ ] **Step 1: Run the full automated test suite**

Run:
```bash
uv run pytest -v
node --test static/js/tests/*.test.js
```
Expected: all backend (8) and frontend (60, unchanged count — this plan adds no new automated tests) tests pass.

- [ ] **Step 2: Full manual playtest, preferring a real headless-browser session if available**

Launch the app and drive it (headless Chromium via Playwright, reusing whatever setup has already proven to work in this project, if available):

1. Confirm the Gantt chart shows a time-axis ruler with second labels aligned to action blocks.
2. Add a pass action using the new receiver dropdown (not clicking a dot) and confirm it commits correctly and the ball actually moves during playback.
3. Confirm the start-time field increments in steps of 0.5 via its spinner/keyboard arrows.
4. Add a couple of actions, double-click one of their Gantt blocks, confirm it's removed (and Undo brings it back).
5. Confirm nothing from editor-v2 (click-to-target for cut/screen/pass, screener enlarge + facing line, Cancel/Escape, timer/reset, save/load resync) regressed.
6. Capture at least one screenshot and check the browser console for errors.

If real-browser capability is not available in this environment, perform the equivalent verification via careful, explicit code-tracing and state that clearly in the report.

- [ ] **Step 3: Fix any rough edges found**

If any issues are found during Step 2, fix them following the patterns established in the relevant task above. Do not add new features at this stage.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: polish after editor-polish manual playtest"
```

(Skip this commit if Step 3 found nothing to change.)
