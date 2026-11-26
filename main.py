#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
APATHY — Единый сервер Telegram-бота + Веб-плеер APATHY (v22)
==============================================================
Возможности:
  1. Поиск треков прямо в Telegram-боте (YouTube + SoundCloud через yt-dlp) и мгновенное добавление на сайт.
  2. Пересылка/загрузка ЛЮБОГО аудиофайла из других Telegram-ботов и каналов прямо в бота -> трек сразу появляется на сайте!
  3. Автоиндексация постов с музыкой из вашего Telegram-канала (если бот добавлен туда админом).
  4. Единый HTTP API + встроенная раздача сайта APATHY (работает и в Safari/Chrome, и как Telegram Mini App):
       - GET /api/tg/ping                 — проверка работы сервера
       - GET /api/tg/library              — список всех треков, сохранённых через Telegram
       - GET /api/tg/search?q=...         — единый поиск: база Telegram + живой поиск yt-dlp
       - GET /api/tg/resolve?artist=&title= — подбор полного трека для сайта
       - GET /api/tg/stream/<id>          — потоковое аудио (HTTP Range 206 для iPhone Safari) из Telegram CDN или yt-dlp с фоновым кэшированием в Telegram!
       - GET /api/tg/thumb/<file_id>      — обложки треков из Telegram
