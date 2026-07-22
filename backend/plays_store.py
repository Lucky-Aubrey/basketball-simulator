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
