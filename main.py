#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
APATHY v40 — Надёжный лёгкий Telegram-бот (ТОЛЬКО АУДИО) + API для https://awuro.sergeyhownan.workers.dev/
===========================================================================================================
Исправлено в v40 (обход блокировок YouTube на Docker/VPS-серверах):
  1. Мульти-поиск строго по аудиоисточникам одновременно:
       • SoundCloud API v2 (полные треки, прогрессивный MP3 без блокировок дата-центров — идеально для ру-рэпа/андерграунда)
       • Прямые РФ MP3-порталы (Hitmo, Hitmotop, Muzofond, Mp3Party, LightAudio — мгновенный MP3, 0% CPU)
       • YouTube InnerTube (лёгкий JSON-поиск без тяжёлого yt-dlp)
  2. Умный каскад скачивания/стриминга ТОЛЬКО АУДИО (vcodec=none, без видео и без ffmpeg):
       • Прямой MP3 с портала -> SoundCloud Progressive MP3 -> YouTube InnerTube -> Piped/Invidious -> yt-dlp (+ cookies.txt)
       • АВТОСПАСЕНИЕ: если YouTube заблокировал IP хостинга (bot-check), бот сам подхватывает
         этот же трек с SoundCloud или РФ MP3-порталов и отправляет чистое аудио!
  3. Команда /test в Telegram — за 3 секунды проверяет доступность всех источников прямо с вашего хостинга.
  4. Поддержка загрузки cookies.txt прямо в чат бота (только админ) для прямого YouTube без ограничений.
"""

import asyncio
import base64
import gzip
from datetime import datetime, timezone
import hashlib
import hmac
import secrets
import json
import logging
import os
import re
import shutil
import sqlite3
import tempfile
import time
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qsl, quote, urljoin

import aiohttp
from aiohttp import web
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from dotenv import load_dotenv
import yt_dlp

# -------------------- КОНФИГУРАЦИЯ --------------------
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_SITE_URL = "https://awuro.sergeyhownan.workers.dev"
DEFAULT_BOT_API_URL = "https://bot-1795701331-3932-awuro.bothost.tech"

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
SITE_URL = (os.getenv("WEBAPP_URL", DEFAULT_SITE_URL) or DEFAULT_SITE_URL).strip().rstrip("/")
BOT_API_URL_ENV = (os.getenv("BOT_API_URL", DEFAULT_BOT_API_URL) or DEFAULT_BOT_API_URL).strip().rstrip("/")
STORAGE_CHAT_ID_ENV = os.getenv("STORAGE_CHAT_ID", "").strip()
ADMIN_ID_ENV = os.getenv("ADMIN_ID", "").strip()
AUTO_CACHE_TO_TG = os.getenv("AUTO_CACHE_TO_TG", "0").strip().lower() in ("1", "true", "yes")
HOST = os.getenv("HOST", "0.0.0.0").strip()
PORT = int(os.getenv("PORT", "8080"))
DB_PATH = BASE_DIR / os.getenv("DB_FILE", "apathy_music.db")
COOKIES_PATH = BASE_DIR / os.getenv("COOKIES_FILE", "cookies.txt")
WEB_DIR = BASE_DIR / "web"

ADMIN_ID: Optional[int] = int(ADMIN_ID_ENV) if ADMIN_ID_ENV.lstrip("-").isdigit() else None
def _detect_ffmpeg() -> Tuple[Optional[str], str]:
    sys_ff = shutil.which("ffmpeg")
    if sys_ff:
        return sys_ff, "system"
    try:
        import imageio_ffmpeg  # type: ignore
        bundled = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled and os.path.exists(bundled):
            return bundled, "imageio-ffmpeg"
    except Exception:
        pass
    return None, "none"


FFMPEG_BIN, FFMPEG_SOURCE = _detect_ffmpeg()
HAS_FFMPEG: bool = bool(FFMPEG_BIN)
MP3_CACHE_DIR = Path(tempfile.gettempdir()) / "apathy_mp3_cache"
MP3_CACHE_DIR.mkdir(parents=True, exist_ok=True)
MP3_CACHE_MAX_FILES = 18
MP3_CONVERT_LOCKS: Dict[str, asyncio.Lock] = {}

# Ограничители нагрузки для лёгких контейнеров
YTDLP_SEMAPHORE = asyncio.Semaphore(2)
DOWNLOAD_SEMAPHORE = asyncio.Semaphore(2)

# Лимиты для строгого аудио-режима (до 19.5 МБ — укладывается в лимит getFile 20 МБ Telegram Bot API)
MIN_DURATION_SEC = 20
MAX_DURATION_SEC = 660
MAX_AUDIO_BYTES = 19_500_000

DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"

PIPED_NODES = [
    "https://api.piped.private.coffee",
    "https://pipedapi.r4fo.com",
    "https://pipedapi.adminforge.de",
    "https://pipedapi.darkness.services",
    "https://pipedapi.leptons.xyz",
    "https://piped-api.lunar.icu",
]
INVIDIOUS_NODES = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://inv.thepixora.com",
    "https://invidious.f5.si",
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("apathy_bot")


# -------------------- КОМПАКТНЫЙ LRU-КЭШ --------------------
class BoundedTTLCache:
    def __init__(self, maxsize: int = 150, default_ttl: int = 600):
        self.maxsize = maxsize
        self.default_ttl = default_ttl
        self._data: OrderedDict[str, Tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any:
        item = self._data.get(key)
        if not item:
            return None
        expires_at, val = item
        if expires_at < time.time():
            self._data.pop(key, None)
            return None
        self._data.move_to_end(key)
        return val

    def set(self, key: str, val: Any, ttl: Optional[int] = None) -> None:
        exp = time.time() + (ttl if ttl is not None else self.default_ttl)
        self._data[key] = (exp, val)
        self._data.move_to_end(key)
        while len(self._data) > self.maxsize:
            self._data.popitem(last=False)


SEARCH_CACHE = BoundedTTLCache(maxsize=120, default_ttl=600)
TEMP_TRACKS = BoundedTTLCache(maxsize=400, default_ttl=3600)
DIRECT_STREAM_CACHE = BoundedTTLCache(maxsize=180, default_ttl=1500)
TG_FILE_PATH_CACHE = BoundedTTLCache(maxsize=220, default_ttl=1800)
BOT_PICK_CACHE = BoundedTTLCache(maxsize=350, default_ttl=1800)
PENDING_AUTH_CODES = BoundedTTLCache(maxsize=200, default_ttl=300)
ADMIN_STATUS_CACHE = BoundedTTLCache(maxsize=200, default_ttl=600)
SESSION_TTL_SEC = 365 * 86400  # 1 год
BG_CACHE_INFLIGHT: set = set()
BACKUP_LOCK = asyncio.Lock()
DB_DIRTY: bool = False
DB_FIRST_DIRTY_AT: float = 0.0
DB_LAST_DIRTY_AT: float = 0.0
DB_LAST_BACKUP_AT: float = 0.0
LAST_BACKUP_MSG_ID: int = 0
BACKUP_DEBOUNCE_SEC = 45
BACKUP_MAX_WAIT_SEC = 300


# -------------------- БАЗА ДАННЫХ (SQLite) --------------------
def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tracks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            duration INTEGER DEFAULT 180,
            artwork TEXT DEFAULT '',
            source TEXT DEFAULT 'telegram',
            source_id TEXT DEFAULT '',
            source_url TEXT DEFAULT '',
            tg_file_id TEXT DEFAULT '',
            tg_thumb_id TEXT DEFAULT '',
            mime_type TEXT DEFAULT 'audio/mpeg',
            added_by INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tracks_created ON tracks(created_at DESC);")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            tg_id INTEGER PRIMARY KEY,
            username TEXT DEFAULT '',
            first_name TEXT DEFAULT '',
            last_name TEXT DEFAULT '',
            photo_url TEXT DEFAULT '',
            session_token TEXT UNIQUE NOT NULL,
            theme TEXT DEFAULT 'chrome',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_users_token ON users(session_token);")
    existing_user_cols = {r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "tg_avatar_file_id" not in existing_user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN tg_avatar_file_id TEXT DEFAULT ''")
    if "custom_avatar" not in existing_user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN custom_avatar BLOB DEFAULT NULL")
    if "custom_avatar_mime" not in existing_user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN custom_avatar_mime TEXT DEFAULT ''")
    if "avatar_version" not in existing_user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN avatar_version INTEGER DEFAULT 0")
    if "revoked_before" not in existing_user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN revoked_before INTEGER DEFAULT 0")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_state (
            tg_id INTEGER PRIMARY KEY,
            playlists_json TEXT DEFAULT '[]',
            liked_ids_json TEXT DEFAULT '[]',
            saved_tracks_json TEXT DEFAULT '[]',
            updated_at INTEGER NOT NULL
        );
        """
    )
    if STORAGE_CHAT_ID_ENV:
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('storage_chat_id', ?)", (STORAGE_CHAT_ID_ENV,))
    if BOT_API_URL_ENV:
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('bot_api_url', ?)", (BOT_API_URL_ENV,))
    conn.commit()
    return conn


DB = init_db()


def mark_db_dirty() -> None:
    global DB_DIRTY, DB_FIRST_DIRTY_AT, DB_LAST_DIRTY_AT
    now = time.time()
    DB_DIRTY = True
    DB_LAST_DIRTY_AT = now
    if DB_FIRST_DIRTY_AT == 0.0:
        DB_FIRST_DIRTY_AT = now


def get_setting(key: str, default: str = "") -> str:
    row = DB.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return (row["value"] if row else default).strip()


def set_setting(key: str, value: str, mark_dirty: bool = True) -> None:
    DB.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (key, value.strip()))
    DB.commit()
    if mark_dirty:
        mark_db_dirty()


def get_db_stats() -> Dict[str, int]:
    try:
        users_c = int(DB.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"])
        tracks_c = int(DB.execute("SELECT COUNT(*) AS c FROM tracks WHERE tg_file_id != ''").fetchone()["c"])
        all_tracks_c = int(DB.execute("SELECT COUNT(*) AS c FROM tracks").fetchone()["c"])
        states_c = int(DB.execute("SELECT COUNT(*) AS c FROM user_state").fetchone()["c"])
        pl_total = 0
        for r in DB.execute("SELECT playlists_json FROM user_state").fetchall():
            try:
                pls = json.loads(r["playlists_json"] or "[]")
                if isinstance(pls, list):
                    pl_total += len(pls)
            except Exception:
                pass
        return {
            "users": users_c,
            "tracks": tracks_c,
            "all_tracks": all_tracks_c,
            "states": states_c,
            "playlists": pl_total,
        }
    except Exception:
        return {"users": 0, "tracks": 0, "all_tracks": 0, "states": 0, "playlists": 0}


def _create_db_snapshot_gz_sync(src_db_path: str, out_gz_path: str) -> Tuple[bool, str]:
    """Безопасный снимок живой SQLite-базы (WAL-совместимый) + проверка целостности + gzip."""
    tmp_snap = out_gz_path + ".sqlite"
    try:
        src = sqlite3.connect(src_db_path, timeout=15)
        dst = sqlite3.connect(tmp_snap)
        try:
            src.backup(dst)
        finally:
            dst.close()
            src.close()

        chk_conn = sqlite3.connect(tmp_snap)
        try:
            chk = chk_conn.execute("PRAGMA integrity_check").fetchone()
            if not chk or str(chk[0]).lower() != "ok":
                return False, "integrity_check_failed"
        finally:
            chk_conn.close()

        with open(tmp_snap, "rb") as f_in, gzip.open(out_gz_path, "wb", compresslevel=6) as f_out:
            shutil.copyfileobj(f_in, f_out, length=65536)

        if not os.path.exists(out_gz_path) or os.path.getsize(out_gz_path) < 64:
            return False, "empty_gzip"
        return True, ""
    except Exception as e:
        return False, str(e)[:120]
    finally:
        try:
            if os.path.exists(tmp_snap):
                os.remove(tmp_snap)
        except OSError:
            pass


def _unpack_and_validate_backup_sync(raw_path: str, out_db_path: str) -> Tuple[bool, str]:
    """Распаковывает (если gzip) и проверяет целостность файла бэкапа SQLite перед заменой живой БД."""
    try:
        with open(raw_path, "rb") as f:
            magic = f.read(16)
        if magic.startswith(b"\x1f\x8b"):
            with gzip.open(raw_path, "rb") as f_in, open(out_db_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out, length=65536)
        elif magic.startswith(b"SQLite format 3"):
            shutil.copyfile(raw_path, out_db_path)
        else:
            return False, "not_sqlite_or_gzip"

        conn = sqlite3.connect(out_db_path)
        try:
            chk = conn.execute("PRAGMA integrity_check").fetchone()
            if not chk or str(chk[0]).lower() != "ok":
                return False, "corrupt_sqlite"
            tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
            if not ({"tracks", "users", "user_state"} & tables):
                return False, "missing_apathy_tables"
        finally:
            conn.close()
        return True, ""
    except Exception as e:
        return False, str(e)[:120]


async def backup_db_to_telegram(bot: Bot, reason: str = "auto") -> Tuple[bool, str, Dict[str, Any]]:
    """Делает сжатый снимок apathy_music.db, отправляет и закрепляет в приватном канале STORAGE_CHAT_ID."""
    global DB_DIRTY, DB_FIRST_DIRTY_AT, DB_LAST_BACKUP_AT, LAST_BACKUP_MSG_ID

    st_id = get_storage_chat_id()
    if not st_id:
        return False, "STORAGE_CHAT_ID не задан", {}

    stats = get_db_stats()
    if reason == "auto" and stats["users"] == 0 and stats["all_tracks"] == 0 and stats["states"] == 0:
        DB_DIRTY = False
        DB_FIRST_DIRTY_AT = 0.0
        return False, "empty_db", stats

    async with BACKUP_LOCK:
        try:
            DB.execute("PRAGMA wal_checkpoint(PASSIVE)")
        except Exception:
            pass

        with tempfile.TemporaryDirectory(prefix="apathy_bak_") as tmpdir:
            gz_path = os.path.join(tmpdir, "apathy_backup.db.gz")
            ok, err = await asyncio.to_thread(_create_db_snapshot_gz_sync, str(DB_PATH), gz_path)
            if not ok:
                log.warning("DB backup snapshot failed: %s", err)
                return False, err, stats

            size_bytes = os.path.getsize(gz_path)
            if size_bytes > MAX_AUDIO_BYTES:
                log.warning("DB backup too large for Telegram Bot API getFile (%d bytes)", size_bytes)
                return False, f"backup_too_large ({size_bytes // 1024} KB)", stats

            ts_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            reason_lbl = {"manual": "Ручной бэкап", "shutdown": "Бэкап при остановке", "auto": "Автобэкап"}.get(reason, "Бэкап")
            caption = (
                "#apathy_db_backup\n"
                f"💾 <b>{reason_lbl} базы APATHY</b> (v40)\n"
                f"👤 Пользователей: <b>{stats['users']}</b> · 🎵 Треков: <b>{stats['all_tracks']}</b> · 📋 Плейлистов: <b>{stats['playlists']}</b>\n"
                f"📦 Размер: <b>{size_bytes / 1024:.1f} КБ</b> · 🕒 {ts_str}"
            )

            try:
                doc_file = FSInputFile(gz_path, filename="apathy_backup.db.gz")
                sent = await bot.send_document(
                    chat_id=st_id,
                    document=doc_file,
                    caption=caption,
                    parse_mode="HTML",
                    disable_notification=True,
                )
            except Exception as e:
                log.warning("Failed to upload DB backup to %s: %s", st_id, e)
                return False, f"send_error: {str(e)[:90]}", stats

            try:
                await bot.pin_chat_message(chat_id=st_id, message_id=sent.message_id, disable_notification=True)
            except Exception as e:
                log.warning("Failed to pin DB backup message in %s: %s", st_id, e)

            # Удаляем предыдущее сообщение с бэкапом (только ПОСЛЕ того как новый успешно закреплён)
            prev_id_str = get_setting("last_backup_msg_id", "")
            prev_id = int(prev_id_str) if prev_id_str.isdigit() else LAST_BACKUP_MSG_ID
            if prev_id and prev_id != sent.message_id:
                try:
                    await bot.delete_message(chat_id=st_id, message_id=prev_id)
                except Exception:
                    pass

            LAST_BACKUP_MSG_ID = sent.message_id
            set_setting("last_backup_msg_id", str(sent.message_id), mark_dirty=False)

            DB_DIRTY = False
            DB_FIRST_DIRTY_AT = 0.0
            DB_LAST_BACKUP_AT = time.time()
            log.info(
                "DB backup uploaded & pinned (reason=%s, msg_id=%d, size=%.1fKB, users=%d, tracks=%d)",
                reason, sent.message_id, size_bytes / 1024.0, stats["users"], stats["all_tracks"],
            )
            return True, "", {**stats, "size_kb": round(size_bytes / 1024.0, 1), "msg_id": sent.message_id}


async def restore_db_from_telegram(bot: Bot, force: bool = False) -> Tuple[bool, str, Dict[str, int]]:
    """Восстанавливает apathy_music.db из закреплённого сообщения в канале STORAGE_CHAT_ID."""
    global DB, DB_DIRTY, DB_FIRST_DIRTY_AT, LAST_BACKUP_MSG_ID

    st_id = get_storage_chat_id()
    if not st_id:
        return False, "STORAGE_CHAT_ID не задан", {}

    cur_stats = get_db_stats()
    if not force and (cur_stats["users"] > 0 or cur_stats["all_tracks"] > 0 or cur_stats["states"] > 0):
        log.info(
            "Local DB already populated (users=%d, tracks=%d, states=%d) — auto-restore skipped",
            cur_stats["users"], cur_stats["all_tracks"], cur_stats["states"],
        )
        return False, "already_populated", cur_stats

    try:
        chat = await bot.get_chat(st_id)
    except Exception as e:
        log.warning("Cannot access STORAGE_CHAT_ID %s for restore: %s", st_id, e)
        return False, f"chat_access_error: {str(e)[:90]}", cur_stats

    pinned = getattr(chat, "pinned_message", None)
    if not pinned or not getattr(pinned, "document", None):
        log.info("No pinned backup document found in storage chat %s", st_id)
        return False, "no_pinned_backup", cur_stats

    doc = pinned.document
    fname = (doc.file_name or "").lower()
    cap = (pinned.caption or "").lower()
    if "apathy_backup" not in fname and "#apathy_db_backup" not in cap and not fname.endswith((".db", ".db.gz")):
        return False, "pinned_not_backup", cur_stats

    async with BACKUP_LOCK:
        with tempfile.TemporaryDirectory(prefix="apathy_rst_") as tmpdir:
            raw_path = os.path.join(tmpdir, doc.file_name or "apathy_backup.db.gz")
            out_db = os.path.join(tmpdir, "restored.db")
            try:
                await bot.download(doc, destination=raw_path)
            except Exception as e:
                log.warning("Failed to download pinned backup: %s", e)
                return False, f"download_error: {str(e)[:90]}", cur_stats

            ok, err = await asyncio.to_thread(_unpack_and_validate_backup_sync, raw_path, out_db)
            if not ok:
                log.warning("Pinned backup validation failed: %s", err)
                return False, err, cur_stats

            try:
                DB.close()
            except Exception:
                pass

            for suffix in ("", "-wal", "-shm"):
                p = Path(str(DB_PATH) + suffix)
                try:
                    if p.exists():
                        p.unlink()
                except OSError:
                    pass

            shutil.copyfile(out_db, str(DB_PATH))
            DB = init_db()
            LAST_BACKUP_MSG_ID = pinned.message_id
            set_setting("last_backup_msg_id", str(pinned.message_id), mark_dirty=False)
            DB_DIRTY = False
            DB_FIRST_DIRTY_AT = 0.0

            new_stats = get_db_stats()
            log.info(
                "DB restored from Telegram pinned backup (msg_id=%d, users=%d, tracks=%d, playlists=%d)",
                pinned.message_id, new_stats["users"], new_stats["all_tracks"], new_stats["playlists"],
            )
            return True, "", new_stats


async def auto_backup_loop(bot: Bot) -> None:
    """Фоновый цикл автобэкапа: сохраняет базу в канал через 45 сек после последних изменений."""
    while True:
        try:
            await asyncio.sleep(20)
            if not DB_DIRTY or not get_storage_chat_id():
                continue
            now = time.time()
            idle_enough = (now - DB_LAST_DIRTY_AT) >= BACKUP_DEBOUNCE_SEC
            waited_max = DB_FIRST_DIRTY_AT > 0 and (now - DB_FIRST_DIRTY_AT) >= BACKUP_MAX_WAIT_SEC
            if idle_enough or waited_max:
                await backup_db_to_telegram(bot, reason="auto")
        except asyncio.CancelledError:
            break
        except Exception as e:
            log.warning("auto_backup_loop error: %s", e)


def get_storage_chat_id() -> Optional[int]:
    val = get_setting("storage_chat_id", STORAGE_CHAT_ID_ENV)
    return int(val) if (val and val.lstrip("-").isdigit()) else None


def get_bot_api_url() -> str:
    return get_setting("bot_api_url", BOT_API_URL_ENV).rstrip("/")


def get_webapp_link() -> str:
    api_base = get_bot_api_url()
    if api_base and api_base != SITE_URL and api_base != DEFAULT_BOT_API_URL:
        return f"{SITE_URL}/?api={quote(api_base, safe=':/')}"
    return f"{SITE_URL}/"


def get_app_version_payload() -> Dict[str, Any]:
    latest_code = int(get_setting("app_latest_code", "1") or 1)
    min_code = int(get_setting("app_min_code", "1") or 1)
    latest_name = get_setting("app_latest_name", "1.0.0") or "1.0.0"
    changelog = get_setting("app_changelog", "Актуальная версия плеера APATHY.")
    apk_url = get_setting("app_apk_url", "")
    apk_fid = get_setting("app_apk_file_id", "")
    if not apk_url and apk_fid:
        apk_url = f"{get_bot_api_url()}/api/app/download"
    return {
        "ok": True,
        "latestVersionCode": latest_code,
        "latestVersionName": latest_name,
        "minVersionCode": min_code,
        "force": min_code >= latest_code and latest_code > 1,
        "apkUrl": apk_url,
        "hasTelegramApk": bool(apk_fid),
        "changelog": changelog,
    }


# -------------------- ТЕКСТОВЫЕ УТИЛИТЫ --------------------
def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip()


def decode_html(s: str) -> str:
    s = str(s or "")
    s = (
        s.replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#039;", "'")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&nbsp;", " ")
    )
    s = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), s)
    return clean_text(s)