"""

import asyncio
import hashlib
import logging
import os
import re
import sqlite3
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

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

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip().rstrip("/")
STORAGE_CHAT_ID_ENV = os.getenv("STORAGE_CHAT_ID", "").strip()
ADMIN_ID_ENV = os.getenv("ADMIN_ID", "").strip()
HOST = os.getenv("HOST", "0.0.0.0").strip()
PORT = int(os.getenv("PORT", "8080"))
DB_PATH = BASE_DIR / os.getenv("DB_FILE", "apathy_music.db")
WEB_DIR = BASE_DIR / "web"

ADMIN_ID: Optional[int] = int(ADMIN_ID_ENV) if ADMIN_ID_ENV.lstrip("-").isdigit() else None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("apathy_bot")

# -------------------- БАЗА ДАННЫХ (SQLite) --------------------
def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tracks_source_id ON tracks(source_id);")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )
    if STORAGE_CHAT_ID_ENV:
        conn.execute(
            "INSERT OR REPLACE INTO settings(key, value) VALUES('storage_chat_id', ?)",
            (STORAGE_CHAT_ID_ENV,),
        )
    conn.commit()
    return conn


DB = init_db()


def get_storage_chat_id() -> Optional[int]:
    row = DB.execute("SELECT value FROM settings WHERE key='storage_chat_id'").fetchone()
    val = (row["value"] if row else STORAGE_CHAT_ID_ENV).strip()
    if val and val.lstrip("-").isdigit():
        return int(val)
    return None


def set_storage_chat_id(chat_id: int) -> None:
    DB.execute(
        "INSERT OR REPLACE INTO settings(key, value) VALUES('storage_chat_id', ?)",
        (str(chat_id),),
    )
    DB.commit()


def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip()


def fold_ru(s: str) -> str:
    return re.sub(r"[^a-zа-я0-9]+", " ", str(s or "").lower().replace("ё", "е")).strip()


def make_track_id(prefix: str, key: str) -> str:
    h = hashlib.sha1(key.encode("utf-8", errors="ignore")).hexdigest()[:12]
    return f"{prefix}_{h}"


def upsert_track(
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
    return row_to_api_track(row)


def row_to_api_track(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    artwork = d.get("artwork") or ""
    if not artwork and d.get("tg_thumb_id"):
        artwork = f"/api/tg/thumb/{quote(d['tg_thumb_id'], safe='')}"
    in_tg = bool(d.get("tg_file_id"))
    return {
        "id": d["id"],
        "title": d["title"],
        "artist": d["artist"],
        "duration": d["duration"] or 180,
        "artwork": artwork,
        "source": "telegram" if in_tg else (d.get("source") or "youtube"),
        "sourceLabel": "Telegram" if in_tg else ("SoundCloud" if d.get("source") == "soundcloud" else "YouTube"),
        "inTelegram": in_tg,
        "ytVideoId": d["source_id"] if d.get("source") == "youtube" and len(d.get("source_id") or "") == 11 else "",
        "streamUrl": f"/api/tg/stream/{quote(d['id'], safe='')}",
    }


def search_db_tracks(query: str = "", limit: int = 50) -> List[Dict[str, Any]]:
    q = fold_ru(query)
    rows = DB.execute("SELECT * FROM tracks ORDER BY created_at DESC LIMIT 400").fetchall()
    if not q:
        return [row_to_api_track(r) for r in rows[:limit]]

    tokens = [w for w in q.split() if len(w) >= 2]
    scored = []
    for r in rows:
        hay = fold_ru(f"{r['artist']} {r['title']}")
        score = 0
        if q in hay:
            score += 20
        matched = sum(1 for tok in tokens if tok in hay)
        if tokens and matched == len(tokens):
            score += 15
        else:
            score += matched * 4
        if score > 0:
            if r["tg_file_id"]:
                score += 6
            scored.append((score, r))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [row_to_api_track(r) for _, r in scored[:limit]]


# -------------------- КЭШ И YT-DLP ДВИЖОК --------------------
# Кэш результатов поиска (query -> (timestamp, list_of_items))
SEARCH_CACHE: Dict[str, tuple] = {}
# Кэш временных прямых аудио-ссылок yt-dlp (track_id -> (expires_at, url, mime_type))
DIRECT_STREAM_CACHE: Dict[str, tuple] = {}
# Кэш путей файлов Telegram Bot API (tg_file_id -> (expires_at, file_path))
TG_FILE_PATH_CACHE: Dict[str, tuple] = {}
# Кэш для inline-кнопок бота (short_key -> item_dict)
BOT_PICK_CACHE: Dict[str, Dict[str, Any]] = {}
# Защита от двойного фонового кэширования одного трека
BG_CACHE_INFLIGHT: set = set()


def _parse_artist_title(raw_title: str, uploader: str) -> tuple:
    t = clean_text(raw_title)
    u = re.sub(r"\s*-\s*Topic$", "", clean_text(uploader), flags=re.I)
    t = re.sub(r"\s*[\(\[]\s*(official\s*(music\s*)?video|official\s*audio|lyric\s*video|lyrics|hd|4k|клип|премьера)\s*[\)\]]", "", t, flags=re.I).strip()
    m = re.match(r"^(.{2,48}?)\s+[–—-]\s+(.{2,120})$", t)
    if m:
        return clean_text(m.group(1)), clean_text(m.group(2))
    return (u or "YouTube"), (t or raw_title)


def _ytdlp_search_sync(query: str, max_yt: int = 8, max_sc: int = 4) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    seen: set = set()

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "noplaylist": True,
        "socket_timeout": 7,
    }

    def run_spec(spec: str, source_name: str):
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(spec, download=False)
            entries = (info or {}).get("entries") or []
            for ent in entries:
                if not ent:
                    continue
                vid = str(ent.get("id") or "")
                raw_url = ent.get("webpage_url") or ent.get("url") or ""
                if source_name == "youtube" and vid and len(vid) == 11:
                    raw_url = f"https://www.youtube.com/watch?v={vid}"
                if not raw_url:
                    continue
                dur = int(ent.get("duration") or 0)
                if dur and (dur < 25 or dur > 1200):
                    continue
                artist, title = _parse_artist_title(ent.get("title") or "", ent.get("uploader") or ent.get("channel") or "")
                if not title:
                    continue
                dedup_key = fold_ru(f"{artist} {title}")
                if dedup_key in seen:
                    continue
                seen.add(dedup_key)

                thumb = ""
                thumbs = ent.get("thumbnails")
                if isinstance(thumbs, list) and thumbs:
                    thumb = thumbs[-1].get("url") or ""
                elif ent.get("thumbnail"):
                    thumb = str(ent.get("thumbnail"))
                elif source_name == "youtube" and len(vid) == 11:
                    thumb = f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg"

                tid = f"yt_{vid}" if (source_name == "youtube" and len(vid) == 11) else make_track_id("sc", raw_url)
                results.append(
                    {
                        "id": tid,
                        "title": title,
                        "artist": artist,
                        "duration": dur or 180,
                        "artwork": thumb,
                        "source": source_name,
                        "source_id": vid or tid,
                        "source_url": raw_url,
                    }
                )
        except Exception as e:
            log.warning("yt-dlp search failed (%s): %s", spec, e)

    run_spec(f"ytsearch{max_yt}:{query} audio", "youtube")
    if len(results) < 5 and max_sc > 0:
        run_spec(f"scsearch{max_sc}:{query}", "soundcloud")
    return results


async def ytdlp_search(query: str, max_yt: int = 8, max_sc: int = 4) -> List[Dict[str, Any]]:
    key = f"{query.lower().strip()}|{max_yt}|{max_sc}"
    cached = SEARCH_CACHE.get(key)
    if cached and (time.time() - cached[0] < 600):
        return cached[1]
    items = await asyncio.to_thread(_ytdlp_search_sync, query, max_yt, max_sc)
    if items:
        SEARCH_CACHE[key] = (time.time(), items)
        # Сохраняем метаданные найденных треков в БД (без tg_file_id пока), чтобы /api/tg/stream/<id> сразу знал source_url!
        for it in items:
            upsert_track(
                track_id=it["id"],
                title=it["title"],
                artist=it["artist"],
                duration=it["duration"],
                artwork=it["artwork"],
                source=it["source"],
                source_id=it["source_id"],
                source_url=it["source_url"],
            )
    return items


def _ytdlp_extract_stream_sync(source_url: str) -> Optional[tuple]:
    """Извлекает прямую аудио-ссылку (предпочтительно m4a/mp3 для iPhone Safari)."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "format": "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio[acodec^=mp4a]/bestaudio/best",
        "socket_timeout": 10,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_url, download=False)
        if not info:
            return None
        url = info.get("url")
        ext = (info.get("ext") or "m4a").lower()
        if not url and isinstance(info.get("formats"), list):
            for fmt in reversed(info["formats"]):
                if fmt.get("url") and fmt.get("acodec") not in (None, "none"):
                    url = fmt["url"]
                    ext = (fmt.get("ext") or "m4a").lower()
                    break
        if not url:
            return None
        mime = "audio/mpeg" if ext == "mp3" else ("audio/mp4" if ext in ("m4a", "mp4") else "audio/webm")
        dur = int(info.get("duration") or 0)
        return (url, mime, dur)
    except Exception as e:
        log.warning("yt-dlp extract stream failed (%s): %s", source_url, e)
        return None


