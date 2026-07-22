# Basketball Play Simulator — Spec 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core play editor (offense placement + timed actions), rule-based man-to-man and zone defense, frame-accurate playback, and save/load persistence, per `docs/superpowers/specs/2026-07-22-play-simulator-spec1-design.md`.

**Architecture:** FastAPI/uvicorn backend that only serves static files and a filesystem-backed JSON play store (`/api/plays*`). Plain HTML/Canvas/vanilla-JS frontend where all simulation math (offense interpolation, ball state, defense target rules, movement capping) is pure, DOM-free JS testable with Node's built-in test runner. No build step on either side.

**Tech Stack:** Python 3.13, FastAPI, uvicorn, pytest, httpx (managed via `uv`). Vanilla JS (ES modules, `.js` with `"type": "module"`), Node 24's built-in `node --test` runner for JS unit tests. No frontend framework, no bundler.

## Global Constraints

- Dependency management is `uv` only — no pip/poetry/conda. Use `uv add` / `uv add --dev`.
- Backend is Python served with `uvicorn`; it must not contain simulation/defense-rule logic (design doc: "No simulation logic lives on the backend").
- Frontend is plain HTML/Canvas/vanilla JS — no framework, no build step.
- Court coordinate system: feet, origin at the basket, `x ∈ [-25, 25]`, `y ∈ [0, 47]`.
- Play JSON schema is exactly as defined in the design doc's "Data model" section — do not add fields without a documented reason (the box-and-1 `man_mark` field added in Task 16 is one such documented exception).
- Persistence is server-side named saves under a `plays/` directory (not browser download/upload).

---

## File Structure

```
backend/
  __init__.py
  app.py              # FastAPI app: mounts static/, includes plays router
  plays_store.py      # filesystem-backed JSON store: list/load/save
  routes_plays.py      # /api/plays* endpoints
  tests/
    test_plays_store.py
    test_routes_plays.py
static/
  package.json        # {"type": "module"} so Node/browsers treat .js as ES modules
  index.html
  style.css
  js/
    geometry.js        # court<->pixel transforms, distance, lerp, clamp
    ball.js            # ballStateAt(play, t)
    offense.js          # playerPositionAt(playerData, t)
    movement.js         # capMovement, separation
    state.js            # createEmptyPlay, action CRUD, History (undo/redo)
    simulate.js          # simulateFrame(play, t)
    defense/
      man.js             # manDefenderTargets(play, t)
      zone.js            # zoneDefenderTargets(play, t), ZONE_PRESETS
    court.js             # drawCourt(ctx, w, h) — canvas rendering, DOM-dependent
    render.js            # drawFrame(ctx, w, h, frame) — canvas rendering, DOM-dependent
    editor.js             # click-to-place, timeline UI, config UI — DOM-dependent
    playback.js           # transport loop, keeps prevDefenderPos for capMovement — DOM-dependent
    api.js                # fetchPlays/fetchPlay/savePlay — fetch wrappers
    main.js                # bootstrap/wiring
    tests/
      geometry.test.js
      ball.test.js
      offense.test.js
      movement.test.js
      state.test.js
      man.test.js
      zone.test.js
      simulate.test.js
pyproject.toml          # add fastapi, uvicorn deps; pytest/httpx dev deps
```

Pure, DOM-free modules (`geometry`, `ball`, `offense`, `movement`, `state`, `simulate`, `defense/man`, `defense/zone`) get unit tests. DOM-dependent modules (`court`, `render`, `editor`, `playback`, `main`) are verified manually in-browser at the end of the milestone that introduces them.

---

### Task 1: Backend scaffolding + static file serving

**Files:**
- Modify: `pyproject.toml`
- Create: `backend/__init__.py`
- Create: `backend/app.py`
- Create: `static/package.json`
- Create: `static/index.html`
- Delete: `main.py` (superseded by `backend/app.py`)

**Interfaces:**
- Produces: `backend.app:app` (FastAPI instance), static files served from `/` via `static/` directory.

- [ ] **Step 1: Add backend dependencies**

Run:
```bash
uv add fastapi "uvicorn[standard]"
uv add --dev pytest httpx
```

- [ ] **Step 2: Configure pytest to see the `backend` package from repo root**

Add to `pyproject.toml`:
```toml
[tool.pytest.ini_options]
pythonpath = ["."]
```

- [ ] **Step 3: Create the backend package and app**

`backend/__init__.py`:
```python
```

`backend/app.py`:
```python
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .routes_plays import router as plays_router

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI()
app.include_router(plays_router)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
```

This imports `routes_plays`, which doesn't exist yet — that's created in Task 5. For now, stub it so the app is importable:

`backend/routes_plays.py`:
```python
from fastapi import APIRouter

router = APIRouter(prefix="/api/plays")
```

- [ ] **Step 4: Create the static entrypoint**

`static/package.json`:
```json
{
  "type": "module"
}
```

`static/index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Basketball Play Simulator</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>Basketball Play Simulator</h1>
  <canvas id="court" width="500" height="470"></canvas>
  <script type="module" src="/js/main.js"></script>
</body>
</html>
```

`static/style.css`:
```css
body {
  font-family: sans-serif;
  margin: 0;
  padding: 1rem;
}

#court {
  background: #d9a066;
  border: 2px solid #333;
}
```

`static/js/main.js`:
```javascript
console.log("Basketball Play Simulator loaded");
```

- [ ] **Step 5: Remove the placeholder root script**

```bash
rm main.py
```

- [ ] **Step 6: Verify the app runs and serves the page**

Run:
```bash
uv run uvicorn backend.app:app --port 8000 &
sleep 1
curl -s http://localhost:8000/ | grep "Basketball Play Simulator"
kill %1
```
Expected: the `grep` prints the matching `<title>` line, confirming the static file is served.

- [ ] **Step 7: Commit**

```bash
git add pyproject.toml uv.lock backend static main.py
git commit -m "feat: scaffold FastAPI backend and static frontend entrypoint"
```

---

### Task 2: Court geometry + rendering

**Files:**
- Create: `static/js/geometry.js`
- Create: `static/js/tests/geometry.test.js`
- Create: `static/js/court.js`
- Modify: `static/js/main.js`

**Interfaces:**
- Produces: `COURT_X_MIN, COURT_X_MAX, COURT_Y_MIN, COURT_Y_MAX` constants; `courtToPixel(x, y, canvasWidth, canvasHeight) -> [px, py]`; `pixelToCourt(px, py, canvasWidth, canvasHeight) -> [x, y]`; `distance(a, b) -> number`; `lerp(a, b, frac) -> number`; `lerpPoint(a, b, frac) -> [x, y]`; `clampPointToCourt([x, y]) -> [x, y]`.
- Produces: `drawCourt(ctx, width, height)` (DOM-dependent, not unit tested).

- [ ] **Step 1: Write the failing tests**

`static/js/tests/geometry.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  courtToPixel,
  pixelToCourt,
  distance,
  lerp,
  lerpPoint,
  clampPointToCourt,
} from "../geometry.js";

test("courtToPixel maps court origin and bounds to canvas pixels", () => {
  assert.deepEqual(courtToPixel(0, 0, 500, 470), [250, 470]);
  assert.deepEqual(courtToPixel(-25, 47, 500, 470), [0, 0]);
});

test("pixelToCourt inverts courtToPixel", () => {
  const [px, py] = courtToPixel(10, 20, 500, 470);
  const [x, y] = pixelToCourt(px, py, 500, 470);
  assert.ok(Math.abs(x - 10) < 1e-9);
  assert.ok(Math.abs(y - 20) < 1e-9);
});

test("distance computes euclidean distance", () => {
  assert.equal(distance([0, 0], [3, 4]), 5);
});

test("lerp and lerpPoint interpolate linearly", () => {
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.deepEqual(lerpPoint([0, 0], [10, 20], 0.5), [5, 10]);
});

test("clampPointToCourt clamps out-of-bounds points to court edges", () => {
  assert.deepEqual(clampPointToCourt([-30, 50]), [-25, 47]);
  assert.deepEqual(clampPointToCourt([10, 20]), [10, 20]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/geometry.test.js`
Expected: FAIL — `geometry.js` does not exist yet.

- [ ] **Step 3: Implement geometry.js**

```javascript
export const COURT_X_MIN = -25;
export const COURT_X_MAX = 25;
export const COURT_Y_MIN = 0;
export const COURT_Y_MAX = 47;

export function courtToPixel(x, y, canvasWidth, canvasHeight) {
  const scale = canvasWidth / (COURT_X_MAX - COURT_X_MIN);
  const px = (x - COURT_X_MIN) * scale;
  const py = canvasHeight - (y - COURT_Y_MIN) * scale;
  return [px, py];
}

export function pixelToCourt(px, py, canvasWidth, canvasHeight) {
  const scale = canvasWidth / (COURT_X_MAX - COURT_X_MIN);
  const x = px / scale + COURT_X_MIN;
  const y = (canvasHeight - py) / scale + COURT_Y_MIN;
  return [x, y];
}

export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function lerp(a, b, frac) {
  return a + (b - a) * frac;
}

export function lerpPoint(a, b, frac) {
  return [lerp(a[0], b[0], frac), lerp(a[1], b[1], frac)];
}

export function clampPointToCourt([x, y]) {
  return [
    Math.min(COURT_X_MAX, Math.max(COURT_X_MIN, x)),
    Math.min(COURT_Y_MAX, Math.max(COURT_Y_MIN, y)),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/geometry.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Implement court rendering (DOM-dependent, no unit test)**

`static/js/court.js`:
```javascript
import { courtToPixel } from "./geometry.js";

