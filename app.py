import os
import sqlite3
import secrets
import uuid
from datetime import date, timedelta

from flask import Flask, g, jsonify, render_template, request, send_from_directory

import gacha

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "app.db")
COOKIE_NAME = "tf_uid"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2  # 2년

app = Flask(__name__)


# ---------- DB ----------
def get_db():
    if "db" not in g:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            salt TEXT NOT NULL,
            pity INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pulls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT NOT NULL,
            pull_date TEXT NOT NULL,
            entry_id TEXT NOT NULL,
            term TEXT NOT NULL,
            game TEXT NOT NULL,
            tier TEXT NOT NULL,
            fortune_text TEXT NOT NULL,
            lucky_color TEXT NOT NULL,
            lucky_number INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (uid) REFERENCES users(uid)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_uid_date ON pulls(uid, pull_date);
        CREATE INDEX IF NOT EXISTS idx_uid_created ON pulls(uid, created_at);
        """
    )
    conn.commit()
    conn.close()


# ---------- 유저 식별 ----------
def ensure_user(uid: str):
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
    if row is None:
        salt = secrets.token_hex(16)
        db.execute(
            "INSERT INTO users (uid, salt, pity, created_at) VALUES (?, ?, 0, ?)",
            (uid, salt, date.today().isoformat()),
        )
        db.commit()
        row = db.execute("SELECT * FROM users WHERE uid = ?", (uid,)).fetchone()
    return row


def get_uid_from_request() -> tuple[str, bool]:
    """쿠키에서 uid를 읽고, 없으면 새로 발급. (uid, is_new) 반환."""
    uid = request.cookies.get(COOKIE_NAME)
    if uid:
        return uid, False
    return uuid.uuid4().hex, True


def set_uid_cookie(resp, uid: str):
    resp.set_cookie(
        COOKIE_NAME,
        uid,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="Lax",
    )
    return resp


def today_str() -> str:
    return date.today().isoformat()


def get_today_pull(uid: str):
    db = get_db()
    return db.execute(
        "SELECT * FROM pulls WHERE uid = ? AND pull_date = ?",
        (uid, today_str()),
    ).fetchone()


def get_history(uid: str, limit: int = 30):
    db = get_db()
    return db.execute(
        "SELECT pull_date, term, game, tier FROM pulls "
        "WHERE uid = ? ORDER BY pull_date DESC LIMIT ?",
        (uid, limit),
    ).fetchall()


# ---------- 라우트 ----------
@app.route("/")
def index():
    uid, is_new = get_uid_from_request()
    user = ensure_user(uid)

    today_pull = get_today_pull(uid)
    history = get_history(uid)

    pity = user["pity"]
    pity_text = (
        "다음 소환은 SSR 확정이에요"
        if pity >= gacha.PITY_LIMIT - 1
        else f"천장까지 {gacha.PITY_LIMIT - pity}번 남음"
    )

    theme_map = {e["id"]: e["theme"] for e in gacha.ENTRIES}

    today_result_json = None
    if today_pull is not None:
        theme = gacha.ENTRIES_BY_ID.get(today_pull["entry_id"], {}).get("theme", "school")
        today_result_json = {
            "entry_id": today_pull["entry_id"],
            "term": today_pull["term"],
            "game": today_pull["game"],
            "tier": today_pull["tier"],
            "theme": theme,
            "text": today_pull["fortune_text"],
            "color": today_pull["lucky_color"],
            "num": today_pull["lucky_number"],
        }

    resp = app.make_response(
        render_template(
            "index.html",
            entries=gacha.ENTRIES,
            today_pull=today_pull,
            today_result_json=today_result_json,
            history=history,
            pity_text=pity_text,
            already_pulled=today_pull is not None,
            theme_map=theme_map,
        )
    )
    if is_new:
        set_uid_cookie(resp, uid)
    return resp


@app.route("/api/pull", methods=["POST"])
def api_pull():
    uid, is_new = get_uid_from_request()
    user = ensure_user(uid)

    existing = get_today_pull(uid)
    if existing is not None:
        theme = gacha.ENTRIES_BY_ID.get(existing["entry_id"], {}).get("theme", "school")
        resp = jsonify(
            {
                "locked": True,
                "entry_id": existing["entry_id"],
                "term": existing["term"],
                "game": existing["game"],
                "tier": existing["tier"],
                "theme": theme,
                "text": existing["fortune_text"],
                "color": existing["lucky_color"],
                "num": existing["lucky_number"],
            }
        )
        if is_new:
            set_uid_cookie(resp, uid)
        return resp

    result = gacha.draw(today_str(), user["salt"], user["pity"])

    db = get_db()
    db.execute(
        """INSERT INTO pulls
           (uid, pull_date, entry_id, term, game, tier, fortune_text, lucky_color, lucky_number, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            uid,
            today_str(),
            result["entry_id"],
            result["term"],
            result["game"],
            result["tier"],
            result["text"],
            result["color"],
            result["num"],
            today_str(),
        ),
    )
    new_pity = 0 if result["tier"] == "SSR" else user["pity"] + 1
    db.execute("UPDATE users SET pity = ? WHERE uid = ?", (new_pity, uid))
    db.commit()

    pity_text = (
        "다음 소환은 SSR 확정이에요"
        if new_pity >= gacha.PITY_LIMIT - 1
        else f"천장까지 {gacha.PITY_LIMIT - new_pity}번 남음"
    )

    theme = gacha.ENTRIES_BY_ID.get(result["entry_id"], {}).get("theme", "school")
    resp = jsonify(
        {
            "locked": False,
            "pity_text": pity_text,
            "theme": theme,
            **result,
        }
    )
    if is_new:
        set_uid_cookie(resp, uid)
    return resp


init_db()


# ---------- 스마트 이미지 서빙 라우트 (.png, .jpg, .webp, .svg 자동 감지) ----------
@app.route("/static/images/<path:filename>")
def custom_static_images(filename):
    img_folder = os.path.join(app.root_path, "static", "images")
    base_name = os.path.splitext(filename)[0]

    # 1. 정확한 파일명이 존재하는 경우
    if os.path.isfile(os.path.join(img_folder, filename)):
        return send_from_directory(img_folder, filename)

    # 2. 확장자가 다르더라도 (.png, .jpg, .jpeg, .webp, .svg) 자동 매칭
    for ext in [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]:
        candidate = base_name + ext
        if os.path.isfile(os.path.join(img_folder, candidate)):
            return send_from_directory(img_folder, candidate)

    return send_from_directory(img_folder, filename)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(debug=True, host="0.0.0.0", port=port)