def _ytdlp_download_file_sync(source_url: str, out_dir: str) -> Optional[Dict[str, Any]]:
    """Скачивает аудиофайл (без ffmpeg — нативный m4a/mp3) во временную папку для отправки в Telegram."""
    out_tmpl = os.path.join(out_dir, "%(id)s.%(ext)s")
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": "bestaudio[ext=m4a][filesize<19M]/bestaudio[ext=mp3][filesize<19M]/bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio",
        "outtmpl": out_tmpl,
        "max_filesize": 19_500_000,
        "socket_timeout": 15,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_url, download=True)
            if not info:
                return None
            file_path = ydl.prepare_filename(info)
            if not os.path.exists(file_path):
                # Fallback scan directory
                for fname in os.listdir(out_dir):
                    full = os.path.join(out_dir, fname)
                    if os.path.isfile(full) and os.path.getsize(full) > 1024:
                        file_path = full
                        break
            if not os.path.exists(file_path):
                return None
            return {
                "path": file_path,
                "duration": int(info.get("duration") or 0),
                "ext": Path(file_path).suffix.lstrip(".").lower() or "m4a",
            }
    except Exception as e:
        log.warning("yt-dlp download failed (%s): %s", source_url, e)
        return None


async def cache_track_to_telegram(bot: Bot, track_row: Dict[str, Any], target_chat_id: int) -> Optional[str]:
    """Скачивает трек и загружает в Telegram (чат или канал-хранилище), сохраняя постоянный tg_file_id."""
    tid = track_row["id"]
    if tid in BG_CACHE_INFLIGHT:
        return None
    BG_CACHE_INFLIGHT.add(tid)
    try:
        src_url = track_row.get("source_url") or ""
        if not src_url:
            return None
        with tempfile.TemporaryDirectory(prefix="apathy_") as tmpdir:
            dl = await asyncio.to_thread(_ytdlp_download_file_sync, src_url, tmpdir)
            if not dl or not os.path.exists(dl["path"]):
                return None
            size = os.path.getsize(dl["path"])
            if size <= 1024 or size > 48_000_000:
                return None

            safe_name = re.sub(r'[\\/:*?"<>|]+', "", f"{track_row['artist']} - {track_row['title']}")[:90]
            ext = dl.get("ext") or "m4a"
            audio_file = FSInputFile(dl["path"], filename=f"{safe_name}.{ext}")
            sent = await bot.send_audio(
                chat_id=target_chat_id,
                audio=audio_file,
                title=track_row["title"][:64],
                performer=track_row["artist"][:64],
                duration=dl.get("duration") or track_row.get("duration") or None,
                caption=f"🎵 <b>{track_row['artist']} — {track_row['title']}</b>\nДобавлено в плеер APATHY",
                parse_mode="HTML",
            )
            if sent and sent.audio:
                fid = sent.audio.file_id
                th_id = sent.audio.thumbnail.file_id if sent.audio.thumbnail else ""
                mime = sent.audio.mime_type or ("audio/mp4" if ext == "m4a" else "audio/mpeg")
                upsert_track(
                    track_id=tid,
                    title=track_row["title"],
                    artist=track_row["artist"],
                    duration=sent.audio.duration or dl.get("duration") or track_row.get("duration") or 180,
                    artwork=track_row.get("artwork") or "",
                    source=track_row.get("source") or "telegram",
                    source_id=track_row.get("source_id") or "",
                    source_url=src_url,
                    tg_file_id=fid,
                    tg_thumb_id=th_id,
                    mime_type=mime,
                )
                log.info("Cached track %s to Telegram (file_id=%s...)", tid, fid[:16])
                return fid
    except Exception as e:
        log.warning("Failed to cache track %s to Telegram: %s", tid, e)
    finally:
        BG_CACHE_INFLIGHT.discard(tid)
    return None