export function drawCourt(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  // court outline
  ctx.strokeRect(0, 0, width, height);

  // half-court line (top edge, y=47)
  const [x1, y1] = courtToPixel(-25, 47, width, height);
  const [x2] = courtToPixel(25, 47, width, height);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y1);
  ctx.stroke();

  // free-throw lane (approx: 16ft wide, 19ft from baseline)
  const [lx1, ly1] = courtToPixel(-8, 0, width, height);
  const [lx2, ly2] = courtToPixel(8, 19, width, height);
  ctx.strokeRect(lx1, ly2, lx2 - lx1, ly1 - ly2);

  // three-point arc (approx radius 23.75ft from basket at origin)
  const [cx, cy] = courtToPixel(0, 0, width, height);
  const scale = width / (25 - -25);
  ctx.beginPath();
  ctx.arc(cx, cy, 23.75 * scale, Math.PI, 2 * Math.PI);
  ctx.stroke();
}
```

- [ ] **Step 6: Wire it into main.js**

Replace `static/js/main.js` with:
```javascript
import { drawCourt } from "./court.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
drawCourt(ctx, canvas.width, canvas.height);
```

- [ ] **Step 7: Manually verify in the browser**

Run: `uv run uvicorn backend.app:app --port 8000` and open `http://localhost:8000/` in a browser.
Expected: a tan half-court with white outline, half-court line, free-throw lane rectangle, and three-point arc.

- [ ] **Step 8: Commit**

```bash
git add static/js/geometry.js static/js/tests/geometry.test.js static/js/court.js static/js/main.js
git commit -m "feat: add court coordinate geometry and canvas rendering"
```

---

### Task 3: Player placement state & rendering

**Files:**
- Create: `static/js/state.js` (initial version: `createEmptyPlay` only — action CRUD/undo added in Task 9)
- Create: `static/js/tests/state.test.js`
- Create: `static/js/render.js`
- Modify: `static/js/editor.js` (new file)
- Modify: `static/js/main.js`

**Interfaces:**
- Produces: `createEmptyPlay() -> Play` where `Play.offense` is 5 entries `{id, start_pos, actions: []}` with ids `O1`-`O5`, `Play.ball = {start_holder: "O1", events: []}`, `Play.defense = {mode: "man", man: {assignments: {}, help_scheme: "uniform", params: {lag: 0.3, help_weight: 0.4, rim_bias: 0.2}}, zone: null}`.
- Produces: `drawPlayers(ctx, width, height, positions)` where `positions` is `{offense: {id: [x,y]}, defense: {id: [x,y]}}` (DOM-dependent, not unit tested).
- Consumes: `courtToPixel`, `pixelToCourt` from `geometry.js` (Task 2).

- [ ] **Step 1: Write the failing test**

`static/js/tests/state.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyPlay } from "../state.js";

test("createEmptyPlay has 5 offensive players O1-O5 with empty actions", () => {
  const play = createEmptyPlay();
  assert.equal(play.offense.length, 5);
  assert.deepEqual(
    play.offense.map((p) => p.id),
    ["O1", "O2", "O3", "O4", "O5"]
  );
  for (const p of play.offense) {
    assert.deepEqual(p.actions, []);
    assert.deepEqual(p.start_pos, [0, 0]);
  }
});

test("createEmptyPlay defaults ball and man-defense config", () => {
  const play = createEmptyPlay();
  assert.equal(play.ball.start_holder, "O1");
  assert.deepEqual(play.ball.events, []);
  assert.equal(play.defense.mode, "man");
  assert.equal(play.defense.man.help_scheme, "uniform");
  assert.equal(play.defense.zone, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test static/js/tests/state.test.js`
Expected: FAIL — `state.js` does not exist yet.

- [ ] **Step 3: Implement state.js**

```javascript
export function createEmptyPlay() {
  return {
    name: "",
    offense: ["O1", "O2", "O3", "O4", "O5"].map((id) => ({
      id,
      start_pos: [0, 0],
      actions: [],
    })),
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: {},
        help_scheme: "uniform",
        params: { lag: 0.3, help_weight: 0.4, rim_bias: 0.2 },
      },
      zone: null,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test static/js/tests/state.test.js`
Expected: PASS, 2 tests.

- [ ] **Step 5: Implement player rendering (DOM-dependent, no unit test)**

`static/js/render.js`:
```javascript
import { courtToPixel } from "./geometry.js";

function drawDot(ctx, x, y, color, label) {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 3);
}

export function drawPlayers(ctx, width, height, positions) {
  for (const [id, [x, y]] of Object.entries(positions.offense || {})) {
    const [px, py] = courtToPixel(x, y, width, height);
    drawDot(ctx, px, py, "#1e88e5", id);
  }
  for (const [id, [x, y]] of Object.entries(positions.defense || {})) {
    const [px, py] = courtToPixel(x, y, width, height);
    drawDot(ctx, px, py, "#e53935", id);
  }
}
```

- [ ] **Step 6: Implement click-to-place editor**

`static/js/editor.js`:
```javascript
import { pixelToCourt } from "./geometry.js";

const PLAYER_IDS = { offense: ["O1", "O2", "O3", "O4", "O5"], defense: ["D1", "D2", "D3", "D4", "D5"] };

export function createPlacementEditor(play, canvas) {
  const defensePositions = {};
  let mode = "offense";
  let nextIndex = 0;

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const [x, y] = pixelToCourt(px, py, canvas.width, canvas.height);

    const ids = PLAYER_IDS[mode];
    if (nextIndex >= ids.length) return;
    const id = ids[nextIndex];
    if (mode === "offense") {
      play.offense.find((p) => p.id === id).start_pos = [x, y];
    } else {
      defensePositions[id] = [x, y];
    }
    nextIndex += 1;
    if (nextIndex >= ids.length && mode === "offense") {
      mode = "defense";
      nextIndex = 0;
    }
  });

  return { getDefensePositions: () => defensePositions };
}
```

- [ ] **Step 7: Wire placement + rendering into main.js**

```javascript
import { drawCourt } from "./court.js";
import { drawPlayers } from "./render.js";
import { createEmptyPlay } from "./state.js";
import { createPlacementEditor } from "./editor.js";

const canvas = document.getElementById("court");
const ctx = canvas.getContext("2d");
const play = createEmptyPlay();
const placement = createPlacementEditor(play, canvas);

function render() {
  drawCourt(ctx, canvas.width, canvas.height);
  const offense = {};
  for (const p of play.offense) offense[p.id] = p.start_pos;
  drawPlayers(ctx, canvas.width, canvas.height, {
    offense,
    defense: placement.getDefensePositions(),
  });
  requestAnimationFrame(render);
}
render();
```

- [ ] **Step 8: Manually verify in the browser**

Run: `uv run uvicorn backend.app:app --port 8000`, open `http://localhost:8000/`.
Expected: clicking the court places 5 blue offense dots (O1-O5) then 5 red defense dots (D1-D5), each labeled.

- [ ] **Step 9: Commit**

```bash
git add static/js/state.js static/js/tests/state.test.js static/js/render.js static/js/editor.js static/js/main.js
git commit -m "feat: add play state model and click-to-place player editor"
```

---

### Task 4: Backend plays store

**Files:**
- Create: `backend/plays_store.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_plays_store.py`

**Interfaces:**
- Produces: `plays_store.PLAYS_DIR: Path`; `plays_store.list_plays() -> list[str]`; `plays_store.load_play(name: str) -> dict`; `plays_store.save_play(name: str, data: dict) -> None`. `load_play` raises `FileNotFoundError` if the play doesn't exist.

- [ ] **Step 1: Write the failing tests**

`backend/tests/__init__.py`:
```python
```

`backend/tests/test_plays_store.py`:
```python
import pytest

from backend import plays_store


def test_save_and_load_play_round_trips(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    plays_store.save_play("pick-and-roll", {"name": "pick-and-roll"})
    assert plays_store.load_play("pick-and-roll") == {"name": "pick-and-roll"}


def test_list_plays_empty_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    assert plays_store.list_plays() == []


def test_list_plays_returns_sorted_names(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    plays_store.save_play("zeta", {})
    plays_store.save_play("alpha", {})
    assert plays_store.list_plays() == ["alpha", "zeta"]


def test_load_missing_play_raises_file_not_found(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    with pytest.raises(FileNotFoundError):
        plays_store.load_play("does-not-exist")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest backend/tests/test_plays_store.py -v`
Expected: FAIL — `backend.plays_store` module not found.

