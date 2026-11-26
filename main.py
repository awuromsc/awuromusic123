#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
APATHY v27 — Надёжный лёгкий Telegram-бот (ТОЛЬКО АУДИО) + API для https://awuro.sergeyhownan.workers.dev/
===========================================================================================================
Исправлено в v27 (обход блокировок YouTube на Docker/VPS-серверах):
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
import hashlib
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
from urllib.parse import quote, urljoin

import aiohttp
from aiohttp import web
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import (
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
FFMPEG_BIN: Optional[str] = shutil.which("ffmpeg")
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
BG_CACHE_INFLIGHT: set = set()


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
    if STORAGE_CHAT_ID_ENV:
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('storage_chat_id', ?)", (STORAGE_CHAT_ID_ENV,))
    if BOT_API_URL_ENV:
        conn.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('bot_api_url', ?)", (BOT_API_URL_ENV,))
    conn.commit()
    return conn


DB = init_db()


def get_setting(key: str, default: str = "") -> str:
    row = DB.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return (row["value"] if row else default).strip()


def set_setting(key: str, value: str) -> None:
    DB.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (key, value.strip()))
    DB.commit()


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
        if media_url and proto == "progressive":
            return (media_url, "audio/mpeg", int(track.get("duration") or 180))
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
            if HAS_FFMPEG:
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
async def cmd_start(message: Message):
    total = DB.execute("SELECT COUNT(*) AS c FROM tracks WHERE tg_file_id != ''").fetchone()["c"]
    text = (
        "<b>APATHY v27 · Музыкальный бот (только аудио)</b>\n\n"
        f"🌐 Сайт плеера: {SITE_URL}/\n"
        f"💾 Сохранённых треков: <b>{total}</b>\n\n"
        "• <b>Напиши название трека</b> — ищу по SoundCloud, РФ MP3-порталам и YouTube, скачиваю строго чистое аудио.\n"
        "• <b>Перешли любой аудиофайл</b> — сразу появится в плеере APATHY.\n"
        "• <b>/test</b> — проверить источники на сервере · <b>/list</b> — список треков\n"
        "• <b>/del название</b> — удалить трек · <b>/setapi URL</b> — привязать адрес API"
    )
    await message.answer(text, parse_mode="HTML", reply_markup=build_webapp_keyboard(), disable_web_page_preview=True)


@router.message(Command("test"))
async def cmd_test_sources(message: Message):
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
    ff_st = "✅ активен (выход строго .mp3)" if HAS_FFMPEG else "⚠️ не установлен (нужен ffmpeg в Dockerfile)"
    await m.edit_text(
        "<b>Диагностика источников сервера (v27):</b>\n\n"
        + "\n".join(lines)
        + f"\n\n🎛 ffmpeg: {ff_st}\n🍪 cookies.txt: {cookies_st}",
        parse_mode="HTML",
    )


@router.message(Command("setstorage"))
async def cmd_set_storage(message: Message):
    if ADMIN_ID and message.from_user and message.from_user.id != ADMIN_ID:
        await message.answer("Только администратор может менять хранилище.")
        return
    set_setting("storage_chat_id", str(message.chat.id))
    await message.answer(f"✅ Чат <code>{message.chat.id}</code> назначен хранилищем APATHY.", parse_mode="HTML")


@router.channel_post(Command("setstorage"))
async def channel_set_storage(message: Message):
    set_setting("storage_chat_id", str(message.chat.id))
    await message.answer(f"✅ Канал <code>{message.chat.id}</code> подключён к APATHY.", parse_mode="HTML")


@router.message(Command("setapi"))
async def cmd_set_api(message: Message):
    if ADMIN_ID and message.from_user and message.from_user.id != ADMIN_ID:
        await message.answer("Только администратор может менять адрес API.")
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
async def cmd_delete_track(message: Message):
    if ADMIN_ID and message.from_user and message.from_user.id != ADMIN_ID:
        await message.answer("Только администратор может удалять треки.")
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
            await message.answer(f"🗑 Удалено: <b>{r['artist']} — {r['title']}</b>", parse_mode="HTML")
            return
    await message.answer("Трек не найден в базе.")


