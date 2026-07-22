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