- [ ] **Step 3: Implement plays_store.py**

```python
import json
from pathlib import Path

PLAYS_DIR = Path(__file__).resolve().parent.parent / "plays"


def _ensure_dir() -> None:
    PLAYS_DIR.mkdir(parents=True, exist_ok=True)


def list_plays() -> list[str]:
    _ensure_dir()
    return sorted(p.stem for p in PLAYS_DIR.glob("*.json"))


def load_play(name: str) -> dict:
    _ensure_dir()
    path = PLAYS_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(name)
    return json.loads(path.read_text())


def save_play(name: str, data: dict) -> None:
    _ensure_dir()
    path = PLAYS_DIR / f"{name}.json"
    path.write_text(json.dumps(data, indent=2))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest backend/tests/test_plays_store.py -v`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/plays_store.py backend/tests/__init__.py backend/tests/test_plays_store.py
git commit -m "feat: add filesystem-backed play store"
```

---

### Task 5: Backend plays API routes

**Files:**
- Modify: `backend/routes_plays.py`
- Create: `backend/tests/test_routes_plays.py`

**Interfaces:**
- Consumes: `plays_store.list_plays`, `plays_store.load_play`, `plays_store.save_play` (Task 4).
- Produces: `GET /api/plays -> list[str]`; `GET /api/plays/{name} -> dict` (404 if missing); `POST /api/plays/{name}` with JSON body `-> {"status": "saved"}`. Invalid names (not matching `^[A-Za-z0-9_-]+$`) return 400.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_routes_plays.py`:
```python
from fastapi.testclient import TestClient

from backend import plays_store
from backend.app import app

client = TestClient(app)


def test_save_then_load_round_trip(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    resp = client.post("/api/plays/test-play", json={"name": "test-play"})
    assert resp.status_code == 200
    assert resp.json() == {"status": "saved"}

    resp = client.get("/api/plays/test-play")
    assert resp.status_code == 200
    assert resp.json() == {"name": "test-play"}


def test_list_includes_saved_play(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    client.post("/api/plays/foo", json={"name": "foo"})
    resp = client.get("/api/plays")
    assert resp.status_code == 200
    assert resp.json() == ["foo"]


def test_get_missing_play_returns_404(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    resp = client.get("/api/plays/missing")
    assert resp.status_code == 404


def test_invalid_name_returns_400(tmp_path, monkeypatch):
    monkeypatch.setattr(plays_store, "PLAYS_DIR", tmp_path)
    resp = client.get("/api/plays/bad name")
    assert resp.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest backend/tests/test_routes_plays.py -v`
Expected: FAIL — routes return 404 (route doesn't exist) instead of the expected behavior.

- [ ] **Step 3: Implement routes_plays.py**

```python
import re

from fastapi import APIRouter, HTTPException

from . import plays_store

router = APIRouter(prefix="/api/plays")
NAME_RE = re.compile(r"^[A-Za-z0-9_-]+$")


def _validate_name(name: str) -> None:
    if not NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="invalid play name")


@router.get("")
def list_plays() -> list[str]:
    return plays_store.list_plays()


@router.get("/{name}")
def get_play(name: str) -> dict:
    _validate_name(name)
    try:
        return plays_store.load_play(name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="play not found")


@router.post("/{name}")
def put_play(name: str, play: dict) -> dict:
    _validate_name(name)
    plays_store.save_play(name, play)
    return {"status": "saved"}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest backend/tests/test_routes_plays.py -v`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/routes_plays.py backend/tests/test_routes_plays.py
git commit -m "feat: add /api/plays save/load/list endpoints"
```

---

### Task 6: Frontend save/load wiring

**Files:**
- Create: `static/js/api.js`
- Create: `static/js/tests/api.test.js`
- Modify: `static/js/editor.js`
- Modify: `static/js/main.js`
- Modify: `static/index.html`

**Interfaces:**
- Produces: `fetchPlayNames() -> Promise<string[]>`; `fetchPlay(name) -> Promise<Play>`; `savePlay(name, play) -> Promise<void>`. All three take an injectable `fetchImpl` (defaults to global `fetch`) so they're testable without a real server.

- [ ] **Step 1: Write the failing test**

`static/js/tests/api.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPlayNames, fetchPlay, savePlay } from "../api.js";

function fakeFetch(responses) {
  return async (url, options) => {
    const key = `${options?.method || "GET"} ${url}`;
    const response = responses[key];
    if (!response) throw new Error(`unexpected request: ${key}`);
    return { ok: true, json: async () => response };
  };
}

test("fetchPlayNames GETs /api/plays and returns the list", async () => {
  const names = await fetchPlayNames(fakeFetch({ "GET /api/plays": ["a", "b"] }));
  assert.deepEqual(names, ["a", "b"]);
});

test("fetchPlay GETs /api/plays/{name}", async () => {
  const play = await fetchPlay("foo", fakeFetch({ "GET /api/plays/foo": { name: "foo" } }));
  assert.deepEqual(play, { name: "foo" });
});