def strip_tags(s: str) -> str:
    return decode_html(re.sub(r"<[^>]+>", " ", str(s or "")))


def fold_ru(s: str) -> str:
    s = str(s or "").lower().replace("ё", "е")
    s = re.sub(r"\(.*?\)|\[.*?\]", " ", s)
    s = re.sub(r"\b(feat\.?|ft\.?|prod\.?|official|audio|video|explicit|mp3|lyrics?)\b", " ", s, flags=re.I)
    return re.sub(r"[^a-zа-я0-9]+", " ", s).strip()


def parse_dur_str(s: str) -> int:
    parts = [int(p) for p in re.findall(r"\d+", str(s or ""))]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0


def make_track_id(prefix: str, key: str) -> str:
    return f"{prefix}_{hashlib.sha1(key.encode('utf-8', errors='ignore')).hexdigest()[:12]}"


def _parse_artist_title(raw_title: str, uploader: str) -> Tuple[str, str]:
    t = clean_text(raw_title)
    u = re.sub(r"\s*-\s*Topic$", "", clean_text(uploader), flags=re.I)
    t = re.sub(
        r"\s*[\(\[]\s*(official\s*(music\s*)?video|official\s*audio|lyric\s*video|lyrics|hd|4k|клип|премьера)\s*[\)\]]",
        "",
        t,
        flags=re.I,
    ).strip()
    m = re.match(r"^(.{2,48}?)\s+[–—-]\s+(.{2,120})$", t)
    if m:
        return clean_text(m.group(1)), clean_text(m.group(2))
    return (u or "Аудио"), (t or raw_title)


def score_match(cand_artist: str, cand_title: str, target_artist: str, target_title: str) -> int:
    want_a = fold_ru(target_artist)
    want_t = fold_ru(target_title)
    got_all = fold_ru(f"{cand_artist} {cand_title}")
    got_t = fold_ru(cand_title)
    score = 0
    for tok in [w for w in want_t.split() if len(w) >= 2]:
        if tok in got_t or tok in got_all:
            score += 5
    for tok in [w for w in want_a.split() if len(w) >= 2]:
        if tok in got_all:
            score += 3
    if want_t and want_t in got_all:
        score += 10
    if want_a and want_a in got_all:
        score += 6
    if got_t == want_t:
        score += 8
    low_got = f"{cand_artist} {cand_title}".lower()
    low_want = f"{target_artist} {target_title}".lower()
    for bad in ("slowed", "reverb", "speed up", "nightcore", "remix", "karaoke", "cover", "8d", "минус"):
        if bad in low_got and bad not in low_want:
            score -= 6
    return score


def smart_referer(url: str) -> str:
    low = url.lower()
    if "mp3party.net" in low:
        return "https://mp3party.net/"
    if "hitmo.me" in low:
        return "https://hitmo.me/"
    if "hitmotop.com" in low:
        return "https://rus.hitmotop.com/"
    if "hitmo.net" in low:
        return "https://mp3.hitmo.net/"
    if "muzofond" in low:
        return "https://muzofond.fm/"
    if "lightaudio.ru" in low:
        return "https://lightaudio.ru/"
    if "sndcdn.com" in low or "soundcloud.com" in low:
        return "https://soundcloud.com/"
    return "https://www.google.com/"