async def get_tg_file_url(bot: Bot, file_id: str) -> Optional[str]:
    now = time.time()
    cached = TG_FILE_PATH_CACHE.get(file_id)
    if cached and cached[0] > now:
        return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{cached[1]}"
    try:
        f = await bot.get_file(file_id)
        if f and f.file_path:
            TG_FILE_PATH_CACHE[file_id] = (now + 1800, f.file_path)
            return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{f.file_path}"
    except Exception as e:
        log.warning("Telegram getFile failed (%s): %s", file_id[:16], e)
    return None


# -------------------- TELEGRAM BOT HANDLERS (aiogram v3) --------------------
router = Router()
BOT_USERNAME_CACHE = ""


def build_webapp_keyboard() -> Optional[InlineKeyboardMarkup]:
    if not WEBAPP_URL:
        return None
    if WEBAPP_URL.startswith("https://"):
        btn = InlineKeyboardButton(text="🎵 Открыть плеер APATHY", web_app=WebAppInfo(url=WEBAPP_URL))
    else:
        btn = InlineKeyboardButton(text="🎵 Открыть сайт APATHY", url=WEBAPP_URL)
    return InlineKeyboardMarkup(inline_keyboard=[[btn]])


@router.message(CommandStart())
async def cmd_start(message: Message):
    total = DB.execute("SELECT COUNT(*) AS c FROM tracks WHERE tg_file_id != ''").fetchone()["c"]
    text = (
        "<b>APATHY · Музыкальный бот</b>\n\n"
        "Как добавлять и искать треки на сайте:\n"
        "1️⃣ <b>Напиши название трека или артиста</b> — бот найдёт полные версии и по нажатию загрузит их в плеер.\n"
        "2️⃣ <b>Перешли любой аудиофайл</b> из других музыкальных ботов или каналов — он мгновенно появится на сайте APATHY.\n"
        "3️⃣ <b>Поиск на самом сайте</b> автоматически ищет и в базе бота, и в сети.\n\n"
        f"💾 Треков в базе Telegram: <b>{total}</b>\n"
        "Команды: /list — последние треки, /setstorage — сделать этот чат хранилищем"
    )
    await message.answer(text, parse_mode="HTML", reply_markup=build_webapp_keyboard())