@router.message(Command("list"))
async def cmd_list(message: Message):
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
        if ADMIN_ID and message.from_user and message.from_user.id != ADMIN_ID:
            return
        try:
            await bot.download(message.document, destination=str(COOKIES_PATH))
            await message.reply("🍪 Файл <b>cookies.txt</b> сохранён! Прямое скачивание с YouTube активировано.", parse_mode="HTML")
        except Exception as e:
            await message.reply(f"Не удалось сохранить cookies.txt: {e}")
        return

    meta = _extract_audio_from_msg(message)
    if not meta:
        return
    uid = message.from_user.id if message.from_user else 0
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
        added_by=uid,
    )
    await message.reply(
        f"✅ <b>{meta['artist']} — {meta['title']}</b> добавлен на сайт APATHY!",
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
        f"Найдено по запросу <b>«{query}»</b> (только аудио):",
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

    row = DB.execute("SELECT * FROM tracks WHERE id = ?", (item["id"],)).fetchone()
    if row and row["tg_file_id"]:
        await callback.answer("Отправляю аудио...")
        await callback.message.answer_audio(
            audio=row["tg_file_id"],
            caption=f"⚡ <b>{row['artist']} — {row['title']}</b>\nУже доступно в плеере APATHY",
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
        st_id = get_storage_chat_id()
        if st_id and st_id != callback.message.chat.id:
            try:
                await bot.send_audio(chat_id=st_id, audio=fid)
            except Exception:
                pass
    else:
        hint = " (YouTube запросил проверку — попробуй вариант с ☁️ или 🎧, либо выполни /test)" if err == "youtube_bot_check" else f" ({err})"
        await callback.message.answer(f"Не удалось загрузить этот вариант{hint}. Выбери другой трек из списка.")


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
    origin = request.headers.get("Origin", "")
    resp.headers["Access-Control-Allow-Origin"] = origin if origin == SITE_URL else "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Range, Accept, Content-Type"
    resp.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges, Content-Type"
    return resp


async def api_ping(request: web.Request) -> web.Response:
    total = DB.execute("SELECT COUNT(*) AS c FROM tracks WHERE tg_file_id != ''").fetchone()["c"]
    return web.json_response(
        {
            "ok": True,
            "service": "apathy-tg-audio-v27",
            "version": "v27",
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
            resp_headers = {
                "Content-Type": ct,
                "Accept-Ranges": up.headers.get("Accept-Ranges", "bytes"),
                "Cache-Control": "public, max-age=3600",
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
        is_direct_mp3 = ("mpeg" in mime) or direct_url.lower().split("?")[0].endswith(".mp3")
        if is_direct_mp3:
            if AUTO_CACHE_TO_TG:
                st_id = get_storage_chat_id()
                if st_id and not rec.get("tg_file_id") and track_id not in BG_CACHE_INFLIGHT:
                    asyncio.create_task(upload_audio_to_telegram(bot, session, rec, st_id))
            return await proxy_audio_stream(request, direct_url, default_mime="audio/mpeg")

    # 4) YouTube DASH m4a / SoundCloud HLS -> конвертируем в чистый .mp3 (1-2 сек) и отдаём как стандартный MP3 с Range 206!
    if HAS_FFMPEG:
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


async def main():
    global BOT_USERNAME_CACHE, HTTP_SESSION_REF

    if not BOT_TOKEN or BOT_TOKEN == "ВСТАВЬ_ТОКЕН_ОТ_BOTFATHER":
        raise SystemExit("ОШИБКА: Укажите переменную окружения BOT_TOKEN (или в файле .env)!")

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)

    me = await bot.get_me()
    BOT_USERNAME_CACHE = f"@{me.username}" if me.username else str(me.id)
    log.info("APATHY v27 Audio-Only Bot started: %s | Site: %s | ffmpeg=%s", BOT_USERNAME_CACHE, SITE_URL, HAS_FFMPEG)

    connector = aiohttp.TCPConnector(limit=30, ttl_dns_cache=300)
    http_session = aiohttp.ClientSession(connector=connector)
    HTTP_SESSION_REF = http_session

    app = web.Application(middlewares=[cors_middleware])
    app["bot"] = bot
    app["http_session"] = http_session

    app.router.add_get("/health", api_ping)
    app.router.add_get("/api/tg/ping", api_ping)
    app.router.add_get("/api/tg/library", api_library)
    app.router.add_get("/api/tg/search", api_search)
    app.router.add_get("/api/tg/resolve", api_resolve)
    app.router.add_route("GET", "/api/tg/stream/{track_id}", api_stream)
    app.router.add_route("HEAD", "/api/tg/stream/{track_id}", api_stream)
    app.router.add_get("/api/tg/thumb/{file_id}", api_thumb)
    app.router.add_get("/", serve_index)

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

    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await dp.start_polling(bot, allowed_updates=["message", "callback_query", "channel_post"])
    finally:
        await runner.cleanup()
        await http_session.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