def save_telegram_track(
    track_id: str,
    title: str,
    artist: str,
    duration: int = 180,
    artwork: str = "",
    source: str = "telegram",
    source_id: str = "",
    source_url: str = "",
    tg_file_id: str = "",
    tg_thumb_id: str = "",
    mime_type: str = "audio/mpeg",
    added_by: int = 0,
) -> Dict[str, Any]:
    now = int(time.time())
    existing = DB.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    if existing:
        DB.execute(
            """
            UPDATE tracks SET
                title = COALESCE(NULLIF(?, ''), title),
                artist = COALESCE(NULLIF(?, ''), artist),
                duration = CASE WHEN ? > 10 THEN ? ELSE duration END,
                artwork = COALESCE(NULLIF(?, ''), artwork),
                tg_file_id = COALESCE(NULLIF(?, ''), tg_file_id),
                tg_thumb_id = COALESCE(NULLIF(?, ''), tg_thumb_id),
                source_url = COALESCE(NULLIF(?, ''), source_url),
                mime_type = COALESCE(NULLIF(?, ''), mime_type)
            WHERE id = ?
            """,
            (title, artist, duration, duration, artwork, tg_file_id, tg_thumb_id, source_url, mime_type, track_id),
        )
    else:
        DB.execute(
            """
            INSERT INTO tracks(
                id, title, artist, duration, artwork, source, source_id, source_url,
                tg_file_id, tg_thumb_id, mime_type, added_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                track_id,
                clean_text(title) or "Без названия",
                clean_text(artist) or "Неизвестный",
                max(int(duration or 0), 0) or 180,
                artwork or "",
                source,
                source_id or "",
                source_url or "",
                tg_file_id or "",
                tg_thumb_id or "",
                mime_type or "audio/mpeg",
                int(added_by or 0),
                now,
            ),
        )
    DB.commit()
    mark_db_dirty()
    row = DB.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    return track_dict_to_api(dict(row))


def track_dict_to_api(d: Dict[str, Any]) -> Dict[str, Any]:
    artwork = d.get("artwork") or ""
    if not artwork and d.get("tg_thumb_id"):
        artwork = f"/api/tg/thumb/{quote(d['tg_thumb_id'], safe='')}"
    in_tg = bool(d.get("tg_file_id"))
    src = d.get("source") or "audio"
    label_map = {
        "telegram": "Telegram",
        "soundcloud": "SoundCloud",
        "hitmo": "Hitmo",
        "mp3party": "Mp3Party",
        "muzofond": "Muzofond",
        "lightaudio": "LightAudio",
        "youtube": "YouTube",
    }
    return {
        "id": d["id"],
        "title": d["title"],
        "artist": d["artist"],
        "duration": int(d.get("duration") or 180),
        "artwork": artwork,
        "source": "telegram" if in_tg else src,
        "sourceLabel": "Telegram" if in_tg else label_map.get(src, "Аудио"),
        "inTelegram": in_tg,
        "streamUrl": f"/api/tg/stream/{quote(d['id'], safe='')}",
    }


def search_db_tracks(query: str = "", limit: int = 50) -> List[Dict[str, Any]]:
    q = fold_ru(query)
    rows = DB.execute("SELECT * FROM tracks WHERE tg_file_id != '' ORDER BY created_at DESC LIMIT 400").fetchall()
    if not q:
        return [track_dict_to_api(dict(r)) for r in rows[:limit]]

    tokens = [w for w in q.split() if len(w) >= 2]
    scored = []
    for r in rows:
        hay = fold_ru(f"{r['artist']} {r['title']}")
        score = 0
        if q in hay:
            score += 20
        matched = sum(1 for tok in tokens if tok in hay)
        score += 15 if (tokens and matched == len(tokens)) else matched * 4
        if score > 0:
            scored.append((score, r))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [track_dict_to_api(dict(r)) for _, r in scored[:limit]]


def lookup_track_record(track_id: str) -> Optional[Dict[str, Any]]:
    row = DB.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    if row:
        return dict(row)
    cached = TEMP_TRACKS.get(track_id)
    if cached:
        return dict(cached)
    return None




# ==================== АККАУНТЫ TELEGRAM И ОБЛАЧНЫЕ ПЛЕЙЛИСТЫ (v40) ====================
def _user_row_to_public(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    tg_id = int(d["tg_id"])
    has_custom = bool(d.get("custom_avatar"))
    has_tg_file = bool(d.get("tg_avatar_file_id"))
    ver = int(d.get("avatar_version") or d.get("updated_at") or 1)
    if has_custom or has_tg_file:
        photo_url = f"/api/user/avatar/{tg_id}?v={ver}"
    else:
        photo_url = d.get("photo_url") or ""
    return {
        "tgId": tg_id,
        "username": d.get("username") or "",
        "firstName": d.get("first_name") or "",
        "lastName": d.get("last_name") or "",
        "photoUrl": photo_url,
        "hasCustomAvatar": has_custom,
        "theme": d.get("theme") or "chrome",
    }


async def sync_tg_profile_photo(bot: Bot, tg_id: int, force: bool = False) -> str:
    """Подгружает file_id актуальной аватарки Telegram-аккаунта пользователя через Bot API."""
    row = DB.execute("SELECT tg_avatar_file_id FROM users WHERE tg_id = ?", (int(tg_id),)).fetchone()
    if not force and row and row["tg_avatar_file_id"]:
        return str(row["tg_avatar_file_id"])
    try:
        photos = await bot.get_user_profile_photos(user_id=int(tg_id), limit=1)
        if photos and photos.photos and photos.photos[0]:
            sizes = photos.photos[0]
            # Берём оптимальный средний/крупный размер (до ~640px)
            chosen = sizes[-1] if len(sizes) <= 2 else sizes[min(1, len(sizes) - 1)]
            fid = chosen.file_id
            now = int(time.time())
            DB.execute(
                "UPDATE users SET tg_avatar_file_id = ?, avatar_version = CASE WHEN avatar_version = 0 THEN ? ELSE avatar_version END, updated_at = ? WHERE tg_id = ?",
                (fid, now, now, int(tg_id)),
            )
            DB.commit()
            mark_db_dirty()
            return fid
    except Exception as e:
        log.warning("get_user_profile_photos failed for %s: %s", tg_id, e)
    return ""


def add_track_to_user_playlist(tg_id: int, track_api: Dict[str, Any], tg_user: Any = None) -> str:
    """Автоматически добавляет трек в личную учётную запись пользователя и его основной плейлист на сайте."""
    if not tg_id or not track_api or not track_api.get("id"):
        return ""
    if tg_user is not None:
        upsert_telegram_user(
            tg_id=int(tg_id),
            username=getattr(tg_user, "username", "") or "",
            first_name=getattr(tg_user, "first_name", "") or "",
            last_name=getattr(tg_user, "last_name", "") or "",
        )
    else:
        exists = DB.execute("SELECT tg_id FROM users WHERE tg_id = ?", (int(tg_id),)).fetchone()
        if not exists:
            upsert_telegram_user(tg_id=int(tg_id))

    cloud = load_user_cloud_state(int(tg_id))
    playlists = cloud.get("playlists") or []
    liked_ids = cloud.get("likedIds") or []
    saved_tracks = cloud.get("savedTracks") or []

    if not playlists:
        playlists = [
            {"id": "pl_main", "name": "Мой плейлист", "trackIds": []},
            {"id": "pl_night", "name": "Ночной вайб", "trackIds": []},
        ]

    target_pl = next((p for p in playlists if p and p.get("id") == "pl_main"), playlists[0])
    if not isinstance(target_pl.get("trackIds"), list):
        target_pl["trackIds"] = []

    raw_id = str(track_api["id"])
    web_id = raw_id if raw_id.startswith("tg_") else f"tg_{raw_id}"

    web_track = {
        "id": web_id,
        "tgTrackId": raw_id,
        "tgStreamUrl": track_api.get("streamUrl") or f"/api/tg/stream/{quote(raw_id, safe='')}",
        "title": track_api.get("title") or "Без названия",
        "artist": track_api.get("artist") or "Исполнитель",
        "album": "Telegram Бот",
        "duration": int(track_api.get("duration") or 180),
        "artwork": track_api.get("artwork") or "",
        "coverGrad": "linear-gradient(145deg, #163b5c 0%, #070c14 60%, #2468a3 100%)",
        "source": "Telegram",
        "inTelegram": True,
        "fromTelegramBot": True,
        "fromCatalog": True,
    }

    if not any(isinstance(t, dict) and str(t.get("id")) == web_id for t in saved_tracks):
        saved_tracks.insert(0, web_track)
    if web_id not in target_pl["trackIds"]:
        target_pl["trackIds"].insert(0, web_id)

    save_user_cloud_state(int(tg_id), playlists, liked_ids, saved_tracks)
    return str(target_pl.get("name") or "Мой плейлист")


def _session_hmac_key() -> bytes:
    return hmac.new(b"apathy_session_v2", (BOT_TOKEN or "apathy_fallback").encode("utf-8"), hashlib.sha256).digest()


def issue_long_lived_token(tg_id: int, ttl_sec: int = SESSION_TTL_SEC) -> str:
    """Выпускает криптографически подписанный токен на 365 дней — не слетает при перезапусках сервера."""
    now = int(time.time())
    exp = now + int(ttl_sec)
    payload = f"{int(tg_id)}.{now}.{exp}"
    sig = hmac.new(_session_hmac_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()[:32]
    return f"ap2.{payload}.{sig}"


def verify_long_lived_token(token: str) -> Optional[Tuple[int, int, int]]:
    """Проверяет токен ap2.<tg_id>.<iat>.<exp>.<sig>. Возвращает (tg_id, iat, exp) или None."""
    tok = str(token or "").strip()
    if not tok.startswith("ap2."):
        return None
    parts = tok.split(".")
    if len(parts) != 5:
        return None
    _, uid_s, iat_s, exp_s, sig = parts
    if not (uid_s.isdigit() and iat_s.isdigit() and exp_s.isdigit()):
        return None
    payload = f"{uid_s}.{iat_s}.{exp_s}"
    expected = hmac.new(_session_hmac_key(), payload.encode("utf-8"), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(expected, sig):
        return None
    exp = int(exp_s)
    if exp < int(time.time()):
        return None
    return (int(uid_s), int(iat_s), exp)


async def is_admin_user(bot: Bot, user_id: Optional[int]) -> bool:
    """Проверяет, является ли пользователь администратором (ADMIN_ID или админ приватного канала STORAGE_CHAT_ID)."""
    if not user_id:
        return False
    uid = int(user_id)
    if ADMIN_ID is not None:
        return uid == ADMIN_ID
    saved_admin = get_setting("admin_id", "")
    if saved_admin and saved_admin.lstrip("-").isdigit():
        return uid == int(saved_admin)
    st_id = get_storage_chat_id()
    if not st_id:
        return False
    cache_key = f"{st_id}:{uid}"
    cached = ADMIN_STATUS_CACHE.get(cache_key)
    if cached is not None:
        return bool(cached)
    try:
        member = await bot.get_chat_member(chat_id=st_id, user_id=uid)
        ok = getattr(member, "status", "") in ("creator", "administrator")
        ADMIN_STATUS_CACHE.set(cache_key, ok, ttl=600)
        return ok
    except Exception:
        ADMIN_STATUS_CACHE.set(cache_key, False, ttl=180)
        return False


def upsert_telegram_user(
    tg_id: int,
    username: str = "",
    first_name: str = "",
    last_name: str = "",
    photo_url: str = "",
    refresh_token: bool = False,
) -> Tuple[Dict[str, Any], str]:
    now = int(time.time())
    existing = DB.execute("SELECT * FROM users WHERE tg_id = ?", (int(tg_id),)).fetchone()
    if existing:
        cur_tok = str(existing["session_token"] or "")
        # Если токен старого формата (не ap2.) или истёк/запрошено обновление — выдаём свежий на 365 дней
        if refresh_token or not verify_long_lived_token(cur_tok):
            token = issue_long_lived_token(int(tg_id))
        else:
            token = cur_tok
        DB.execute(
            """
            UPDATE users SET
                username = COALESCE(NULLIF(?, ''), username),
                first_name = COALESCE(NULLIF(?, ''), first_name),
                last_name = CASE WHEN ? != '' THEN ? ELSE last_name END,
                photo_url = COALESCE(NULLIF(?, ''), photo_url),
                session_token = ?,
                updated_at = ?
            WHERE tg_id = ?
            """,
            (
                username or "",
                first_name or "",
                last_name or "",
                last_name or "",
                photo_url or "",
                token,
                now,
                int(tg_id),
            ),
        )
    else:
        token = issue_long_lived_token(int(tg_id))
        DB.execute(
            """
            INSERT INTO users(tg_id, username, first_name, last_name, photo_url, session_token, theme, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'chrome', ?, ?)
            """,
            (int(tg_id), username or "", first_name or "", last_name or "", photo_url or "", token, now, now),
        )
    DB.commit()
    mark_db_dirty()
    row = DB.execute("SELECT * FROM users WHERE tg_id = ?", (int(tg_id),)).fetchone()
    return _user_row_to_public(row), token


def get_user_by_token(token: str) -> Optional[sqlite3.Row]:
    tok = str(token or "").strip()
    if not tok or len(tok) < 16:
        return None
    # 1) Криптографический долгоживущий токен ap2 (выживает при перезапуске/бэкапах/на нескольких устройствах!)
    parsed = verify_long_lived_token(tok)
    if parsed:
        tg_id, iat, _exp = parsed
        row = DB.execute("SELECT * FROM users WHERE tg_id = ?", (tg_id,)).fetchone()
        if row:
            revoked_before = int(row["revoked_before"] or 0)
            if revoked_before and iat < revoked_before:
                return None
            return row
        # Даже если контейнер перезапустился с пустой БД — подпись верна, восстанавливаем профиль автоматически!
        upsert_telegram_user(tg_id=tg_id)
        return DB.execute("SELECT * FROM users WHERE tg_id = ?", (tg_id,)).fetchone()

    # 2) Обратная совместимость со старыми токенами из БД
    return DB.execute("SELECT * FROM users WHERE session_token = ?", (tok,)).fetchone()


def extract_bearer_token(request: web.Request) -> str:
    auth_hdr = request.headers.get("Authorization", "").strip()
    if auth_hdr.lower().startswith("bearer "):
        return auth_hdr[7:].strip()
    return request.headers.get("X-Auth-Token", "").strip()


def load_user_cloud_state(tg_id: int, theme: str = "chrome") -> Dict[str, Any]:
    row = DB.execute("SELECT * FROM user_state WHERE tg_id = ?", (int(tg_id),)).fetchone()
    if not row:
        return {"playlists": [], "likedIds": [], "savedTracks": [], "theme": theme or "chrome", "updatedAt": 0}
    try:
        playlists = json.loads(row["playlists_json"] or "[]")
    except Exception:
        playlists = []
    try:
        liked_ids = json.loads(row["liked_ids_json"] or "[]")
    except Exception:
        liked_ids = []
    try:
        saved_tracks = json.loads(row["saved_tracks_json"] or "[]")
    except Exception:
        saved_tracks = []
    return {
        "playlists": playlists if isinstance(playlists, list) else [],
        "likedIds": liked_ids if isinstance(liked_ids, list) else [],
        "savedTracks": saved_tracks if isinstance(saved_tracks, list) else [],
        "theme": theme or "chrome",
        "updatedAt": int(row["updated_at"] or 0),
    }


def save_user_cloud_state(tg_id: int, playlists: list, liked_ids: list, saved_tracks: list, theme: str = "") -> int:
    now = int(time.time())
    clean_playlists = playlists[:50] if isinstance(playlists, list) else []
    clean_likes = [str(x) for x in (liked_ids[:500] if isinstance(liked_ids, list) else [])]
    clean_tracks = saved_tracks[:350] if isinstance(saved_tracks, list) else []

    # Гарантируем, что все треки из личных плейлистов сохранены в таблице tracks,
    # чтобы они продолжали играть даже после перезапуска сервера!
    for t in clean_tracks:
        if not isinstance(t, dict):
            continue
        raw_tid = str(t.get("tgTrackId") or "").strip()
        if not raw_tid:
            tid_str = str(t.get("id") or "")
            raw_tid = tid_str[3:] if tid_str.startswith("tg_") else tid_str
        if not raw_tid:
            continue
        exists = DB.execute("SELECT id FROM tracks WHERE id = ?", (raw_tid,)).fetchone()
        if exists:
            continue
        temp = TEMP_TRACKS.get(raw_tid)
        if temp:
            save_telegram_track(
                track_id=raw_tid,
                title=temp.get("title") or t.get("title") or "Без названия",
                artist=temp.get("artist") or t.get("artist") or "Исполнитель",
                duration=max(1, int(float(temp.get("duration") or t.get("duration") or 180))),
                artwork=temp.get("artwork") or t.get("artwork") or "",
                source=temp.get("source") or "audio",
                source_id=str(temp.get("source_id") or ""),
                source_url=str(temp.get("source_url") or ""),
                tg_file_id=str(temp.get("tg_file_id") or ""),
                tg_thumb_id=str(temp.get("tg_thumb_id") or ""),
                mime_type=str(temp.get("mime_type") or "audio/mpeg"),
                added_by=int(tg_id),
            )
        else:
            src_name = "soundcloud" if raw_tid.startswith("sc_") else ("youtube" if raw_tid.startswith("yt_") else "audio")
            src_id = raw_tid[3:] if raw_tid.startswith(("sc_", "yt_")) else ""
            src_url = f"https://www.youtube.com/watch?v={src_id}" if (src_name == "youtube" and len(src_id) == 11) else ""
            save_telegram_track(
                track_id=raw_tid,
                title=str(t.get("title") or "Без названия"),
                artist=str(t.get("artist") or "Исполнитель"),
                duration=max(1, int(float(t.get("duration") or 180))),
                artwork=str(t.get("artwork") or ""),
                source=src_name,
                source_id=src_id,
                source_url=src_url,
                added_by=int(tg_id),
            )

    DB.execute(
        """
        INSERT INTO user_state(tg_id, playlists_json, liked_ids_json, saved_tracks_json, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(tg_id) DO UPDATE SET
            playlists_json = excluded.playlists_json,
            liked_ids_json = excluded.liked_ids_json,
            saved_tracks_json = excluded.saved_tracks_json,
            updated_at = excluded.updated_at
        """,
        (
            int(tg_id),
            json.dumps(clean_playlists, ensure_ascii=False),
            json.dumps(clean_likes, ensure_ascii=False),
            json.dumps(clean_tracks, ensure_ascii=False),
            now,
        ),
    )
    if theme in ("chrome", "purple", "red"):
        DB.execute("UPDATE users SET theme = ?, updated_at = ? WHERE tg_id = ?", (theme, now, int(tg_id)))
    DB.commit()
    mark_db_dirty()
    return now


def verify_telegram_webapp_init_data(init_data: str) -> Optional[Dict[str, Any]]:
    """Криптографическая проверка Telegram.WebApp.initData через HMAC-SHA256 по стандарту Telegram."""
    if not init_data or not BOT_TOKEN:
        return None
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = pairs.pop("hash", "")
        if not received_hash:
            return None
        auth_date = int(pairs.get("auth_date") or 0)
        if auth_date and abs(time.time() - auth_date) > 7 * 86400:
            return None
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode("utf-8"), hashlib.sha256).digest()
        expected_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_hash, received_hash):
            return None
        user_raw = pairs.get("user")
        if not user_raw:
            return None
        user_obj = json.loads(user_raw)
        if not isinstance(user_obj, dict) or not user_obj.get("id"):
            return None
        return user_obj
    except Exception as e:
        log.warning("WebApp initData verify failed: %s", e)
        return None


# ==================== ИСТОЧНИК 1: SOUNDCLOUD API V2 (БЕЗ YT-DLP, ПОЛНЫЕ ТРЕКИ) ====================
SC_CLIENT_ID: str = ""
SC_CLIENT_ID_AT: float = 0.0
SC_LOCK = asyncio.Lock()


async def get_sc_client_id(session: aiohttp.ClientSession, force: bool = False) -> str:
    global SC_CLIENT_ID, SC_CLIENT_ID_AT
    if not force and SC_CLIENT_ID and (time.time() - SC_CLIENT_ID_AT < 6 * 3600):
        return SC_CLIENT_ID
    async with SC_LOCK:
        if not force and SC_CLIENT_ID and (time.time() - SC_CLIENT_ID_AT < 6 * 3600):
            return SC_CLIENT_ID
        try:
            async with session.get(
                "https://soundcloud.com/",
                headers={"User-Agent": DESKTOP_UA},
                timeout=aiohttp.ClientTimeout(total=6),
            ) as resp:
                if resp.status != 200:
                    return SC_CLIENT_ID
                html = await resp.text()
            js_urls = list(dict.fromkeys(re.findall(r"https://a-v2\.sndcdn\.com/assets/[0-9a-zA-Z-]+\.js", html)))
            for u in reversed(js_urls[-6:]):
                try:
                    async with session.get(u, headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=5)) as jr:
                        if jr.status != 200:
                            continue
                        jtxt = await jr.text()
                    m = re.search(r'client_id\s*[:=]\s*["\']([a-zA-Z0-9]{24,40})["\']', jtxt)
                    if m:
                        SC_CLIENT_ID = m.group(1)
                        SC_CLIENT_ID_AT = time.time()
                        log.info("Harvested SoundCloud client_id: %s...", SC_CLIENT_ID[:8])
                        return SC_CLIENT_ID
                except Exception:
                    continue
        except Exception as e:
            log.warning("SoundCloud client_id harvest failed: %s", e)
        return SC_CLIENT_ID


async def search_soundcloud_api(session: aiohttp.ClientSession, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    cid = await get_sc_client_id(session, force=False)
    if not cid:
        return []
    url = f"https://api-v2.soundcloud.com/search/tracks?q={quote(query)}&client_id={quote(cid)}&limit={limit + 6}"
    data = None
    try:
        async with session.get(url, headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=5)) as r:
            if r.status in (401, 403):
                cid = await get_sc_client_id(session, force=True)
                if cid:
                    url2 = f"https://api-v2.soundcloud.com/search/tracks?q={quote(query)}&client_id={quote(cid)}&limit={limit + 6}"
                    async with session.get(url2, headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=5)) as r2:
                        if r2.status == 200:
                            data = await r2.json()
            elif r.status == 200:
                data = await r.json()
    except Exception as e:
        log.warning("SoundCloud search failed: %s", e)
        return []

    if not data or not isinstance(data.get("collection"), list):
        return []

    out: List[Dict[str, Any]] = []
    for it in data["collection"]:
        if not it or not it.get("id") or not it.get("title"):
            continue
        trans = (it.get("media") or {}).get("transcodings") or []
        full_trans = [tr for tr in trans if tr and not tr.get("snipped") and tr.get("url")]
        if not full_trans:
            continue
        dur = int((it.get("full_duration") or it.get("duration") or 0) / 1000)
        if dur and (dur < MIN_DURATION_SEC or dur > MAX_DURATION_SEC):
            continue

        # Prefer progressive MP3 (instant direct download without HLS/ffmpeg!)
        prog = next((tr for tr in full_trans if (tr.get("format") or {}).get("protocol") == "progressive"), None)
        hls_mp3 = next((tr for tr in full_trans if (tr.get("format") or {}).get("protocol") == "hls" and "mpeg" in str((tr.get("format") or {}).get("mime_type") or "")), None)
        chosen_tr = prog or hls_mp3 or full_trans[0]

        art = it.get("artwork_url") or (it.get("user") or {}).get("avatar_url") or ""
        if art:
            art = art.replace("-large", "-t500x500")
        uploader = (it.get("user") or {}).get("username") or "SoundCloud"
        artist, title = _parse_artist_title(it["title"], uploader)
        item = {
            "id": f"sc_{it['id']}",
            "title": title,
            "artist": artist,
            "duration": dur or 180,
            "artwork": art,
            "source": "soundcloud",
            "source_id": str(it["id"]),
            "source_url": it.get("permalink_url") or "",
            "sc_transcoding_url": chosen_tr.get("url") or "",
            "sc_protocol": (chosen_tr.get("format") or {}).get("protocol") or "",
            "sc_auth": it.get("track_authorization") or "",
            "tg_file_id": "",
            "tg_thumb_id": "",
            "mime_type": "audio/mpeg",
        }
        TEMP_TRACKS.set(item["id"], item)
        out.append(item)
        if len(out) >= limit:
            break
    return out


async def resolve_soundcloud_direct_mp3(session: aiohttp.ClientSession, track: Dict[str, Any]) -> Optional[Tuple[str, str, int]]:
    cid = await get_sc_client_id(session, force=False)
    if not cid:
        return None
    tr_url = track.get("sc_transcoding_url") or ""
    proto = track.get("sc_protocol") or ""
    auth = track.get("sc_auth") or ""

    if not tr_url and track.get("source_id"):
        try:
            info_u = f"https://api-v2.soundcloud.com/tracks/{quote(str(track['source_id']))}?client_id={quote(cid)}"
            async with session.get(info_u, headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=5)) as r:
                if r.status == 200:
                    info = await r.json()
                    trans = [t for t in ((info.get("media") or {}).get("transcodings") or []) if t and not t.get("snipped") and t.get("url")]
                    prog = next((t for t in trans if (t.get("format") or {}).get("protocol") == "progressive"), None)
                    chosen = prog or (trans[0] if trans else None)
                    if chosen:
                        tr_url = chosen["url"]
                        proto = (chosen.get("format") or {}).get("protocol") or ""
                        auth = info.get("track_authorization") or ""
        except Exception:
            pass

    if not tr_url:
        return None
    sep = "&" if "?" in tr_url else "?"
    auth_q = f"&track_authorization={quote(auth)}" if auth else ""
    req_u = f"{tr_url}{sep}client_id={quote(cid)}{auth_q}"
    try:
        async with session.get(req_u, headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=5)) as r:
            if r.status != 200:
                return None
            j = await r.json()
        media_url = j.get("url")
        if media_url:
            if proto == "progressive":
                return (media_url, "audio/mpeg", int(track.get("duration") or 180))
            if proto == "hls":
                return (media_url, "application/vnd.apple.mpegurl", int(track.get("duration") or 180))
    except Exception:
        pass
    return None


# ==================== ИСТОЧНИК 2: ПРЯМЫЕ РФ MP3-ПОРТАЛЫ (0% CPU, МГНОВЕННЫЙ MP3) ====================
async def _fetch_portal_html(session: aiohttp.ClientSession, url: str, timeout_s: float = 4.5) -> str:
    try:
        async with session.get(
            url,
            headers={
                "User-Agent": DESKTOP_UA,
                "Referer": smart_referer(url),
                "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
            },
            allow_redirects=True,
            timeout=aiohttp.ClientTimeout(total=timeout_s),
        ) as r:
            if r.status != 200:
                return ""
            txt = await r.text(errors="ignore")
            low = txt[:2500].lower()
            if "just a moment..." in low or "cf-browser-verification" in low or "ddos-guard" in low:
                return ""
            return txt
    except Exception:
        return ""


async def search_hitmo_server(session: aiohttp.ClientSession, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    for host in ("https://hitmo.me", "https://rus.hitmotop.com", "https://mp3.hitmo.net"):
        html = await _fetch_portal_html(session, f"{host}/search?q={quote(query)}", 4.0)
        if not html:
            continue
        out: List[Dict[str, Any]] = []
        seen: set = set()
        for m in re.finditer(r'data-musmeta=(?:"([^"]+)"|\'([^\']+)\')', html, re.I):
            if len(out) >= limit:
                break
            try:
                meta = json.loads(decode_html(m.group(1) or m.group(2) or ""))
                mp3 = urljoin(host, str(meta.get("url") or "").strip())
                if not mp3.startswith("http") or mp3 in seen:
                    continue
                seen.add(mp3)
                title = decode_html(meta.get("title") or "")
                artist = decode_html(meta.get("artist") or "Hitmo")
                if not title:
                    continue
                item = {
                    "id": make_track_id("hm", mp3),
                    "title": title,
                    "artist": artist,
                    "duration": 180,
                    "artwork": urljoin(host, meta["img"]) if meta.get("img") else "",
                    "source": "hitmo",
                    "source_id": "",
                    "source_url": mp3,
                    "direct_mp3": mp3,
                    "tg_file_id": "",
                    "tg_thumb_id": "",
                    "mime_type": "audio/mpeg",
                }
                TEMP_TRACKS.set(item["id"], item)
                out.append(item)
            except Exception:
                continue
        if out:
            return out
    return []


async def search_muzofond_server(session: aiohttp.ClientSession, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    host = "https://muzofond.fm"
    html = await _fetch_portal_html(session, f"{host}/search/{quote(query)}", 4.0)
    if not html or ".mp3" not in html:
        return []
    out: List[Dict[str, Any]] = []
    seen: set = set()
    for m in re.finditer(r'data-url=["\']([^"\']+?\.mp3[^"\']*)["\']', html, re.I):
        if len(out) >= limit:
            break
        mp3 = urljoin(host, m.group(1).strip())
        if not mp3.startswith("http") or mp3 in seen:
            continue
        win = html[m.start() : m.start() + 1400]
        a_m = re.search(r'class=["\'][^"\']*artist[^"\']*["\'][^>]*>([\s\S]*?)</(?:span|a|div)>', win, re.I)
        t_m = re.search(r'class=["\'][^"\']*track[^"\']*["\'][^>]*>([\s\S]*?)</(?:span|a|div)>', win, re.I)
        d_m = re.search(r"\b(\d{1,2}:\d{2})\b", win)
        artist = strip_tags(a_m.group(1)) if a_m else "Muzofond"
        title = strip_tags(t_m.group(1)) if t_m else ""
        if not title:
            continue
        seen.add(mp3)
        item = {
            "id": make_track_id("mzf", mp3),
            "title": title,
            "artist": artist,
            "duration": parse_dur_str(d_m.group(1)) if d_m else 180,
            "artwork": "",
            "source": "muzofond",
            "source_id": "",
            "source_url": mp3,
            "direct_mp3": mp3,
            "tg_file_id": "",
            "tg_thumb_id": "",
            "mime_type": "audio/mpeg",
        }
        TEMP_TRACKS.set(item["id"], item)
        out.append(item)
    return out


async def search_mp3party_server(session: aiohttp.ClientSession, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    html = await _fetch_portal_html(session, f"https://mp3party.net/search?q={quote(query)}", 4.0)
    if not html or "/music/" not in html:
        return []
    out: List[Dict[str, Any]] = []
    seen: set = set()
    for m in re.finditer(r'<a[^>]+href=["\'][^"\']*/music/(\d{4,12})(?:["\'/?#])[^>]*>([\s\S]{2,220}?)</a>', html, re.I):
        if len(out) >= limit:
            break
        mid = m.group(1)
        if mid in seen:
            continue
        label = strip_tags(m.group(2))
        if not label or len(label) < 3 or re.match(r"^(скачать|слушать|подробнее|далее)$", label, re.I):
            continue
        artist, title = _parse_artist_title(label, "Mp3Party")
        if not title:
            continue
        seen.add(mid)
        mp3 = f"https://dl2.mp3party.net/online/{mid}.mp3"
        item = {
            "id": f"mp3p_{mid}",
            "title": title,
            "artist": artist,
            "duration": 180,
            "artwork": "",
            "source": "mp3party",
            "source_id": mid,
            "source_url": mp3,
            "direct_mp3": mp3,
            "tg_file_id": "",
            "tg_thumb_id": "",
            "mime_type": "audio/mpeg",
        }
        TEMP_TRACKS.set(item["id"], item)
        out.append(item)
    return out


async def search_lightaudio_server(session: aiohttp.ClientSession, query: str, limit: int = 8) -> List[Dict[str, Any]]:
    host = "https://lightaudio.ru"
    html = await _fetch_portal_html(session, f"{host}/mp3/{quote(query)}", 4.0)
    if not html or ".mp3" not in html:
        return []
    out: List[Dict[str, Any]] = []
    seen: set = set()
    for m in re.finditer(r'(?:data-url|data-src|href)=["\']([^"\']+?\.mp3[^"\']*)["\']', html, re.I):
        if len(out) >= limit:
            break
        mp3 = urljoin(host, m.group(1).strip())
        if not mp3.startswith("http") or mp3 in seen:
            continue
        win = strip_tags(html[max(0, m.start() - 200) : m.start() + 700].split("</li>")[0])
        dm = re.search(r"([A-Za-zА-Яа-яЁё0-9][^—\n]{1,75}?)\s+—\s+([A-Za-zА-Яа-яЁё0-9][^—\n]{1,75})", win)
        if not dm:
            continue
        dur_m = re.search(r"\b(\d{1,2}:\d{2})\b", win)
        title = re.sub(r"\b\d{1,2}:\d{2}\b", "", dm.group(1)).strip()
        artist = re.sub(r"\b\d{1,2}:\d{2}\b", "", dm.group(2)).strip()
        if not title:
            continue
        seen.add(mp3)
        item = {
            "id": make_track_id("la", mp3),
            "title": title,
            "artist": artist or "LightAudio",
            "duration": parse_dur_str(dur_m.group(1)) if dur_m else 180,
            "artwork": "",
            "source": "lightaudio",
            "source_id": "",
            "source_url": mp3,
            "direct_mp3": mp3,
            "tg_file_id": "",
            "tg_thumb_id": "",
            "mime_type": "audio/mpeg",
        }
        TEMP_TRACKS.set(item["id"], item)
        out.append(item)
    return out


# ==================== ИСТОЧНИК 3: YOUTUBE INNERTUBE + PIPED / INVIDIOUS ====================
async def innertube_search_light(session: aiohttp.ClientSession, query: str, limit: int = 6) -> List[Dict[str, Any]]:
    payload = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20261001.00.00",
                "hl": "ru",
                "gl": "RU",
            }
        },
        "query": f"{query} audio",
    }
    try:
        async with session.post(
            "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
            json=payload,
            headers={"User-Agent": DESKTOP_UA, "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8"},
            timeout=aiohttp.ClientTimeout(total=4.5),
        ) as resp:
            if resp.status != 200:
                return []
            text = await resp.text()
    except Exception:
        return []

    out: List[Dict[str, Any]] = []
    seen: set = set()
    re_vid = re.compile(
        r'"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"([\s\S]{0,1800}?)(?="videoRenderer":|\}\]\},"trackingParams")'
    )
    for m in re_vid.finditer(text):
        if len(out) >= limit:
            break
        vid = m.group(1)
        chunk = m.group(2) or ""
        t_m = re.search(r'"title":\{"runs":\[\{"text":"((?:\\.|[^"\\]){1,180})"', chunk)
        a_m = re.search(r'"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"((?:\\.|[^"\\]){1,120})"', chunk)
        d_m = re.search(r'"lengthText":\{[^}]*"simpleText":"(\d{1,2}:\d{2}(?::\d{2})?)"', chunk)
        if not t_m:
            continue
        try:
            raw_t = json.loads('"' + t_m.group(1) + '"')
        except Exception:
            raw_t = t_m.group(1)
        try:
            raw_a = json.loads('"' + a_m.group(1) + '"') if a_m else ""
        except Exception:
            raw_a = a_m.group(1) if a_m else ""
        dur = parse_dur_str(d_m.group(1)) if d_m else 0
        if dur and (dur < MIN_DURATION_SEC or dur > MAX_DURATION_SEC):
            continue
        artist, title = _parse_artist_title(raw_t, raw_a)
        if not title:
            continue
        dk = fold_ru(f"{artist} {title}")
        if dk in seen:
            continue
        seen.add(dk)
        item = {
            "id": f"yt_{vid}",
            "title": title,
            "artist": artist,
            "duration": dur or 180,
            "artwork": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
            "source": "youtube",
            "source_id": vid,
            "source_url": f"https://www.youtube.com/watch?v={vid}",
            "tg_file_id": "",
            "tg_thumb_id": "",
            "mime_type": "audio/mp4",
        }
        TEMP_TRACKS.set(item["id"], item)
        out.append(item)
    return out


async def innertube_extract_audio_only(session: aiohttp.ClientSession, video_id: str) -> Optional[Tuple[str, str, int]]:
    if not re.match(r"^[A-Za-z0-9_-]{11}$", video_id or ""):
        return None
    profiles = [
        (
            "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
            {"clientName": "ANDROID_VR", "clientVersion": "1.60.19", "deviceMake": "Oculus", "deviceModel": "Quest 3", "androidSdkVersion": 32, "hl": "en", "gl": "US"},
        ),
        (
            "com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
            {"clientName": "IOS", "clientVersion": "19.45.4", "deviceMake": "Apple", "deviceModel": "iPhone16,2", "hl": "en", "gl": "US"},
        ),
        (
            DESKTOP_UA,
            {"clientName": "TVHTML5_SIMPLY_EMBEDDED_PLAYER", "clientVersion": "2.0", "hl": "en", "gl": "US"},
        ),
    ]
    for ua, client in profiles:
        try:
            async with session.post(
                "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
                json={"videoId": video_id, "context": {"client": client}, "contentCheckOk": True, "racyCheckOk": True},
                headers={"User-Agent": ua, "Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=4.5),
            ) as resp:
                if resp.status != 200:
                    continue
                data = await resp.json()
            sd = (data or {}).get("streamingData") or {}
            formats = sd.get("adaptiveFormats") or []
            audios = [f for f in formats if f and f.get("url") and str(f.get("mimeType") or "").lower().startswith("audio/")]
            if not audios:
                continue
            mp4s = [f for f in audios if "audio/mp4" in str(f.get("mimeType") or "").lower()]
            light = [f for f in mp4s if int(f.get("bitrate") or 0) <= 165000]
            pool = light or mp4s or audios
            pool.sort(key=lambda x: int(x.get("bitrate") or 0), reverse=True)
            chosen = pool[0]
            raw_mime = str(chosen.get("mimeType") or "audio/mp4").split(";")[0].strip().lower()
            dur = int(((data.get("videoDetails") or {}).get("lengthSeconds")) or 0)
            return (chosen["url"], raw_mime, dur)
        except Exception:
            continue
    return None


async def piped_invidious_extract_audio(session: aiohttp.ClientSession, video_id: str) -> Optional[Tuple[str, str, int]]:
    """Обходит блокировку IP дата-центра YouTube через пул Piped/Invidious."""
    async def try_piped(host: str):
        try:
            async with session.get(f"{host}/streams/{video_id}", headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=3.8)) as r:
                if r.status != 200:
                    return None
                d = await r.json()
            streams = [s for s in (d.get("audioStreams") or []) if s and s.get("url")]
            if not streams:
                return None
            mp4s = [s for s in streams if "mp4" in str(s.get("mimeType") or "").lower() or "m4a" in str(s.get("format") or "").lower()]
            pool = mp4s or streams
            pool.sort(key=lambda x: int(x.get("bitrate") or 0), reverse=True)
            chosen = pool[0]
            mime = "audio/mp4" if mp4s else "audio/webm"
            return (chosen["url"], mime, int(d.get("duration") or 0))
        except Exception:
            return None

    async def try_inv(host: str):
        try:
            async with session.get(f"{host}/api/v1/videos/{video_id}", headers={"User-Agent": DESKTOP_UA}, timeout=aiohttp.ClientTimeout(total=4.0)) as r:
                if r.status != 200:
                    return None
                d = await r.json()
            fmts = [f for f in (d.get("adaptiveFormats") or []) if f and f.get("url") and str(f.get("type") or "").startswith("audio/")]
            if not fmts:
                return None
            mp4s = [f for f in fmts if "audio/mp4" in str(f.get("type") or "").lower()]
            chosen = mp4s[0] if mp4s else fmts[0]
            itag = chosen.get("itag") or (140 if mp4s else 251)
            return (f"{host}/latest_version?id={video_id}&itag={itag}&local=true", "audio/mp4" if mp4s else "audio/webm", int(d.get("lengthSeconds") or 0))
        except Exception:
            return None

    tasks = [asyncio.create_task(try_piped(h)) for h in PIPED_NODES[:4]] + [asyncio.create_task(try_inv(h)) for h in INVIDIOUS_NODES[:2]]
    try:
        for fut in asyncio.as_completed(tasks, timeout=4.2):
            res = await fut
            if res:
                for t in tasks:
                    if not t.done():
                        t.cancel()
                return res
    except Exception:
        pass
    for t in tasks:
        if not t.done():
            t.cancel()
    return None


def _ytdlp_extract_audio_only_sync(source_url: str) -> Optional[Tuple[str, str, int]]:
    ydl_opts: Dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "format": "bestaudio[vcodec=none][ext=m4a][abr<=160]/bestaudio[vcodec=none][ext=mp3]/bestaudio[vcodec=none][ext=m4a]/bestaudio[vcodec=none]",
        "socket_timeout": 8,
        "extractor_args": {"youtube": {"player_client": ["android_vr", "ios", "tv_embedded"]}},
    }
    if COOKIES_PATH.exists() and COOKIES_PATH.stat().st_size > 20:
        ydl_opts["cookiefile"] = str(COOKIES_PATH)
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_url, download=False)
        if not info:
            return None
        url = info.get("url")
        ext = (info.get("ext") or "m4a").lower()
        if not url and isinstance(info.get("formats"), list):
            for fmt in reversed(info["formats"]):
                if fmt.get("url") and fmt.get("vcodec") == "none" and fmt.get("acodec") not in (None, "none"):
                    url = fmt["url"]
                    ext = (fmt.get("ext") or "m4a").lower()
                    break
        if not url:
            return None
        mime = "audio/mpeg" if ext == "mp3" else ("audio/mp4" if ext in ("m4a", "mp4") else "audio/webm")
        return (url, mime, int(info.get("duration") or 0))
    except Exception as e:
        log.warning("yt-dlp extract failed: %s", str(e)[:140])
        return None


# ==================== ЕДИНЫЙ МУЛЬТИ-ПОИСК (SOUNDCLOUD + РФ MP3 + YOUTUBE) ====================
async def search_all_audio_sources(session: aiohttp.ClientSession, query: str, limit: int = 12) -> List[Dict[str, Any]]:
    key = f"{query.lower().strip()}|{limit}"
    cached = SEARCH_CACHE.get(key)
    if cached is not None:
        return cached

    # Запускаем все лёгкие источники параллельно!
    # SoundCloud + РФ MP3-порталы идут ПЕРВЫМИ, потому что качаются мгновенно и не страдают от YouTube bot-check!
    results = await asyncio.gather(
        search_soundcloud_api(session, query, limit=6),
        search_hitmo_server(session, query, limit=6),
        search_muzofond_server(session, query, limit=6),
        search_mp3party_server(session, query, limit=6),
        search_lightaudio_server(session, query, limit=5),
        innertube_search_light(session, query, limit=6),
        return_exceptions=True,
    )

    buckets = [r if isinstance(r, list) else [] for r in results]
    merged: List[Dict[str, Any]] = []
    seen: set = set()

    # Склеиваем с приоритетом надёжных аудиоисточников (SC + прямые MP3 > YouTube)
    for bucket in buckets:
        for it in bucket:
            k = fold_ru(f"{it['artist']} {it['title']}")
            if not k or k in seen:
                continue
            seen.add(k)
            merged.append(it)

    if merged:
        SEARCH_CACHE.set(key, merged[:limit])
    return merged[:limit]


# ==================== КАСКАДНЫЙ РЕЗОЛВЕР И СКАЧИВАТЕЛЬ (С АВТОСПАСЕНИЕМ ОТ БЛОКА YOUTUBE!) ====================
async def cross_platform_rescue_audio(session: aiohttp.ClientSession, track: Dict[str, Any]) -> Optional[Tuple[str, str, int]]:
    """Если YouTube заблокировал сервер — ищем ЭТОТ ЖЕ трек на SoundCloud и РФ MP3-порталах!"""
    artist = clean_text(track.get("artist") or "")
    title = clean_text(track.get("title") or "")
    q = clean_text(f"{artist} {title}")
    if not q:
        return None

    log.info("Cross-platform audio rescue for: %s", q)
    res_list = await asyncio.gather(
        search_soundcloud_api(session, q, limit=5),
        search_hitmo_server(session, q, limit=5),
        search_muzofond_server(session, q, limit=5),
        search_mp3party_server(session, q, limit=5),
        search_lightaudio_server(session, q, limit=5),
        return_exceptions=True,
    )

    candidates: List[Tuple[int, Dict[str, Any]]] = []
    for bucket in res_list:
        if not isinstance(bucket, list):
            continue
        for item in bucket:
            sc = score_match(item["artist"], item["title"], artist, title)
            if item.get("direct_mp3"):
                sc += 3
            if sc >= 5:
                candidates.append((sc, item))

    candidates.sort(key=lambda x: x[0], reverse=True)
    for _, cand in candidates[:4]:
        if cand.get("direct_mp3"):
            return (cand["direct_mp3"], "audio/mpeg", int(cand.get("duration") or track.get("duration") or 180))
        if cand.get("source") == "soundcloud":
            sc_stream = await resolve_soundcloud_direct_mp3(session, cand)
            if sc_stream:
                return sc_stream
    return None


async def resolve_audio_stream_url(session: aiohttp.ClientSession, track: Dict[str, Any]) -> Optional[Tuple[str, str, int]]:
    tid = track["id"]
    cached = DIRECT_STREAM_CACHE.get(tid)
    if cached:
        return cached

    res: Optional[Tuple[str, str, int]] = None
    src = track.get("source") or ""

    # 1) Прямой MP3 (Hitmo / Muzofond / Mp3Party / LightAudio)
    if track.get("direct_mp3") or str(track.get("source_url") or "").lower().endswith(".mp3"):
        mp3_u = track.get("direct_mp3") or track.get("source_url")
        res = (mp3_u, "audio/mpeg", int(track.get("duration") or 180))

    # 2) SoundCloud API v2 Progressive MP3 -> yt-dlp fallback
    elif src == "soundcloud":
        res = await resolve_soundcloud_direct_mp3(session, track)
        if not res and track.get("source_url"):
            async with YTDLP_SEMAPHORE:
                res = await asyncio.to_thread(_ytdlp_extract_audio_only_sync, track["source_url"])

    # 3) YouTube: InnerTube -> Piped/Invidious -> yt-dlp -> АВТОСПАСЕНИЕ (SoundCloud + РФ MP3)!
    elif src == "youtube":
        vid = track.get("source_id") or ""
        if len(vid) == 11:
            res = await innertube_extract_audio_only(session, vid)
        if not res and len(vid) == 11:
            res = await piped_invidious_extract_audio(session, vid)
        if not res and track.get("source_url"):
            async with YTDLP_SEMAPHORE:
                res = await asyncio.to_thread(_ytdlp_extract_audio_only_sync, track["source_url"])
        if not res:
            res = await cross_platform_rescue_audio(session, track)

    # 4) Любой другой источник
    if not res and track.get("source_url") and src != "youtube":
        async with YTDLP_SEMAPHORE:
            res = await asyncio.to_thread(_ytdlp_extract_audio_only_sync, track["source_url"])
    if not res:
        res = await cross_platform_rescue_audio(session, track)

    if res:
        DIRECT_STREAM_CACHE.set(tid, res)
    return res


def is_valid_mp3_file(file_path: str) -> bool:
    """Проверяет по магическим байтам, что файл является настоящим MP3 (ID3 или MPEG sync frame)."""
    try:
        if not os.path.exists(file_path) or os.path.getsize(file_path) < 12_000:
            return False
        with open(file_path, "rb") as f:
            head = f.read(64)
        if head.startswith(b"ID3"):
            return True
        # Ищем MPEG audio frame sync (0xFF 0xE0..0xFF) в начале файла, исключая MP4/ftyp/WebM
        if b"ftyp" in head[:24] or head.startswith(b"\x1a\x45\xdf\xa3") or head.startswith(b"OggS"):
            return False
        for i in range(min(len(head) - 1, 16)):
            if head[i] == 0xFF and (head[i + 1] & 0xE0) == 0xE0:
                return True
    except Exception:
        return False
    return False


async def convert_audio_to_mp3(src_path: str, dst_path: str) -> bool:
    """Конвертирует любой m4a/DASH/webm/opus в 100% совместимый стандартный MP3 (160k, 44.1kHz, 1 поток CPU)."""
    if not FFMPEG_BIN or not os.path.exists(src_path):
        return False
    cmd = [
        FFMPEG_BIN,
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", src_path,
        "-vn",
        "-acodec", "libmp3lame",
        "-b:a", "160k",
        "-ar", "44100",
        "-ac", "2",
        "-threads", "1",
        "-f", "mp3",
        dst_path,
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=55)
        if proc.returncode == 0 and os.path.exists(dst_path) and os.path.getsize(dst_path) > 12_000:
            return True
        err_txt = (stderr_bytes or b"").decode("utf-8", errors="ignore").strip()[:160]
        log.warning("ffmpeg mp3 convert failed (rc=%s): %s", proc.returncode, err_txt)
    except Exception as e:
        log.warning("ffmpeg exception: %s", e)
    try:
        if os.path.exists(dst_path):
            os.remove(dst_path)
    except OSError:
        pass
    return False


def prune_mp3_cache() -> None:
    try:
        files = sorted(
            [p for p in MP3_CACHE_DIR.glob("*.mp3") if p.is_file()],
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for old_f in files[MP3_CACHE_MAX_FILES:]:
            try:
                old_f.unlink()
            except OSError:
                pass
    except Exception:
        pass


async def _ensure_mp3_output(raw_path: str, out_dir: str, track_id: str, duration: int) -> Optional[Dict[str, Any]]:
    """Гарантирует на выходе стандартный рабочий .mp3 (если файл уже MP3 — не тратит CPU, иначе конвертирует через ffmpeg)."""
    if is_valid_mp3_file(raw_path):
        mp3_path = os.path.join(out_dir, f"{track_id}.mp3")
        if os.path.abspath(raw_path) != os.path.abspath(mp3_path):
            shutil.move(raw_path, mp3_path)
        return {"path": mp3_path, "ext": "mp3", "mime": "audio/mpeg", "duration": duration}

    if HAS_FFMPEG:
        mp3_path = os.path.join(out_dir, f"{track_id}_conv.mp3")
        ok = await convert_audio_to_mp3(raw_path, mp3_path)
        try:
            if os.path.exists(raw_path):
                os.remove(raw_path)
        except OSError:
            pass
        if ok and os.path.getsize(mp3_path) <= MAX_AUDIO_BYTES:
            return {"path": mp3_path, "ext": "mp3", "mime": "audio/mpeg", "duration": duration}
        return None

    # Без ffmpeg не отдаём сломанный DASH m4a как рабочий трек
    log.warning("File %s is not MP3 and ffmpeg is not installed", raw_path)
    return None


async def _download_hls_mp3(session: aiohttp.ClientSession, m3u8_url: str, out_path: str) -> Optional[Tuple[str, str]]:
    """Собирает HLS-плейлист MP3 (SoundCloud) напрямую в чистый .mp3 без ffmpeg."""
    try:
        async with session.get(
            m3u8_url,
            headers={"User-Agent": SAFARI_UA, "Referer": smart_referer(m3u8_url)},
            timeout=aiohttp.ClientTimeout(total=12),
        ) as r:
            if r.status != 200:
                return None
            text = await r.text(errors="ignore")
        seg_urls = []
        for line in text.splitlines():
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            seg_urls.append(urljoin(m3u8_url, s))
        if not seg_urls or len(seg_urls) > 260:
            return None

        written = 0
        with open(out_path, "wb") as f:
            for seg_u in seg_urls:
                async with session.get(
                    seg_u,
                    headers={"User-Agent": SAFARI_UA, "Referer": smart_referer(seg_u)},
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as sr:
                    if sr.status != 200:
                        return None
                    chunk = await sr.read()
                    written += len(chunk)
                    if written > MAX_AUDIO_BYTES:
                        f.close()
                        try:
                            os.remove(out_path)
                        except OSError:
                            pass
                        return None
                    f.write(chunk)
        if written < 12_000:
            try:
                os.remove(out_path)
            except OSError:
                pass
            return None
        return (out_path, "audio/mpeg")
    except Exception as e:
        log.warning("HLS MP3 download error: %s", e)
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except OSError:
            pass
        return None


async def _download_http_audio(session: aiohttp.ClientSession, url: str, out_path: str) -> Optional[Tuple[str, str]]:
    """Скачивает аудиопоток по HTTP и проверяет, что сервер отдал реальное аудио, а не HTML-заглушку."""
    try:
        async with session.get(
            url,
            headers={"User-Agent": SAFARI_UA, "Referer": smart_referer(url), "Accept": "audio/*,*/*;q=0.5"},
            allow_redirects=True,
            timeout=aiohttp.ClientTimeout(total=40, sock_connect=8, sock_read=20),
        ) as resp:
            if resp.status not in (200, 206):
                log.warning("HTTP audio status %s for %s", resp.status, url[:70])
                return None
            ct = (resp.headers.get("Content-Type") or "").lower()
            if "text/html" in ct or "application/json" in ct or "text/plain" in ct:
                log.warning("Rejected non-audio Content-Type %s for %s", ct, url[:70])
                return None
            cl = int(resp.headers.get("Content-Length") or 0)
            if cl and cl > MAX_AUDIO_BYTES:
                log.warning("Audio too large (%d bytes) for %s", cl, url[:70])
                return None

            written = 0
            first_bytes = b""
            with open(out_path, "wb") as f:
                async for chunk in resp.content.iter_chunked(32768):
                    if not first_bytes:
                        first_bytes = chunk[:64]
                        low_head = first_bytes.lstrip().lower()
                        if low_head.startswith((b"<!doctype", b"<html", b"<?xml", b"{")):
                            f.close()
                            try:
                                os.remove(out_path)
                            except OSError:
                                pass
                            return None
                    written += len(chunk)
                    if written > MAX_AUDIO_BYTES:
                        f.close()
                        try:
                            os.remove(out_path)
                        except OSError:
                            pass
                        return None
                    f.write(chunk)

            if written < 12_000:
                try:
                    os.remove(out_path)
                except OSError:
                    pass
                return None

            final_mime = "audio/mpeg" if ("mpeg" in ct or url.lower().endswith(".mp3")) else ("audio/mp4" if "mp4" in ct else "audio/mpeg")
            return (out_path, final_mime)
    except Exception as e:
        log.warning("HTTP audio download error (%s): %s", url[:60], e)
        try:
            if os.path.exists(out_path):
                os.remove(out_path)
        except OSError:
            pass
        return None


async def download_audio_only_to_file(
    session: aiohttp.ClientSession, track: Dict[str, Any], out_dir: str
) -> Tuple[Optional[Dict[str, Any]], str]:
    """Скачивает трек и ГАРАНТИРУЕТ стандартный .mp3 на выходе (работает в Telegram и Safari 100%)."""
    # 1) Пробуем прямой аудиопоток (для SoundCloud / РФ MP3 это уже готовый MP3, для YouTube — m4a -> ffmpeg -> mp3)
    res = await resolve_audio_stream_url(session, track)
    if res:
        direct_url, mime, dur = res
        if "mpegurl" in mime or ".m3u8" in direct_url.lower():
            raw_path = os.path.join(out_dir, f"hls_{track['id']}.mp3")
            dl = await _download_hls_mp3(session, direct_url, raw_path)
        else:
            raw_ext = "mp3" if "mpeg" in mime else ("m4a" if "mp4" in mime else "webm")
            raw_path = os.path.join(out_dir, f"raw_{track['id']}.{raw_ext}")
            dl = await _download_http_audio(session, direct_url, raw_path)
        if dl:
            ensured = await _ensure_mp3_output(dl[0], out_dir, track["id"], dur or track.get("duration") or 180)
            if ensured:
                return ensured, ""

        # Если прямой файл не прошёл (например, сломанный DASH или без ffmpeg) -> ищем готовый MP3 на других площадках!
        DIRECT_STREAM_CACHE._data.pop(track["id"], None)
        rescue = await cross_platform_rescue_audio(session, track)
        if rescue and rescue[0] != direct_url:
            r_url, r_mime, r_dur = rescue
            if "mpegurl" in r_mime or ".m3u8" in r_url.lower():
                r_path = os.path.join(out_dir, f"rescue_hls_{track['id']}.mp3")
                dl2 = await _download_hls_mp3(session, r_url, r_path)
            else:
                r_ext = "mp3" if "mpeg" in r_mime else "m4a"
                r_path = os.path.join(out_dir, f"rescue_{track['id']}.{r_ext}")
                dl2 = await _download_http_audio(session, r_url, r_path)
            if dl2:
                ensured2 = await _ensure_mp3_output(dl2[0], out_dir, track["id"], r_dur or track.get("duration") or 180)
                if ensured2:
                    return ensured2, ""

    # 2) Резервный yt-dlp (поддерживает SoundCloud HLS + YouTube + автоконвертацию в MP3 через ffmpeg!)
    src_url = track.get("source_url") or ""
    if src_url and not src_url.lower().endswith(".mp3"):
        def _dl_sync() -> Tuple[Optional[Dict[str, Any]], str]:
            out_tmpl = os.path.join(out_dir, "%(id)s.%(ext)s")
            opts: Dict[str, Any] = {
                "quiet": True,
                "no_warnings": True,
                "noplaylist": True,
                "writethumbnail": False,
                "writesubtitles": False,
                "format": "bestaudio[vcodec=none][ext=mp3][filesize<19M]/bestaudio[vcodec=none][ext=m4a][filesize<19M]/bestaudio[vcodec=none]/bestaudio",
                "outtmpl": out_tmpl,
                "max_filesize": MAX_AUDIO_BYTES,
                "socket_timeout": 12,
                "extractor_args": {"youtube": {"player_client": ["android_vr", "ios", "tv_embedded"]}},
            }
            if HAS_FFMPEG and FFMPEG_BIN:
                opts["ffmpeg_location"] = FFMPEG_BIN
                opts["postprocessors"] = [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "160",
                    }
                ]
                opts["postprocessor_args"] = {"ffmpeg": ["-threads", "1", "-ar", "44100", "-ac", "2"]}
            if COOKIES_PATH.exists() and COOKIES_PATH.stat().st_size > 20:
                opts["cookiefile"] = str(COOKIES_PATH)
            try:
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(src_url, download=True)
                    if not info:
                        return None, "empty_info"
                    mp3_cand = None
                    for fn in os.listdir(out_dir):
                        cand = os.path.join(out_dir, fn)
                        if os.path.isfile(cand) and cand.lower().endswith(".mp3") and os.path.getsize(cand) > 12_000:
                            mp3_cand = cand
                            break
                    if not mp3_cand:
                        for fn in os.listdir(out_dir):
                            cand = os.path.join(out_dir, fn)
                            if os.path.isfile(cand) and os.path.getsize(cand) > 12_000:
                                mp3_cand = cand
                                break
                    if not mp3_cand:
                        return None, "file_missing"
                    return {"path": mp3_cand, "duration": int(info.get("duration") or 0)}, ""
            except Exception as e:
                err = str(e)
                if "confirm you’re not a bot" in err or "not a bot" in err or "Sign in" in err:
                    return None, "youtube_bot_check"
                return None, err[:90]

        async with YTDLP_SEMAPHORE:
            dl_res, err_msg = await asyncio.to_thread(_dl_sync)
            if dl_res:
                ensured3 = await _ensure_mp3_output(dl_res["path"], out_dir, track["id"], dl_res["duration"] or track.get("duration") or 180)
                if ensured3:
                    return ensured3, ""
                return None, "ffmpeg_required"
            return None, err_msg

    return None, ("ffmpeg_required" if not HAS_FFMPEG else "no_audio_found")


async def upload_audio_to_telegram(
    bot: Bot, session: aiohttp.ClientSession, track: Dict[str, Any], target_chat_id: int
) -> Tuple[Optional[str], str]:
    tid = track["id"]
    if tid in BG_CACHE_INFLIGHT:
        return None, "already_loading"
    BG_CACHE_INFLIGHT.add(tid)
    try:
        async with DOWNLOAD_SEMAPHORE:
            with tempfile.TemporaryDirectory(prefix="apathy_") as tmpdir:
                dl, err = await download_audio_only_to_file(session, track, tmpdir)
                if not dl or not os.path.exists(dl["path"]):
                    return None, err or "download_failed"

                safe_name = re.sub(r'[\\/:*?"<>|]+', "", f"{track['artist']} - {track['title']}")[:85]
                audio_file = FSInputFile(dl["path"], filename=f"{safe_name}.{dl['ext']}")
                sent = await bot.send_audio(
                    chat_id=target_chat_id,
                    audio=audio_file,
                    title=track["title"][:64],
                    performer=track["artist"][:64],
                    duration=dl.get("duration") or track.get("duration") or None,
                    caption=f"🎵 <b>{track['artist']} — {track['title']}</b>\nДобавлено в плеер APATHY",
                    parse_mode="HTML",
                    reply_markup=build_webapp_keyboard(),
                )
                if sent and sent.audio:
                    fid = sent.audio.file_id
                    th_id = sent.audio.thumbnail.file_id if sent.audio.thumbnail else ""
                    save_telegram_track(
                        track_id=tid,
                        title=track["title"],
                        artist=track["artist"],
                        duration=sent.audio.duration or dl.get("duration") or track.get("duration") or 180,
                        artwork=track.get("artwork") or "",
                        source=track.get("source") or "telegram",
                        source_id=track.get("source_id") or "",
                        source_url=track.get("source_url") or "",
                        tg_file_id=fid,
                        tg_thumb_id=th_id,
                        mime_type=sent.audio.mime_type or dl.get("mime") or "audio/mpeg",
                    )
                    return fid, ""
    except Exception as e:
        log.warning("upload_audio_to_telegram error (%s): %s", tid, e)
        return None, str(e)[:90]
    finally:
        BG_CACHE_INFLIGHT.discard(tid)
    return None, "send_failed"


async def get_tg_file_url(bot: Bot, file_id: str) -> Optional[str]:
    cached = TG_FILE_PATH_CACHE.get(file_id)
    if cached:
        return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{cached}"
    try:
        f = await bot.get_file(file_id)
        if f and f.file_path:
            TG_FILE_PATH_CACHE.set(file_id, f.file_path)
            return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{f.file_path}"
    except Exception as e:
        log.warning("Telegram getFile failed: %s", e)
    return None


# -------------------- TELEGRAM BOT HANDLERS --------------------
router = Router()
BOT_USERNAME_CACHE = ""
HTTP_SESSION_REF: Optional[aiohttp.ClientSession] = None


def build_webapp_keyboard() -> InlineKeyboardMarkup:
    link = get_webapp_link()
    if link.startswith("https://"):
        btn = InlineKeyboardButton(text="🎵 Открыть плеер APATHY", web_app=WebAppInfo(url=link))
    else:
        btn = InlineKeyboardButton(text="🎵 Открыть сайт APATHY", url=link)
    return InlineKeyboardMarkup(inline_keyboard=[[btn]])


@router.message(CommandStart())
async def cmd_start(message: Message, bot: Bot):
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) == 2 and parts[1].strip().startswith("auth_"):
        code = parts[1].strip()[5:]
        pending = PENDING_AUTH_CODES.get(code)
        if not pending or pending.get("status") != "pending":
            await message.answer(
                "⏱ Ссылка для входа устарела. Откройте сайт APATHY и нажмите <b>«Войти через Telegram»</b> ещё раз.",
                parse_mode="HTML",
                reply_markup=build_webapp_keyboard(),
            )
            return
        u = message.from_user
        if not u:
            return
        pub_user, token = upsert_telegram_user(
            tg_id=u.id,
            username=u.username or "",
            first_name=u.first_name or "",
            last_name=u.last_name or "",
            refresh_token=True,
        )
        await sync_tg_profile_photo(bot, u.id, force=True)
        PENDING_AUTH_CODES.set(code, {"status": "authorized", "tg_id": u.id, "token": token}, ttl=180)
        display = f"@{u.username}" if u.username else (u.first_name or f"ID {u.id}")
        await message.answer(
            f"✅ <b>Вход в APATHY выполнен!</b>\n\n"
            f"Аккаунт <b>{display}</b> привязан к плееру.\n"
            "Вернитесь на сайт — ваши личные плейлисты и избранное уже доступны.",
            parse_mode="HTML",
            reply_markup=build_webapp_keyboard(),
        )
        return

    # Чистый текст приветствия для обычных пользователей (без служебных и админ-команд!)
    text = (
        "<b>APATHY · Музыкальный плеер</b>\n\n"
        f"🌐 Плеер: {SITE_URL}/\n\n"
        "• <b>Напиши название трека или исполнителя</b> — найду и пришлю аудио.\n"
        "• <b>Перешли любой аудиофайл</b> — трек сразу добавится в твой плейлист.\n"
        "• <b>/playlists</b> — твои плейлисты и избранное\n"
        "• <b>/apk</b> — скачать приложение APATHY для Android"
    )
    uid = message.from_user.id if message.from_user else None
    if await is_admin_user(bot, uid):
        text += "\n\n<i>🔧 Админ-панель: /admin</i>"
    await message.answer(text, parse_mode="HTML", reply_markup=build_webapp_keyboard(), disable_web_page_preview=True)


@router.message(Command("admin"))
async def cmd_admin_help(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    db_s = get_db_stats()
    text = (
        "<b>🔧 Админ-команды APATHY (v40):</b>\n\n"
        f"📊 В базе: <b>{db_s['users']}</b> польз. · <b>{db_s['all_tracks']}</b> трек. · <b>{db_s['playlists']}</b> плейл.\n\n"
        "• /backup — сохранить бэкап базы в канал\n"
        "• /restore — восстановить базу из канала\n"
        "• /test — диагностика источников, ffmpeg и бэкапа\n"
        "• /list — последние треки в базе\n"
        "• /del название — удалить трек из базы\n"
        "• /setapi URL — задать публичный URL бота\n"
        "• /setstorage — привязать канал-хранилище\n"
        "• /setapp 2 2 1.1.0 | описание — версия и Force Update APK\n"
        "• /setapk URL — внешняя ссылка на APK (или просто скиньте .apk файл боту)"
    )
    await message.answer(text, parse_mode="HTML")




@router.message(Command("apk", "android"))
async def cmd_download_apk(message: Message):
    info = get_app_version_payload()
    apk_fid = get_setting("app_apk_file_id", "")
    apk_url = info.get("apkUrl") or ""
    ver = info.get("latestVersionName") or "1.0.0"
    chlog = info.get("changelog") or ""
    if apk_fid:
        cap = f"📱 <b>APATHY для Android · v{ver}</b>"
        if chlog:
            cap += f"\n\n{chlog}"
        await message.answer_document(document=apk_fid, caption=cap, parse_mode="HTML")
        return
    if apk_url:
        kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=f"⬇️ Скачать APATHY v{ver} (.apk)", url=apk_url)]])
        await message.answer(
            f"📱 <b>APATHY для Android · v{ver}</b>\n\n{chlog}",
            parse_mode="HTML",
            reply_markup=kb,
        )
        return
    await message.answer("📱 Android-приложение (.apk) скоро появится здесь. Пока можно слушать прямо в браузере!", reply_markup=build_webapp_keyboard())


@router.message(Command("setapp"))
async def cmd_set_app_version(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    raw = (message.text or "").split(maxsplit=1)
    if len(raw) < 2 or not raw[1].strip():
        cur = get_app_version_payload()
        await message.answer(
            "<b>Настройка версии Android APK (Force Update):</b>\n\n"
            f"Сейчас: <b>v{cur['latestVersionName']}</b> (code={cur['latestVersionCode']}, min={cur['minVersionCode']})\n"
            f"Ссылка: <code>{cur['apkUrl'] or 'не задана'}</code>\n\n"
            "<b>Формат команды:</b>\n"
            "<code>/setapp latestCode minCode versionName | Что нового</code>\n\n"
            "<b>Примеры:</b>\n"
            "• Обязательное обновление до v1.1.0:\n"
            "<code>/setapp 2 2 1.1.0 | Исправлены баги и ускорен плеер</code>\n"
            "• Мягкое (можно нажать «Позже»):\n"
            "<code>/setapp 2 1 1.1.0 | Новые функции</code>",
            parse_mode="HTML",
        )
        return

    body = raw[1].strip()
    if "|" in body:
        meta_part, chlog = [x.strip() for x in body.split("|", 1)]
    else:
        meta_part, chlog = body, ""
    tokens = meta_part.split()
    if len(tokens) < 2 or not tokens[0].isdigit() or not tokens[1].isdigit():
        await message.answer("Формат: <code>/setapp 2 2 1.1.0 | Описание</code>", parse_mode="HTML")
        return

    latest_code = int(tokens[0])
    min_code = int(tokens[1])
    ver_name = tokens[2] if len(tokens) >= 3 else f"1.{latest_code}.0"

    set_setting("app_latest_code", str(latest_code))
    set_setting("app_min_code", str(min_code))
    set_setting("app_latest_name", ver_name)
    if chlog:
        set_setting("app_changelog", chlog)

    mode = "🔒 ПРИНУДИТЕЛЬНОЕ (старые версии заблокированы)" if min_code >= latest_code else "🔔 Мягкое (можно пропустить)"
    await message.answer(
        f"✅ <b>Версия APK обновлена!</b>\n\n"
        f"Версия: <b>v{ver_name}</b> (code {latest_code})\n"
        f"Минимум: <b>code {min_code}</b>\n"
        f"Режим: {mode}\n"
        f"Описание: {chlog or 'без изменений'}",
        parse_mode="HTML",
    )


@router.message(Command("setapk"))
async def cmd_set_apk_url(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2 or not re.match(r"^https?://", parts[1].strip(), re.I):
        await message.answer(
            "Укажите прямую HTTPS-ссылку на файл .apk:\n"
            "<code>/setapk https://github.com/.../APATHY.apk</code>\n\n"
            "Или просто <b>отправьте сам файл .apk</b> в этот чат — бот сохранит его автоматически!",
            parse_mode="HTML",
        )
        return
    url = parts[1].strip()
    set_setting("app_apk_url", url)
    set_setting("app_apk_file_id", "")
    await message.answer(f"✅ Внешняя ссылка на APK сохранена:\n<code>{url}</code>", parse_mode="HTML")


@router.message(Command("playlists", "my"))
async def cmd_my_playlists(message: Message):
    u = message.from_user
    if not u:
        return
    cloud = load_user_cloud_state(u.id)
    pls = cloud.get("playlists") or []
    likes = cloud.get("likedIds") or []
    tracks = cloud.get("savedTracks") or []
    if not pls and not likes and not tracks:
        await message.answer(
            "У тебя пока нет сохранённых плейлистов.\nОткрой плеер APATHY, войди через Telegram и добавляй треки кнопкой «+»!",
            parse_mode="HTML",
            reply_markup=build_webapp_keyboard(),
        )
        return
    lines = [
        "<b>Твоя медиатека APATHY:</b>",
        f"❤️ Избранных треков: <b>{len(likes)}</b>",
        f"🎵 Сохранено треков: <b>{len(tracks)}</b>",
        "",
    ]
    if pls:
        lines.append("<b>Плейлисты:</b>")
        for idx, pl in enumerate(pls[:15], 1):
            cnt = len(pl.get("trackIds") or [])
            lines.append(f"{idx}. <b>{pl.get('name', 'Плейлист')}</b> — {cnt} трек.")
    await message.answer("\n".join(lines), parse_mode="HTML", reply_markup=build_webapp_keyboard())


@router.message(Command("backup"))
async def cmd_manual_backup(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    m = await message.answer("💾 Создаю и отправляю бэкап базы APATHY в канал-хранилище...")
    ok, err, info = await backup_db_to_telegram(bot, reason="manual")
    if ok:
        await m.edit_text(
            f"✅ <b>Бэкап сохранён и закреплён в канале!</b>\n\n"
            f"👤 Пользователей: <b>{info.get('users', 0)}</b>\n"
            f"🎵 Треков в базе: <b>{info.get('all_tracks', 0)}</b>\n"
            f"📋 Плейлистов: <b>{info.get('playlists', 0)}</b>\n"
            f"📦 Размер архива: <b>{info.get('size_kb', 0)} КБ</b>",
            parse_mode="HTML",
        )
    else:
        await m.edit_text(
            f"❌ Не удалось сделать бэкап (<code>{err}</code>).\n"
            "Проверьте переменную <b>STORAGE_CHAT_ID</b> и права бота (публикация и закрепление) в канале.",
            parse_mode="HTML",
        )


@router.message(Command("restore"))
async def cmd_manual_restore(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    m = await message.answer("♻️ Загружаю закреплённый бэкап из канала-хранилища...")
    ok, err, stats = await restore_db_from_telegram(bot, force=True)
    if ok:
        await m.edit_text(
            f"✅ <b>База APATHY восстановлена из Telegram!</b>\n\n"
            f"👤 Пользователей: <b>{stats.get('users', 0)}</b>\n"
            f"🎵 Треков в базе: <b>{stats.get('all_tracks', 0)}</b>\n"
            f"📋 Плейлистов: <b>{stats.get('playlists', 0)}</b>",
            parse_mode="HTML",
        )
    else:
        await m.edit_text(f"❌ Не удалось восстановить базу: <code>{err}</code>", parse_mode="HTML")


@router.message(Command("test"))
async def cmd_test_sources(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    if HTTP_SESSION_REF is None:
        return
    m = await message.answer("🔎 Проверяю источники аудио с сервера (запрос: Miyagi)...")
    q = "Miyagi"

    async def chk(name: str, coro):
        t0 = time.time()
        try:
            res = await asyncio.wait_for(coro, timeout=5.5)
            cnt = len(res) if isinstance(res, list) else (1 if res else 0)
            ms = int((time.time() - t0) * 1000)
            return f"{'✅' if cnt else '❌'} <b>{name}</b>: {cnt} трек. ({ms} мс)"
        except Exception as e:
            return f"❌ <b>{name}</b>: ошибка ({str(e)[:40]})"

    lines = await asyncio.gather(
        chk("SoundCloud API", search_soundcloud_api(HTTP_SESSION_REF, q, 4)),
        chk("Hitmo / Hitmotop", search_hitmo_server(HTTP_SESSION_REF, q, 4)),
        chk("Muzofond", search_muzofond_server(HTTP_SESSION_REF, q, 4)),
        chk("Mp3Party", search_mp3party_server(HTTP_SESSION_REF, q, 4)),
        chk("LightAudio", search_lightaudio_server(HTTP_SESSION_REF, q, 4)),
        chk("YouTube Поиск", innertube_search_light(HTTP_SESSION_REF, q, 4)),
        chk("YouTube Аудио (InnerTube)", innertube_extract_audio_only(HTTP_SESSION_REF, "dQw4w9WgXcQ")),
        chk("Piped/Invidious Аудио", piped_invidious_extract_audio(HTTP_SESSION_REF, "dQw4w9WgXcQ")),
    )
    cookies_st = "✅ подключён" if (COOKIES_PATH.exists() and COOKIES_PATH.stat().st_size > 20) else "не загружен"
    ff_st = f"✅ активен ({FFMPEG_SOURCE} · выход строго .mp3)" if HAS_FFMPEG else "⚠️ не установлен — добавьте imageio-ffmpeg в requirements.txt"
    st_id = get_storage_chat_id()
    st_txt = "⚠️ не задан (добавьте STORAGE_CHAT_ID)"
    if st_id:
        try:
            st_chat = await bot.get_chat(st_id)
            has_pin = bool(getattr(st_chat, "pinned_message", None) and getattr(st_chat.pinned_message, "document", None))
            st_txt = f"✅ <code>{st_id}</code> ({'бэкап закреплён' if has_pin else 'бэкапа пока нет — нажмите /backup'})"
        except Exception as e:
            st_txt = f"❌ <code>{st_id}</code> (нет доступа: {str(e)[:40]})"
    db_s = get_db_stats()
    await m.edit_text(
        "<b>Диагностика источников сервера (v40):</b>\n\n"
        + "\n".join(lines)
        + f"\n\n🎛 ffmpeg: {ff_st}"
        + f"\n💾 Бэкап-канал: {st_txt}"
        + f"\n📊 В базе: {db_s['users']} польз. · {db_s['all_tracks']} трек. · {db_s['playlists']} плейл."
        + f"\n🍪 cookies.txt: {cookies_st}",
        parse_mode="HTML",
    )


@router.message(Command("setstorage"))
async def cmd_set_storage(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    set_setting("storage_chat_id", str(message.chat.id))
    await message.answer(f"✅ Чат <code>{message.chat.id}</code> назначен хранилищем APATHY.", parse_mode="HTML")


@router.channel_post(Command("setstorage"))
async def channel_set_storage(message: Message):
    set_setting("storage_chat_id", str(message.chat.id))
    await message.answer(f"✅ Канал <code>{message.chat.id}</code> подключён к APATHY.", parse_mode="HTML")


@router.message(Command("setapi"))
async def cmd_set_api(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2 or not re.match(r"^https?://", parts[1].strip(), re.I):
        await message.answer("Укажите публичный HTTPS-адрес бота:\n<code>/setapi https://ваш-бот.example.com</code>", parse_mode="HTML")
        return
    url = parts[1].strip().rstrip("/")
    set_setting("bot_api_url", url)
    await message.answer(
        f"✅ Адрес API сохранён: <code>{url}</code>\nКнопка плеера теперь связывает <b>{SITE_URL}/</b> с ботом.",
        parse_mode="HTML",
        reply_markup=build_webapp_keyboard(),
    )


@router.message(Command("del"))
async def cmd_delete_track(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        await message.answer("Формат: <code>/del название</code>", parse_mode="HTML")
        return
    q = fold_ru(parts[1])
    rows = DB.execute("SELECT id, artist, title FROM tracks ORDER BY created_at DESC LIMIT 200").fetchall()
    for r in rows:
        if q == r["id"].lower() or q in fold_ru(f"{r['artist']} {r['title']}"):
            DB.execute("DELETE FROM tracks WHERE id = ?", (r["id"],))
            DB.commit()
            mark_db_dirty()
            await message.answer(f"🗑 Удалено: <b>{r['artist']} — {r['title']}</b>", parse_mode="HTML")
            return
    await message.answer("Трек не найден в базе.")


@router.message(Command("list"))
async def cmd_list(message: Message, bot: Bot):
    uid = message.from_user.id if message.from_user else None
    if not await is_admin_user(bot, uid):
        return
    rows = DB.execute("SELECT * FROM tracks WHERE tg_file_id != '' ORDER BY created_at DESC LIMIT 15").fetchall()
    if not rows:
        await message.answer("База пока пуста. Напиши название трека или перешли аудиофайл сюда!", reply_markup=build_webapp_keyboard())
        return
    lines = [f"<b>Треки в APATHY ({len(rows)}):</b>"]
    for idx, r in enumerate(rows, 1):
        m, s = divmod(int(r["duration"] or 0), 60)
        lines.append(f"{idx}. <b>{r['artist']}</b> — {r['title']} ({m}:{s:02d})")
    await message.answer("\n".join(lines), parse_mode="HTML", reply_markup=build_webapp_keyboard())


def _extract_audio_from_msg(message: Message) -> Optional[Dict[str, Any]]:
    if message.audio:
        a = message.audio
        raw_title = a.title or (Path(a.file_name).stem if a.file_name else "Без названия")
        artist = a.performer or ""
        title = raw_title
        if not artist and " - " in raw_title:
            parts = raw_title.split(" - ", 1)
            artist, title = parts[0].strip(), parts[1].strip()
        return {
            "id": f"tga_{a.file_unique_id}",
            "title": clean_text(title) or "Без названия",
            "artist": clean_text(artist) or "Telegram",
            "duration": int(a.duration or 180),
            "tg_file_id": a.file_id,
            "tg_thumb_id": a.thumbnail.file_id if a.thumbnail else "",
            "mime_type": a.mime_type or "audio/mpeg",
        }
    if message.document and (message.document.mime_type or "").startswith("audio/"):
        doc = message.document
        stem = Path(doc.file_name or "track").stem
        artist, title = ("Telegram", stem)
        if " - " in stem:
            parts = stem.split(" - ", 1)
            artist, title = parts[0].strip(), parts[1].strip()
        return {
            "id": f"tgd_{doc.file_unique_id}",
            "title": clean_text(title) or "Без названия",
            "artist": clean_text(artist) or "Telegram",
            "duration": 180,
            "tg_file_id": doc.file_id,
            "tg_thumb_id": doc.thumbnail.file_id if doc.thumbnail else "",
            "mime_type": doc.mime_type or "audio/mpeg",
        }
    return None


@router.message(F.audio | F.document)
async def handle_uploaded_audio(message: Message, bot: Bot):
    # Поддержка загрузки cookies.txt для YouTube прямо в бота
    if message.document and (message.document.file_name or "").lower() == "cookies.txt":
        uid_c = message.from_user.id if message.from_user else None
        if not await is_admin_user(bot, uid_c):
            return
        try:
            await bot.download(message.document, destination=str(COOKIES_PATH))
            await message.reply("🍪 Файл <b>cookies.txt</b> сохранён! Прямое скачивание с YouTube активировано.", parse_mode="HTML")
        except Exception as e:
            await message.reply(f"Не удалось сохранить cookies.txt: {e}")
        return

    # Поддержка загрузки нового Android .apk файла прямо в бота (только админ)
    if message.document and (message.document.file_name or "").lower().endswith(".apk"):
        uid_a = message.from_user.id if message.from_user else None
        if not await is_admin_user(bot, uid_a):
            return
        doc = message.document
        dl_url = f"{get_bot_api_url()}/api/app/download"
        set_setting("app_apk_file_id", doc.file_id)
        set_setting("app_apk_url", dl_url)
        size_mb = (doc.file_size or 0) / (1024 * 1024)
        cur = get_app_version_payload()
        warn_big = "\n⚠️ Файл больше 19.5 МБ — для автоскачивания в приложении лучше выложить его на GitHub Releases и указать через /setapk URL." if (doc.file_size or 0) > MAX_AUDIO_BYTES else ""
        await message.reply(
            f"📱 <b>APK-файл сохранён!</b> ({size_mb:.1f} МБ)\n"
            f"Прямая ссылка: <code>{dl_url}</code>\n"
            f"Текущая версия в API: <b>v{cur['latestVersionName']}</b> (code {cur['latestVersionCode']}, min {cur['minVersionCode']}){warn_big}\n\n"
            "Чтобы разослать принудительное обновление, отправьте:\n"
            "<code>/setapp 2 2 1.1.0 | Что нового</code>",
            parse_mode="HTML",
        )
        return

    meta = _extract_audio_from_msg(message)
    if not meta:
        return
    uid = message.from_user.id if message.from_user else 0
    saved_api = save_telegram_track(
        track_id=meta["id"],
        title=meta["title"],
        artist=meta["artist"],
        duration=meta["duration"],
        source="telegram",
        source_id=meta["id"],
        tg_file_id=meta["tg_file_id"],
        tg_thumb_id=meta["tg_thumb_id"],
        mime_type=meta["mime_type"],
        added_by=uid,
    )
    pl_name = ""
    if uid:
        pl_name = add_track_to_user_playlist(uid, saved_api, message.from_user)
        await sync_tg_profile_photo(bot, uid, force=False)
    where_txt = f"в ваш плейлист «<b>{pl_name}</b>» на аккаунте APATHY" if pl_name else "на сайт APATHY"
    await message.reply(
        f"✅ <b>{meta['artist']} — {meta['title']}</b> добавлен {where_txt}!",
        parse_mode="HTML",
        reply_markup=build_webapp_keyboard(),
    )


@router.channel_post(F.audio | F.document)
async def handle_channel_audio(message: Message):
    meta = _extract_audio_from_msg(message)
    if not meta:
        return
    save_telegram_track(
        track_id=meta["id"],
        title=meta["title"],
        artist=meta["artist"],
        duration=meta["duration"],
        source="telegram",
        source_id=meta["id"],
        tg_file_id=meta["tg_file_id"],
        tg_thumb_id=meta["tg_thumb_id"],
        mime_type=meta["mime_type"],
    )


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_search(message: Message):
    query = clean_text(message.text or "")
    if len(query) < 2 or HTTP_SESSION_REF is None:
        return

    status_msg = await message.answer(f"🔎 Ищу аудио: <b>{query}</b>...", parse_mode="HTML")

    db_hits = search_db_tracks(query, limit=4)
    net_hits = await search_all_audio_sources(HTTP_SESSION_REF, query, limit=10)

    combined: List[Dict[str, Any]] = []
    seen: set = set()
    for it in db_hits:
        k = fold_ru(f"{it['artist']} {it['title']}")
        if k not in seen:
            seen.add(k)
            combined.append(it)
    for it in net_hits:
        k = fold_ru(f"{it['artist']} {it['title']}")
        if k not in seen:
            seen.add(k)
            combined.append(it)

    combined = combined[:8]
    if not combined:
        await status_msg.edit_text(f"По запросу «{query}» ничего не найдено.")
        return

    buttons = []
    for idx, item in enumerate(combined):
        pick_key = hashlib.md5(f"{item['id']}:{time.time()}:{idx}".encode()).hexdigest()[:10]
        BOT_PICK_CACHE.set(pick_key, item)
        m, s = divmod(int(item.get("duration") or 0), 60)
        src = item.get("source") or ""
        mark = "⚡" if item.get("inTelegram") else ("☁️" if src == "soundcloud" else ("🎧" if item.get("direct_mp3") else "🎵"))
        label = f"{mark} {item['artist']} — {item['title']}"
        if len(label) > 45:
            label = label[:42] + "..."
        label += f" ({m}:{s:02d})"
        buttons.append([InlineKeyboardButton(text=label, callback_data=f"pick:{pick_key}")])

    link = get_webapp_link()
    if link.startswith("https://"):
        buttons.append([InlineKeyboardButton(text="🎧 Открыть плеер APATHY", web_app=WebAppInfo(url=link))])
    else:
        buttons.append([InlineKeyboardButton(text="🎧 Открыть сайт APATHY", url=link)])

    await status_msg.edit_text(
        f"Найдено по запросу <b>«{query}»</b>:",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
    )


@router.callback_query(F.data.startswith("pick:"))
async def handle_pick_callback(callback: CallbackQuery, bot: Bot):
    pick_key = (callback.data or "").split(":", 1)[1]
    item = BOT_PICK_CACHE.get(pick_key)
    if not item or HTTP_SESSION_REF is None:
        await callback.answer("Кнопка устарела — повтори поиск.", show_alert=True)
        return

    u_from = callback.from_user
    uid = u_from.id if u_from else 0
    row = DB.execute("SELECT * FROM tracks WHERE id = ?", (item["id"],)).fetchone()
    if row and row["tg_file_id"]:
        pl_name = add_track_to_user_playlist(uid, track_dict_to_api(dict(row)), u_from) if uid else ""
        if uid:
            await sync_tg_profile_photo(bot, uid, force=False)
        await callback.answer("Добавлено в ваш плейлист!")
        pl_note = f"Добавлено в ваш плейлист «{pl_name}» в APATHY" if pl_name else "Уже доступно в плеере APATHY"
        await callback.message.answer_audio(
            audio=row["tg_file_id"],
            caption=f"⚡ <b>{row['artist']} — {row['title']}</b>\n{pl_note}",
            parse_mode="HTML",
            reply_markup=build_webapp_keyboard(),
        )
        return

    await callback.answer("Загружаю аудиодорожку...")
    prog = await callback.message.answer(f"⏳ Загружаю аудио: <b>{item['artist']} — {item['title']}</b>...", parse_mode="HTML")

    fid, err = await upload_audio_to_telegram(bot, HTTP_SESSION_REF, item, callback.message.chat.id)
    try:
        await prog.delete()
    except Exception:
        pass

    if fid:
        if uid:
            saved_row = DB.execute("SELECT * FROM tracks WHERE id = ?", (item["id"],)).fetchone()
            if saved_row:
                add_track_to_user_playlist(uid, track_dict_to_api(dict(saved_row)), u_from)
            await sync_tg_profile_photo(bot, uid, force=False)
        st_id = get_storage_chat_id()
        if st_id and st_id != callback.message.chat.id:
            try:
                await bot.send_audio(chat_id=st_id, audio=fid)
            except Exception:
                pass
    else:
        log.warning("Pick download failed for %s: %s", item.get("id"), err)
        await callback.message.answer("Не удалось загрузить этот вариант. Выбери другой трек из списка.")


# -------------------- HTTP API ДЛЯ САЙТА https://awuro.sergeyhownan.workers.dev/ --------------------
@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        resp = web.Response(status=204)
    else:
        try:
            resp = await handler(request)
        except web.HTTPException as ex:
            resp = ex
    if not getattr(resp, "prepared", False):
        origin = request.headers.get("Origin", "")
        resp.headers["Access-Control-Allow-Origin"] = origin if origin == SITE_URL else "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, HEAD, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Range, Accept, Content-Type, Authorization, X-Auth-Token"
        resp.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges, Content-Type"
    return resp


async def api_auth_webapp(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "invalid_json"}, status=400)
    init_data = str((body or {}).get("initData") or "").strip()
    tg_user = verify_telegram_webapp_init_data(init_data)
    if not tg_user:
        return web.json_response({"ok": False, "error": "invalid_init_data"}, status=401)
    pub_user, token = upsert_telegram_user(
        tg_id=int(tg_user["id"]),
        username=str(tg_user.get("username") or ""),
        first_name=str(tg_user.get("first_name") or ""),
        last_name=str(tg_user.get("last_name") or ""),
        photo_url=str(tg_user.get("photo_url") or ""),
    )
    bot: Bot = request.app["bot"]
    await sync_tg_profile_photo(bot, pub_user["tgId"], force=False)
    fresh_row = DB.execute("SELECT * FROM users WHERE tg_id = ?", (pub_user["tgId"],)).fetchone()
    if fresh_row:
        pub_user = _user_row_to_public(fresh_row)
    cloud_state = load_user_cloud_state(pub_user["tgId"], pub_user["theme"])
    return web.json_response({"ok": True, "token": token, "user": pub_user, "state": cloud_state})


async def api_auth_start(request: web.Request) -> web.Response:
    bot_uname = BOT_USERNAME_CACHE.lstrip("@")
    if not bot_uname:
        return web.json_response({"ok": False, "error": "bot_username_missing"}, status=503)
    code = secrets.token_urlsafe(12).replace("-", "").replace("_", "")[:16]
    PENDING_AUTH_CODES.set(code, {"status": "pending", "created_at": int(time.time())}, ttl=300)
    return web.json_response(
        {
            "ok": True,
            "code": code,
            "botUsername": bot_uname,
            "botUrl": f"https://t.me/{bot_uname}?start=auth_{code}",
            "expiresIn": 300,
        }
    )


async def api_auth_poll(request: web.Request) -> web.Response:
    code = clean_text(request.query.get("code", ""))
    if not code:
        return web.json_response({"ok": False, "status": "expired"}, status=400)
    entry = PENDING_AUTH_CODES.get(code)
    if not entry:
        return web.json_response({"ok": True, "status": "expired"})
    if entry.get("status") != "authorized":
        return web.json_response({"ok": True, "status": "pending"})

    PENDING_AUTH_CODES._data.pop(code, None)
    row = DB.execute("SELECT * FROM users WHERE tg_id = ?", (int(entry["tg_id"]),)).fetchone()
    if not row:
        return web.json_response({"ok": True, "status": "expired"})
    pub_user = _user_row_to_public(row)
    cloud_state = load_user_cloud_state(pub_user["tgId"], pub_user["theme"])
    tok = str(entry.get("token") or row["session_token"] or "")
    if not verify_long_lived_token(tok):
        tok = issue_long_lived_token(pub_user["tgId"])
    return web.json_response(
        {
            "ok": True,
            "status": "authorized",
            "token": tok,
            "user": pub_user,
            "state": cloud_state,
        }
    )


async def api_user_me(request: web.Request) -> web.Response:
    token = extract_bearer_token(request)
    row = get_user_by_token(token)
    if not row:
        return web.json_response({"ok": False, "error": "token_revoked"}, status=401)
    if not row["tg_avatar_file_id"] and not row["custom_avatar"]:
        await sync_tg_profile_photo(request.app["bot"], int(row["tg_id"]), force=False)
        row = DB.execute("SELECT * FROM users WHERE tg_id = ?", (int(row["tg_id"]),)).fetchone() or row
    pub_user = _user_row_to_public(row)
    # Скользящее продление: если токен старого формата или осталось меньше 180 дней — продлеваем на 365 дней!
    fresh_token = token
    parsed = verify_long_lived_token(token)
    if not parsed or (parsed[2] - int(time.time()) < 180 * 86400):
        fresh_token = issue_long_lived_token(pub_user["tgId"])
        DB.execute("UPDATE users SET session_token = ?, updated_at = ? WHERE tg_id = ?", (fresh_token, int(time.time()), pub_user["tgId"]))
        DB.commit()
    cloud_state = load_user_cloud_state(pub_user["tgId"], pub_user["theme"])
    return web.json_response({"ok": True, "token": fresh_token, "user": pub_user, "state": cloud_state})


async def api_user_avatar_get(request: web.Request) -> web.StreamResponse:
    tg_id_str = request.match_info.get("tg_id", "").strip()
    if not tg_id_str.isdigit():
        return web.Response(status=400)
    tg_id = int(tg_id_str)
    row = DB.execute("SELECT custom_avatar, custom_avatar_mime, tg_avatar_file_id FROM users WHERE tg_id = ?", (tg_id,)).fetchone()
    if not row:
        return web.Response(status=404)

    # 1) Пользовательская аватарка, загруженная с сайта
    if row["custom_avatar"]:
        return web.Response(
            body=bytes(row["custom_avatar"]),
            headers={
                "Content-Type": row["custom_avatar_mime"] or "image/jpeg",
                "Cache-Control": "public, max-age=86400",
            },
        )

    # 2) Аватарка из Telegram-аккаунта пользователя
    bot: Bot = request.app["bot"]
    fid = row["tg_avatar_file_id"] or await sync_tg_profile_photo(bot, tg_id, force=False)
    if not fid:
        return web.Response(status=404)

    tg_url = await get_tg_file_url(bot, fid)
    if not tg_url:
        return web.Response(status=404)
    session: aiohttp.ClientSession = request.app["http_session"]
    try:
        async with session.get(tg_url, timeout=aiohttp.ClientTimeout(total=8)) as up:
            if up.status != 200:
                return web.Response(status=404)
            body = await up.read()
            return web.Response(
                body=body,
                headers={
                    "Content-Type": up.headers.get("Content-Type", "image/jpeg"),
                    "Cache-Control": "public, max-age=86400",
                },
            )
    except Exception:
        return web.Response(status=404)


def _detect_image_mime(raw: bytes) -> Optional[str]:
    if len(raw) < 12:
        return None
    if raw.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if raw.startswith(b"RIFF") and raw[8:12] == b"WEBP":
        return "image/webp"
    if raw.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    return None


async def api_user_avatar_upload(request: web.Request) -> web.Response:
    token = extract_bearer_token(request)
    row = get_user_by_token(token)
    if not row:
        return web.json_response({"ok": False, "error": "token_revoked"}, status=401)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "invalid_json"}, status=400)
    data_uri = str((body or {}).get("imageData") or "").strip()
    if "," in data_uri and data_uri.startswith("data:"):
        b64_part = data_uri.split(",", 1)[1]
    else:
        b64_part = data_uri
    try:
        raw_bytes = base64.b64decode(b64_part, validate=True)
    except Exception:
        return web.json_response({"ok": False, "error": "bad_base64"}, status=400)
    if not raw_bytes or len(raw_bytes) > 1_500_000:
        return web.json_response({"ok": False, "error": "image_too_large"}, status=400)
    mime = _detect_image_mime(raw_bytes)
    if not mime:
        return web.json_response({"ok": False, "error": "unsupported_image"}, status=400)

    now = int(time.time())
    tg_id = int(row["tg_id"])
    DB.execute(
        "UPDATE users SET custom_avatar = ?, custom_avatar_mime = ?, avatar_version = ?, updated_at = ? WHERE tg_id = ?",
        (sqlite3.Binary(raw_bytes), mime, now, now, tg_id),
    )
    DB.commit()
    mark_db_dirty()
    return web.json_response(
        {
            "ok": True,
            "photoUrl": f"/api/user/avatar/{tg_id}?v={now}",
            "hasCustomAvatar": True,
        }
    )


async def api_user_avatar_delete(request: web.Request) -> web.Response:
    token = extract_bearer_token(request)
    row = get_user_by_token(token)
    if not row:
        return web.json_response({"ok": False, "error": "token_revoked"}, status=401)
    tg_id = int(row["tg_id"])
    now = int(time.time())
    DB.execute(
        "UPDATE users SET custom_avatar = NULL, custom_avatar_mime = '', avatar_version = ?, updated_at = ? WHERE tg_id = ?",
        (now, now, tg_id),
    )
    DB.commit()
    mark_db_dirty()
    await sync_tg_profile_photo(request.app["bot"], tg_id, force=True)
    fresh = DB.execute("SELECT * FROM users WHERE tg_id = ?", (tg_id,)).fetchone()
    pub = _user_row_to_public(fresh) if fresh else {"photoUrl": "", "hasCustomAvatar": False}
    return web.json_response({"ok": True, "photoUrl": pub.get("photoUrl", ""), "hasCustomAvatar": False})


async def api_user_sync(request: web.Request) -> web.Response:
    token = extract_bearer_token(request)
    row = get_user_by_token(token)
    if not row:
        return web.json_response({"ok": False, "error": "token_revoked"}, status=401)
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "invalid_json"}, status=400)
    playlists = (body or {}).get("playlists") or []
    liked_ids = (body or {}).get("likedIds") or []
    saved_tracks = (body or {}).get("savedTracks") or []
    theme = str((body or {}).get("theme") or "").strip()
    try:
        ts = save_user_cloud_state(int(row["tg_id"]), playlists, liked_ids, saved_tracks, theme)
    except Exception as e:
        log.warning("api_user_sync save error for %s: %s", row["tg_id"], e)
        return web.json_response({"ok": False, "error": "sync_save_error"}, status=500)
    return web.json_response(
        {
            "ok": True,
            "syncedAt": ts,
            "counts": {
                "playlists": len(playlists) if isinstance(playlists, list) else 0,
                "liked": len(liked_ids) if isinstance(liked_ids, list) else 0,
                "tracks": len(saved_tracks) if isinstance(saved_tracks, list) else 0,
            },
        }
    )


async def api_user_logout(request: web.Request) -> web.Response:
    token = extract_bearer_token(request)
    row = get_user_by_token(token)
    if row:
        now_ts = int(time.time())
        new_tok = secrets.token_urlsafe(32)
        DB.execute(
            "UPDATE users SET session_token = ?, revoked_before = ?, updated_at = ? WHERE tg_id = ?",
            (new_tok, now_ts, now_ts, int(row["tg_id"])),
        )
        DB.commit()
        mark_db_dirty()
    return web.json_response({"ok": True})


async def api_app_version(request: web.Request) -> web.Response:
    return web.json_response(
        get_app_version_payload(),
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
    )


async def api_app_download(request: web.Request) -> web.StreamResponse:
    apk_fid = get_setting("app_apk_file_id", "")
    ext_url = get_setting("app_apk_url", "")
    bot: Bot = request.app["bot"]
    session: aiohttp.ClientSession = request.app["http_session"]

    if apk_fid:
        tg_url = await get_tg_file_url(bot, apk_fid)
        if tg_url:
            try:
                async with session.get(tg_url, timeout=aiohttp.ClientTimeout(total=120, sock_connect=10, sock_read=30)) as up:
                    if up.status == 200:
                        ver = get_setting("app_latest_name", "1.0.0") or "1.0.0"
                        resp_headers = {
                            "Content-Type": "application/vnd.android.package-archive",
                            "Content-Disposition": f'attachment; filename="APATHY-v{ver}.apk"',
                            "Cache-Control": "no-cache",
                            "Access-Control-Allow-Origin": "*",
                        }
                        if "Content-Length" in up.headers:
                            resp_headers["Content-Length"] = up.headers["Content-Length"]
                        resp = web.StreamResponse(status=200, headers=resp_headers)
                        await resp.prepare(request)
                        async for chunk in up.content.iter_chunked(65536):
                            await resp.write(chunk)
                        await resp.write_eof()
                        return resp
            except Exception as e:
                log.warning("api_app_download stream error: %s", e)

    if ext_url and not ext_url.rstrip("/").endswith("/api/app/download"):
        raise web.HTTPFound(ext_url)
    return web.Response(status=404, text="APK not uploaded yet")


async def api_ping(request: web.Request) -> web.Response:
    total = DB.execute("SELECT COUNT(*) AS c FROM tracks WHERE tg_file_id != ''").fetchone()["c"]
    return web.json_response(
        {
            "ok": True,
            "service": "apathy-tg-audio-v40",
            "version": "v40",
            "bot": BOT_USERNAME_CACHE,
            "siteUrl": SITE_URL,
            "tracksCount": total,
        }
    )


async def api_library(request: web.Request) -> web.Response:
    limit = min(int(request.query.get("limit", "60") or 60), 200)
    tracks = search_db_tracks("", limit=limit)
    return web.json_response({"ok": True, "sources": ["Telegram Бот"] if tracks else [], "tracks": tracks})


async def api_search(request: web.Request) -> web.Response:
    q = clean_text(request.query.get("q", ""))
    if not q:
        return await api_library(request)

    session: aiohttp.ClientSession = request.app["http_session"]
    db_hits = search_db_tracks(q, limit=16)
    net_raw = await search_all_audio_sources(session, q, limit=14)

    tracks: List[Dict[str, Any]] = []
    seen: set = set()
    sources: List[str] = []

    for it in db_hits:
        k = fold_ru(f"{it['artist']} {it['title']}")
        if k not in seen:
            seen.add(k)
            tracks.append(it)
            if "Telegram" not in sources:
                sources.append("Telegram")

    for raw in net_raw:
        k = fold_ru(f"{raw['artist']} {raw['title']}")
        if k in seen:
            continue
        seen.add(k)
        row = DB.execute("SELECT * FROM tracks WHERE id = ?", (raw["id"],)).fetchone()
        api_t = track_dict_to_api(dict(row) if row else raw)
        tracks.append(api_t)
        lbl = api_t["sourceLabel"]
        if lbl not in sources:
            sources.append(lbl)

    return web.json_response({"ok": True, "query": q, "sources": sources, "tracks": tracks[:28]})


async def api_resolve(request: web.Request) -> web.Response:
    track_id_param = clean_text(request.query.get("id", ""))
    artist = clean_text(request.query.get("artist", ""))
    title = clean_text(request.query.get("title", ""))

    if track_id_param:
        rec = lookup_track_record(track_id_param)
        if rec:
            t = track_dict_to_api(rec)
            return web.json_response(
                {"ok": True, "id": t["id"], "streamUrl": t["streamUrl"], "label": t["sourceLabel"] + " · Аудио", "duration": t["duration"]}
            )

    q = clean_text(f"{artist} {title}")
    if not q:
        return web.json_response({"ok": False, "error": "empty query"}, status=400)

    db_hits = search_db_tracks(q, limit=2)
    if db_hits:
        best = db_hits[0]
        return web.json_response(
            {"ok": True, "id": best["id"], "streamUrl": best["streamUrl"], "label": "Telegram · Аудио", "duration": best["duration"]}
        )

    session: aiohttp.ClientSession = request.app["http_session"]
    net_hits = await search_all_audio_sources(session, q, limit=5)
    if net_hits:
        t = track_dict_to_api(net_hits[0])
        return web.json_response(
            {"ok": True, "id": t["id"], "streamUrl": t["streamUrl"], "label": t["sourceLabel"] + " · Аудио", "duration": t["duration"]}
        )
    return web.json_response({"ok": False})


async def proxy_audio_stream(request: web.Request, upstream_url: str, default_mime: str = "audio/mpeg") -> web.StreamResponse:
    req_headers = {"User-Agent": SAFARI_UA, "Referer": smart_referer(upstream_url), "Accept": "audio/*,*/*;q=0.5"}
    if "Range" in request.headers:
        req_headers["Range"] = request.headers["Range"]

    session: aiohttp.ClientSession = request.app["http_session"]
    try:
        async with session.request(
            "HEAD" if request.method == "HEAD" else "GET",
            upstream_url,
            headers=req_headers,
            allow_redirects=True,
            timeout=aiohttp.ClientTimeout(total=None, sock_connect=8, sock_read=25),
        ) as up:
            if up.status >= 400:
                return web.Response(status=502, text=f"Upstream HTTP {up.status}")
            ct = up.headers.get("Content-Type") or default_mime
            if "octet-stream" in ct.lower():
                ct = default_mime
            origin = request.headers.get("Origin", "")
            resp_headers = {
                "Content-Type": ct,
                "Accept-Ranges": up.headers.get("Accept-Ranges", "bytes"),
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": origin if origin == SITE_URL else "*",
                "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
            }
            if "Content-Length" in up.headers:
                resp_headers["Content-Length"] = up.headers["Content-Length"]
            if "Content-Range" in up.headers:
                resp_headers["Content-Range"] = up.headers["Content-Range"]

            resp = web.StreamResponse(status=up.status, headers=resp_headers)
            await resp.prepare(request)
            if request.method != "HEAD":
                async for chunk in up.content.iter_chunked(32768):
                    await resp.write(chunk)
            await resp.write_eof()
            return resp
    except (asyncio.CancelledError, ConnectionResetError):
        return web.Response(status=499)
    except Exception as e:
        log.warning("Audio stream error: %s", e)
        return web.Response(status=502, text="Stream error")


async def api_stream(request: web.Request) -> web.StreamResponse:
    track_id = request.match_info.get("track_id", "").strip()
    rec = lookup_track_record(track_id)
    if not rec:
        if re.match(r"^yt_[A-Za-z0-9_-]{11}$", track_id):
            vid = track_id[3:]
            rec = {
                "id": track_id,
                "title": "Audio",
                "artist": "APATHY",
                "duration": 180,
                "source": "youtube",
                "source_id": vid,
                "source_url": f"https://www.youtube.com/watch?v={vid}",
                "tg_file_id": "",
                "mime_type": "audio/mpeg",
            }
        elif re.match(r"^sc_\d+$", track_id):
            sc_id = track_id[3:]
            rec = {
                "id": track_id,
                "title": "Audio",
                "artist": "SoundCloud",
                "duration": 180,
                "source": "soundcloud",
                "source_id": sc_id,
                "source_url": "",
                "tg_file_id": "",
                "mime_type": "audio/mpeg",
            }
        else:
            return web.Response(status=404, text="Track not found")

    bot: Bot = request.app["bot"]
    session: aiohttp.ClientSession = request.app["http_session"]
    default_mime = rec.get("mime_type") or "audio/mpeg"

    # 1) Трек уже сохранён в Telegram (как MP3) -> стримим напрямую с Telegram CDN!
    if rec.get("tg_file_id"):
        tg_url = await get_tg_file_url(bot, rec["tg_file_id"])
        if tg_url:
            return await proxy_audio_stream(request, tg_url, default_mime=default_mime)

    # 2) Проверяем локальный кэш готовых MP3 (мгновенный старт и перемотка Range 206 на iPhone!)
    safe_tid = re.sub(r"[^A-Za-z0-9_-]", "_", track_id)[:60]
    cached_mp3 = MP3_CACHE_DIR / f"{safe_tid}.mp3"
    if cached_mp3.exists() and cached_mp3.stat().st_size > 12_000:
        return web.FileResponse(
            cached_mp3,
            headers={"Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600"},
        )

    # 3) Если источник отдаёт чистый прямой MP3 (Hitmo / Muzofond / Mp3Party / LightAudio / SoundCloud progressive MP3) -> стримим напрямую!
    res = await resolve_audio_stream_url(session, rec)
    if res:
        direct_url, mime, _ = res
        is_hls = ("mpegurl" in mime) or ".m3u8" in direct_url.lower()
        is_direct_mp3 = (not is_hls) and (("mpeg" in mime) or direct_url.lower().split("?")[0].endswith(".mp3"))
        if is_direct_mp3:
            if AUTO_CACHE_TO_TG:
                st_id = get_storage_chat_id()
                if st_id and not rec.get("tg_file_id") and track_id not in BG_CACHE_INFLIGHT:
                    asyncio.create_task(upload_audio_to_telegram(bot, session, rec, st_id))
            return await proxy_audio_stream(request, direct_url, default_mime="audio/mpeg")

    # 4) YouTube DASH m4a / SoundCloud HLS -> конвертируем/собираем в чистый .mp3 (1-2 сек) и отдаём как стандартный MP3 с Range 206!
    if HAS_FFMPEG or (res and ("mpegurl" in res[1] or ".m3u8" in res[0].lower())):
        lock = MP3_CONVERT_LOCKS.setdefault(safe_tid, asyncio.Lock())
        async with lock:
            if not (cached_mp3.exists() and cached_mp3.stat().st_size > 12_000):
                with tempfile.TemporaryDirectory(prefix="apathy_s_") as tmpdir:
                    dl, _ = await download_audio_only_to_file(session, rec, tmpdir)
                    if dl and os.path.exists(dl["path"]):
                        shutil.move(dl["path"], str(cached_mp3))
                        prune_mp3_cache()
        if cached_mp3.exists() and cached_mp3.stat().st_size > 12_000:
            if AUTO_CACHE_TO_TG:
                st_id = get_storage_chat_id()
                if st_id and not rec.get("tg_file_id") and track_id not in BG_CACHE_INFLIGHT:
                    asyncio.create_task(upload_audio_to_telegram(bot, session, rec, st_id))
            return web.FileResponse(
                cached_mp3,
                headers={"Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=3600"},
            )

    # 5) Крайний резерв без ffmpeg
    if res:
        return await proxy_audio_stream(request, res[0], default_mime=res[1])
    return web.Response(status=502, text="Audio stream unavailable")


async def api_thumb(request: web.Request) -> web.StreamResponse:
    file_id = request.match_info.get("file_id", "").strip()
    if not file_id:
        return web.Response(status=404)
    bot: Bot = request.app["bot"]
    tg_url = await get_tg_file_url(bot, file_id)
    if not tg_url:
        return web.Response(status=404)
    session: aiohttp.ClientSession = request.app["http_session"]
    try:
        async with session.get(tg_url, timeout=aiohttp.ClientTimeout(total=8)) as up:
            if up.status != 200:
                return web.Response(status=404)
            body = await up.read()
            return web.Response(
                body=body,
                headers={"Content-Type": up.headers.get("Content-Type", "image/jpeg"), "Cache-Control": "public, max-age=86400"},
            )
    except Exception:
        return web.Response(status=404)


async def serve_index(request: web.Request) -> web.StreamResponse:
    idx = WEB_DIR / "index.html"
    if idx.exists():
        return web.FileResponse(idx, headers={"Cache-Control": "no-cache, must-revalidate"})
    raise web.HTTPFound(get_webapp_link())


async def serve_sw(request: web.Request) -> web.StreamResponse:
    sw_path = WEB_DIR / "sw.js"
    if not sw_path.exists():
        return web.Response(status=404)
    return web.FileResponse(
        sw_path,
        headers={
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache, must-revalidate",
            "Service-Worker-Allowed": "/",
        },
    )


async def main():
    global BOT_USERNAME_CACHE, HTTP_SESSION_REF

    if not BOT_TOKEN or BOT_TOKEN == "ВСТАВЬ_ТОКЕН_ОТ_BOTFATHER":
        raise SystemExit("ОШИБКА: Укажите переменную окружения BOT_TOKEN (или в файле .env)!")

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)

    me = await bot.get_me()
    BOT_USERNAME_CACHE = f"@{me.username}" if me.username else str(me.id)
    try:
        await bot.set_my_commands(
            [
                BotCommand(command="start", description="Открыть плеер APATHY"),
                BotCommand(command="playlists", description="Мои плейлисты"),
                BotCommand(command="apk", description="Скачать приложение для Android"),
            ]
        )
    except Exception as e:
        log.warning("set_my_commands skipped: %s", e)

    # Автовосстановление базы из закреплённого бэкапа в STORAGE_CHAT_ID (если контейнер пустой после пересборки)
    restored, rst_err, rst_stats = await restore_db_from_telegram(bot, force=False)
    if restored:
        log.info("Auto-restored DB from Telegram channel: %s", rst_stats)
    elif rst_err not in ("already_populated", "no_pinned_backup", "STORAGE_CHAT_ID не задан"):
        log.warning("Auto-restore skipped with status: %s", rst_err)

    log.info(
        "APATHY v40 Audio-Only Bot started: %s | Site: %s | ffmpeg=%s | storage=%s",
        BOT_USERNAME_CACHE, SITE_URL, HAS_FFMPEG, get_storage_chat_id(),
    )

    connector = aiohttp.TCPConnector(limit=30, ttl_dns_cache=300)
    http_session = aiohttp.ClientSession(connector=connector)
    HTTP_SESSION_REF = http_session

    app = web.Application(middlewares=[cors_middleware], client_max_size=5 * 1024 * 1024)
    app["bot"] = bot
    app["http_session"] = http_session

    app.router.add_get("/health", api_ping)
    app.router.add_get("/api/app/version", api_app_version)
    app.router.add_get("/api/app/download", api_app_download)
    app.router.add_post("/api/auth/webapp", api_auth_webapp)
    app.router.add_post("/api/auth/start", api_auth_start)
    app.router.add_get("/api/auth/poll", api_auth_poll)
    app.router.add_get("/api/user/me", api_user_me)
    app.router.add_post("/api/user/sync", api_user_sync)
    app.router.add_post("/api/user/logout", api_user_logout)
    app.router.add_get("/api/user/avatar/{tg_id}", api_user_avatar_get)
    app.router.add_post("/api/user/avatar", api_user_avatar_upload)
    app.router.add_delete("/api/user/avatar", api_user_avatar_delete)
    app.router.add_get("/api/tg/ping", api_ping)
    app.router.add_get("/api/tg/library", api_library)
    app.router.add_get("/api/tg/search", api_search)
    app.router.add_get("/api/tg/resolve", api_resolve)
    app.router.add_route("GET", "/api/tg/stream/{track_id}", api_stream)
    app.router.add_route("HEAD", "/api/tg/stream/{track_id}", api_stream)
    app.router.add_get("/api/tg/thumb/{file_id}", api_thumb)
    app.router.add_get("/", serve_index)
    app.router.add_get("/sw.js", serve_sw)

    if WEB_DIR.exists():
        app.router.add_static("/", path=str(WEB_DIR), name="web_static")

    runner = web.AppRunner(app, access_log=None)
    await runner.setup()

    ports_to_bind = [PORT]
    # Если хостинг не передал PORT явно — слушаем и 8080, и 8000, чтобы Traefik Bothost подключился в любом случае
    if not os.getenv("PORT", "").strip():
        for extra_p in (8000, 3000):
            if extra_p not in ports_to_bind:
                ports_to_bind.append(extra_p)

    bound_ports = []
    for p in ports_to_bind:
        try:
            site = web.TCPSite(runner, HOST, p)
            await site.start()
            bound_ports.append(p)
        except OSError as e:
            if p == PORT:
                raise
            log.warning("Optional port %d skipped: %s", p, e)

    log.info("APATHY Audio API listening on %s ports=%s | Public: %s", HOST, bound_ports, get_bot_api_url())

    backup_task = asyncio.create_task(auto_backup_loop(bot))

    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await dp.start_polling(bot, allowed_updates=["message", "callback_query", "channel_post"])
    finally:
        backup_task.cancel()
        try:
            await backup_task
        except asyncio.CancelledError:
            pass
        if DB_DIRTY and get_storage_chat_id():
            try:
                await asyncio.wait_for(backup_db_to_telegram(bot, reason="shutdown"), timeout=15)
            except Exception as e:
                log.warning("Shutdown backup failed: %s", e)
        await runner.cleanup()
        await http_session.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