@router.message(Command("setstorage"))
async def cmd_set_storage(message: Message):
    if ADMIN_ID and message.from_user and message.from_user.id != ADMIN_ID:
        await message.answer("Только администратор может менять чат-хранилище.")
        return
    set_storage_chat_id(message.chat.id)
    await message.answer(
        f"✅ Этот чат (<code>{message.chat.id}</code>) назначен хранилищем кэша APATHY.\n"
        "Все новые треки с сайта будут автоматически сохраняться сюда для мгновенного запуска!",
        parse_mode="HTML",
    )


@router.channel_post(Command("setstorage"))
async def channel_set_storage(message: Message):
    set_storage_chat_id(message.chat.id)
    await message.answer(f"✅ Канал <code>{message.chat.id}</code> подключён как хранилище APATHY.", parse_mode="HTML")


@router.message(Command("list"))
async def cmd_list(message: Message):
    rows = DB.execute("SELECT * FROM tracks WHERE tg_file_id != '' ORDER BY created_at DESC LIMIT 15").fetchall()
    if not rows:
        await message.answer("В базе Telegram пока нет треков. Напиши название песни или перешли аудиофайл сюда!")
        return
    lines = [f"<b>Последние треки в APATHY ({len(rows)}):</b>"]
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
async def handle_uploaded_audio(message: Message):
    meta = _extract_audio_from_msg(message)
    if not meta:
        return
    uid = message.from_user.id if message.from_user else 0
    upsert_track(
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
    upsert_track(
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
    log.info("Auto-indexed channel audio: %s - %s", meta["artist"], meta["title"])


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_search(message: Message):
    query = clean_text(message.text or "")
    if len(query) < 2:
        return

    status_msg = await message.answer(f"🔎 Ищу <b>{query}</b>...", parse_mode="HTML")

    db_hits = search_db_tracks(query, limit=4)
    net_hits = await ytdlp_search(query, max_yt=7, max_sc=3)

    combined: List[Dict[str, Any]] = []
    seen = set()

    for it in db_hits:
        k = fold_ru(f"{it['artist']} {it['title']}")
        if k not in seen:
            seen.add(k)
            combined.append({**it, "from_db": True})

    for it in net_hits:
        k = fold_ru(f"{it['artist']} {it['title']}")
        if k not in seen:
            seen.add(k)
            combined.append({**it, "from_db": False})

    combined = combined[:8]
    if not combined:
        await status_msg.edit_text(f"По запросу «{query}» ничего не найдено. Попробуй другое написание.")
        return

    buttons = []
    for idx, item in enumerate(combined):
        pick_key = hashlib.md5(f"{item['id']}:{time.time()}:{idx}".encode()).hexdigest()[:10]
        BOT_PICK_CACHE[pick_key] = item
        if len(BOT_PICK_CACHE) > 500:
            BOT_PICK_CACHE.pop(next(iter(BOT_PICK_CACHE)))

        m, s = divmod(int(item.get("duration") or 0), 60)
        mark = "⚡" if item.get("inTelegram") else "🎵"
        label = f"{mark} {item['artist']} — {item['title']}"
        if len(label) > 48:
            label = label[:45] + "..."
        label += f" ({m}:{s:02d})"
        buttons.append([InlineKeyboardButton(text=label, callback_data=f"pick:{pick_key}")])

    if WEBAPP_URL:
        if WEBAPP_URL.startswith("https://"):
            buttons.append([InlineKeyboardButton(text="🎧 Открыть плеер APATHY", web_app=WebAppInfo(url=WEBAPP_URL))])
        else:
            buttons.append([InlineKeyboardButton(text="🎧 Открыть сайт APATHY", url=WEBAPP_URL)])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    await status_msg.edit_text(
        f"Найдено по запросу <b>«{query}»</b>.\nНажми на трек — он загрузится сюда и сразу появится в плеере APATHY:",
        parse_mode="HTML",
        reply_markup=kb,
    )


@router.callback_query(F.data.startswith("pick:"))
async def handle_pick_callback(callback: CallbackQuery, bot: Bot):
    pick_key = (callback.data or "").split(":", 1)[1]
    item = BOT_PICK_CACHE.get(pick_key)
    if not item:
        await callback.answer("Кнопка устарела — повтори поиск.", show_alert=True)
        return

    row = DB.execute("SELECT * FROM tracks WHERE id = ?", (item["id"],)).fetchone()
    if row and row["tg_file_id"]:
        await callback.answer("Отправляю трек...")
        await callback.message.answer_audio(
            audio=row["tg_file_id"],
            caption=f"⚡ <b>{row['artist']} — {row['title']}</b>\nУже доступен в плеере APATHY",
            parse_mode="HTML",
            reply_markup=build_webapp_keyboard(),
        )
        return

    await callback.answer("Скачиваю полный трек...")
    prog = await callback.message.answer(f"⏳ Загружаю <b>{item['artist']} — {item['title']}</b>...", parse_mode="HTML")

    track_dict = dict(row) if row else item
    fid = await cache_track_to_telegram(bot, track_dict, callback.message.chat.id)
    try:
        await prog.delete()
    except Exception:
        pass

    if fid:
        # Also mirror to storage channel if configured and different from current chat
        st_id = get_storage_chat_id()
        if st_id and st_id != callback.message.chat.id:
            try:
                await bot.send_audio(chat_id=st_id, audio=fid)
            except Exception:
                pass
    else:
        await callback.message.answer(
            "Не удалось скачать этот вариант (возможно, файл больше 19 МБ или заблокирован). Выбери другой вариант из списка."
        )


# -------------------- HTTP API & WEB SERVER (aiohttp) --------------------
@web.middleware
async def cors_middleware(request: web.Request, handler):
    if request.method == "OPTIONS":
        resp = web.Response(status=204)
    else:
        try:
            resp = await handler(request)
        except web.HTTPException as ex:
            resp = ex
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Range, Accept, Content-Type"
    resp.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges, Content-Type"
    return resp


async def api_ping(request: web.Request) -> web.Response:
    total = DB.execute("SELECT COUNT(*) AS c FROM tracks WHERE tg_file_id != ''").fetchone()["c"]
    return web.json_response(
        {
            "ok": True,
            "service": "apathy-telegram-music",
            "bot": BOT_USERNAME_CACHE,
            "tracksCount": total,
            "hasStorage": get_storage_chat_id() is not None,
        }
    )


async def api_library(request: web.Request) -> web.Response:
    limit = min(int(request.query.get("limit", "60") or 60), 200)
    rows = DB.execute(
        "SELECT * FROM tracks WHERE tg_file_id != '' ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    tracks = [row_to_api_track(r) for r in rows]
    return web.json_response(
        {
            "ok": True,
            "sources": ["Telegram Бот"] if tracks else [],
            "tracks": tracks,
        }
    )


async def api_search(request: web.Request) -> web.Response:
    q = clean_text(request.query.get("q", ""))
    if not q:
        return await api_library(request)

    db_hits = search_db_tracks(q, limit=20)
    net_raw = await ytdlp_search(q, max_yt=10, max_sc=4)

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
        if row:
            api_t = row_to_api_track(row)
            tracks.append(api_t)
            lbl = "Telegram" if api_t["inTelegram"] else ("YouTube" if raw["source"] == "youtube" else "SoundCloud")
            if lbl not in sources:
                sources.append(lbl)

    return web.json_response({"ok": True, "query": q, "sources": sources, "tracks": tracks[:30]})


async def api_resolve(request: web.Request) -> web.Response:
    artist = clean_text(request.query.get("artist", ""))
    title = clean_text(request.query.get("title", ""))
    vid = clean_text(request.query.get("v", ""))

    if vid and re.match(r"^[A-Za-z0-9_-]{11}$", vid):
        tid = f"yt_{vid}"
        row = DB.execute("SELECT * FROM tracks WHERE id = ?", (tid,)).fetchone()
        if not row:
            upsert_track(
                track_id=tid,
                title=title or "YouTube Audio",
                artist=artist or "YouTube",
                duration=180,
                artwork=f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                source="youtube",
                source_id=vid,
                source_url=f"https://www.youtube.com/watch?v={vid}",
            )
            row = DB.execute("SELECT * FROM tracks WHERE id = ?", (tid,)).fetchone()
        t = row_to_api_track(row)
        return web.json_response(
            {
                "ok": True,
                "id": t["id"],
                "streamUrl": t["streamUrl"],
                "label": "Telegram · Полный" if t["inTelegram"] else "Бот · Полный",
                "duration": t["duration"],
            }
        )

    q = clean_text(f"{artist} {title}")
    if not q:
        return web.json_response({"ok": False, "error": "empty query"}, status=400)

    db_hits = search_db_tracks(q, limit=3)
    if db_hits:
        best = db_hits[0]
        return web.json_response(
            {
                "ok": True,
                "id": best["id"],
                "streamUrl": best["streamUrl"],
                "label": "Telegram · Полный" if best["inTelegram"] else "Бот · Полный",
                "duration": best["duration"],
            }
        )

    net_hits = await ytdlp_search(q, max_yt=5, max_sc=2)
    if net_hits:
        best_id = net_hits[0]["id"]
        row = DB.execute("SELECT * FROM tracks WHERE id = ?", (best_id,)).fetchone()
        if row:
            t = row_to_api_track(row)
            return web.json_response(
                {
                    "ok": True,
                    "id": t["id"],
                    "streamUrl": t["streamUrl"],
                    "label": "Бот · Полный",
                    "duration": t["duration"],
                }
            )

    return web.json_response({"ok": False})


async def proxy_audio_url(request: web.Request, upstream_url: str, default_mime: str = "audio/mpeg") -> web.StreamResponse:
    """Стримит аудиофайл с полной поддержкой HTTP Range (206 Partial Content для iPhone Safari)."""
    req_headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
        "Accept": "*/*",
    }
    if "Range" in request.headers:
        req_headers["Range"] = request.headers["Range"]

    session: aiohttp.ClientSession = request.app["http_session"]
    try:
        async with session.request(
            "HEAD" if request.method == "HEAD" else "GET",
            upstream_url,
            headers=req_headers,
            allow_redirects=True,
            timeout=aiohttp.ClientTimeout(total=None, sock_connect=10, sock_read=30),
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
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
            }
            if "Content-Length" in up.headers:
                resp_headers["Content-Length"] = up.headers["Content-Length"]
            if "Content-Range" in up.headers:
                resp_headers["Content-Range"] = up.headers["Content-Range"]

            resp = web.StreamResponse(status=up.status, headers=resp_headers)
            await resp.prepare(request)
            if request.method != "HEAD":
                async for chunk in up.content.iter_chunked(65536):
                    await resp.write(chunk)
            await resp.write_eof()
            return resp
    except (asyncio.CancelledError, ConnectionResetError):
        return web.Response(status=499)
    except Exception as e:
        log.warning("Stream proxy error: %s", e)
        return web.Response(status=502, text="Stream error")


async def api_stream(request: web.Request) -> web.StreamResponse:
    track_id = request.match_info.get("track_id", "").strip()
    row = DB.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    if not row:
        return web.Response(status=404, text="Track not found")

    bot: Bot = request.app["bot"]
    default_mime = row["mime_type"] or "audio/mpeg"

    # 1) Трек уже сохранён в Telegram -> мгновенный стрим напрямую с Telegram CDN!
    if row["tg_file_id"]:
        tg_url = await get_tg_file_url(bot, row["tg_file_id"])
        if tg_url:
            return await proxy_audio_url(request, tg_url, default_mime=default_mime)

    # 2) Трек ещё не в Telegram -> извлекаем прямой аудиопоток yt-dlp и в фоне кэшируем в канал-хранилище!
    src_url = row["source_url"] or ""
    if not src_url:
        return web.Response(status=404, text="No audio source")

    now = time.time()
    cached = DIRECT_STREAM_CACHE.get(track_id)
    if cached and cached[0] > now:
        direct_url, mime = cached[1], cached[2]
    else:
        ext_res = await asyncio.to_thread(_ytdlp_extract_stream_sync, src_url)
        if not ext_res:
            return web.Response(status=502, text="Failed to extract audio stream")
        direct_url, mime, dur = ext_res
        DIRECT_STREAM_CACHE[track_id] = (now + 1200, direct_url, mime)
        if dur > 10 and row["duration"] != dur:
            DB.execute("UPDATE tracks SET duration = ? WHERE id = ?", (dur, track_id))
            DB.commit()

    # Фоновое кэширование трека в Telegram-канал, чтобы в следующий раз играл напрямую с Telegram!
    st_id = get_storage_chat_id()
    if st_id and not row["tg_file_id"] and track_id not in BG_CACHE_INFLIGHT:
        asyncio.create_task(cache_track_to_telegram(bot, dict(row), st_id))

    return await proxy_audio_url(request, direct_url, default_mime=mime)


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
        async with session.get(tg_url, timeout=aiohttp.ClientTimeout(total=10)) as up:
            if up.status != 200:
                return web.Response(status=404)
            body = await up.read()
            return web.Response(
                body=body,
                headers={
                    "Content-Type": up.headers.get("Content-Type", "image/jpeg"),
                    "Cache-Control": "public, max-age=86400",
                    "Access-Control-Allow-Origin": "*",
                },
            )
    except Exception:
        return web.Response(status=404)


async def serve_index(request: web.Request) -> web.StreamResponse:
    idx = WEB_DIR / "index.html"
    if not idx.exists():
        return web.Response(status=404, text="web/index.html not found")
    return web.FileResponse(idx, headers={"Cache-Control": "no-cache, must-revalidate"})


async def main():
    global BOT_USERNAME_CACHE

    if not BOT_TOKEN or BOT_TOKEN == "ВСТАВЬ_ТОКЕН_ОТ_BOTFATHER":
        raise SystemExit(
            "ОШИБКА: Укажите BOT_TOKEN в файле .env (или в переменных окружения хостинга)!\n"
            "Получить токен можно у @BotFather в Telegram."
        )

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    dp.include_router(router)

    me = await bot.get_me()
    BOT_USERNAME_CACHE = f"@{me.username}" if me.username else str(me.id)
    log.info("Telegram Bot started: %s", BOT_USERNAME_CACHE)

    http_session = aiohttp.ClientSession()

    app = web.Application(middlewares=[cors_middleware])
    app["bot"] = bot
    app["http_session"] = http_session

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

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, HOST, PORT)
    await site.start()
    log.info("APATHY Web Server listening on http://%s:%d", HOST, PORT)

    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await dp.start_polling(bot, allowed_updates=["message", "callback_query", "channel_post"])
    finally:
        await runner.cleanup()
        await http_session.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