test("savePlay POSTs the play JSON to /api/plays/{name}", async () => {
  let capturedBody = null;
  const fetchImpl = async (url, options) => {
    assert.equal(url, "/api/plays/foo");
    assert.equal(options.method, "POST");
    capturedBody = JSON.parse(options.body);
    return { ok: true, json: async () => ({ status: "saved" }) };
  };
  await savePlay("foo", { name: "foo" }, fetchImpl);
  assert.deepEqual(capturedBody, { name: "foo" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test static/js/tests/api.test.js`
Expected: FAIL — `api.js` does not exist yet.

- [ ] **Step 3: Implement api.js**

```javascript
export async function fetchPlayNames(fetchImpl = fetch) {
  const resp = await fetchImpl("/api/plays");
  return resp.json();
}

export async function fetchPlay(name, fetchImpl = fetch) {
  const resp = await fetchImpl(`/api/plays/${name}`);
  return resp.json();
}

export async function savePlay(name, play, fetchImpl = fetch) {
  await fetchImpl(`/api/plays/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(play),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test static/js/tests/api.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Add save/load UI**

Add to `static/index.html` (inside `<body>`, above the canvas):
```html
<div id="controls">
  <button id="save-btn">Save</button>
  <select id="load-select"><option value="">Load a play...</option></select>
</div>
```

Add to `static/js/editor.js`:
```javascript
import { fetchPlayNames, fetchPlay, savePlay } from "./api.js";

export function wireSaveLoad(play, onLoad) {
  document.getElementById("save-btn").addEventListener("click", async () => {
    const name = prompt("Play name?", play.name || "");
    if (!name) return;
    play.name = name;
    await savePlay(name, play);
  });

  const select = document.getElementById("load-select");
  fetchPlayNames().then((names) => {
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }
  });
  select.addEventListener("change", async () => {
    if (!select.value) return;
    const loaded = await fetchPlay(select.value);
    onLoad(loaded);
  });
}
```

- [ ] **Step 6: Wire into main.js**

Add to `static/js/main.js`, after `const placement = ...`:
```javascript
import { wireSaveLoad } from "./editor.js";

wireSaveLoad(play, (loaded) => {
  Object.assign(play, loaded);
});
```

- [ ] **Step 7: Manually verify in the browser**

Run: `uv run uvicorn backend.app:app --port 8000`, open `http://localhost:8000/`. Place players, click Save, enter a name. Reload the page, confirm the name appears in the dropdown, select it, confirm player positions restore.

- [ ] **Step 8: Commit**

```bash
git add static/js/api.js static/js/tests/api.test.js static/js/editor.js static/js/main.js static/index.html
git commit -m "feat: wire save/load UI to the plays API"
```

---

### Task 7: Ball possession derivation

**Files:**
- Create: `static/js/ball.js`
- Create: `static/js/tests/ball.test.js`

**Interfaces:**
- Produces: `ballStateAt(play, t) -> {holder: string, lastEvent: object|null}`. `play.ball.events` must be sorted ascending by `t` (enforced by `state.js` in Task 9).

- [ ] **Step 1: Write the failing tests**

`static/js/tests/ball.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { ballStateAt } from "../ball.js";

const play = {
  ball: {
    start_holder: "O1",
    events: [
      { t: 2.0, action: "pass", from: "O1", to: "O2" },
      { t: 4.0, action: "dribble", from: "O2" },
      { t: 5.0, action: "handoff", from: "O2", to: "O3" },
    ],
  },
};

test("before any event, holder is start_holder", () => {
  assert.equal(ballStateAt(play, 0).holder, "O1");
  assert.equal(ballStateAt(play, 1.9).holder, "O1");
});

test("pass event changes holder at its time", () => {
  assert.equal(ballStateAt(play, 2.0).holder, "O2");
  assert.equal(ballStateAt(play, 3.9).holder, "O2");
});

test("dribble event does not change holder", () => {
  assert.equal(ballStateAt(play, 4.0).holder, "O2");
  assert.equal(ballStateAt(play, 4.9).holder, "O2");
});

test("handoff event changes holder at its time", () => {
  assert.equal(ballStateAt(play, 5.0).holder, "O3");
  assert.equal(ballStateAt(play, 100).holder, "O3");
});

test("lastEvent reflects the most recent applied event", () => {
  assert.equal(ballStateAt(play, 2.0).lastEvent.action, "pass");
  assert.equal(ballStateAt(play, 0).lastEvent, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/ball.test.js`
Expected: FAIL — `ball.js` does not exist yet.

- [ ] **Step 3: Implement ball.js**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/ball.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add static/js/ball.js static/js/tests/ball.test.js
git commit -m "feat: derive ball possession state from play events"
```

---

### Task 8: Offense position interpolation

**Files:**
- Create: `static/js/offense.js`
- Create: `static/js/tests/offense.test.js`

**Interfaces:**
- Consumes: `lerpPoint` from `geometry.js` (Task 2).
- Produces: `playerPositionAt(playerData, t) -> [x, y]`. Assumes `playerData.actions` is sorted ascending by `start_t` (enforced by `state.js` in Task 9).

- [ ] **Step 1: Write the failing tests**

`static/js/tests/offense.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { playerPositionAt } from "../offense.js";

const player = {
  id: "O1",
  start_pos: [0, 0],
  actions: [
    { type: "cut", start_t: 2.0, duration: 2.0, target_pos: [10, 0] },
    { type: "relocate", start_t: 6.0, duration: 1.0, target_pos: [10, 10] },
  ],
};

test("before the first action, position is start_pos", () => {
  assert.deepEqual(playerPositionAt(player, 0), [0, 0]);
  assert.deepEqual(playerPositionAt(player, 2.0), [0, 0]);
});

test("mid-action, position is linearly interpolated", () => {
  assert.deepEqual(playerPositionAt(player, 3.0), [5, 0]);
});

test("between actions, position holds at the last action's target", () => {
  assert.deepEqual(playerPositionAt(player, 5.0), [10, 0]);
});

test("during the second action, interpolates from its own start", () => {
  assert.deepEqual(playerPositionAt(player, 6.5), [10, 5]);
});

test("after the last action, position holds at its target", () => {
  assert.deepEqual(playerPositionAt(player, 100), [10, 10]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/offense.test.js`
Expected: FAIL — `offense.js` does not exist yet.

- [ ] **Step 3: Implement offense.js**

```javascript
import { lerpPoint } from "./geometry.js";

export function playerPositionAt(playerData, t) {
  let pos = playerData.start_pos;
  for (const action of playerData.actions) {
    const end = action.start_t + action.duration;
    if (t <= action.start_t) {
      break;
    } else if (t >= end) {
      pos = action.target_pos;
    } else {
      const frac = (t - action.start_t) / action.duration;
      return lerpPoint(pos, action.target_pos, frac);
    }
  }
  return pos;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/offense.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add static/js/offense.js static/js/tests/offense.test.js
git commit -m "feat: interpolate offensive player position from timed actions"
```

---

### Task 9: Action CRUD + undo/redo history

**Files:**
- Modify: `static/js/state.js`
- Modify: `static/js/tests/state.test.js`

**Interfaces:**
- Produces (added to `state.js`): `addAction(play, playerId, action) -> Play`; `removeAction(play, playerId, actionIndex) -> Play`; `reorderAction(play, playerId, fromIndex, toIndex) -> Play` (all mutate and return `play`; `addAction` keeps `actions` sorted by `start_t`). `class History { push(snapshot); undo(current) -> snapshot; redo(current) -> snapshot; }` using `structuredClone` for snapshots.

- [ ] **Step 1: Write the failing tests**

Append to `static/js/tests/state.test.js`:
```javascript
import { addAction, removeAction, reorderAction, History } from "../state.js";

test("addAction appends and keeps actions sorted by start_t", () => {
  const play = createEmptyPlay();
  addAction(play, "O1", { type: "cut", start_t: 3, duration: 1, target_pos: [1, 1] });
  addAction(play, "O1", { type: "screen", start_t: 1, duration: 1, target_pos: [2, 2] });
  const player = play.offense.find((p) => p.id === "O1");
  assert.deepEqual(
    player.actions.map((a) => a.type),
    ["screen", "cut"]
  );
});

test("removeAction removes the action at the given index", () => {
  const play = createEmptyPlay();
  addAction(play, "O1", { type: "cut", start_t: 1, duration: 1, target_pos: [1, 1] });
  removeAction(play, "O1", 0);
  assert.equal(play.offense.find((p) => p.id === "O1").actions.length, 0);
});

test("reorderAction moves an action to a new index", () => {
  const play = createEmptyPlay();
  addAction(play, "O1", { type: "cut", start_t: 1, duration: 1, target_pos: [1, 1] });
  addAction(play, "O1", { type: "screen", start_t: 2, duration: 1, target_pos: [2, 2] });
  reorderAction(play, "O1", 0, 1);
  const player = play.offense.find((p) => p.id === "O1");
  assert.deepEqual(
    player.actions.map((a) => a.type),
    ["screen", "cut"]
  );
});

test("History push/undo/redo restores prior snapshots", () => {
  const history = new History();
  const v1 = { count: 1 };
  const v2 = { count: 2 };
  history.push(v1);
  let current = history.undo(v2);
  assert.deepEqual(current, v1);
  current = history.redo(current);
  assert.deepEqual(current, v2);
});

test("History undo with empty stack returns current unchanged", () => {
  const history = new History();
  const current = { count: 1 };
  assert.deepEqual(history.undo(current), current);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/state.test.js`
Expected: FAIL — `addAction`, `removeAction`, `reorderAction`, `History` not exported yet.

- [ ] **Step 3: Implement the additions in state.js**

Append to `static/js/state.js`:
```javascript
export function addAction(play, playerId, action) {
  const player = play.offense.find((p) => p.id === playerId);
  player.actions.push(action);
  player.actions.sort((a, b) => a.start_t - b.start_t);
  return play;
}

export function removeAction(play, playerId, actionIndex) {
  const player = play.offense.find((p) => p.id === playerId);
  player.actions.splice(actionIndex, 1);
  return play;
}

export function reorderAction(play, playerId, fromIndex, toIndex) {
  const player = play.offense.find((p) => p.id === playerId);
  const [action] = player.actions.splice(fromIndex, 1);
  player.actions.splice(toIndex, 0, action);
  return play;
}

export class History {
  constructor() {
    this.past = [];
    this.future = [];
  }

  push(snapshot) {
    this.past.push(structuredClone(snapshot));
    this.future = [];
  }

  undo(current) {
    if (this.past.length === 0) return current;
    this.future.push(structuredClone(current));
    return this.past.pop();
  }

  redo(current) {
    if (this.future.length === 0) return current;
    this.past.push(structuredClone(current));
    return this.future.pop();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/state.test.js`
Expected: PASS, 7 tests total (2 from Task 3 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add static/js/state.js static/js/tests/state.test.js
git commit -m "feat: add action CRUD and undo/redo history to play state"
```

---

### Task 10: Timeline UI wiring

**Files:**
- Create: `static/js/timeline.js`
- Modify: `static/index.html`
- Modify: `static/js/main.js`

**Interfaces:**
- Consumes: `addAction`, `removeAction`, `reorderAction`, `History` from `state.js` (Task 9).
- Produces: `createTimelineEditor(play, history, container) -> {selectPlayer(id), refresh()}` (DOM-dependent, not unit tested — verified manually).

- [ ] **Step 1: Add timeline container to index.html**

Add to `static/index.html`, below the `#controls` div:
```html
<div id="timeline">
  <select id="player-select">
    <option value="O1">O1</option>
    <option value="O2">O2</option>
    <option value="O3">O3</option>
    <option value="O4">O4</option>
    <option value="O5">O5</option>
  </select>
  <ul id="action-list"></ul>
  <form id="add-action-form">
    <select id="action-type">
      <option>relocate</option>
      <option>cut</option>
      <option>dribble</option>
      <option>pass</option>
      <option>screen</option>
      <option>handoff</option>
      <option>shot</option>
    </select>
    <input id="action-start-t" type="number" step="0.1" placeholder="start_t" required>
    <input id="action-duration" type="number" step="0.1" placeholder="duration" required>
    <input id="action-target-x" type="number" step="0.1" placeholder="target x" required>
    <input id="action-target-y" type="number" step="0.1" placeholder="target y" required>
    <button type="submit">Add action</button>
  </form>
  <button id="undo-btn">Undo</button>
  <button id="redo-btn">Redo</button>
</div>
```

- [ ] **Step 2: Implement timeline.js**

```javascript
import { addAction, removeAction, reorderAction, History } from "./state.js";

export function createTimelineEditor(play, history, onChange) {
  let selectedPlayerId = "O1";

  function refresh() {
    const list = document.getElementById("action-list");
    list.innerHTML = "";
    const player = play.offense.find((p) => p.id === selectedPlayerId);
    player.actions.forEach((action, index) => {
      const li = document.createElement("li");
      li.textContent = `${action.type} @ t=${action.start_t} (${action.duration}s) -> [${action.target_pos}]`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        history.push(play);
        removeAction(play, selectedPlayerId, index);
        refresh();
        onChange();
      });
      li.appendChild(removeBtn);

      if (index > 0) {
        const upBtn = document.createElement("button");
        upBtn.textContent = "Move up";
        upBtn.addEventListener("click", () => {
          history.push(play);
          reorderAction(play, selectedPlayerId, index, index - 1);
          refresh();
          onChange();
        });
        li.appendChild(upBtn);
      }

      list.appendChild(li);
    });
  }

  document.getElementById("player-select").addEventListener("change", (event) => {
    selectedPlayerId = event.target.value;
    refresh();
  });

  document.getElementById("add-action-form").addEventListener("submit", (event) => {
    event.preventDefault();
    history.push(play);
    addAction(play, selectedPlayerId, {
      type: document.getElementById("action-type").value,
      start_t: parseFloat(document.getElementById("action-start-t").value),
      duration: parseFloat(document.getElementById("action-duration").value),
      target_pos: [
        parseFloat(document.getElementById("action-target-x").value),
        parseFloat(document.getElementById("action-target-y").value),
      ],
    });
    refresh();
    onChange();
  });

  document.getElementById("undo-btn").addEventListener("click", () => {
    Object.assign(play, history.undo(play));
    refresh();
    onChange();
  });

  document.getElementById("redo-btn").addEventListener("click", () => {
    Object.assign(play, history.redo(play));
    refresh();
    onChange();
  });

  refresh();
  return { selectPlayer: (id) => { selectedPlayerId = id; refresh(); }, refresh };
}
```

- [ ] **Step 3: Wire into main.js**

Add to `static/js/main.js`:
```javascript
import { createTimelineEditor } from "./timeline.js";
import { History } from "./state.js";

const history = new History();
createTimelineEditor(play, history, () => {});
```

- [ ] **Step 4: Manually verify in the browser**

Run: `uv run uvicorn backend.app:app --port 8000`, open `http://localhost:8000/`. Select player O1, add a `cut` action with start_t=1, duration=2, target [5, 10]; confirm it appears in the list. Add a second action with an earlier start_t and confirm it's sorted before the first. Click Remove, confirm it disappears. Click Undo, confirm it reappears.

- [ ] **Step 5: Commit**

```bash
git add static/index.html static/js/timeline.js static/js/main.js
git commit -m "feat: add timeline UI for editing offensive player actions"
```

---

### Task 11: Offense-only simulate + playback loop

**Files:**
- Create: `static/js/simulate.js`
- Create: `static/js/tests/simulate.test.js`
- Create: `static/js/playback.js`
- Modify: `static/index.html`
- Modify: `static/js/main.js`

**Interfaces:**
- Consumes: `playerPositionAt` (Task 8), `ballStateAt` (Task 7).
- Produces: `simulateFrame(play, t) -> {offense: {id: [x,y]}, ball: {holder, pos}}` (defense fields added in Task 14). Also `createPlaybackController(play, onFrame) -> {play(), pause(), step(delta), scrubTo(t), setSpeed(mult)}` (DOM-independent state machine, but drives `requestAnimationFrame` so only the pure `simulateFrame` calls are unit tested).

- [ ] **Step 1: Write the failing test**

`static/js/tests/simulate.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateFrame } from "../simulate.js";

const play = {
  offense: [
    { id: "O1", start_pos: [0, 0], actions: [] },
    { id: "O2", start_pos: [10, 10], actions: [] },
  ],
  ball: { start_holder: "O1", events: [] },
  defense: { mode: "man", man: { assignments: {}, help_scheme: "uniform", params: { lag: 0, help_weight: 0, rim_bias: 0 } }, zone: null },
};

test("simulateFrame returns each offensive player's position and ball state", () => {
  const frame = simulateFrame(play, 0);
  assert.deepEqual(frame.offense.O1, [0, 0]);
  assert.deepEqual(frame.offense.O2, [10, 10]);
  assert.equal(frame.ball.holder, "O1");
  assert.deepEqual(frame.ball.pos, [0, 0]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test static/js/tests/simulate.test.js`
Expected: FAIL — `simulate.js` does not exist yet.

- [ ] **Step 3: Implement simulate.js (offense/ball only for now)**

```javascript
import { playerPositionAt } from "./offense.js";
import { ballStateAt } from "./ball.js";

export function simulateFrame(play, t) {
  const offense = {};
  for (const p of play.offense) offense[p.id] = playerPositionAt(p, t);
  const ball = ballStateAt(play, t);
  return { offense, ball: { holder: ball.holder, pos: offense[ball.holder] } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test static/js/tests/simulate.test.js`
Expected: PASS.

- [ ] **Step 5: Implement the playback controller (DOM-adjacent, no unit test)**

`static/js/playback.js`:
```javascript
import { simulateFrame } from "./simulate.js";

export function createPlaybackController(play, onFrame) {
  let t = 0;
  let speed = 1;
  let playing = false;
  let lastTimestamp = null;

  function tick(timestamp) {
    if (!playing) return;
    if (lastTimestamp !== null) {
      t += ((timestamp - lastTimestamp) / 1000) * speed;
    }
    lastTimestamp = timestamp;
    onFrame(simulateFrame(play, t), t);
    requestAnimationFrame(tick);
  }

  return {
    play() {
      playing = true;
      lastTimestamp = null;
      requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
    },
    step(delta) {
      t = Math.max(0, t + delta);
      onFrame(simulateFrame(play, t), t);
    },
    scrubTo(newT) {
      t = Math.max(0, newT);
      onFrame(simulateFrame(play, t), t);
    },
    setSpeed(mult) {
      speed = mult;
    },
    getTime: () => t,
  };
}
```

- [ ] **Step 6: Add transport controls to index.html**

```html
<div id="transport">
  <button id="play-btn">Play</button>
  <button id="pause-btn">Pause</button>
  <button id="step-back-btn">Step -</button>
  <button id="step-fwd-btn">Step +</button>
  <input id="scrub" type="range" min="0" max="30" step="0.1" value="0">
  <select id="speed-select">
    <option value="0.25">0.25x</option>
    <option value="0.5">0.5x</option>
    <option value="1" selected>1x</option>
    <option value="2">2x</option>
  </select>
</div>
```

- [ ] **Step 7: Wire playback into main.js**

Replace the `render()` loop in `static/js/main.js` with:
```javascript
import { createPlaybackController } from "./playback.js";
import { drawPlayers } from "./render.js";

const playback = createPlaybackController(play, (frame) => {
  drawCourt(ctx, canvas.width, canvas.height);
  drawPlayers(ctx, canvas.width, canvas.height, { offense: frame.offense, defense: {} });
});

document.getElementById("play-btn").addEventListener("click", () => playback.play());
document.getElementById("pause-btn").addEventListener("click", () => playback.pause());
document.getElementById("step-back-btn").addEventListener("click", () => playback.step(-0.1));
document.getElementById("step-fwd-btn").addEventListener("click", () => playback.step(0.1));
document.getElementById("scrub").addEventListener("input", (event) => playback.scrubTo(parseFloat(event.target.value)));
document.getElementById("speed-select").addEventListener("change", (event) => playback.setSpeed(parseFloat(event.target.value)));

playback.scrubTo(0);
```

Remove the earlier placement-only `render()`/`requestAnimationFrame(render)` block from Task 3 — placement editing now happens before playback starts, and `playback.scrubTo(0)` triggers the first draw.

- [ ] **Step 8: Manually verify in the browser**

Run: `uv run uvicorn backend.app:app --port 8000`, open `http://localhost:8000/`. Place players, add a couple of timed actions to O1, click Play — confirm O1 animates along its path. Pause, drag the scrub slider, confirm the position updates instantly. Try Step +/- and the speed dropdown.

- [ ] **Step 9: Commit**

```bash
git add static/js/simulate.js static/js/tests/simulate.test.js static/js/playback.js static/index.html static/js/main.js
git commit -m "feat: add offense playback simulation and transport controls"
```

---

### Task 12: Movement capping

**Files:**
- Create: `static/js/movement.js`
- Create: `static/js/tests/movement.test.js`

**Interfaces:**
- Consumes: `distance`, `lerpPoint` from `geometry.js` (Task 2).
- Produces: `capMovement(prevPos, targetPos, maxSpeed, dt) -> [x, y]`.

- [ ] **Step 1: Write the failing tests**

`static/js/tests/movement.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { capMovement } from "../movement.js";

test("returns targetPos when within reach", () => {
  const result = capMovement([0, 0], [1, 0], 10, 1);
  assert.deepEqual(result, [1, 0]);
});

test("caps movement to maxSpeed * dt when target is far", () => {
  const result = capMovement([0, 0], [100, 0], 5, 1);
  assert.deepEqual(result, [5, 0]);
});

test("caps movement along the correct direction for diagonal targets", () => {
  const result = capMovement([0, 0], [3, 4], 2.5, 1);
  assert.ok(Math.abs(result[0] - 1.5) < 1e-9);
  assert.ok(Math.abs(result[1] - 2) < 1e-9);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/movement.test.js`
Expected: FAIL — `movement.js` does not exist yet.

- [ ] **Step 3: Implement movement.js**

```javascript
import { distance, lerpPoint } from "./geometry.js";

export function capMovement(prevPos, targetPos, maxSpeed, dt) {
  const maxDist = maxSpeed * dt;
  const d = distance(prevPos, targetPos);
  if (d <= maxDist) return targetPos;
  return lerpPoint(prevPos, targetPos, maxDist / d);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/movement.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add static/js/movement.js static/js/tests/movement.test.js
git commit -m "feat: add speed-capped movement toward a target position"
```

---

### Task 13: Man-to-man defense target rule

**Files:**
- Create: `static/js/defense/man.js`
- Create: `static/js/tests/man.test.js`

**Interfaces:**
- Consumes: `playerPositionAt` (Task 8), `ballStateAt` (Task 7), `distance`, `lerpPoint` (Task 2).
- Produces: `manDefenderTargets(play, t) -> {defenderId: [x, y]}`, reading `play.defense.man.{assignments, help_scheme, params: {lag, help_weight, rim_bias}}`.

- [ ] **Step 1: Write the failing tests**

`static/js/tests/man.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { manDefenderTargets } from "../defense/man.js";

function makePlay({ helpScheme, o2Pos, o3Pos }) {
  return {
    offense: [
      { id: "O1", start_pos: [0, 10], actions: [] },
      { id: "O2", start_pos: o2Pos, actions: [] },
      { id: "O3", start_pos: o3Pos, actions: [] },
    ],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: {
        assignments: { O1: "D1", O2: "D2", O3: "D3" },
        help_scheme: helpScheme,
        params: { lag: 0, help_weight: 0.5, rim_bias: 0 },
      },
      zone: null,
    },
  };
}

test("ball handler's defender tracks with zero help weight", () => {
  const play = makePlay({ helpScheme: "uniform", o2Pos: [10, 10], o3Pos: [15, 10] });
  const targets = manDefenderTargets(play, 0);
  assert.deepEqual(targets.D1, [0, 10]);
});

test("uniform scheme applies the same help_weight to every non-ball defender", () => {
  const play = makePlay({ helpScheme: "uniform", o2Pos: [10, 10], o3Pos: [20, 10] });
  const targets = manDefenderTargets(play, 0);
  // D2 track=[10,10], ball=[0,10]: target = [10,10] + 0.5*([0,10]-[10,10]) = [5,10]
  assert.deepEqual(targets.D2, [5, 10]);
  // D3 track=[20,10], ball=[0,10]: target = [20,10] + 0.5*([0,10]-[20,10]) = [10,10]
  assert.deepEqual(targets.D3, [10, 10]);
});

test("tiered scheme gives the nearest (1-pass-away) defender a reduced help_weight", () => {
  // O2 is closer to the ball handler O1 than O3 is -> O2 is "1 pass away", O3 is "2 passes away"
  const play = makePlay({ helpScheme: "tiered", o2Pos: [5, 10], o3Pos: [20, 10] });
  const targets = manDefenderTargets(play, 0);
  // D2 (1 pass away): weight = 0.5 * 0.4 = 0.2. track=[5,10], ball=[0,10]: target = [5,10] + 0.2*([0,10]-[5,10]) = [4,10]
  assert.deepEqual(targets.D2, [4, 10]);
  // D3 (2 passes away): weight = 0.5 (full). track=[20,10], ball=[0,10]: target = [20,10] + 0.5*([0,10]-[20,10]) = [10,10]
  assert.deepEqual(targets.D3, [10, 10]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/man.test.js`
Expected: FAIL — `defense/man.js` does not exist yet.

- [ ] **Step 3: Implement defense/man.js**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/man.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add static/js/defense/man.js static/js/tests/man.test.js
git commit -m "feat: add man-to-man defender target rule with tiered/uniform help schemes"
```

---

### Task 14: Wire man defense into simulation + playback

**Files:**
- Modify: `static/js/simulate.js`
- Modify: `static/js/tests/simulate.test.js`
- Modify: `static/js/playback.js`
- Modify: `static/js/main.js`

**Interfaces:**
- Modifies `simulateFrame(play, t)` to also return `defenseTargets: {defenderId: [x,y]}` when `play.defense.mode === "man"`.
- `createPlaybackController` now tracks previous defender positions and applies `capMovement` each frame before calling `onFrame`, so `onFrame` receives actual (speed-capped) defender positions, not raw targets.

- [ ] **Step 1: Extend the failing test**

Append to `static/js/tests/simulate.test.js`:
```javascript
test("simulateFrame includes man-to-man defenseTargets when mode is man", () => {
  const manPlay = {
    offense: [{ id: "O1", start_pos: [0, 10], actions: [] }],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "man",
      man: { assignments: { O1: "D1" }, help_scheme: "uniform", params: { lag: 0, help_weight: 0, rim_bias: 0 } },
      zone: null,
    },
  };
  const frame = simulateFrame(manPlay, 0);
  assert.deepEqual(frame.defenseTargets.D1, [0, 10]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test static/js/tests/simulate.test.js`
Expected: FAIL — `frame.defenseTargets` is `undefined`.

- [ ] **Step 3: Update simulate.js**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/simulate.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Apply movement capping in the playback controller**

Replace `static/js/playback.js` with:
```javascript
import { simulateFrame } from "./simulate.js";
import { capMovement } from "./movement.js";

const MAX_DEFENDER_SPEED = 15; // feet per second

export function createPlaybackController(play, onFrame) {
  let t = 0;
  let speed = 1;
  let playing = false;
  let lastTimestamp = null;
  let defenderPositions = {};

  function computeAndEmit(dt) {
    const frame = simulateFrame(play, t);
    const nextPositions = {};
    for (const [id, target] of Object.entries(frame.defenseTargets)) {
      const prev = defenderPositions[id] || target;
      nextPositions[id] = capMovement(prev, target, MAX_DEFENDER_SPEED, dt);
    }
    defenderPositions = nextPositions;
    onFrame({ offense: frame.offense, ball: frame.ball, defense: defenderPositions }, t);
  }

  function tick(timestamp) {
    if (!playing) return;
    const dt = lastTimestamp !== null ? (timestamp - lastTimestamp) / 1000 : 0;
    t += dt * speed;
    lastTimestamp = timestamp;
    computeAndEmit(dt);
    requestAnimationFrame(tick);
  }

  return {
    play() {
      playing = true;
      lastTimestamp = null;
      requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
    },
    step(delta) {
      t = Math.max(0, t + delta);
      computeAndEmit(Math.abs(delta));
    },
    scrubTo(newT) {
      t = Math.max(0, newT);
      defenderPositions = {}; // scrubbing snaps defenders directly to their rule-computed targets
      computeAndEmit(Infinity);
    },
    setSpeed(mult) {
      speed = mult;
    },
    getTime: () => t,
  };
}
```

- [ ] **Step 6: Update main.js rendering to draw defenders from the frame**

In `static/js/main.js`, change the `createPlaybackController` callback:
```javascript
const playback = createPlaybackController(play, (frame) => {
  drawCourt(ctx, canvas.width, canvas.height);
  drawPlayers(ctx, canvas.width, canvas.height, { offense: frame.offense, defense: frame.defense });
});
```

- [ ] **Step 7: Manually verify in the browser**

Set the play's `defense.man.assignments` for the players placed in Task 3 (temporarily via browser console: `play.defense.man.assignments = { O1: "D1", O2: "D2", O3: "D3", O4: "D4", O5: "D5" }`). Click Play, confirm the red defender dots track the blue offense dots with a visible lag and drift toward the ball handler when help_weight > 0.

- [ ] **Step 8: Commit**

```bash
git add static/js/simulate.js static/js/tests/simulate.test.js static/js/playback.js static/js/main.js
git commit -m "feat: wire man-to-man defense targets into simulation and playback"
```

---

### Task 15: Man defense configuration UI

**Files:**
- Modify: `static/index.html`
- Create: `static/js/defense-ui.js`
- Modify: `static/js/main.js`

**Interfaces:**
- Produces: `wireManDefenseUI(play)` (DOM-dependent, not unit tested — verified manually). Reads/writes `play.defense.man.assignments`, `play.defense.man.help_scheme`, `play.defense.man.params`.

- [ ] **Step 1: Add config UI to index.html**

```html
<div id="defense-config">
  <fieldset>
    <legend>Man-to-man assignments</legend>
    <div id="man-assignments"></div>
  </fieldset>
  <label>Help scheme:
    <select id="help-scheme">
      <option value="uniform">Uniform</option>
      <option value="tiered">Tiered</option>
    </select>
  </label>
  <label>Lag (s): <input id="param-lag" type="number" step="0.05" value="0.3"></label>
  <label>Help weight: <input id="param-help-weight" type="number" step="0.05" value="0.4"></label>
  <label>Rim bias: <input id="param-rim-bias" type="number" step="0.05" value="0.2"></label>
</div>
```

- [ ] **Step 2: Implement defense-ui.js**

```javascript
const OFFENSE_IDS = ["O1", "O2", "O3", "O4", "O5"];
const DEFENSE_IDS = ["D1", "D2", "D3", "D4", "D5"];

export function wireManDefenseUI(play) {
  const container = document.getElementById("man-assignments");
  for (const offenseId of OFFENSE_IDS) {
    const label = document.createElement("label");
    label.textContent = `${offenseId} guarded by: `;
    const select = document.createElement("select");
    for (const defenseId of DEFENSE_IDS) {
      const option = document.createElement("option");
      option.value = defenseId;
      option.textContent = defenseId;
      select.appendChild(option);
    }
    select.value = play.defense.man.assignments[offenseId] || "";
    select.addEventListener("change", () => {
      play.defense.man.assignments[offenseId] = select.value;
    });
    play.defense.man.assignments[offenseId] = select.value;
    label.appendChild(select);
    container.appendChild(label);
  }

  document.getElementById("help-scheme").addEventListener("change", (event) => {
    play.defense.man.help_scheme = event.target.value;
  });
  document.getElementById("param-lag").addEventListener("input", (event) => {
    play.defense.man.params.lag = parseFloat(event.target.value);
  });
  document.getElementById("param-help-weight").addEventListener("input", (event) => {
    play.defense.man.params.help_weight = parseFloat(event.target.value);
  });
  document.getElementById("param-rim-bias").addEventListener("input", (event) => {
    play.defense.man.params.rim_bias = parseFloat(event.target.value);
  });
}
```

- [ ] **Step 3: Wire into main.js**

```javascript
import { wireManDefenseUI } from "./defense-ui.js";

wireManDefenseUI(play);
```

- [ ] **Step 4: Manually verify in the browser**

Open the app, confirm each O1-O5 has a defender-assignment dropdown defaulting to D1-D5 respectively, and that changing help scheme/params live-updates `play.defense.man` (check via console: `play.defense.man`). Play the animation and confirm changing "Help weight" while paused and stepping changes defender drift toward the ball.

- [ ] **Step 5: Commit**

```bash
git add static/index.html static/js/defense-ui.js static/js/main.js
git commit -m "feat: add man-to-man defense assignment and tuning UI"
```

---

### Task 16: Zone defense target rule

**Files:**
- Create: `static/js/defense/zone.js`
- Create: `static/js/tests/zone.test.js`

**Interfaces:**
- Consumes: `playerPositionAt` (Task 8), `ballStateAt` (Task 7), `distance`, `lerpPoint` (Task 2).
- Produces: `ZONE_PRESETS: {[zoneType]: {defenderId: [x,y]|null}}` for `"2-3"`, `"3-2"`, `"1-3-1"`, `"box-and-1"`; `zoneDefenderTargets(play, t) -> {defenderId: [x,y]}`, reading `play.defense.zone.{type, home_points, params: {ball_shade_weight, gap_shade_weight, max_shade}, man_mark}`. `man_mark` is an optional `{defenderId: offenseId}` used only when `type === "box-and-1"`, to say which offensive player that one man-marking defender tracks directly (documented exception to the base schema, needed because box-and-1 has no zone home point for its man defender).

- [ ] **Step 1: Write the failing tests**

`static/js/tests/zone.test.js`:
```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { zoneDefenderTargets, ZONE_PRESETS } from "../defense/zone.js";

function makePlay(type, extra = {}) {
  return {
    offense: [
      { id: "O1", start_pos: [0, 20], actions: [] },
      { id: "O2", start_pos: [-15, 4], actions: [] },
      { id: "O3", start_pos: [15, 4], actions: [] },
    ],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "zone",
      man: null,
      zone: {
        type,
        home_points: ZONE_PRESETS[type],
        params: { ball_shade_weight: 0.5, gap_shade_weight: 0, max_shade: 100 },
        ...extra,
      },
    },
  };
}

test("2-3 zone defenders shade from home point toward the ball", () => {
  const play = makePlay("2-3");
  const targets = zoneDefenderTargets(play, 0);
  const home = ZONE_PRESETS["2-3"].D1;
  const ballPos = [0, 20];
  const expected = [
    home[0] + 0.5 * (ballPos[0] - home[0]),
    home[1] + 0.5 * (ballPos[1] - home[1]),
  ];
  assert.deepEqual(targets.D1, expected);
});

test("shade is clamped to max_shade distance from home", () => {
  const play = makePlay("2-3");
  play.defense.zone.params.max_shade = 1;
  const targets = zoneDefenderTargets(play, 0);
  const home = ZONE_PRESETS["2-3"].D1;
  const d = Math.hypot(targets.D1[0] - home[0], targets.D1[1] - home[1]);
  assert.ok(d <= 1 + 1e-9);
});

test("box-and-1 tracks the man_mark assignment directly instead of a home point", () => {
  const play = makePlay("box-and-1", { man_mark: { D5: "O1" } });
  const targets = zoneDefenderTargets(play, 0);
  assert.deepEqual(targets.D5, [0, 20]);
});

test("all four zone presets define exactly 5 defender entries", () => {
  for (const type of ["2-3", "3-2", "1-3-1", "box-and-1"]) {
    assert.equal(Object.keys(ZONE_PRESETS[type]).length, 5);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test static/js/tests/zone.test.js`
Expected: FAIL — `defense/zone.js` does not exist yet.

- [ ] **Step 3: Implement defense/zone.js**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/zone.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add static/js/defense/zone.js static/js/tests/zone.test.js
git commit -m "feat: add zone defense home-point shading rule for all four zone types"
```

---

### Task 17: Wire zone defense into simulation

**Files:**
- Modify: `static/js/simulate.js`
- Modify: `static/js/tests/simulate.test.js`

**Interfaces:**
- Modifies `simulateFrame` to dispatch to `zoneDefenderTargets` when `play.defense.mode === "zone"`.

- [ ] **Step 1: Extend the failing test**

Append to `static/js/tests/simulate.test.js`:
```javascript
test("simulateFrame includes zone defenseTargets when mode is zone", () => {
  const zonePlay = {
    offense: [{ id: "O1", start_pos: [0, 20], actions: [] }],
    ball: { start_holder: "O1", events: [] },
    defense: {
      mode: "zone",
      man: null,
      zone: {
        type: "2-3",
        home_points: { D1: [-10, 18], D2: [10, 18], D3: [-15, 4], D4: [0, 3], D5: [15, 4] },
        params: { ball_shade_weight: 0, gap_shade_weight: 0, max_shade: 100 },
      },
    },
  };
  const frame = simulateFrame(zonePlay, 0);
  assert.deepEqual(frame.defenseTargets.D1, [-10, 18]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test static/js/tests/simulate.test.js`
Expected: FAIL — zone mode currently returns `{}` for `defenseTargets`.

- [ ] **Step 3: Update simulate.js**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/simulate.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Manually verify in the browser**

Via console, set `play.defense.mode = "zone"; play.defense.zone = { type: "2-3", home_points: ZONE_PRESETS["2-3"], params: { ball_shade_weight: 0.4, gap_shade_weight: 0.2, max_shade: 6 } }` (import `ZONE_PRESETS` temporarily or hardcode values), play the animation, confirm defenders sit near their zone home points and shade toward the ball as it moves.

- [ ] **Step 6: Commit**

```bash
git add static/js/simulate.js static/js/tests/simulate.test.js
git commit -m "feat: wire zone defense targets into simulation"
```

---

### Task 18: Zone configuration UI

**Files:**
- Modify: `static/index.html`
- Modify: `static/js/defense-ui.js`
- Modify: `static/js/main.js`

**Interfaces:**
- Produces: `wireZoneDefenseUI(play)` (DOM-dependent, not unit tested — verified manually). Consumes `ZONE_PRESETS` from `defense/zone.js` (Task 16). Reads/writes `play.defense.mode`, `play.defense.zone`.

- [ ] **Step 1: Add zone config UI to index.html**

```html
<div id="zone-config" style="display:none">
  <label>Zone type:
    <select id="zone-type">
      <option value="2-3">2-3</option>
      <option value="3-2">3-2</option>
      <option value="1-3-1">1-3-1</option>
      <option value="box-and-1">Box-and-1</option>
    </select>
  </label>
  <label>Ball shade weight: <input id="zone-ball-shade" type="number" step="0.05" value="0.5"></label>
  <label>Gap shade weight: <input id="zone-gap-shade" type="number" step="0.05" value="0.3"></label>
  <label>Max shade: <input id="zone-max-shade" type="number" step="0.5" value="8"></label>
  <label id="box-one-target-label" style="display:none">Box-and-1 man mark (O id): <input id="box-one-target" value="O1"></label>
</div>
<label>Defense mode:
  <select id="defense-mode">
    <option value="man">Man-to-man</option>
    <option value="zone">Zone</option>
  </select>
</label>
```

- [ ] **Step 2: Implement wireZoneDefenseUI in defense-ui.js**

Append to `static/js/defense-ui.js`:
```javascript
import { ZONE_PRESETS } from "./defense/zone.js";

function applyZoneType(play, type) {
  play.defense.zone = play.defense.zone || {
    params: { ball_shade_weight: 0.5, gap_shade_weight: 0.3, max_shade: 8 },
  };
  play.defense.zone.type = type;
  play.defense.zone.home_points = ZONE_PRESETS[type];
  if (type === "box-and-1") {
    play.defense.zone.man_mark = { D5: document.getElementById("box-one-target").value };
  } else {
    delete play.defense.zone.man_mark;
  }
  document.getElementById("box-one-target-label").style.display = type === "box-and-1" ? "" : "none";
}

export function wireZoneDefenseUI(play) {
  const zoneConfig = document.getElementById("zone-config");
  const manAssignments = document.getElementById("man-assignments").closest("fieldset");

  document.getElementById("defense-mode").addEventListener("change", (event) => {
    play.defense.mode = event.target.value;
    zoneConfig.style.display = event.target.value === "zone" ? "" : "none";
    manAssignments.style.display = event.target.value === "man" ? "" : "none";
    if (event.target.value === "zone" && !play.defense.zone) {
      applyZoneType(play, document.getElementById("zone-type").value);
    }
  });

  document.getElementById("zone-type").addEventListener("change", (event) => {
    applyZoneType(play, event.target.value);
  });
  document.getElementById("box-one-target").addEventListener("input", (event) => {
    if (play.defense.zone.man_mark) play.defense.zone.man_mark.D5 = event.target.value;
  });
  document.getElementById("zone-ball-shade").addEventListener("input", (event) => {
    play.defense.zone.params.ball_shade_weight = parseFloat(event.target.value);
  });
  document.getElementById("zone-gap-shade").addEventListener("input", (event) => {
    play.defense.zone.params.gap_shade_weight = parseFloat(event.target.value);
  });
  document.getElementById("zone-max-shade").addEventListener("input", (event) => {
    play.defense.zone.params.max_shade = parseFloat(event.target.value);
  });
}
```

- [ ] **Step 3: Wire into main.js**

```javascript
import { wireManDefenseUI, wireZoneDefenseUI } from "./defense-ui.js";

wireZoneDefenseUI(play);
```

(`wireManDefenseUI(play)` from Task 15 stays as-is; both are wired together.)

- [ ] **Step 4: Manually verify in the browser**

Switch "Defense mode" to Zone, confirm the man-assignment fieldset hides and zone config shows. Try each zone type, confirm "Box-and-1" reveals the man-mark input. Play the animation in zone mode and confirm defenders behave as in Task 17's manual check, now fully UI-driven with no console commands needed.

- [ ] **Step 5: Commit**

```bash
git add static/index.html static/js/defense-ui.js static/js/main.js
git commit -m "feat: add zone defense type picker and tuning UI"
```

---

### Task 19: Out-of-bounds clamping and defender separation

**Files:**
- Modify: `static/js/movement.js`
- Modify: `static/js/tests/movement.test.js`
- Modify: `static/js/playback.js`

**Interfaces:**
- Adds to `movement.js`: `separateOverlaps(positions, minDistance) -> positions` where `positions` is `{id: [x,y]}` — pushes apart any two entries closer than `minDistance`.
- `playback.js`'s `computeAndEmit` clamps each defender position to the court and runs `separateOverlaps` on the combined offense+defense position map before calling `onFrame`.

- [ ] **Step 1: Write the failing test**

Append to `static/js/tests/movement.test.js`:
```javascript
import { separateOverlaps } from "../movement.js";

test("separateOverlaps pushes apart two positions closer than minDistance", () => {
  const result = separateOverlaps({ A: [0, 0], B: [1, 0] }, 2);
  const d = Math.hypot(result.A[0] - result.B[0], result.A[1] - result.B[1]);
  assert.ok(d >= 2 - 1e-9);
});

test("separateOverlaps leaves already-separated positions unchanged", () => {
  const input = { A: [0, 0], B: [10, 0] };
  assert.deepEqual(separateOverlaps(input, 2), input);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test static/js/tests/movement.test.js`
Expected: FAIL — `separateOverlaps` not exported yet.

- [ ] **Step 3: Implement separateOverlaps in movement.js**

Append to `static/js/movement.js`:
```javascript
import { clampPointToCourt } from "./geometry.js";

export function separateOverlaps(positions, minDistance) {
  const ids = Object.keys(positions);
  const result = {};
  for (const id of ids) result[id] = [...positions[id]];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = result[ids[i]];
      const b = result[ids[j]];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1e-6;
      if (d < minDistance) {
        const push = (minDistance - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        result[ids[i]] = [a[0] - ux * push, a[1] - uy * push];
        result[ids[j]] = [b[0] + ux * push, b[1] + uy * push];
      }
    }
  }
  return result;
}

export function clampAllToCourt(positions) {
  const result = {};
  for (const [id, pos] of Object.entries(positions)) result[id] = clampPointToCourt(pos);
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test static/js/tests/movement.test.js`
Expected: PASS, all tests.

- [ ] **Step 5: Apply clamping and separation in playback.js**

Replace `static/js/playback.js`'s imports and `computeAndEmit` function with:
```javascript
import { simulateFrame } from "./simulate.js";
import { capMovement, separateOverlaps, clampAllToCourt } from "./movement.js";
import { clampPointToCourt } from "./geometry.js";

const MAX_DEFENDER_SPEED = 15; // feet per second
const MIN_PLAYER_SEPARATION = 1.5;

// ... inside createPlaybackController, replace computeAndEmit with:
function computeAndEmit(dt) {
  const frame = simulateFrame(play, t);
  const nextPositions = {};
  for (const [id, target] of Object.entries(frame.defenseTargets)) {
    const prev = defenderPositions[id] || target;
    nextPositions[id] = capMovement(prev, clampPointToCourt(target), MAX_DEFENDER_SPEED, dt);
  }
  const separated = separateOverlaps({ ...frame.offense, ...nextPositions }, MIN_PLAYER_SEPARATION);
  const clamped = clampAllToCourt(separated);

  defenderPositions = {};
  for (const id of Object.keys(nextPositions)) defenderPositions[id] = clamped[id];
  const offense = {};
  for (const id of Object.keys(frame.offense)) offense[id] = clamped[id];

  onFrame({ offense, ball: frame.ball, defense: defenderPositions }, t);
}
```

- [ ] **Step 6: Manually verify in the browser**

Set up a play where a defender's target would fall outside the court bounds (e.g. a wide relocate action near the sideline) and confirm the defender dot never crosses the court edge. Place two players' actions to intentionally overlap and confirm the dots visibly separate rather than stacking exactly on top of each other.

- [ ] **Step 7: Commit**

```bash
git add static/js/movement.js static/js/tests/movement.test.js static/js/playback.js
git commit -m "feat: clamp players to court bounds and separate overlapping players"
```

---

### Task 20: Full manual playtest and polish

**Files:**
- Modify: `static/style.css` (visual polish only)
- No new source logic — this task is verification + small CSS/UX fixes found along the way.

**Interfaces:** None (uses everything built in Tasks 1-19).

- [ ] **Step 1: Run the full automated test suite**

Run:
```bash
uv run pytest -v
node --test static/js
```
Expected: all backend and frontend tests pass.

- [ ] **Step 2: Full manual playtest — offense + man defense**

Run: `uv run uvicorn backend.app:app --port 8000`, open `http://localhost:8000/`.
1. Place 5 offense and 5 defense players.
2. Give O1 a `dribble` action driving toward the basket, O2 a `screen` action on O1's defender, O3 a `cut` to the corner, O4/O5 `relocate` actions for spacing.
3. Set defense mode to Man-to-man, confirm default assignments (O1↔D1 ... O5↔D5), set help scheme to Tiered, tune lag/help/rim-bias sliders.
4. Play the animation, confirm defenders track with lag and helpers sag off 2-pass-away players.
5. Pause mid-play, scrub backward and forward, confirm defender positions match what continuous playback showed at the same timestamp (scrubbing should be deterministic, not path-dependent, since `scrubTo` recomputes fresh from `simulateFrame`).
6. Save the play under a name, reload the page, load it back, confirm everything (positions, actions, defense config) is restored exactly.

- [ ] **Step 3: Full manual playtest — zone defense**

1. Switch defense mode to Zone, try 2-3, 3-2, 1-3-1, and Box-and-1.
2. For Box-and-1, set the man-mark target to a specific offensive player and confirm that one defender tracks them directly (not shading from a home point) while the other four hold zone shape.
3. Play with the ball moving between offensive players (via Pass/Handoff actions) and confirm zone defenders shade toward the ball's current position.

- [ ] **Step 4: Fix any rough edges found**

If any visual/UX issues are found during Steps 2-3 (e.g. illegible text, controls overlapping the canvas), fix them in `static/style.css` and re-run the relevant manual check. Do not add new features at this stage — only polish what's already built per the design doc's milestone 6 scope.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: polish styling after full manual playtest"
```

(Skip this commit if Step 4 found nothing to change.)
