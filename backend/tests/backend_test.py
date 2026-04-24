"""Backend tests for Presento API"""
import os
import io
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # read from frontend/.env
    fe = Path("/app/frontend/.env").read_text()
    for line in fe.splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def mongo():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="session")
def seeded_user(mongo):
    user_id = f"user_TEST_{uuid.uuid4().hex[:8]}"
    token = f"TEST_token_{uuid.uuid4().hex}"
    mongo.users.insert_one({
        "user_id": user_id,
        "email": f"TEST_{user_id}@example.com",
        "name": "Test User",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })
    yield {"user_id": user_id, "token": token}
    mongo.users.delete_one({"user_id": user_id})
    mongo.user_sessions.delete_one({"session_token": token})
    mongo.presentations.delete_many({"user_id": user_id})


def auth_h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Root & basic ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True
    assert d.get("service") == "presento"


def test_cors_api_prefix():
    # any non-/api route should not serve API
    r = requests.get(f"{BASE_URL}/")  # frontend
    # just ensure /api route responds
    r2 = requests.get(f"{API}/")
    assert r2.status_code == 200


# ---------- Auth ----------
def test_auth_me_no_cookie():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_auth_me_with_bearer(seeded_user):
    r = requests.get(f"{API}/auth/me", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    d = r.json()
    assert d["user_id"] == seeded_user["user_id"]
    assert "email" in d


def test_auth_me_invalid_token():
    r = requests.get(f"{API}/auth/me", headers=auth_h("garbage_token_xyz"))
    assert r.status_code == 401


def test_auth_session_missing_body():
    r = requests.post(f"{API}/auth/session", json={})
    assert r.status_code == 400


# ---------- Extraction ----------
def test_extract_txt_file():
    content = b"Hola mundo\nEste es un archivo de prueba."
    files = {"files": ("sample.txt", content, "text/plain")}
    r = requests.post(f"{API}/extract/files", files=files)
    assert r.status_code == 200
    d = r.json()
    assert "content" in d
    assert "Hola mundo" in d["content"]
    assert "sample.txt" in d["content"]


def test_extract_md_file():
    content = b"# Titulo\n\nContenido markdown de prueba."
    files = {"files": ("readme.md", content, "text/markdown")}
    r = requests.post(f"{API}/extract/files", files=files)
    assert r.status_code == 200
    assert "Contenido markdown" in r.json()["content"]


def test_extract_url_valid():
    r = requests.post(f"{API}/extract/url", json={"url": "https://example.com"})
    assert r.status_code == 200
    d = r.json()
    assert "content" in d
    assert "Example" in d["content"] or "example" in d["content"].lower()


def test_extract_url_invalid():
    r = requests.post(f"{API}/extract/url", json={"url": "http://this-domain-definitely-does-not-exist-xyz123.invalid"})
    assert r.status_code == 400


# ---------- LLM validate ----------
def test_llm_validate_anthropic_fake_key():
    r = requests.post(f"{API}/llm/validate", json={"provider": "anthropic", "api_key": "sk-ant-fake-invalid-123"})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is False
    assert "error" in d


def test_llm_validate_openai_fake_key():
    r = requests.post(f"{API}/llm/validate", json={"provider": "openai", "api_key": "sk-fake-invalid"})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is False


def test_llm_validate_unknown_provider():
    r = requests.post(f"{API}/llm/validate", json={"provider": "bogus", "api_key": "x"})
    # server raises 400 via HTTPException
    assert r.status_code == 400


# ---------- Presentations auth-gated ----------
def test_presentations_list_no_auth():
    r = requests.get(f"{API}/presentations")
    assert r.status_code == 401


def test_presentations_list_with_auth(seeded_user):
    r = requests.get(f"{API}/presentations", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.json() == []


def test_presentations_get_404(seeded_user):
    r = requests.get(f"{API}/presentations/pres_nonexistent", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 404


def test_presentations_generate_no_auth():
    r = requests.post(f"{API}/presentations/generate", json={
        "content": "test", "llm": {"provider": "anthropic", "model": "x", "api_key": "y"}
    })
    assert r.status_code == 401


def test_presentations_update_and_delete_crud(seeded_user, mongo):
    # Seed a presentation directly (since /generate requires real LLM key)
    pid = f"pres_TEST_{uuid.uuid4().hex[:8]}"
    mongo.presentations.insert_one({
        "presentation_id": pid,
        "user_id": seeded_user["user_id"],
        "title": "Orig",
        "description": "",
        "template": "swiss",
        "primary_color": "#002BFF",
        "accent_color": "#000000",
        "background_color": "#FFFFFF",
        "text_color": "#000000",
        "slides": [{"id": "s1", "layout": "title", "title": "Hello", "bullets": [], "body": "", "subtitle": ""}],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })

    # GET by id
    r = requests.get(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.json()["title"] == "Orig"

    # LIST
    r = requests.get(f"{API}/presentations", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    titles = [p["title"] for p in r.json()]
    assert "Orig" in titles

    # UPDATE
    r = requests.put(f"{API}/presentations/{pid}",
                     headers=auth_h(seeded_user["token"]),
                     json={"title": "Updated"})
    assert r.status_code == 200
    assert r.json()["title"] == "Updated"

    # Verify persist
    r = requests.get(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.json()["title"] == "Updated"

    # Export HTML
    r = requests.get(f"{API}/presentations/{pid}/export/html", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert "<!DOCTYPE html>" in r.text

    # Export PPTX
    r = requests.get(f"{API}/presentations/{pid}/export/pptx", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.content[:2] == b"PK"  # zip header (pptx)

    # DELETE
    r = requests.delete(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    assert r.json()["deleted"] == 1

    # verify gone
    r = requests.get(f"{API}/presentations/{pid}", headers=auth_h(seeded_user["token"]))
    assert r.status_code == 404


# ---------- Images ----------
def test_images_generate_unsplash_requires_auth():
    r = requests.post(f"{API}/images/generate", json={"prompt": "mountain", "source": "unsplash"})
    assert r.status_code == 401


def test_images_generate_unsplash(seeded_user):
    r = requests.post(f"{API}/images/generate",
                      json={"prompt": "mountain landscape", "source": "unsplash"},
                      headers=auth_h(seeded_user["token"]))
    assert r.status_code == 200
    d = r.json()
    assert "url" in d
    assert "unsplash" in d["url"]


def test_images_generate_invalid_source(seeded_user):
    r = requests.post(f"{API}/images/generate",
                      json={"prompt": "x", "source": "invalid"},
                      headers=auth_h(seeded_user["token"]))
    assert r.status_code == 400
