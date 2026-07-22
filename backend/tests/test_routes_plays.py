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
