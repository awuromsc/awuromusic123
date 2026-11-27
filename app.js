
    (() => {
      // ================= SAFE STORAGE =================
      const store = {
        get(k, fallback) {
          try {
            const v = localStorage.getItem('apathy_v10_' + k);
            return v ? JSON.parse(v) : fallback;
          } catch (e) { return fallback; }
        },
        set(k, v) {
          try { localStorage.setItem('apathy_v10_' + k, JSON.stringify(v)); } catch (e) {}
        }
      };

      // Persistent first-party cookie mirror (180 days) so Telegram session survives localStorage eviction
      const SESSION_COOKIE_NAME = 'apathy_tg_tok_v1';
      const SESSION_COOKIE_MAX_AGE = 180 * 24 * 60 * 60;

      function readSessionCookie() {
        try {
          const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SESSION_COOKIE_NAME + '=([^;]+)'));
          return m ? decodeURIComponent(m[1]) : '';
        } catch (e) { return ''; }
      }

      function writeSessionCookie(token) {
        try {
          const sec = location.protocol === 'https:' ? '; Secure' : '';
          if (token) {
            document.cookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${SESSION_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${sec}`;
          } else {
            document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${sec}`;
          }
        } catch (e) {}
      }

      const initialRestoredToken = String(store.get('tgAuthToken', '') || readSessionCookie() || '').trim();
      if (initialRestoredToken && !store.get('tgAuthToken', '')) {
        store.set('tgAuthToken', initialRestoredToken);
      }

      // ================= STATE =================
      const savedCatalogTracks = store.get('savedCatalogTracks', []);
      const defaultPlaylists = [
        { id: 'pl_main', name: 'Мой плейлист', trackIds: [] },
        { id: 'pl_night', name: 'Ночной вайб', trackIds: [] }
      ];

      let state = {
        libraryTracks: [],
        searchResults: [],
        activeQueue: [],
        playlists: store.get('playlists', defaultPlaylists),
        likedIds: new Set(store.get('liked', [])),
        user: store.get('user', null),
        tgToken: initialRestoredToken,
        theme: store.get('theme', 'chrome'),
        activeTab: 'viewSearch',
        libFilter: 'all',
        selectedPlaylistId: null,
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        lyricsOffset: 0,
        shuffle: false,
        repeat: false,
        volume: Math.max(0, Math.min(1, Number(store.get('volume', 1)))),
        prevVolume: 1,
        lyricsExpanded: false,
        modalTrack: null,
        offlineIds: new Set(),
        offlineDownloadingIds: new Set(),
        offlineBytes: 0,
        offlineMode: Boolean(store.get('offlineMode', false)),
        autoOfflineCache: store.get('autoOfflineCache', true) !== false
      };

      savedCatalogTracks.forEach(t => {
        if (!state.libraryTracks.some(x => x.id === t.id)) state.libraryTracks.push(t);
      });


      function persistSavedCatalogTracks() {
        const toSave = state.libraryTracks
          .filter(t => t.fromTelegramBot || t.fromCatalog)
          .slice(0, 250)
          .map(t => ({
            id: t.id,
            tgTrackId: t.tgTrackId || '',
            tgStreamUrl: t.tgStreamUrl || '',
            title: t.title,
            artist: t.artist,
            album: t.album || 'Telegram Бот',
            duration: t.duration || 180,
            artwork: t.artwork || '',
            coverGrad: t.coverGrad || '',
            source: t.source || 'Telegram',
            inTelegram: !!t.inTelegram,
            fromTelegramBot: true,
            fromCatalog: true
          }));
        store.set('savedCatalogTracks', toSave);
        scheduleCloudSync();
      }
      function persistPlaylists(immediate = false) { store.set('playlists', state.playlists); if (immediate) pushCloudSyncNow(false); else scheduleCloudSync(); }

      function ensureTrackInLibrary(track) {
        if (!track) return;
        const existing = state.libraryTracks.find(t => t.id === track.id);
        if (!existing) {
          state.libraryTracks.unshift({ ...track });
          if (track.fromCatalog || track.fromSoundCloud) persistSavedCatalogTracks();
        }
      }

      function isTrackInAnyPlaylist(trackId) {
        return state.playlists.some(pl => pl.trackIds.includes(trackId));
      }

      // ================= DOM REFS =================
      const $ = id => document.getElementById(id);
      const splashScreen = $('splashScreen');
      const mainApp = $('mainApp');
      const chromeFlash = $('chromeFlash');
      const toastEl = $('toast');
      const topProfileBtn = $('topProfileBtn');
      const searchInput = $('searchInput');
      const searchClear = $('searchClear');
      const viewSearch = $('viewSearch');
      const searchTrackList = $('searchTrackList');
      const searchLoader = $('searchLoader');
      const libraryTrackList = $('libraryTrackList');
      const miniPlayer = $('miniPlayer');
      const playerOverlay = $('playerOverlay');
      const playerSplit = $('playerSplit');
      const lyricsScroll = $('lyricsScroll');

      // ================= TOAST =================
      let toastTimer = null;
      function showToast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
      }

      // ================= THEME MANAGER =================
      const THEME_META = {
        chrome: {
          label: 'Тёмный хром',
          color: '#06070a',
          hi: '#a4b0c2',
          mid: '#566070',
          rim: 'rgba(175, 188, 208, 0.22)',
          dark: '#090b10',
          midTree: '#0e1118',
          backTree: '#151923',
          deep: '#040508',
          mist: 'rgba(130, 144, 164, 0.11)',
          glow: 'rgba(154, 168, 188, 0.16)',
          leaf: 'rgba(116, 102, 86, 0.36)'
        },
        purple: {
          label: 'Тёмно-фиолетовый',
          color: '#08050f',
          hi: '#a896c8',
          mid: '#5a4a78',
          rim: 'rgba(168, 144, 212, 0.20)',
          dark: '#0a0712',
          midTree: '#110c1d',
          backTree: '#19122a',
          deep: '#05030a',
          mist: 'rgba(132, 106, 178, 0.11)',
          glow: 'rgba(148, 122, 198, 0.15)',
          leaf: 'rgba(110, 86, 134, 0.34)'
        },
        red: {
          label: 'Красно-тёмный',
          color: '#0b0406',
          hi: '#b8848e',
          mid: '#6e3f48',
          rim: 'rgba(192, 124, 136, 0.20)',
          dark: '#0d0507',
          midTree: '#16090c',
          backTree: '#200d12',
          deep: '#060204',
          mist: 'rgba(166, 86, 100, 0.10)',
          glow: 'rgba(182, 98, 112, 0.14)',
          leaf: 'rgba(128, 72, 68, 0.34)'
        }
      };
      let activeVizPalette = THEME_META.chrome;

      function applyTheme(themeKey, notify = false) {
        if (!THEME_META[themeKey]) themeKey = 'chrome';
        state.theme = themeKey;
        activeVizPalette = THEME_META[themeKey] || THEME_META.chrome;
        document.documentElement.setAttribute('data-theme', themeKey);
        $('metaThemeColor').setAttribute('content', THEME_META[themeKey].color);
        $('activeThemeLabel').textContent = THEME_META[themeKey].label;
        document.querySelectorAll('.theme-card').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.setTheme === themeKey);
        });
        store.set('theme', themeKey);
        if (notify) { showToast('Тема: ' + THEME_META[themeKey].label); scheduleCloudSync(); }
      }

      // ================= TELEGRAM BOT ONLY ENGINE (v23) =================
      // Весь поиск и вся загрузка аудио идут СТРОГО через ваш Telegram-бот!
      const DEFAULT_TG_BOT_URL = 'https://bot-1795701331-3932-awuro.bothost.tech';

      let tgBotBaseUrl = (() => {
        try {
          const sp = new URLSearchParams(location.search);
          const paramApi = (sp.get('api') || sp.get('bot') || '').trim().replace(/\/+$/, '');
          if (paramApi && /^https?:\/\//i.test(paramApi)) {
            store.set('tgBotBaseUrl', paramApi);
            return paramApi;
          }
        } catch (e) {}
        // If opened directly from the bot's own domain, use same-origin relative /api/tg/*
        if (location.origin === DEFAULT_TG_BOT_URL) return '';
        const saved = String(store.get('tgBotBaseUrl', '') || '').trim().replace(/\/+$/, '');
        if (saved && /^https?:\/\//i.test(saved)) return saved;
        return DEFAULT_TG_BOT_URL;
      })();

      let tgBotConnected = false;
      let tgBotUsername = '';
      let tgBotTotalCount = 0;
      const tgSearchCache = new Map();

      function tgApiUrl(path) {
        return (tgBotBaseUrl || '') + path;
      }

      function initTelegramMiniApp() {
        try {
          const tg = window.Telegram && window.Telegram.WebApp;
          if (!tg) return;
          tg.ready();
          tg.expand();
          if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#06070a');
          if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#06070a');
        } catch (e) {}
      }

      function fetchJsonTimeout(url, timeoutMs = 8000) {
        return new Promise((resolve) => {
          let settled = false;
          const ctrl = new AbortController();
          const done = (val) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(val);
          };
          const timer = setTimeout(() => {
            try { ctrl.abort(); } catch (e) {}
            done(null);
          }, timeoutMs);

          fetch(url, { signal: ctrl.signal })
            .then(res => (res && res.ok) ? res.json() : null)
            .then(data => done(data))
            .catch(() => done(null));
        });
      }

      async function checkTgBotStatus() {
        const data = await fetchJsonTimeout(`${tgApiUrl('/api/tg/ping')}?_=${Date.now()}`, 3500);
        if (data && data.ok === true) {
          tgBotConnected = true;
          tgBotUsername = data.bot || '';
          tgBotTotalCount = Number(data.tracksCount || 0);
          const rBtn = $('tgRefreshBtn');
          if (rBtn) rBtn.classList.add('show');
          return true;
        }
        tgBotConnected = false;
        return false;
      }

      function mapTgBotTrack(item) {
        if (!item || !item.id) return null;
        const rawStream = item.streamUrl || `/api/tg/stream/${encodeURIComponent(item.id)}`;
        const fullStream = rawStream.startsWith('http') ? rawStream : tgApiUrl(rawStream);
        let art = item.artwork || '';
        if (art && art.startsWith('/')) art = tgApiUrl(art);
        const inTg = Boolean(item.inTelegram);
        return {
          id: 'tg_' + item.id,
          tgTrackId: String(item.id),
          tgStreamUrl: fullStream,
          title: item.title || 'Без названия',
          artist: item.artist || 'Исполнитель',
          album: inTg ? 'Telegram Бот' : (item.sourceLabel || 'Telegram Бот'),
          duration: item.duration || 180,
          artwork: art,
          coverGrad: 'linear-gradient(145deg, #163b5c 0%, #070c14 60%, #2468a3 100%)',
          source: inTg ? 'Telegram' : (item.sourceLabel || 'Бот'),
          inTelegram: inTg,
          fromTelegramBot: true,
          fromCatalog: true,
          lyrics: null
        };
      }

      async function searchViaTgBotOnly(query) {
        const q = String(query || '').trim();
        const cacheKey = q.toLowerCase();
        const cached = tgSearchCache.get(cacheKey);
        if (cached && (Date.now() - cached.ts < 3 * 60 * 1000)) {
          return cached;
        }

        const endpoint = q
          ? `${tgApiUrl('/api/tg/search')}?q=${encodeURIComponent(q)}`
          : `${tgApiUrl('/api/tg/library')}?limit=100`;

        const data = await fetchJsonTimeout(endpoint, q ? 11000 : 4500);
        if (!data || !data.ok || !Array.isArray(data.tracks)) {
          return { ok: false, tracks: [], sources: [] };
        }

        tgBotConnected = true;
        const rBtn = $('tgRefreshBtn');
        if (rBtn) rBtn.classList.add('show');

        const tracks = data.tracks.map(mapTgBotTrack).filter(Boolean);
        const sources = Array.isArray(data.sources) && data.sources.length ? data.sources : ['Telegram Бот'];
        const result = { ok: true, tracks, sources, ts: Date.now() };

        if (tracks.length) {
          tgSearchCache.set(cacheKey, result);
          if (tgSearchCache.size > 40) {
            tgSearchCache.delete(tgSearchCache.keys().next().value);
          }
          if (!q) {
            store.set('lastTgLibraryV27', { tracks: tracks.slice(0, 30), sources });
          }
        }
        return result;
      }

      // =========================================================================
      // SYNCED LYRICS ENGINE (LRCLIB MULTI-PASS + YOUTUBE VTT CAPTIONS)
      // =========================================================================
      function cleanTrackMetaForLyrics(track) {
        let title = String(track.title || '')
          .replace(/\(.*?(official|video|audio|lyric|клип|премьера|hd|4k|prod|slowed|reverb|bass|remix|live|radio edit|explicit).*?\)/gi, '')
          .replace(/\[.*?\]/g, '')
          .replace(/\s*(feat\.?|ft\.?|при уч\.?).*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();

        let artist = String(track.artist || '')
          .split(/,|&|\sx\s|\s×\s|feat\.|ft\./i)[0]
          .replace(/\s+/g, ' ')
          .trim();

        return { cleanTitle: title || track.title, cleanArtist: artist || track.artist };
      }

      function parseLrc(lrcText) {
        const out = [];
        const lines = String(lrcText || '').split(/\r?\n/);
        for (const raw of lines) {
          const matches = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
          const text = raw.replace(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g, '').trim();
          if (!text || !matches.length) continue;
          for (const m of matches) {
            const min = parseInt(m[1], 10);
            const sec = parseInt(m[2], 10);
            const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
            out.push({ t: min * 60 + sec + ms / 1000, text });
          }
        }
        out.sort((a, b) => a.t - b.t);
        return out;
      }

      function parseVttTime(str) {
        const parts = str.trim().replace(',', '.').split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
      }

      function parseVttCaptions(vttText) {
        const out = [];
        const blocks = String(vttText || '').replace(/\r/g, '').split(/\n\n+/);
        for (const blk of blocks) {
          const lines = blk.split('\n').map(s => s.trim()).filter(Boolean);
          const tsIdx = lines.findIndex(l => l.includes('-->'));
          if (tsIdx === -1) continue;
          const startStr = lines[tsIdx].split('-->')[0].trim().split(' ')[0];
          const text = lines.slice(tsIdx + 1)
            .join(' ')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .trim();
          if (!text) continue;
          const t = parseVttTime(startStr);
          if (!out.length || out[out.length - 1].text !== text) out.push({ t, text });
        }
        return out;
      }

      function pickBestLrcCandidate(list, targetDur) {
        if (!Array.isArray(list) || !list.length) return null;
        const synced = list.filter(x => x && x.syncedLyrics);
        if (synced.length) {
          if (targetDur > 40) {
            synced.sort((a, b) => Math.abs((a.duration || targetDur) - targetDur) - Math.abs((b.duration || targetDur) - targetDur));
          }
          return { type: 'synced', item: synced[0] };
        }
        const plain = list.filter(x => x && x.plainLyrics);
        if (plain.length) return { type: 'plain', item: plain[0] };
        return null;
      }

      async function fetchSyncedLyricsForTrack(track, ytSubtitles = []) {
        if (!track) return;
        if (track.lyrics && track.lyrics.length > 0 && !track.lyricsIsPlaceholder) return;
        if (isOfflineEffective()) {
          $('lyricsSourceTag').textContent = 'OFFLINE';
          lyricsScroll.innerHTML = `<div class="lyric-line active">${escapeHtml(track.title)}</div><div class="lyric-line">${escapeHtml(track.artist)}</div><div class="lyric-line" style="opacity:0.65;">Оффлайн-режим</div>`;
          return;
        }

        $('lyricsSourceTag').textContent = 'ПОИСК...';
        lyricsScroll.innerHTML = `<div class="lyric-line active" style="opacity:0.65;">Ищем синхронизированный текст...</div>`;

        const { cleanTitle, cleanArtist } = cleanTrackMetaForLyrics(track);
        const dur = track.duration || 180;

        let hit = null;
        if (cleanArtist && cleanTitle) {
          const exact = await fetchJsonTimeout(
            `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`,
            4200
          );
          if (exact && exact.syncedLyrics) hit = { type: 'synced', item: exact };
        }

        if (!hit) {
          const list1 = await fetchJsonTimeout(
            `https://lrclib.net/api/search?q=${encodeURIComponent(cleanArtist + ' ' + cleanTitle)}`,
            5000
          );
          hit = pickBestLrcCandidate(list1, dur);
        }

        if (!hit && cleanTitle.length >= 3) {
          const list2 = await fetchJsonTimeout(
            `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`,
            4500
          );
          hit = pickBestLrcCandidate(list2, dur);
        }

        if (hit && hit.type === 'synced') {
          const parsed = parseLrc(hit.item.syncedLyrics);
          if (parsed.length) {
            track.lyrics = parsed;
            track.lyricsIsPlaceholder = false;
            saveOfflineLyrics(track.id, parsed);
            if (state.currentTrack && state.currentTrack.id === track.id) {
              $('lyricsSourceTag').textContent = 'LRCLIB SYNC';
              renderLyrics(track);
              syncTimeAndLyrics(true);
            }
            return;
          }
        }

        if (hit && hit.type === 'plain' && hit.item.plainLyrics) {
          const rows = hit.item.plainLyrics.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
          if (rows.length) {
            const totalSpan = Math.max(dur * 0.92, 24);
            const step = totalSpan / rows.length;
            track.lyrics = rows.map((text, idx) => ({ t: idx * step + 2, text }));
            track.lyricsIsPlaceholder = false;
            saveOfflineLyrics(track.id, track.lyrics);
            if (state.currentTrack && state.currentTrack.id === track.id) {
              $('lyricsSourceTag').textContent = 'AUTO SYNC';
              renderLyrics(track);
              syncTimeAndLyrics(true);
            }
            return;
          }
        }

        if (state.currentTrack && state.currentTrack.id === track.id) {
          $('lyricsSourceTag').textContent = 'AUDIO';
          track.lyrics = [
            { t: 0, text: track.title },
            { t: 4, text: track.artist },
            { t: 10, text: 'Текст не найден в базе LRCLIB' },
            { t: 18, text: 'Приятного прослушивания в APATHY' }
          ];
          track.lyricsIsPlaceholder = true;
          renderLyrics(track);
          syncTimeAndLyrics(true);
        }
      }

      // ================= OFFLINE AUDIO ENGINE (INDEXEDDB + SERVICE WORKER v32) =================
      const OFFLINE_DB_NAME = 'apathy_offline_v1';
      const OFFLINE_STORE = 'tracks';
      const SESSION_KV_STORE = 'kv';
      const MAX_AUTO_OFFLINE_TRACKS = 60;
      let offlineDbPromise = null;
      let activeOfflineBlobUrl = '';
      let autoCacheTimer = null;

      function isOfflineEffective() {
        return Boolean(state.offlineMode || (typeof navigator !== 'undefined' && navigator.onLine === false));
      }

      function registerServiceWorker() {
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
          navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
        }
      }

      function openOfflineDb() {
        if (offlineDbPromise) return offlineDbPromise;
        if (typeof indexedDB === 'undefined') return Promise.resolve(null);
        offlineDbPromise = new Promise((resolve) => {
          try {
            const req = indexedDB.open(OFFLINE_DB_NAME, 2);
            req.onupgradeneeded = (ev) => {
              const db = ev.target.result;
              if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
                const st = db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
                st.createIndex('savedAt', 'savedAt', { unique: false });
              }
              if (!db.objectStoreNames.contains(SESSION_KV_STORE)) {
                db.createObjectStore(SESSION_KV_STORE, { keyPath: 'k' });
              }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
        return offlineDbPromise;
      }

      async function idbGetRecord(id) {
        const db = await openOfflineDb();
        if (!db) return null;
        return await new Promise((resolve) => {
          try {
            const tx = db.transaction(OFFLINE_STORE, 'readonly');
            const req = tx.objectStore(OFFLINE_STORE).get(String(id));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch (e) { resolve(null); }
        });
      }

      async function idbPutRecord(record) {
        const db = await openOfflineDb();
        if (!db) return false;
        return await new Promise((resolve) => {
          try {
            const tx = db.transaction(OFFLINE_STORE, 'readwrite');
            tx.objectStore(OFFLINE_STORE).put(record);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (e) { resolve(false); }
        });
      }

      async function idbDeleteRecord(id) {
        const db = await openOfflineDb();
        if (!db) return false;
        return await new Promise((resolve) => {
          try {
            const tx = db.transaction(OFFLINE_STORE, 'readwrite');
            tx.objectStore(OFFLINE_STORE).delete(String(id));
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (e) { resolve(false); }
        });
      }

      async function idbClearAll() {
        const db = await openOfflineDb();
        if (!db) return false;
        return await new Promise((resolve) => {
          try {
            const tx = db.transaction(OFFLINE_STORE, 'readwrite');
            tx.objectStore(OFFLINE_STORE).clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (e) { resolve(false); }
        });
      }

      async function idbKvGet(k) {
        const db = await openOfflineDb();
        if (!db || !db.objectStoreNames.contains(SESSION_KV_STORE)) return null;
        return await new Promise((resolve) => {
          try {
            const tx = db.transaction(SESSION_KV_STORE, 'readonly');
            const req = tx.objectStore(SESSION_KV_STORE).get(String(k));
            req.onsuccess = () => resolve(req.result ? req.result.v : null);
            req.onerror = () => resolve(null);
          } catch (e) { resolve(null); }
        });
      }

      async function idbKvSet(k, v) {
        const db = await openOfflineDb();
        if (!db || !db.objectStoreNames.contains(SESSION_KV_STORE)) return false;
        return await new Promise((resolve) => {
          try {
            const tx = db.transaction(SESSION_KV_STORE, 'readwrite');
            if (v === null || v === undefined || v === '') {
              tx.objectStore(SESSION_KV_STORE).delete(String(k));
            } else {
              tx.objectStore(SESSION_KV_STORE).put({ k: String(k), v });
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
          } catch (e) { resolve(false); }
        });
      }

      async function idbScanMeta() {
        const db = await openOfflineDb();
        if (!db) return [];
        return await new Promise((resolve) => {
          const items = [];
          try {
            const tx = db.transaction(OFFLINE_STORE, 'readonly');
            const req = tx.objectStore(OFFLINE_STORE).openCursor();
            req.onsuccess = (ev) => {
              const cur = ev.target.result;
              if (cur) {
                const v = cur.value || {};
                items.push({
                  id: String(v.id || ''),
                  size: Number(v.size || (v.blob && v.blob.size) || 0),
                  pinned: !!v.pinned,
                  savedAt: Number(v.savedAt || 0),
                  meta: v.meta || null,
                  hasLyrics: Array.isArray(v.lyrics) && v.lyrics.length > 0
                });
                cur.continue();
              } else {
                resolve(items);
              }
            };
            req.onerror = () => resolve(items);
          } catch (e) { resolve(items); }
        });
      }

      function serializeTrackForOffline(track) {
        return {
          id: String(track.id),
          tgTrackId: track.tgTrackId || '',
          tgStreamUrl: track.tgStreamUrl || '',
          title: track.title || 'Без названия',
          artist: track.artist || 'Исполнитель',
          album: track.album || 'Оффлайн',
          duration: Number(track.duration || 180) || 180,
          artwork: track.artwork || '',
          coverGrad: track.coverGrad || 'linear-gradient(145deg, #163b5c 0%, #070c14 60%, #2468a3 100%)',
          source: track.isLocal ? 'Файл' : (track.source || 'Telegram'),
          inTelegram: !!track.inTelegram,
          isLocal: !!track.isLocal,
          fromTelegramBot: !!track.fromTelegramBot,
          fromCatalog: !!track.fromCatalog
        };
      }

      function fmtBytesMb(bytes) {
        const mb = (Number(bytes || 0)) / (1024 * 1024);
        return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' МБ';
      }

      function updateOfflineUI() {
        const cnt = state.offlineIds.size;
        const chip = $('offlineFilterChip');
        if (chip) chip.textContent = `Оффлайн (${cnt})`;

        const summary = $('offlineStorageSummary');
        if (summary) summary.textContent = `Сохранено: ${cnt} трек. · ${fmtBytesMb(state.offlineBytes)}`;

        const modeBtn = $('offlineModeToggleBtn');
        if (modeBtn) {
          modeBtn.classList.toggle('on', !!state.offlineMode);
          modeBtn.textContent = state.offlineMode ? 'Вкл' : 'Выкл';
        }

        const autoBtn = $('autoOfflineToggleBtn');
        if (autoBtn) {
          autoBtn.classList.toggle('on', !!state.autoOfflineCache);
          autoBtn.textContent = state.autoOfflineCache ? 'Вкл' : 'Выкл';
        }

        const banner = $('offlineBanner');
        const bText = $('offlineBannerText');
        const offlineNow = isOfflineEffective();
        if (banner) banner.classList.toggle('show', offlineNow);
        if (bText && offlineNow) {
          const reason = (typeof navigator !== 'undefined' && navigator.onLine === false)
            ? 'Нет интернета'
            : 'Оффлайн-режим';
          bText.textContent = `${reason} · Доступно ${cnt} трек.`;
        }

        updatePlayerOfflineBtn();
      }

      function updatePlayerOfflineBtn() {
        const btn = $('playerOfflineBtn');
        const track = state.currentTrack;
        if (!btn) return;
        if (!track) {
          btn.classList.remove('offline-saved', 'offline-busy');
          return;
        }
        const saved = state.offlineIds.has(track.id);
        const busy = state.offlineDownloadingIds.has(track.id);
        btn.classList.toggle('offline-saved', saved && !busy);
        btn.classList.toggle('offline-busy', busy);
        btn.title = saved ? 'Сохранён оффлайн (нажмите, чтобы удалить)' : 'Сохранить для оффлайн-прослушивания';
        btn.innerHTML = busy
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
          : (saved
            ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 16 9.5"/></svg>`
            : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`);
      }

      async function pruneUnpinnedOfflineCache() {
        const items = await idbScanMeta();
        const unpinned = items.filter(it => !it.pinned).sort((a, b) => b.savedAt - a.savedAt);
        if (unpinned.length <= MAX_AUTO_OFFLINE_TRACKS) return;
        for (const oldItem of unpinned.slice(MAX_AUTO_OFFLINE_TRACKS)) {
          await idbDeleteRecord(oldItem.id);
          state.offlineIds.delete(oldItem.id);
          state.offlineBytes = Math.max(0, state.offlineBytes - (oldItem.size || 0));
        }
      }

      async function initOfflineStorage() {
        registerServiceWorker();
        const items = await idbScanMeta();
        state.offlineIds = new Set();
        state.offlineBytes = 0;

        items.sort((a, b) => b.savedAt - a.savedAt);
        for (const it of items) {
          if (!it.id) continue;
          state.offlineIds.add(it.id);
          state.offlineBytes += (it.size || 0);
          // Restore tracks stored in IndexedDB into libraryTracks so they're visible offline immediately
          if (it.meta && !state.libraryTracks.some(x => x && x.id === it.id)) {
            state.libraryTracks.push({
              ...it.meta,
              lyrics: null
            });
          }
        }
        updateOfflineUI();
        renderLibrary();
        renderSearchResultsList();
      }

      async function saveOfflineLyrics(trackId, lyrics) {
        if (!trackId || !Array.isArray(lyrics) || !lyrics.length || !state.offlineIds.has(trackId)) return;
        const rec = await idbGetRecord(trackId);
        if (!rec) return;
        rec.lyrics = lyrics;
        await idbPutRecord(rec);
      }

      async function saveBlobOffline(track, blob, pinned = true) {
        if (!track || !track.id || !blob || blob.size < 4096) return false;
        const prev = await idbGetRecord(track.id);
        const prevSize = prev ? Number(prev.size || 0) : 0;
        const ok = await idbPutRecord({
          id: String(track.id),
          blob,
          mime: blob.type || 'audio/mpeg',
          size: blob.size,
          meta: serializeTrackForOffline(track),
          lyrics: (Array.isArray(track.lyrics) && !track.lyricsIsPlaceholder) ? track.lyrics : (prev && prev.lyrics ? prev.lyrics : null),
          pinned: Boolean(pinned || (prev && prev.pinned)),
          savedAt: Date.now()
        });
        if (!ok) return false;
        state.offlineIds.add(track.id);
        state.offlineBytes = Math.max(0, state.offlineBytes - prevSize) + blob.size;
        if (!pinned) pruneUnpinnedOfflineCache();
        ensureTrackInLibrary(track);
        updateOfflineUI();
        renderLibrary();
        renderSearchResultsList();
        return true;
      }

      async function cacheTrackOffline(track, { silent = false, pinned = true } = {}) {
        if (!track || !track.id) return false;
        if (state.offlineIds.has(track.id)) {
          if (pinned) {
            const rec = await idbGetRecord(track.id);
            if (rec && !rec.pinned) {
              rec.pinned = true;
              await idbPutRecord(rec);
            }
          }
          if (!silent) showToast('Трек уже сохранён для оффлайн-прослушивания');
          return true;
        }
        if (state.offlineDownloadingIds.has(track.id)) return false;
        if (isOfflineEffective()) {
          if (!silent) showToast('Нет подключения к сети для скачивания трека');
          return false;
        }

        let streamUrl = track.tgStreamUrl || (track.tgTrackId ? tgApiUrl(`/api/tg/stream/${encodeURIComponent(track.tgTrackId)}`) : '');
        if (!streamUrl && track.audioUrl) streamUrl = track.audioUrl;
        if (!streamUrl) {
          if (!silent) showToast('У трека нет аудиопотока для сохранения');
          return false;
        }

        state.offlineDownloadingIds.add(track.id);
        updatePlayerOfflineBtn();
        renderSearchResultsList();
        renderLibrary();

        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 45000);
          const resp = await fetch(streamUrl, { signal: ctrl.signal, mode: 'cors' });
          clearTimeout(timer);
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          const blob = await resp.blob();
          if (!blob || blob.size < 10000) throw new Error('empty_audio');

          const saved = await saveBlobOffline(track, blob, pinned);
          if (saved) {
            // Also warm artwork cache via SW if present
            if (track.artwork) fetch(track.artwork, { mode: 'no-cors' }).catch(() => {});
            if (!silent) showToast(`Сохранено оффлайн: ${track.title} (${fmtBytesMb(blob.size)})`);
            return true;
          }
        } catch (e) {
          if (!silent) showToast('Не удалось сохранить трек оффлайн');
        } finally {
          state.offlineDownloadingIds.delete(track.id);
          updatePlayerOfflineBtn();
          renderSearchResultsList();
          renderLibrary();
        }
        return false;
      }

      async function removeTrackOffline(track, silent = false) {
        if (!track || !track.id || !state.offlineIds.has(track.id)) return;
        const prev = await idbGetRecord(track.id);
        const prevSize = prev ? Number(prev.size || 0) : 0;
        await idbDeleteRecord(track.id);
        state.offlineIds.delete(track.id);
        state.offlineBytes = Math.max(0, state.offlineBytes - prevSize);
        updateOfflineUI();
        renderLibrary();
        renderSearchResultsList();
        if (!silent) showToast('Удалено из оффлайн-кэша');
      }

      async function toggleTrackOffline(track) {
        if (!track) return;
        if (state.offlineIds.has(track.id)) {
          await removeTrackOffline(track, false);
        } else {
          await cacheTrackOffline(track, { silent: false, pinned: true });
        }
      }

      function searchOfflineTracksLocal(query) {
        const q = String(query || '').trim().toLowerCase().replace(/ё/g, 'е');
        const pool = state.libraryTracks.filter(t => t && state.offlineIds.has(t.id));
        if (!q) return pool;
        const tokens = q.split(/\s+/).filter(Boolean);
        return pool.filter(t => {
          const hay = `${t.artist || ''} ${t.title || ''}`.toLowerCase().replace(/ё/g, 'е');
          return tokens.every(tok => hay.includes(tok));
        });
      }

      function scheduleAutoCacheCurrentTrack(track) {
        clearTimeout(autoCacheTimer);
        if (!track || !track.id || !state.autoOfflineCache || isOfflineEffective()) return;
        if (state.offlineIds.has(track.id) || state.offlineDownloadingIds.has(track.id)) return;
        if (!track.tgStreamUrl && !track.tgTrackId) return;
        // Wait 1.6s after playback starts so buffering isn't slowed down
        autoCacheTimer = setTimeout(() => {
          if (state.currentTrack && state.currentTrack.id === track.id && !state.offlineIds.has(track.id)) {
            cacheTrackOffline(track, { silent: true, pinned: false });
          }
        }, 1600);
      }

      // ================= LIVE SEARCH CONTROLLER (ONLY TELEGRAM BOT) =================
      let searchSeq = 0;
      let searchDebounce = null;

      function renderSourcesLiveBar(sources) {
        const bar = $('searchSourcesBar');
        if (!bar) return;
        if (!sources || !sources.length) {
          bar.classList.remove('show');
          bar.innerHTML = '';
          return;
        }
        bar.classList.add('show');
        bar.innerHTML = sources.map(s => `<span class="src-pill ready"><span class="src-pill-dot"></span>${escapeHtml(s)}</span>`).join('');
      }

      // ================= FAVORITE ARTISTS RECOMMENDATIONS (v36) =================
      const DEFAULT_QUICK_TAGS = [
        'onda andar', 'Pharaoh', 'Miyagi', 'Скриптонит', 'kai angel',
        'madk1d', 'Баста', 'Король и Шут', 'The Weeknd', 'тёмный принц'
      ];
      const IGNORED_ARTIST_KEYS = new Set([
        'telegram', 'телеграм', 'ваш файл', 'неизвестный', 'исполнитель',
        'аудио', 'audio', 'soundcloud', 'hitmo', 'muzofond', 'mp3party',
        'lightaudio', 'youtube', 'бот', 'файл', 'local', 'unknown', 'apathy'
      ]);

      let favRecsDirty = false;
      let favRecsLastSig = '';
      let favRecsRotateOffset = 0;

      function normalizeArtistKey(s) {
        return String(s || '')
          .toLowerCase()
          .replace(/ё/g, 'е')
          .replace(/[\(\[][^\)\]]*[\)\]]/g, ' ')
          .replace(/[^a-zа-я0-9]+/g, ' ')
          .trim();
      }

      function extractIndividualArtists(rawArtist) {
        const cleaned = String(rawArtist || '')
          .replace(/[\(\[]\s*(prod\.?|feat\.?|ft\.?).*?[\)\]]/gi, ' ')
          .replace(/\s+-\s+Topic$/i, '')
          .trim();
        if (!cleaned || cleaned.startsWith('@')) return [];
        const parts = cleaned
          .split(/\s*(?:,|&|\bfeat\.?\b|\bft\.?\b|\bпри уч\.?\b|\bwith\b|\bx\b|×|\/)\s*/i)
          .map(p => p.trim())
          .filter(Boolean);
        const out = [];
        for (const part of parts) {
          const k = normalizeArtistKey(part);
          if (!k || k.length < 2 || IGNORED_ARTIST_KEYS.has(k)) continue;
          out.push({ key: k, name: part });
        }
        return out;
      }

      function getFavoriteArtistsList(maxCount = 12) {
        if (!state.likedIds || !state.likedIds.size) return [];
        const counts = new Map();
        const libById = new Map();
        for (const t of state.libraryTracks) {
          if (t && t.id) libById.set(t.id, t);
        }
        let orderIdx = 0;
        for (const lid of state.likedIds) {
          const track = libById.get(lid);
          if (!track || !track.artist) continue;
          const artists = extractIndividualArtists(track.artist);
          for (const a of artists) {
            const cur = counts.get(a.key);
            if (cur) {
              cur.count += 1;
              cur.lastOrder = orderIdx;
            } else {
              counts.set(a.key, { key: a.key, name: a.name, count: 1, lastOrder: orderIdx });
            }
          }
          orderIdx++;
        }
        return Array.from(counts.values())
          .sort((a, b) => (b.count - a.count) || (b.lastOrder - a.lastOrder))
          .slice(0, maxCount);
      }

      function getFavoriteArtistsSignature() {
        return getFavoriteArtistsList(6).map(a => a.key).join('|');
      }

      function renderQuickTags() {
        const container = $('quickTags');
        if (!container) return;
        const favs = getFavoriteArtistsList(5);
        const usedKeys = new Set();
        const items = [];
        for (const f of favs) {
          usedKeys.add(f.key);
          items.push({ label: f.name, q: f.name, isFav: true });
        }
        for (const def of DEFAULT_QUICK_TAGS) {
          const k = normalizeArtistKey(def);
          if (usedKeys.has(k)) continue;
          usedKeys.add(k);
          items.push({ label: def, q: def, isFav: false });
          if (items.length >= 10) break;
        }
        container.innerHTML = items.map(it =>
          `<button type="button" class="quick-tag${it.isFav ? ' fav-artist' : ''}" data-q="${escapeHtml(it.q)}">${it.isFav ? '<span class="fav-heart">♥</span>' : ''}${escapeHtml(it.label)}</button>`
        ).join('');
      }

      function pickArtistsForFeed(favArtists, maxPick = 3) {
        if (favArtists.length <= maxPick) return favArtists.slice();
        const chosen = [];
        const offset = favRecsRotateOffset % favArtists.length;
        for (let i = 0; i < maxPick; i++) {
          chosen.push(favArtists[(offset + i) % favArtists.length]);
        }
        return chosen;
      }

      function matchesAnyFavArtist(track, chosenArtists) {
        if (!track) return false;
        const hayArtist = normalizeArtistKey(track.artist || '');
        const hayTitle = normalizeArtistKey(track.title || '');
        for (const a of chosenArtists) {
          if (hayArtist.includes(a.key) || a.key.includes(hayArtist) && hayArtist.length >= 3) return true;
          if (hayTitle.includes(a.key)) return true;
        }
        return false;
      }

      async function loadFavoriteArtistRecommendations(favArtists, forceFresh = false) {
        const chosen = pickArtistsForFeed(favArtists, 3);
        const namesLabel = chosen.map(a => a.name).join(', ');

        if (forceFresh) {
          chosen.forEach(a => tgSearchCache.delete(a.name.toLowerCase()));
        }

        const batches = await Promise.all(
          chosen.map(a => searchViaTgBotOnly(a.name).catch(() => ({ ok: false, tracks: [], sources: [] })))
        );

        const anyOk = batches.some(b => b && b.ok);
        if (!anyOk) return { ok: false, tracks: [], sources: [], namesLabel };

        const allSources = new Set(['По избранному']);
        const perArtistBuckets = [];

        batches.forEach((b, idx) => {
          if (!b || !b.ok || !Array.isArray(b.tracks)) return;
          (b.sources || []).forEach(s => allSources.add(s));
          const targetArtist = [chosen[idx]];
          const unseenMatching = [];
          const likedMatching = [];
          const unseenOther = [];
          for (const tr of b.tracks) {
            if (!tr || !tr.id) continue;
            const isLiked = state.likedIds.has(tr.id);
            const isMatch = matchesAnyFavArtist(tr, targetArtist);
            if (isMatch && !isLiked) unseenMatching.push(tr);
            else if (isMatch && isLiked) likedMatching.push(tr);
            else if (!isLiked) unseenOther.push(tr);
          }
          // Prefer NEW tracks by the favorite artist first, then remaining tracks by them
          const ordered = [...unseenMatching, ...likedMatching, ...unseenOther];
          if (ordered.length) perArtistBuckets.push(ordered);
        });

        // Round-robin interleave across favorite artists so the feed feels balanced & fresh
        const merged = [];
        const seenIds = new Set();
        const seenKeys = new Set();
        let round = 0;
        let addedInRound = true;
        while (merged.length < 24 && addedInRound) {
          addedInRound = false;
          for (const bucket of perArtistBuckets) {
            if (round < bucket.length) {
              const tr = bucket[round];
              const dk = normalizeArtistKey(`${tr.artist} ${tr.title}`);
              if (!seenIds.has(tr.id) && (!dk || !seenKeys.has(dk))) {
                seenIds.add(tr.id);
                if (dk) seenKeys.add(dk);
                merged.push(tr);
                addedInRound = true;
                if (merged.length >= 24) break;
              }
            }
          }
          round++;
        }

        return {
          ok: true,
          tracks: merged,
          sources: Array.from(allSources).slice(0, 5),
          namesLabel
        };
      }

      async function performSearch(forceFresh = false) {
        const q = searchInput.value.trim();
        searchClear.classList.toggle('show', q.length > 0);
        viewSearch.classList.toggle('has-results', q.length > 0);

        const seq = ++searchSeq;
        const favArtists = !q ? getFavoriteArtistsList(10) : [];
        const favSig = favArtists.slice(0, 6).map(a => a.key).join('|');

        // Offline Mode: instant local search across all downloaded / auto-cached tracks (favorite artists first!)
        if (isOfflineEffective()) {
          searchLoader.classList.remove('show');
          let localHits = searchOfflineTracksLocal(q);
          if (!q && favArtists.length && localHits.length > 1) {
            localHits = [...localHits].sort((a, b) => {
              const am = matchesAnyFavArtist(a, favArtists) ? 1 : 0;
              const bm = matchesAnyFavArtist(b, favArtists) ? 1 : 0;
              return bm - am;
            });
          }
          renderSourcesLiveBar(['Оффлайн-кэш']);
          $('searchResultTitle').textContent = q
            ? `Оффлайн поиск: «${q}»`
            : (favArtists.length ? 'Оффлайн · По избранному' : 'Загруженные оффлайн-треки');
          state.searchResults = localHits;
          renderSearchResultsList(false, true);
          return;
        }

        // Personalized Recommendations Mode when Search input is EMPTY and user has liked artists!
        if (!q && favArtists.length > 0) {
          favRecsDirty = false;
          favRecsLastSig = favSig;
          const previewNames = pickArtistsForFeed(favArtists, 3).map(a => a.name).join(', ');
          const shortTitle = previewNames.length > 32 ? previewNames.slice(0, 29) + '...' : previewNames;

          searchLoader.classList.add('show');
          $('searchLoaderText').textContent = `Подбираем треки: ${shortTitle}...`;
          $('searchResultTitle').textContent = `Для вас · ${shortTitle}`;
          renderSourcesLiveBar(['По избранному']);

          const rBtn = $('tgRefreshBtn');
          if (rBtn) {
            rBtn.textContent = '↻ Обновить';
            rBtn.classList.add('show');
          }

          // Instant cached recommendation preview while refreshing from Telegram bot
          if (!forceFresh) {
            const cachedRecs = store.get('lastFavRecsV36', null);
            if (cachedRecs && cachedRecs.sig === favSig && Array.isArray(cachedRecs.tracks) && cachedRecs.tracks.length) {
              state.searchResults = cachedRecs.tracks;
              renderSearchResultsList(false, false);
            }
          }

          const recRes = await loadFavoriteArtistRecommendations(favArtists, forceFresh);
          if (seq !== searchSeq) return;
          searchLoader.classList.remove('show');

          if (recRes.ok && recRes.tracks.length) {
            const lbl = recRes.namesLabel.length > 32 ? recRes.namesLabel.slice(0, 29) + '...' : recRes.namesLabel;
            renderSourcesLiveBar(recRes.sources);
            $('searchResultTitle').textContent = `Для вас · ${lbl}`;
            state.searchResults = recRes.tracks;
            store.set('lastFavRecsV36', { sig: favSig, tracks: recRes.tracks.slice(0, 24), sources: recRes.sources, ts: Date.now() });
            renderSearchResultsList(false, false);
            return;
          }

          // If bot unreachable, gracefully fall back to offline tracks
          if (!recRes.ok) {
            const offlineFallback = searchOfflineTracksLocal('');
            if (offlineFallback.length) {
              renderSourcesLiveBar(['Оффлайн-кэш']);
              $('searchResultTitle').textContent = 'Доступно оффлайн';
              state.searchResults = offlineFallback;
              renderSearchResultsList(false, true);
              return;
            }
          }
          // Otherwise fall through to general bot library below
        }

        const rBtnDefault = $('tgRefreshBtn');
        if (rBtnDefault && !favArtists.length) rBtnDefault.textContent = '↻ Из бота';

        searchLoader.classList.add('show');
        $('searchLoaderText').textContent = q
          ? `Бот ищет «${q}»...`
          : 'Загрузка треков из вашего Telegram-бота...';
        $('searchResultTitle').textContent = q ? `Поиск в боте: «${q}»` : 'Треки из Telegram-бота';
        renderSourcesLiveBar([]);

        // Instant cached library preview on startup while live bot library loads
        if (!q) {
          const cachedLib = store.get('lastTgLibraryV27', null);
          if (cachedLib && Array.isArray(cachedLib.tracks) && cachedLib.tracks.length) {
            state.searchResults = cachedLib.tracks;
            renderSearchResultsList();
          }
        }

        const res = await searchViaTgBotOnly(q);
        if (seq !== searchSeq) return;
        searchLoader.classList.remove('show');

        if (!res.ok) {
          const offlineFallback = searchOfflineTracksLocal(q);
          if (offlineFallback.length) {
            renderSourcesLiveBar(['Оффлайн-кэш']);
            $('searchResultTitle').textContent = q ? `Оффлайн: «${q}»` : 'Доступно оффлайн';
            state.searchResults = offlineFallback;
            renderSearchResultsList(false, true);
            return;
          }
          state.searchResults = [];
          renderSourcesLiveBar([]);
          renderSearchResultsList(true, false);
          return;
        }

        renderSourcesLiveBar(res.sources);
        $('searchResultTitle').textContent = q
          ? `Найдено ботом: «${q}»`
          : (res.tracks.length ? 'Треки из Telegram-бота' : 'В боте пока нет треков');
        state.searchResults = res.tracks;
        renderSearchResultsList(false, false);
      }

      function renderSearchResultsList(botOffline = false, offlineView = false) {
        $('searchCount').textContent = String(state.searchResults.length);
        searchTrackList.innerHTML = '';
        if (!state.searchResults.length) {
          const q = searchInput.value.trim();
          let msg = '';
          if (offlineView) {
            msg = q
              ? `Среди оффлайн-треков нет «${escapeHtml(q)}».`
              : 'В оффлайн-кэше пока нет треков.<br/>Включите музыку с интернетом или нажмите <b>⬇</b> на треках, чтобы слушать их без сети.';
          } else if (botOffline) {
            msg = 'Сервер бота <code>bot-1795701331-3932-awuro.bothost.tech</code> сейчас не отвечает.<br/>Если нет интернета — откройте вкладку <b>Ваши треки → Оффлайн</b>.';
          } else if (q) {
            msg = `Бот не нашёл «${escapeHtml(q)}». Попробуйте другое название или перешлите трек прямо в Telegram-бота.`;
          } else {
            msg = 'В базе бота пока нет треков.<br/>Введите название песни в поиск выше или перешлите аудиофайлы вашему Telegram-боту!';
          }
          searchTrackList.innerHTML = `<div style="text-align:center;padding:28px 14px;color:var(--text-dim);font-size:13px;line-height:1.55;">${msg}</div>`;
          return;
        }
        state.searchResults.forEach(t => searchTrackList.appendChild(buildTrackRow(t, 'search')));
      }

            // ================= AUDIO ENGINE (TELEGRAM BOT STREAMING + iOS SAFARI UNLOCK) =================
      const SILENT_WAV_URI = (() => {
        try {
          const bytes = new Uint8Array([
            82,73,70,70, 38,0,0,0, 87,65,86,69, 102,109,116,32,
            16,0,0,0, 1,0, 1,0, 64,31,0,0, 64,31,0,0, 1,0, 8,0,
            100,97,116,97, 2,0,0,0, 128,128
          ]);
          return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
        } catch (e) { return ''; }
      })();

      let audioCtx = null, masterGain = null, analyser = null;
      const htmlAudio = $('apathyAudio') || new Audio();
      htmlAudio.preload = 'auto';
      htmlAudio.playsInline = true;
      try { htmlAudio.referrerPolicy = 'no-referrer'; } catch (e) {}
      htmlAudio.muted = false;
      htmlAudio.volume = isFinite(state.volume) ? state.volume : 1.0;

      let iosHtmlAudioUnlocked = false;
      let synthTimer = null, synthStep = 0, lastTickTime = 0;
      let currentAudioMode = 'stream';
      let streamWatchdogTimer = null;
      let retryCountForTrack = 0;

      function unlockAudioForIos() {
        ensureAudioCtx();
        if (iosHtmlAudioUnlocked) return;
        try {
          if (!htmlAudio.src || htmlAudio.paused) {
            const prevSrc = htmlAudio.getAttribute('src');
            if (!prevSrc) {
              htmlAudio.src = SILENT_WAV_URI;
              const p = htmlAudio.play();
              if (p && typeof p.then === 'function') {
                p.then(() => {
                  iosHtmlAudioUnlocked = true;
                  if (htmlAudio.src === SILENT_WAV_URI) {
                    htmlAudio.pause();
                    htmlAudio.removeAttribute('src');
                  }
                }).catch(() => {});
              } else {
                iosHtmlAudioUnlocked = true;
              }
            } else {
              iosHtmlAudioUnlocked = true;
            }
          }
        } catch (e) {}
      }

      ['touchstart', 'pointerdown', 'click'].forEach(ev => {
        window.addEventListener(ev, unlockAudioForIos, { passive: true, once: true });
      });

      function ensureAudioCtx() {
        if (!audioCtx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          audioCtx = new AC();
          masterGain = audioCtx.createGain();
          masterGain.gain.value = 0.28 * (isFinite(state.volume) ? state.volume : 1);
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          masterGain.connect(analyser);
          analyser.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
      }

      function applyAudioVolume(vol, save = true) {
        const v = Math.max(0, Math.min(1, isFinite(vol) ? vol : 1));
        state.volume = v;
        if (v > 0.01) state.prevVolume = v;
        try {
          htmlAudio.volume = v;
          htmlAudio.muted = (v === 0);
        } catch (e) {}
        if (masterGain) {
          try { masterGain.gain.value = 0.28 * v; } catch (e) {}
        }
        const pct = Math.round(v * 100);
        const sl = $('volumeSlider');
        if (sl) {
          sl.value = String(pct);
          sl.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, rgba(255,255,255,0.14) ${pct}%)`;
        }
        const lbl = $('volumePct');
        if (lbl) lbl.textContent = pct + '%';
        const btn = $('btnMuteToggle');
        const ico = $('volumeIcon');
        if (btn) btn.classList.toggle('muted', pct === 0);
        if (ico) {
          if (pct === 0) {
            ico.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
          } else if (pct < 50) {
            ico.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
          } else {
            ico.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`;
          }
        }
        if (save) store.set('volume', v);
      }

      function playUnlockChime() {
        const ctx = ensureAudioCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        [329.63, 493.88, 659.25, 987.77].forEach((freq, i) => {
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = i % 2 === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.045);
          gain.gain.setValueAtTime(0.001, now + i * 0.045);
          gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.045 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.045 + 0.55);
          osc.connect(gain); gain.connect(masterGain);
          osc.start(now + i * 0.045); osc.stop(now + i * 0.045 + 0.6);
        });
      }

      function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
      function stopSynthLoop() { if (synthTimer) { clearInterval(synthTimer); synthTimer = null; } }

      function startSynthLoop(track) {
        stopSynthLoop();
        const ctx = ensureAudioCtx();
        if (!ctx || !track.synth) return;
        const s = track.synth;
        const stepMs = (60 / s.bpm / 2) * 1000;
        synthStep = Math.floor(state.currentTime / (stepMs / 1000));

        const triggerStep = () => {
          if (!state.isPlaying || currentAudioMode !== 'synth') return;
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          const now = ctx.currentTime, idx = synthStep % 16;

          if (idx === 0 || idx === 8 || (s.bpm >= 128 && (idx === 6 || idx === 14))) {
            const kick = ctx.createOscillator(), kg = ctx.createGain();
            kick.type = 'sine'; kick.frequency.setValueAtTime(132, now); kick.frequency.exponentialRampToValueAtTime(36, now + 0.14);
            kg.gain.setValueAtTime(0.65, now); kg.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            kick.connect(kg); kg.connect(masterGain); kick.start(now); kick.stop(now + 0.24);
          }
          if (idx === 4 || idx === 12) {
            const bufSize = Math.floor(ctx.sampleRate * 0.11);
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate), data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
            const noise = ctx.createBufferSource(); noise.buffer = buf;
            const flt = ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1700;
            const ng = ctx.createGain(); ng.gain.setValueAtTime(0.24, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            noise.connect(flt); flt.connect(ng); ng.connect(masterGain); noise.start(now);
          }
          if (idx % 2 === 1) {
            const bufSize = Math.floor(ctx.sampleRate * 0.035);
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate), data = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
            const hat = ctx.createBufferSource(); hat.buffer = buf;
            const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7200;
            const hg = ctx.createGain(); hg.gain.setValueAtTime(0.09, now); hg.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            hat.connect(hf); hf.connect(hg); hg.connect(masterGain); hat.start(now);
          }
          if (idx % 4 === 0) {
            const bar = Math.floor(synthStep / 16) % 4, bassMidi = s.root + [0, 0, -2, -4][bar];
            const bass = ctx.createOscillator(), bf = ctx.createBiquadFilter(), bg = ctx.createGain();
            bass.type = 'sawtooth'; bass.frequency.setValueAtTime(midiToFreq(bassMidi), now);
            bf.type = 'lowpass'; bf.frequency.setValueAtTime(280, now);
            bg.gain.setValueAtTime(0.26, now); bg.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 3.8) / 1000);
            bass.connect(bf); bf.connect(bg); bg.connect(masterGain); bass.start(now); bass.stop(now + (stepMs * 4) / 1000);
          }
          const semi = s.scale[s.arp[idx % s.arp.length] % s.scale.length];
          const leadOsc = ctx.createOscillator(), leadFlt = ctx.createBiquadFilter(), leadGain = ctx.createGain();
          leadOsc.type = s.wave; leadOsc.frequency.setValueAtTime(midiToFreq(s.root + 12 + semi), now);
          leadFlt.type = 'lowpass'; leadFlt.frequency.setValueAtTime(1600, now); leadFlt.frequency.exponentialRampToValueAtTime(420, now + 0.24);
          leadGain.gain.setValueAtTime(0.11, now); leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
          leadOsc.connect(leadFlt); leadFlt.connect(leadGain); leadGain.connect(masterGain); leadOsc.start(now); leadOsc.stop(now + 0.28);

          if (s.pad && idx === 0) {
            [0, 3, 7].forEach(interval => {
              const pOsc = ctx.createOscillator(), pFlt = ctx.createBiquadFilter(), pGain = ctx.createGain();
              pOsc.type = 'triangle'; pOsc.frequency.setValueAtTime(midiToFreq(s.root + 12 + interval), now);
              pFlt.type = 'lowpass'; pFlt.frequency.value = 820;
              pGain.gain.setValueAtTime(0.001, now); pGain.gain.linearRampToValueAtTime(0.055, now + 0.45);
              pGain.gain.exponentialRampToValueAtTime(0.001, now + (stepMs * 15) / 1000);
              pOsc.connect(pFlt); pFlt.connect(pGain); pGain.connect(masterGain); pOsc.start(now); pOsc.stop(now + (stepMs * 15.5) / 1000);
            });
          }
          synthStep++;
        };
        triggerStep();
        synthTimer = setInterval(triggerStep, stepMs);
      }

      function clearStreamWatchdog() {
        if (streamWatchdogTimer) {
          clearTimeout(streamWatchdogTimer);
          streamWatchdogTimer = null;
        }
      }

      function armStreamWatchdog(trackId, ms = 12000) {
        clearStreamWatchdog();
        streamWatchdogTimer = setTimeout(() => {
          if (!state.isPlaying) return;
          if (!state.currentTrack || state.currentTrack.id !== trackId) return;
          if (currentAudioMode === 'stream' && htmlAudio.src !== SILENT_WAV_URI) {
            if (htmlAudio.readyState < 2 && (htmlAudio.currentTime || 0) < 0.1) {
              handleBotStreamError('timeout');
            }
          }
        }, ms);
      }

      ['playing', 'canplay', 'pause', 'ended'].forEach(ev => {
        htmlAudio.addEventListener(ev, () => {
          clearStreamWatchdog();
          if (ev === 'playing' && state.currentTrack) {
            updatePlayerUI();
            scheduleAutoCacheCurrentTrack(state.currentTrack);
          }
        });
      });

      async function handleBotStreamError(reason = 'error') {
        clearStreamWatchdog();
        const track = state.currentTrack;
        if (!state.isPlaying || !track || currentAudioMode !== 'stream') return;
        if (htmlAudio.src === SILENT_WAV_URI) return;

        // Retry once via /api/tg/resolve in case track was from old saved playlist or temporary stream expired
        if (retryCountForTrack < 1 && (track.fromTelegramBot || track.fromCatalog)) {
          retryCountForTrack++;
          $('playerArtist').innerHTML = `<span class="stream-loading-dot"></span>Повторный запрос в Telegram-бота...`;
          const params = new URLSearchParams({ artist: track.artist || '', title: track.title || '' });
          if (track.tgTrackId) params.set('id', track.tgTrackId);
          const data = await fetchJsonTimeout(`${tgApiUrl('/api/tg/resolve')}?${params.toString()}`, 9000);
          if (data && data.ok && data.streamUrl && state.currentTrack && state.currentTrack.id === track.id) {
            const freshUrl = (data.streamUrl.startsWith('http') ? data.streamUrl : tgApiUrl(data.streamUrl)) + `?r=${Date.now()}`;
            track.tgStreamUrl = freshUrl;
            htmlAudio.src = freshUrl;
            armStreamWatchdog(track.id, 12000);
            htmlAudio.play().catch(() => {});
            updatePlayerUI();
            return;
          }
        }

        state.isPlaying = false;
        updatePlayerUI();
        showToast('Бот не смог загрузить аудио для этого трека — выберите другой вариант');
      }

      htmlAudio.addEventListener('error', () => handleBotStreamError('error'));

      function updateMediaSession(track) {
        if ('mediaSession' in navigator && track) {
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: track.title,
              artist: track.artist,
              album: track.album || 'APATHY · Telegram',
              artwork: track.artwork ? [{ src: track.artwork, sizes: '500x500', type: 'image/jpeg' }] : []
            });
            navigator.mediaSession.setActionHandler('play', resumePlayback);
            navigator.mediaSession.setActionHandler('pause', pausePlayback);
            navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
            navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
          } catch (e) {}
        }
      }

      // ================= SPLASH SCREEN (ULTRA-SMOOTH GPU UNLOCK v33) =================
      let splashParticlesActive = false;
      let splashParticlesRaf = 0;
      let startSplashParticlesLoop = () => {};

      function initSplashParticles() {
        const canvas = $('splashParticles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        let w = 0, h = 0, dpr = 1;
        const pts = Array.from({ length: 26 }, () => ({
          x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + 0.55,
          vx: (Math.random() - 0.5) * 0.00042, vy: -Math.random() * 0.00062 - 0.00018, a: Math.random() * 0.45 + 0.18
        }));

        function resize() {
          const rect = splashScreen.getBoundingClientRect();
          dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          w = canvas.width = Math.max(1, Math.round(rect.width * dpr));
          h = canvas.height = Math.max(1, Math.round(rect.height * dpr));
        }
        resize();
        window.addEventListener('resize', () => {
          if (!splashScreen.classList.contains('hidden')) resize();
        });

        function draw() {
          if (!splashParticlesActive || splashScreen.classList.contains('hidden') || document.hidden) {
            splashParticlesActive = false;
            splashParticlesRaf = 0;
            return;
          }
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = activeVizPalette.hi;
          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -0.04) { p.y = 1.04; p.x = Math.random(); }
            if (p.x < 0) p.x = 1;
            else if (p.x > 1) p.x = 0;
            ctx.globalAlpha = p.a;
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, p.r * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          splashParticlesRaf = requestAnimationFrame(draw);
        }

        startSplashParticlesLoop = () => {
          if (splashParticlesActive) return;
          resize();
          splashParticlesActive = true;
          splashParticlesRaf = requestAnimationFrame(draw);
        };

        if (!splashScreen.classList.contains('hidden')) {
          startSplashParticlesLoop();
        }
      }

      let chromeFlashTimer = null;
      function triggerChromeFlash() {
        clearTimeout(chromeFlashTimer);
        chromeFlash.classList.remove('active');
        requestAnimationFrame(() => {
          chromeFlash.classList.add('active');
          chromeFlashTimer = setTimeout(() => chromeFlash.classList.remove('active'), 360);
        });
      }

      function unlockFromSplash() {
        splashParticlesActive = false;
        if (splashParticlesRaf) {
          cancelAnimationFrame(splashParticlesRaf);
          splashParticlesRaf = 0;
        }
        splashScreen.classList.add('hidden');
        mainApp.classList.add('visible');
        triggerChromeFlash();
        // Play chime on next frame so AudioContext init never stalls the visual unlock frame
        setTimeout(() => {
          try { playUnlockChime(); } catch (e) {}
        }, 16);
      }

      function initCrossSwipe() {
        const cross = $('draggableCross');
        const ring = $('crossRing');
        const glow = $('crossGlow');
        let dragging = false;
        let unlocked = false;
        let pointerId = null;
        let startX = 0, startY = 0, dx = 0, dy = 0, startTime = 0;
        let rafPending = false;

        function paintDragFrame() {
          rafPending = false;
          if (!dragging) return;
          const dist = Math.hypot(dx, dy);
          const prog = Math.min(dist / 92, 1);
          // Pure GPU-composited transform & opacity only (ZERO filter re-rasterization!)
          cross.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${(dx * 0.12).toFixed(2)}deg) scale(${(1 + prog * 0.1).toFixed(3)})`;
          if (ring) {
            ring.style.transform = `translate3d(0, 0, 0) scale(${(1 + prog * 0.28).toFixed(3)})`;
            ring.style.opacity = (0.55 + prog * 0.42).toFixed(2);
          }
          if (glow) {
            glow.style.transform = `translate3d(${(dx * 0.45).toFixed(1)}px, ${(dy * 0.45).toFixed(1)}px, 0) scale(${(1 + prog * 0.35).toFixed(3)})`;
            glow.style.opacity = (0.48 + prog * 0.48).toFixed(2);
          }
        }

        function resetCrossVisuals() {
          cross.style.transition = 'none';
          cross.style.transform = 'translate3d(0, 0, 0)';
          cross.style.opacity = '1';
          if (ring) {
            ring.style.transition = 'none';
            ring.style.transform = 'translate3d(0, 0, 0) scale(1)';
            ring.style.opacity = '0.55';
          }
          if (glow) {
            glow.style.transition = 'none';
            glow.style.transform = 'translate3d(0, 0, 0) scale(1)';
            glow.style.opacity = '0.48';
          }
        }

        function beginDrag(clientX, clientY, pid = null) {
          if (unlocked || splashScreen.classList.contains('hidden')) return;
          dragging = true;
          pointerId = pid;
          startX = clientX;
          startY = clientY;
          dx = 0;
          dy = 0;
          startTime = performance.now();
          cross.style.transition = 'none';
          if (ring) ring.style.transition = 'none';
          if (glow) glow.style.transition = 'none';
          unlockAudioForIos();
        }

        function moveDrag(clientX, clientY) {
          if (!dragging) return;
          dx = clientX - startX;
          dy = clientY - startY;
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(paintDragFrame);
          }
        }

        function finishDrag() {
          if (!dragging) return;
          dragging = false;
          pointerId = null;
          const dist = Math.hypot(dx, dy);
          const velocity = dist / Math.max(performance.now() - startTime, 1);

          if (dist > 54 || (dist > 22 && velocity > 0.28)) {
            unlocked = true;
            const angle = Math.atan2(dy, dx);
            cross.style.transition = 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease-out';
            cross.style.transform = `translate3d(${(Math.cos(angle) * 260).toFixed(1)}px, ${(Math.sin(angle) * 260).toFixed(1)}px, 0) rotate(${(dx * 0.24).toFixed(1)}deg) scale(1.22)`;
            cross.style.opacity = '0';
            if (ring) {
              ring.style.transition = 'transform 0.22s ease-out, opacity 0.2s ease-out';
              ring.style.transform = 'translate3d(0, 0, 0) scale(1.42)';
              ring.style.opacity = '0';
            }
            if (glow) {
              glow.style.transition = 'transform 0.22s ease-out, opacity 0.2s ease-out';
              glow.style.transform = 'translate3d(0, 0, 0) scale(1.55)';
              glow.style.opacity = '0';
            }
            unlockFromSplash();
            setTimeout(() => {
              unlocked = false;
              resetCrossVisuals();
            }, 300);
          } else {
            cross.style.transition = 'transform 0.28s cubic-bezier(0.22, 1.4, 0.36, 1)';
            cross.style.transform = 'translate3d(0, 0, 0)';
            if (ring) {
              ring.style.transition = 'transform 0.24s ease-out, opacity 0.24s ease-out';
              ring.style.transform = 'translate3d(0, 0, 0) scale(1)';
              ring.style.opacity = '0.55';
            }
            if (glow) {
              glow.style.transition = 'transform 0.24s ease-out, opacity 0.24s ease-out';
              glow.style.transform = 'translate3d(0, 0, 0) scale(1)';
              glow.style.opacity = '0.48';
            }
          }
        }

        if ('PointerEvent' in window) {
          cross.addEventListener('pointerdown', (e) => {
            if (e.button && e.button !== 0) return;
            try { cross.setPointerCapture(e.pointerId); } catch (err) {}
            beginDrag(e.clientX, e.clientY, e.pointerId);
          });
          cross.addEventListener('pointermove', (e) => {
            if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
            moveDrag(e.clientX, e.clientY);
          });
          cross.addEventListener('pointerup', (e) => {
            if (pointerId !== null && e.pointerId !== pointerId) return;
            try { cross.releasePointerCapture(e.pointerId); } catch (err) {}
            finishDrag();
          });
          cross.addEventListener('pointercancel', finishDrag);
        } else {
          cross.addEventListener('mousedown', (e) => beginDrag(e.clientX, e.clientY));
          window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
          window.addEventListener('mouseup', finishDrag);
          cross.addEventListener('touchstart', (e) => {
            const pt = e.touches && e.touches[0];
            if (pt) beginDrag(pt.clientX, pt.clientY);
          }, { passive: true });
          window.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            if (e.cancelable) e.preventDefault();
            const pt = e.touches && e.touches[0];
            if (pt) moveDrag(pt.clientX, pt.clientY);
          }, { passive: false });
          window.addEventListener('touchend', finishDrag);
        }

        const pill = splashScreen.querySelector('.swipe-pill');
        if (pill) {
          pill.style.cursor = 'pointer';
          pill.addEventListener('click', () => {
            unlockAudioForIos();
            unlockFromSplash();
          });
        }
      }

      // ================= NAVIGATION & TELEGRAM AUTH GATE (v37) =================
      let pendingProtectedTab = '';
      let authPulseTimer = null;

      function isTelegramAuthorized() {
        return Boolean(state.tgToken && state.user && state.user.tgId);
      }

      function updateAuthGateUI() {
        const authed = isTelegramAuthorized();
        const gate = $('tracksGuestGate');
        const wrap = $('tracksAuthedWrap');
        const navBtn = $('navTracksBtn');
        const notice = $('authRedirectNotice');
        const cntEl = $('libTotalCount');

        if (gate) gate.style.display = authed ? 'none' : 'block';
        if (wrap) wrap.style.display = authed ? 'block' : 'none';
        if (navBtn) navBtn.classList.toggle('is-locked', !authed);
        if (cntEl && !authed) cntEl.textContent = 'Требуется вход';
        if (notice && authed) notice.classList.remove('show');
      }

      function promptTelegramAuthForTracks() {
        pendingProtectedTab = 'viewTracks';
        state.activeTab = 'viewProfile';
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === 'viewProfile'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'viewProfile'));
        renderProfile();
        const notice = $('authRedirectNotice');
        if (notice) notice.classList.add('show');
        const card = $('authCard');
        if (card) {
          card.classList.add('auth-pulse');
          clearTimeout(authPulseTimer);
          authPulseTimer = setTimeout(() => card.classList.remove('auth-pulse'), 2200);
        }
        const vp = $('viewProfile');
        if (vp) vp.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Авторизуйтесь через Telegram, чтобы открыть «Ваши треки»');
      }

      function switchTab(tabId) {
        if (tabId === 'viewTracks' && !isTelegramAuthorized()) {
          promptTelegramAuthForTracks();
          return;
        }
        state.activeTab = tabId;
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === tabId));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        if (tabId === 'viewSearch' && !searchInput.value.trim() && (favRecsDirty || getFavoriteArtistsSignature() !== favRecsLastSig)) {
          performSearch(false);
        }
        if (tabId === 'viewTracks') {
          updateAuthGateUI();
          renderLibrary();
          refreshCloudAccountState(false);
        }
        if (tabId === 'viewProfile') {
          const notice = $('authRedirectNotice');
          if (notice && pendingProtectedTab !== 'viewTracks') notice.classList.remove('show');
          renderProfile();
        }
      }
      document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
      topProfileBtn.addEventListener('click', () => switchTab('viewProfile'));
      const topBrandBtn = $('topBrandBtn');
      if (topBrandBtn) {
        topBrandBtn.addEventListener('click', () => {
          closePlayerOverlay();
          closePlaylistModal();
          switchTab('viewSearch');
          if (viewSearch) viewSearch.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // ================= HELPERS =================
      function fmtTime(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      }
      function trackInitials(title) {
        return String(title || '').replace(/[^A-Za-zА-Яа-я0-9 ]/g, '').trim().slice(0, 2).toUpperCase() || 'AP';
      }
      function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
      }

      // ================= TRACK ROW BUILDER =================
      function buildTrackRow(track, context = 'search') {
        const isCurrent = state.currentTrack && state.currentTrack.id === track.id;
        const isLiked = state.likedIds.has(track.id);
        const inPl = isTrackInAnyPlaylist(track.id);

        const isOfflineSaved = state.offlineIds.has(track.id);
        const isOfflineBusy = state.offlineDownloadingIds.has(track.id);
        let badgeLabel = isOfflineSaved ? 'Оффлайн' : (track.inTelegram ? 'Telegram' : (track.source || 'Бот'));
        let badgeClass = isOfflineSaved ? 'offline-tag' : ((track.fromTelegramBot || track.fromCatalog) ? 'tg-tag' : '');

        const div = document.createElement('div');
        div.className = 'track-item' + (isCurrent ? ' playing' : '') + (isCurrent && state.isPlaying ? ' is-running' : '');

        const artContent = track.artwork
          ? `<img src="${escapeHtml(track.artwork)}" alt="" loading="lazy" /><span>${trackInitials(track.title)}</span>`
          : `<span>${trackInitials(track.title)}</span>`;

        const showRemoveFromPl = (context === 'playlist' && state.selectedPlaylistId);
        const showDeleteFromLib = (context === 'library');

        div.innerHTML = `
          <div class="track-art" style="background:${track.coverGrad || '#181b22'};">
            ${artContent}
            <div class="eq-bars"><span></span><span></span><span></span></div>
          </div>
          <div class="track-meta">
            <div class="track-title">${escapeHtml(track.title)}</div>
            <div class="track-sub">
              <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(track.artist)}</span>
              ${badgeLabel ? `<span class="source-tag ${badgeClass}">${escapeHtml(badgeLabel)}</span>` : ''}
            </div>
          </div>
          <div class="track-right">
            <span class="track-dur">${fmtTime(track.duration)}</span>
            <button class="min-icon-btn ${isOfflineSaved ? 'offline-saved' : ''} ${isOfflineBusy ? 'offline-busy' : ''}" data-offline="${escapeHtml(track.id)}" title="${isOfflineSaved ? 'Сохранён оффлайн (нажмите, чтобы удалить)' : 'Сохранить оффлайн'}" aria-label="Оффлайн">
              ${isOfflineBusy
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
                : (isOfflineSaved
                  ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8.5 12.5 11 15 16 9.5"/></svg>`
                  : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`)
              }
            </button>
            ${showRemoveFromPl
              ? `<button class="min-icon-btn" data-remove-pl="${escapeHtml(track.id)}" title="Убрать из плейлиста" aria-label="Убрать из плейлиста">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                 </button>`
              : `<button class="min-icon-btn add-pl-btn ${inPl ? 'in-pl' : ''}" data-add-pl="${escapeHtml(track.id)}" title="Добавить в плейлист" aria-label="Добавить в плейлист">
                   ${inPl
                     ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                     : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
                   }
                 </button>`
            }
            <button class="min-icon-btn ${isLiked ? 'liked' : ''}" data-like="${escapeHtml(track.id)}" aria-label="Нравится">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            ${showDeleteFromLib
              ? `<button class="min-icon-btn del-lib-btn" data-delete-lib="${escapeHtml(track.id)}" title="Удалить трек из «Ваших треков»" aria-label="Удалить трек">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                     <polyline points="3 6 5 6 21 6"/>
                     <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                     <path d="M10 11v6M14 11v6"/>
                   </svg>
                 </button>`
              : ''
            }
          </div>
        `;

        const rowImg = div.querySelector('.track-art img');
        if (rowImg) rowImg.addEventListener('error', () => rowImg.remove());
        div.addEventListener('click', (e) => {
          if (e.target.closest('[data-offline]')) { e.stopPropagation(); toggleTrackOffline(track); return; }
          if (e.target.closest('[data-add-pl]')) { e.stopPropagation(); openPlaylistModal(track); return; }
          if (e.target.closest('[data-remove-pl]')) { e.stopPropagation(); removeTrackFromPlaylist(state.selectedPlaylistId, track.id); return; }
          if (e.target.closest('[data-delete-lib]')) { e.stopPropagation(); deleteTrackFromLibrary(track); return; }
          if (e.target.closest('[data-like]')) { e.stopPropagation(); toggleLike(track); return; }
          if (context === 'search') state.activeQueue = [...state.searchResults];
          else state.activeQueue = getVisibleLibraryTracks();
          playTrack(track, true);
        });
        return div;
      }

      // ================= PLAYLISTS & LIBRARY =================
      function getVisibleLibraryTracks() {
        if (state.selectedPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
          if (!pl) return [];
          return pl.trackIds.map(id => state.libraryTracks.find(t => t.id === id)).filter(Boolean);
        }
        return state.libraryTracks.filter(t => {
          if (state.libFilter === 'offline') return state.offlineIds.has(t.id);
          if (state.libFilter === 'liked') return state.likedIds.has(t.id);
          if (state.libFilter === 'telegram') return !!(t.fromTelegramBot || t.fromCatalog);
          if (state.libFilter === 'local') return !!t.isLocal;
          return true;
        });
      }

      function renderLibrary() {
        updateAuthGateUI();
        if (!isTelegramAuthorized()) return;
        $('libTotalCount').textContent = `${state.libraryTracks.length} треков`;
        $('plCountLabel').textContent = String(state.playlists.length);

        const strip = $('playlistStrip');
        strip.innerHTML = '';

        const createCard = document.createElement('button');
        createCard.className = 'pl-card create-pl';
        createCard.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span style="font-size:11px;">Создать</span>
        `;
        createCard.addEventListener('click', () => openPlaylistModal(null));
        strip.appendChild(createCard);

        state.playlists.forEach(pl => {
          const card = document.createElement('button');
          const active = state.selectedPlaylistId === pl.id;
          card.className = 'pl-card' + (active ? ' active' : '');
          card.innerHTML = `
            <div class="pl-card-name">${escapeHtml(pl.name)}</div>
            <div class="pl-card-meta"><span>${pl.trackIds.length} трек.</span><span>›</span></div>
          `;
          card.addEventListener('click', () => {
            state.selectedPlaylistId = (state.selectedPlaylistId === pl.id) ? null : pl.id;
            renderLibrary();
          });
          strip.appendChild(card);
        });

        const activePlBar = $('activePlBar'), libFilterChips = $('libFilterChips');
        if (state.selectedPlaylistId) {
          const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
          if (pl) {
            activePlBar.classList.add('show');
            libFilterChips.style.display = 'none';
            $('activePlTitle').textContent = pl.name;
            $('activePlSub').textContent = `${pl.trackIds.length} трек(ов)`;
          } else {
            state.selectedPlaylistId = null;
          }
        }
        if (!state.selectedPlaylistId) {
          activePlBar.classList.remove('show');
          libFilterChips.style.display = 'flex';
        }

        const list = getVisibleLibraryTracks();
        libraryTrackList.innerHTML = '';
        if (!list.length) {
          libraryTrackList.innerHTML = `<div style="text-align:center;padding:30px 12px;color:var(--text-dim);font-size:13px;">
            ${state.selectedPlaylistId
              ? 'В этом плейлисте пока нет треков — найдите музыку в «Поиске» и нажмите «+»'
              : 'Здесь пока пусто — добавьте треки из поиска, через Telegram-бота или загрузите свои MP3'}
          </div>`;
          return;
        }
        const ctx = state.selectedPlaylistId ? 'playlist' : 'library';
        list.forEach(t => libraryTrackList.appendChild(buildTrackRow(t, ctx)));
      }

      // ================= PLAYLIST PICKER MODAL =================
      const playlistModal = $('playlistModal');

      function openPlaylistModal(track) {
        state.modalTrack = track || null;
        const isAuth = Boolean(state.user && state.user.tgId && state.tgToken);
        $('plModalHeading').textContent = track
          ? (isAuth ? 'В личный плейлист аккаунта' : 'Добавить в плейлист')
          : 'Новый плейлист';
        const hint = $('plAuthHint');
        if (hint) hint.classList.toggle('show', !isAuth);
        const box = $('plModalTrackBox');
        if (track) {
          box.style.display = 'flex';
          $('plModalTrackTitle').textContent = track.title;
          $('plModalTrackArtist').textContent = track.artist;
          const artEl = $('plModalTrackArt');
          artEl.style.background = track.coverGrad || '#181b22';
          artEl.innerHTML = track.artwork
            ? `<img src="${escapeHtml(track.artwork)}" alt="" />${trackInitials(track.title)}`
            : trackInitials(track.title);
          const mImg = artEl.querySelector('img');
          if (mImg) mImg.addEventListener('error', () => mImg.remove());
        } else {
          box.style.display = 'none';
        }
        $('newPlNameInput').value = '';
        renderPlaylistModalOptions();
        playlistModal.classList.add('open');
      }

      function closePlaylistModal() {
        playlistModal.classList.remove('open');
        state.modalTrack = null;
      }

      function renderPlaylistModalOptions() {
        const listEl = $('plOptionList');
        listEl.innerHTML = '';
        const track = state.modalTrack;
        if (!track) {
          listEl.innerHTML = `<div style="font-size:12px;color:var(--text-dim);padding:6px 2px;">Введите название выше и нажмите «Создать»</div>`;
          return;
        }
        state.playlists.forEach(pl => {
          const has = pl.trackIds.includes(track.id);
          const item = document.createElement('div');
          item.className = 'pl-option-item' + (has ? ' has-track' : '');
          item.innerHTML = `
            <div style="min-width:0;">
              <div style="font-size:13.5px;font-weight:500;">${escapeHtml(pl.name)}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${pl.trackIds.length} трек(ов)</div>
            </div>
            <div class="pl-check">
              ${has ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
            </div>
          `;
          item.addEventListener('click', () => {
            if (has) {
              pl.trackIds = pl.trackIds.filter(id => id !== track.id);
              showToast(`Убрано из «${pl.name}»`);
            } else {
              ensureTrackInLibrary(track);
              pl.trackIds.unshift(track.id);
              showToast(state.user && state.user.tgId ? `Добавлено в «${pl.name}» (аккаунт)` : `Добавлено в «${pl.name}»`);
            }
            persistPlaylists(true);
            renderPlaylistModalOptions();
            renderSearchResultsList();
            renderLibrary();
            renderProfile();
            updatePlayerPlaylistBtn();
          });
          listEl.appendChild(item);
        });
      }

      function removeTrackFromPlaylist(plId, trackId) {
        const pl = state.playlists.find(p => p.id === plId);
        if (!pl) return;
        pl.trackIds = pl.trackIds.filter(id => id !== trackId);
        persistPlaylists(true);
        renderLibrary();
        renderSearchResultsList();
        showToast(`Убрано из «${pl.name}»`);
      }

      async function deleteTrackFromLibrary(track) {
        if (!track || !track.id) return;
        const tid = track.id;

        // 1) Remove from library, queue, likes and every user playlist
        state.libraryTracks = state.libraryTracks.filter(t => t && t.id !== tid);
        state.activeQueue = (state.activeQueue || []).filter(t => t && t.id !== tid);
        state.likedIds.delete(tid);
        state.playlists.forEach(pl => {
          if (pl && Array.isArray(pl.trackIds)) {
            pl.trackIds = pl.trackIds.filter(id => id !== tid);
          }
        });

        // 2) Clean up offline IndexedDB blob & local object URL if any
        if (state.offlineIds.has(tid)) {
          await removeTrackOffline(track, true);
        }
        if (track.isLocal && track.audioUrl && String(track.audioUrl).startsWith('blob:')) {
          try { URL.revokeObjectURL(track.audioUrl); } catch (e) {}
        }

        // 3) If deleted track is currently playing, pause cleanly
        if (state.currentTrack && state.currentTrack.id === tid) {
          pausePlayback();
          try { htmlAudio.removeAttribute('src'); htmlAudio.load(); } catch (e) {}
          state.currentTrack = null;
          miniPlayer.classList.remove('show');
          closePlayerOverlay();
        }

        // 4) Persist locally and push immediately to Telegram cloud account
        store.set('liked', Array.from(state.likedIds));
        store.set('playlists', state.playlists);
        store.set('savedCatalogTracks', getSerializableSavedTracks());
        pushCloudSyncNow(false);

        renderLibrary();
        renderSearchResultsList();
        renderProfile();
        updateOfflineUI();
        showToast(`Трек удалён: ${track.title}`);
      }

      $('createPlBtn').addEventListener('click', () => {
        const name = $('newPlNameInput').value.trim();
        if (!name) { showToast('Введите название плейлиста'); return; }
        const newPl = { id: 'pl_' + Date.now(), name, trackIds: [] };
        if (state.modalTrack) {
          ensureTrackInLibrary(state.modalTrack);
          newPl.trackIds.push(state.modalTrack.id);
        }
        state.playlists.unshift(newPl);
        persistPlaylists(true);
        $('newPlNameInput').value = '';
        renderPlaylistModalOptions();
        renderLibrary();
        renderSearchResultsList();
        renderProfile();
        updatePlayerPlaylistBtn();
        if (state.modalTrack) {
          showToast(`Создан «${name}» и трек добавлен`);
        } else {
          showToast(`Плейлист «${name}» создан`);
          state.selectedPlaylistId = newPl.id;
          renderLibrary();
          closePlaylistModal();
        }
      });

      $('closePlModalBtn').addEventListener('click', closePlaylistModal);
      playlistModal.addEventListener('click', (e) => { if (e.target === playlistModal) closePlaylistModal(); });

      $('playActivePlBtn').addEventListener('click', () => {
        const list = getVisibleLibraryTracks();
        if (!list.length) { showToast('Плейлист пуст'); return; }
        state.activeQueue = [...list];
        playTrack(list[0], true);
      });

      $('downloadActivePlBtn').addEventListener('click', async () => {
        if (isOfflineEffective()) {
          showToast('Для скачивания плейлиста нужен интернет');
          return;
        }
        const list = getVisibleLibraryTracks();
        const toDl = list.filter(t => t && !state.offlineIds.has(t.id));
        if (!toDl.length) {
          showToast('Все треки этого плейлиста уже доступны оффлайн');
          return;
        }
        const btn = $('downloadActivePlBtn');
        btn.disabled = true;
        let done = 0;
        for (let i = 0; i < toDl.length; i++) {
          btn.textContent = `${i + 1}/${toDl.length}`;
          const ok = await cacheTrackOffline(toDl[i], { silent: true, pinned: true });
          if (ok) done++;
        }
        btn.disabled = false;
        btn.textContent = '⬇ Оффлайн';
        showToast(`Сохранено оффлайн: ${done} из ${toDl.length} трек.`);
      });

      $('deleteActivePlBtn').addEventListener('click', () => {
        if (!state.selectedPlaylistId) return;
        const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
        state.playlists = state.playlists.filter(p => p.id !== state.selectedPlaylistId);
        state.selectedPlaylistId = null;
        persistPlaylists(true);
        renderLibrary();
        renderProfile();
        if (pl) showToast(`Плейлист «${pl.name}» удалён`);
      });

      function toggleLike(track) {
        ensureTrackInLibrary(track);
        if (state.likedIds.has(track.id)) state.likedIds.delete(track.id);
        else { state.likedIds.add(track.id); showToast('Добавлено в избранное'); }
        store.set('liked', Array.from(state.likedIds));
        scheduleCloudSync();
        favRecsDirty = true;
        renderQuickTags();
        renderSearchResultsList();
        renderLibrary();
        updatePlayerLikeUI();
        renderProfile();
      }

      // ================= PLAYER & SYNCED LYRICS (TELEGRAM BOT ONLY) =================
      let playSeq = 0;

      async function playTrack(track, openFullscreen = false) {
        if (!track) return;
        unlockAudioForIos();

        const isSame = state.currentTrack && state.currentTrack.id === track.id;
        state.currentTrack = track;
        const mySeq = ++playSeq;

        if (!isSame) {
          retryCountForTrack = 0;
          clearTimeout(autoCacheTimer);
          clearStreamWatchdog();
          state.currentTime = 0;
          state.lyricsOffset = 0;
          stopSynthLoop();
          htmlAudio.pause();
          track._playingOffline = false;

          if (activeOfflineBlobUrl) {
            try { URL.revokeObjectURL(activeOfflineBlobUrl); } catch (e) {}
            activeOfflineBlobUrl = '';
          }

          // 1) Check IndexedDB Offline Cache FIRST -> instant 0ms playback even in Airplane Mode!
          let playedFromOffline = false;
          if (state.offlineIds.has(track.id)) {
            const offRec = await idbGetRecord(track.id);
            if (mySeq !== playSeq) return;
            if (offRec && offRec.blob) {
              if (Array.isArray(offRec.lyrics) && offRec.lyrics.length && (!track.lyrics || track.lyricsIsPlaceholder)) {
                track.lyrics = offRec.lyrics;
                track.lyricsIsPlaceholder = false;
              }
              activeOfflineBlobUrl = URL.createObjectURL(offRec.blob);
              track._playingOffline = true;
              currentAudioMode = 'stream';
              applyAudioVolume(state.volume, false);
              htmlAudio.src = activeOfflineBlobUrl;
              try { htmlAudio.currentTime = 0; } catch (e) {}
              const p = htmlAudio.play();
              if (p && typeof p.catch === 'function') {
                p.catch(() => showToast('Нажмите Play для запуска звука'));
              }
              playedFromOffline = true;
            } else {
              state.offlineIds.delete(track.id);
              updateOfflineUI();
            }
          }

          if (!playedFromOffline) {
            if (track.audioUrl) {
              currentAudioMode = 'stream';
              applyAudioVolume(state.volume, false);
              htmlAudio.src = track.audioUrl;
              try { htmlAudio.currentTime = 0; } catch (e) {}
              htmlAudio.play().catch(() => showToast('Нажмите Play для запуска звука'));
            } else if (track.synth && !track.fromTelegramBot && !track.fromCatalog) {
              currentAudioMode = 'synth';
              state.isPlaying = true;
              startSynthLoop(track);
            } else if (isOfflineEffective()) {
              state.isPlaying = false;
              updatePlayerUI();
              showToast('Нет интернета — этот трек не загружен в оффлайн-кэш');
              return;
            } else {
              // Online streaming strictly via Telegram Bot
              let streamUrl = track.tgStreamUrl || (track.tgTrackId ? tgApiUrl(`/api/tg/stream/${encodeURIComponent(track.tgTrackId)}`) : '');
              if (streamUrl) {
                currentAudioMode = 'stream';
                applyAudioVolume(state.volume, false);
                htmlAudio.src = streamUrl;
                try { htmlAudio.currentTime = 0; } catch (e) {}
                armStreamWatchdog(track.id, 12000);
                const p = htmlAudio.play();
                if (p && typeof p.catch === 'function') {
                  p.catch(() => showToast('Нажмите кнопку Play ещё раз для старта звука'));
                }
              } else {
                try {
                  htmlAudio.src = SILENT_WAV_URI;
                  htmlAudio.play().catch(() => {});
                } catch (e) {}

                state.isPlaying = true;
                lastTickTime = performance.now();
                updatePlayerUI();
                if (openFullscreen) openPlayerOverlay();
                $('playerArtist').innerHTML = `<span class="stream-loading-dot"></span>Загрузка через Telegram-бота...`;

                const params = new URLSearchParams({ artist: track.artist || '', title: track.title || '' });
                const res = await fetchJsonTimeout(`${tgApiUrl('/api/tg/resolve')}?${params.toString()}`, 10000);
                if (mySeq !== playSeq) return;

                if (res && res.ok && res.streamUrl) {
                  const fullUrl = res.streamUrl.startsWith('http') ? res.streamUrl : tgApiUrl(res.streamUrl);
                  track.tgStreamUrl = fullUrl;
                  if (res.id) track.tgTrackId = String(res.id);
                  if (res.duration > 0) track.duration = res.duration;
                  currentAudioMode = 'stream';
                  applyAudioVolume(state.volume, false);
                  htmlAudio.src = fullUrl;
                  try { htmlAudio.currentTime = 0; } catch (e) {}
                  armStreamWatchdog(track.id, 12000);
                  htmlAudio.play().catch(() => showToast('Нажмите Play для запуска звука'));
                } else {
                  state.isPlaying = false;
                  htmlAudio.pause();
                  updatePlayerUI();
                  showToast('Бот не смог найти аудио для этого трека');
                  return;
                }
              }
            }
          }

          state.isPlaying = true;
          lastTickTime = performance.now();
          updatePlayerUI();
          renderSearchResultsList();
          renderLibrary();
          if (openFullscreen) openPlayerOverlay();

          $('lyricsHeaderTitle').textContent = 'ТЕКСТ';
          if (track.lyrics && track.lyrics.length) {
            $('lyricsSourceTag').textContent = 'SYNC';
            renderLyrics(track);
          } else {
            fetchSyncedLyricsForTrack(track);
          }

          updateMediaSession(track);
        } else {
          if (!state.isPlaying) resumePlayback();
          if (openFullscreen) openPlayerOverlay();
        }

        state.isPlaying = true;
        lastTickTime = performance.now();
        updatePlayerUI();
        renderSearchResultsList();
        renderLibrary();
      }

      function resumePlayback() {
        const track = state.currentTrack;
        if (!track) return;
        unlockAudioForIos();
        state.isPlaying = true;
        lastTickTime = performance.now();
        if (currentAudioMode === 'stream') {
          htmlAudio.play().catch(() => {});
        } else {
          startSynthLoop(track);
        }
        updatePlayerUI();
        renderSearchResultsList();
        renderLibrary();
      }

      function pausePlayback() {
        state.isPlaying = false;
        clearStreamWatchdog();
        stopSynthLoop();
        if (currentAudioMode === 'stream') htmlAudio.pause();
        updatePlayerUI();
        renderSearchResultsList();
        renderLibrary();
      }

      function togglePlayPause() {
        if (!state.currentTrack) {
          const first = state.searchResults[0] || state.libraryTracks[0];
          if (first) playTrack(first, false);
          return;
        }
        if (state.isPlaying) pausePlayback();
        else resumePlayback();
      }

      function getQueue() {
        if (state.activeQueue && state.activeQueue.length) return state.activeQueue;
        if (state.searchResults && state.searchResults.length) return state.searchResults;
        return state.libraryTracks;
      }

      function nextTrack() {
        const q = getQueue();
        if (!q.length) return;
        let idx = q.findIndex(t => state.currentTrack && t.id === state.currentTrack.id);
        if (state.shuffle && q.length > 1) {
          let r = idx;
          while (r === idx) r = Math.floor(Math.random() * q.length);
          idx = r;
        } else {
          idx = (idx + 1) % q.length;
        }
        playTrack(q[idx], false);
      }

      function prevTrack() {
        const q = getQueue();
        if (!q.length) return;
        if (state.currentTrack && state.currentTime > 3) { seekTo(0); return; }
        let idx = q.findIndex(t => state.currentTrack && t.id === state.currentTrack.id);
        idx = (idx - 1 + q.length) % q.length;
        playTrack(q[idx], false);
      }

      function seekTo(sec) {
        const track = state.currentTrack;
        if (!track) return;
        state.currentTime = Math.max(0, Math.min(sec, track.duration || 1));
        if (currentAudioMode === 'stream') {
          try { htmlAudio.currentTime = state.currentTime; } catch (e) {}
        } else if (state.isPlaying) {
          startSynthLoop(track);
        }
        syncTimeAndLyrics(true);
      }

      function openPlayerOverlay() {
        triggerChromeFlash();
        playerOverlay.classList.add('open');
        playerOverlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => syncTimeAndLyrics(true), 120);
      }
      function closePlayerOverlay() {
        playerOverlay.classList.remove('open');
        playerOverlay.setAttribute('aria-hidden', 'true');
      }

      function updatePlayerLikeUI() {
        const track = state.currentTrack;
        if (!track) return;
        const liked = state.likedIds.has(track.id);
        const btn = $('playerLikeBtn');
        btn.classList.toggle('liked', liked);
        btn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none');
      }

      function updatePlayerPlaylistBtn() {
        const track = state.currentTrack;
        if (!track) return;
        $('playerAddPlBtn').classList.toggle('in-pl', isTrackInAnyPlaylist(track.id));
      }

      function updatePlayerUI() {
        const track = state.currentTrack;
        if (!track) return;

        miniPlayer.classList.add('show');
        const miniArt = $('miniArt');
        miniArt.style.background = track.coverGrad || '#181b22';
        miniArt.innerHTML = track.artwork
          ? `<img src="${escapeHtml(track.artwork)}" alt="" />${trackInitials(track.title)}`
          : trackInitials(track.title);
        const miImg = miniArt.querySelector('img');
        if (miImg) miImg.addEventListener('error', () => miImg.remove());
        $('miniTitle').textContent = track.title;
        $('miniArtist').textContent = track.artist;

        const cover = $('playerCover'), coverImg = $('playerCoverImg');
        cover.style.background = track.coverGrad || '#181b22';
        if (track.artwork) {
          coverImg.src = track.artwork;
          cover.classList.add('has-img');
          coverImg.onerror = () => cover.classList.remove('has-img');
        } else {
          cover.classList.remove('has-img');
          coverImg.removeAttribute('src');
        }
        cover.classList.toggle('beating', state.isPlaying);

        const activeSource = track._playingOffline ? 'Оффлайн' : (track.isLocal ? 'Файл' : (track.inTelegram ? 'Telegram Бот' : (track.source || 'Telegram Бот')));
        $('playerTitle').textContent = track.title;
        $('playerArtist').textContent = `${track.artist} · ${activeSource}`;
        $('totTime').textContent = fmtTime(track.duration);
        $('playerScrubber').disabled = false;
        $('playerScrubber').max = track.duration || 100;

        const pauseSvg = `<rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/>`;
        const playSvg  = `<polygon points="7 4 20 12 7 20 7 4"/>`;
        $('mainPlayIcon').innerHTML = state.isPlaying ? pauseSvg : playSvg;
        $('miniPlayIcon').innerHTML = state.isPlaying ? pauseSvg : playSvg;
        updatePlayerLikeUI();
        updatePlayerPlaylistBtn();
        updatePlayerOfflineBtn();
      }

      let lastActiveLyricIdx = -1;
      function renderLyrics(track) {
        lyricsScroll.innerHTML = '';
        lastActiveLyricIdx = -1;
        const lines = (track.lyrics && track.lyrics.length) ? track.lyrics : [{ t: 0, text: 'APATHY Audio' }];
        lines.forEach((line, idx) => {
          const el = document.createElement('div');
          el.className = 'lyric-line';
          el.dataset.idx = idx;
          el.textContent = line.text;
          el.addEventListener('click', () => {
            seekTo(Math.max(0, line.t - state.lyricsOffset));
            if (!state.isPlaying) resumePlayback();
          });
          lyricsScroll.appendChild(el);
        });
      }

      function syncTimeAndLyrics(forceScroll = false) {
        const track = state.currentTrack;
        if (!track) return;
        const dur = track.duration || 1;
        const pct = Math.min(100, (state.currentTime / dur) * 100);
        $('curTime').textContent = fmtTime(state.currentTime);
        $('playerScrubber').value = state.currentTime;
        $('miniProgress').style.width = pct + '%';

        const lines = track.lyrics || [];
        const effectiveTime = state.currentTime + state.lyricsOffset;
        let activeIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (effectiveTime >= lines[i].t) activeIdx = i;
          else break;
        }
        if (activeIdx !== lastActiveLyricIdx || forceScroll) {
          lastActiveLyricIdx = activeIdx;
          const nodes = lyricsScroll.querySelectorAll('.lyric-line');
          nodes.forEach((node, i) => {
            node.classList.toggle('active', i === activeIdx);
            node.classList.toggle('past', i < activeIdx);
          });
          if (activeIdx >= 0 && nodes[activeIdx]) {
            const target = nodes[activeIdx];
            const top = target.offsetTop - lyricsScroll.clientHeight * 0.36;
            lyricsScroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
          }
        }
      }

      function initPlayerLoopAndVisualizer() {
        const canvas = $('playerVizCanvas');
        const ctx = canvas.getContext('2d', { alpha: true });
        let cw = 0, ch = 0, dpr = 1;
        let windTime = 0;
        let windSpeedCur = 0.12;
        let windAmpCur = 0.18;
        let pulseCur = 0;

        function mulberry32(seed) {
          let a = seed >>> 0;
          return function() {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }

        // Pre-built bare gnarled branching trees (flat node arrays for 60fps zero-GC traversal)
        let treesBack = [];
        let treesMid = [];
        let treesFore = [];
        let standingCrosses = [];
        let driftingCrosses = [];
        let windMotes = [];
        let hillPoints = [];

        function createBranchingTree(rand, opts) {
          const nodes = [];
          const {
            rootX, rootY, trunkLen, trunkWidth, maxDepth,
            baseAngle, spread, layer, phase, swayScale, hasLeaves
          } = opts;

          // Recursive builder into flat array: parentIdx, relAngle, len, width, curve, flex, depth, leafClusters
          function grow(parentIdx, relAngle, len, width, depth) {
            const idx = nodes.length;
            const curve = (rand() - 0.5) * 0.42;
            const flex = depth === 0 ? 0.08 : (depth === 1 ? 0.24 : (depth === 2 ? 0.52 : (depth === 3 ? 0.85 : 1.15)));
            const leaves = [];
            if (hasLeaves && depth >= maxDepth - 1 && rand() < 0.65) {
              const lc = 2 + Math.floor(rand() * 3);
              for (let k = 0; k < lc; k++) {
                leaves.push({
                  t: 0.45 + rand() * 0.55,
                  ox: (rand() - 0.5) * 10,
                  oy: (rand() - 0.5) * 8,
                  rx: 1.8 + rand() * 2.4,
                  ry: 1.0 + rand() * 1.4,
                  rot: rand() * Math.PI
                });
              }
            }
            nodes.push({
              parentIdx,
              relAngle,
              len,
              width,
              curve,
              flex,
              depth,
              phaseOff: rand() * 1.8,
              leaves,
              // Runtime scratchpad (no allocations per frame!)
              x0: 0, y0: 0, x1: 0, y1: 0, cx: 0, cy: 0, absAng: 0
            });

            if (depth >= maxDepth) return;

            // Main fork count (organic bare winter tree silhouette like reference photo)
            const children = depth === 0
              ? (2 + (rand() < 0.72 ? 1 : 0))
              : (depth === 1 ? (2 + (rand() < 0.55 ? 1 : 0)) : 2);

            for (let c = 0; c < children; c++) {
              const tSlot = children === 1 ? 0 : (c / (children - 1) - 0.5);
              // Spread outward naturally with crooked natural jitter
              const fan = spread * (depth === 0 ? 1.15 : (depth === 1 ? 1.0 : 0.86));
              const childRel = tSlot * fan + (rand() - 0.5) * 0.34;
              const lenScale = depth === 0
                ? (0.58 + rand() * 0.22)
                : (0.64 + rand() * 0.22);
              const childLen = len * lenScale;
              const childW = Math.max(0.55, width * (0.58 + rand() * 0.14));
              if (childLen < 0.012) continue;
              grow(idx, childRel, childLen, childW, depth + 1);
            }

            // Extra subtle side twig emerging mid-limb on primary/secondary branches
            if (depth <= 1 && rand() < 0.65 && nodes.length < 72) {
              const sideSign = rand() < 0.5 ? -1 : 1;
              grow(idx, sideSign * (0.48 + rand() * 0.38), len * (0.42 + rand() * 0.16), Math.max(0.55, width * 0.48), depth + 2);
            }
          }

          grow(-1, baseAngle, trunkLen, trunkWidth, 0);
          return { rootX, rootY, layer, phase, swayScale, nodes };
        }

        function buildChromeForestScene() {
          const rand = mulberry32(20261134);
          treesBack = [];
          treesMid = [];
          treesFore = [];
          standingCrosses = [];
          driftingCrosses = [];
          windMotes = [];

          // Subtle rolling dark hill silhouette along bottom 14%
          hillPoints = [];
          for (let i = 0; i <= 16; i++) {
            const xn = i / 16;
            const yn = 0.885 - 0.032 * Math.sin(xn * Math.PI * 2.1 + 0.4) - 0.018 * Math.cos(xn * Math.PI * 4.3);
            hillPoints.push({ xn, yn });
          }

          // 1) Distant misty bare silhouettes (smaller, softer, deeper in fog)
          const backXs = [0.06, 0.17, 0.29, 0.41, 0.54, 0.67, 0.79, 0.91];
          backXs.forEach((bx) => {
            const xNorm = bx + (rand() - 0.5) * 0.05;
            treesBack.push(createBranchingTree(rand, {
              rootX: xNorm,
              rootY: 0.92 + rand() * 0.04,
              trunkLen: 0.13 + rand() * 0.06,
              trunkWidth: 2.2 + rand() * 1.4,
              maxDepth: 3,
              baseAngle: -Math.PI / 2 + (rand() - 0.5) * 0.16,
              spread: 0.92 + rand() * 0.3,
              layer: 0,
              phase: rand() * Math.PI * 2,
              swayScale: 0.52,
              hasLeaves: false
            }));
          });

          // 2) Main mid-ground gnarled leafless trees (center-right & left-mid, matching reference silhouettes)
          const midSpecs = [
            { x: 0.14, len: 0.20, w: 4.2, spread: 1.05, leaves: true },
            { x: 0.34, len: 0.18, w: 3.6, spread: 1.12, leaves: false },
            { x: 0.52, len: 0.22, w: 4.0, spread: 1.00, leaves: false },
            { x: 0.69, len: 0.24, w: 4.3, spread: 0.98, leaves: false },
            { x: 0.85, len: 0.20, w: 4.0, spread: 1.10, leaves: false },
            { x: 0.96, len: 0.19, w: 3.8, spread: 1.02, leaves: false }
          ];
          midSpecs.forEach((sp) => {
            treesMid.push(createBranchingTree(rand, {
              rootX: sp.x + (rand() - 0.5) * 0.03,
              rootY: 0.95 + rand() * 0.03,
              trunkLen: sp.len + (rand() - 0.5) * 0.03,
              trunkWidth: sp.w,
              maxDepth: 4,
              baseAngle: -Math.PI / 2 + (rand() - 0.5) * 0.14,
              spread: sp.spread,
              layer: 1,
              phase: rand() * Math.PI * 2,
              swayScale: 0.85,
              hasLeaves: sp.leaves
            }));
          });

          // 3) Foreground framing gnarled dark branches (left tree with dark sparse autumn leaves + upper-left & right overhanging limbs)
          treesFore.push(createBranchingTree(rand, {
            rootX: 0.03,
            rootY: 1.01,
            trunkLen: 0.28,
            trunkWidth: 6.2,
            maxDepth: 4,
            baseAngle: -Math.PI / 2 + 0.12,
            spread: 1.18,
            layer: 2,
            phase: rand() * Math.PI * 2,
            swayScale: 1.05,
            hasLeaves: true
          }));
          // Overhanging bare bough entering from top-left edge (just like the reference photo!)
          treesFore.push(createBranchingTree(rand, {
            rootX: -0.04,
            rootY: 0.16,
            trunkLen: 0.17,
            trunkWidth: 4.6,
            maxDepth: 3,
            baseAngle: -0.06,
            spread: 0.82,
            layer: 2,
            phase: rand() * Math.PI * 2,
            swayScale: 1.1,
            hasLeaves: false
          }));
          // Subtle right-edge dark bare branches
          treesFore.push(createBranchingTree(rand, {
            rootX: 1.02,
            rootY: 0.96,
            trunkLen: 0.24,
            trunkWidth: 5.2,
            maxDepth: 4,
            baseAngle: -Math.PI / 2 - 0.18,
            spread: 1.08,
            layer: 2,
            phase: rand() * Math.PI * 2,
            swayScale: 1.0,
            hasLeaves: false
          }));

          // Subtle darkened gothic chrome crosses standing quietly in the dark mist
          [0.21, 0.44, 0.62, 0.78].forEach((xp, idx) => {
            standingCrosses.push({
              xNorm: xp + (rand() - 0.5) * 0.03,
              hNorm: 0.10 + rand() * 0.07,
              layer: idx % 2 === 0 ? 1 : 2,
              phase: rand() * Math.PI * 2,
              tiltBase: (rand() - 0.5) * 0.05,
              shimmerPhase: rand() * Math.PI * 2
            });
          });

          // Very subtle tiny dark-chrome drifting crosses in the fog
          for (let i = 0; i < 6; i++) {
            driftingCrosses.push({
              x: rand(),
              y: 0.14 + rand() * 0.58,
              size: 6 + rand() * 7,
              speedX: 0.014 + rand() * 0.022,
              speedY: -0.003 - rand() * 0.006,
              phase: rand() * Math.PI * 2,
              rot: (rand() - 0.5) * 0.4,
              alpha: 0.10 + rand() * 0.16
            });
          }

          // Subtle dark mist / wind dust motes
          for (let i = 0; i < 24; i++) {
            windMotes.push({
              x: rand(),
              y: 0.15 + rand() * 0.78,
              len: 4 + rand() * 11,
              speed: 0.04 + rand() * 0.08,
              phase: rand() * Math.PI * 2,
              alpha: 0.05 + rand() * 0.10
            });
          }
        }

        function drawDarkChromeCross(cx, cy, hPx, tiltRad, alpha, pal, shimmer) {
          const wPx = hPx * 0.64;
          const armY = -hPx * 0.66;
          const topY = -hPx;
          const neckW = Math.max(1.0, hPx * 0.05);
          const armHalf = wPx * 0.5;
          const coreHalf = Math.max(1.8, hPx * 0.088);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(tiltRad);
          ctx.globalAlpha = alpha;

          const grad = ctx.createLinearGradient(-armHalf, topY, armHalf, 0);
          grad.addColorStop(0, pal.mid);
          grad.addColorStop(0.35, pal.dark);
          grad.addColorStop(0.7, pal.midTree);
          grad.addColorStop(1, pal.deep);

          ctx.beginPath();
          ctx.moveTo(0, topY);
          ctx.lineTo(neckW, armY - neckW * 1.4);
          ctx.lineTo(coreHalf, armY - neckW * 0.55);
          ctx.lineTo(armHalf, armY);
          ctx.lineTo(coreHalf, armY + neckW * 0.55);
          ctx.lineTo(neckW, armY + neckW * 1.5);
          ctx.lineTo(0, 0);
          ctx.lineTo(-neckW, armY + neckW * 1.5);
          ctx.lineTo(-coreHalf, armY + neckW * 0.55);
          ctx.lineTo(-armHalf, armY);
          ctx.lineTo(-coreHalf, armY - neckW * 0.55);
          ctx.lineTo(-neckW, armY - neckW * 1.4);
          ctx.closePath();

          ctx.fillStyle = grad;
          ctx.fill();

          // Very soft muted metallic rim (never bright or glaring)
          ctx.strokeStyle = pal.hi;
          ctx.globalAlpha = alpha * (0.22 + shimmer * 0.24);
          ctx.lineWidth = Math.max(0.7, dpr * 0.75);
          ctx.stroke();

          ctx.restore();
        }

        function drawBranchingTree(tree, windT, windAmp, pal) {
          const nodes = tree.nodes;
          if (!nodes.length) return;

          const scaleH = ch;
          const gustBase = Math.sin(windT * 1.25 - tree.rootX * 4.8 + tree.phase)
            + 0.45 * Math.sin(windT * 2.35 - tree.rootX * 8.1 + tree.phase * 1.3)
            + 0.25 * Math.cos(windT * 0.58 + tree.phase);

          // 1) Forward-kinematics pass: root -> twigs with cumulative wind bend
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const twigFlutter = n.depth >= 2
              ? Math.sin(windT * 2.6 + n.phaseOff + tree.phase) * 0.045 * windAmp * tree.swayScale
              : 0;
            const bendAngle = gustBase * 0.085 * n.flex * windAmp * tree.swayScale + twigFlutter;

            if (n.parentIdx < 0) {
              n.x0 = tree.rootX * cw;
              n.y0 = tree.rootY * ch;
              n.absAng = n.relAngle + bendAngle;
            } else {
              const p = nodes[n.parentIdx];
              n.x0 = p.x1;
              n.y0 = p.y1;
              n.absAng = p.absAng + n.relAngle + bendAngle;
            }

            const segPx = n.len * scaleH;
            n.x1 = n.x0 + Math.cos(n.absAng) * segPx;
            n.y1 = n.y0 + Math.sin(n.absAng) * segPx;

            // Organic crooked midpoint control point perpendicular to branch direction
            const perpX = -Math.sin(n.absAng);
            const perpY = Math.cos(n.absAng);
            const crook = n.curve * segPx * 0.28;
            n.cx = (n.x0 + n.x1) * 0.5 + perpX * crook;
            n.cy = (n.y0 + n.y1) * 0.5 + perpY * crook;
          }

          // 2) Draw dark silhouette limbs & intricate bare twigs
          const strokeCol = tree.layer === 0 ? pal.backTree : (tree.layer === 1 ? pal.midTree : pal.dark);
          const baseAlpha = tree.layer === 0 ? 0.56 : (tree.layer === 1 ? 0.84 : 0.94);

          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Subtle muted chrome edge shimmer behind main trunks/boughs only (depth <= 1)
          if (tree.layer >= 1) {
            ctx.strokeStyle = pal.rim;
            ctx.globalAlpha = tree.layer === 2 ? 0.42 : 0.28;
            for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i];
              if (n.depth > 1) continue;
              ctx.lineWidth = Math.max(0.8, n.width * dpr * 0.95);
              ctx.beginPath();
              ctx.moveTo(n.x0 - 0.8 * dpr, n.y0);
              ctx.quadraticCurveTo(n.cx - 0.8 * dpr, n.cy, n.x1 - 0.6 * dpr, n.y1);
              ctx.stroke();
            }
          }

          // Dark shadowed branches (all depths)
          ctx.strokeStyle = strokeCol;
          ctx.globalAlpha = baseAlpha;
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            ctx.lineWidth = Math.max(0.55 * dpr, n.width * dpr);
            ctx.beginPath();
            ctx.moveTo(n.x0, n.y0);
            ctx.quadraticCurveTo(n.cx, n.cy, n.x1, n.y1);
            ctx.stroke();
          }

          // Sparse dark shadowed autumn leaf specks on foreground left tree (matching image_35b842.jpg!)
          ctx.fillStyle = pal.leaf;
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            if (!n.leaves.length) continue;
            for (let k = 0; k < n.leaves.length; k++) {
              const lf = n.leaves[k];
              const lx = n.x0 + (n.x1 - n.x0) * lf.t + lf.ox * dpr;
              const ly = n.y0 + (n.y1 - n.y0) * lf.t + lf.oy * dpr;
              ctx.globalAlpha = baseAlpha * 0.72;
              ctx.beginPath();
              ctx.ellipse(lx, ly, lf.rx * dpr, lf.ry * dpr, lf.rot + gustBase * 0.25 * windAmp, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        function drawHillSilhouette(pal) {
          if (!hillPoints.length) return;
          ctx.beginPath();
          ctx.moveTo(0, ch);
          for (let i = 0; i < hillPoints.length; i++) {
            const pt = hillPoints[i];
            ctx.lineTo(pt.xn * cw, pt.yn * ch);
          }
          ctx.lineTo(cw, ch);
          ctx.closePath();
          ctx.globalAlpha = 0.88;
          ctx.fillStyle = pal.deep;
          ctx.fill();
        }

        function resize() {
          const rect = playerOverlay.getBoundingClientRect();
          dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          cw = canvas.width = Math.max(1, Math.round(rect.width * dpr));
          ch = canvas.height = Math.max(1, Math.round(rect.height * dpr));
          buildChromeForestScene();
        }
        resize();
        window.addEventListener('resize', resize);

        function tick(now) {
          const dtRaw = lastTickTime ? (now - lastTickTime) / 1000 : 0.016;
          const dt = Math.min(Math.max(dtRaw, 0.001), 0.05);

          if (state.isPlaying && state.currentTrack) {
            const track = state.currentTrack;
            if (currentAudioMode === 'stream') {
              if (htmlAudio.src && htmlAudio.src !== SILENT_WAV_URI) {
                state.currentTime = htmlAudio.currentTime || 0;
                if (isFinite(htmlAudio.duration) && htmlAudio.duration > 1 && Math.abs(track.duration - htmlAudio.duration) > 1) {
                  track.duration = htmlAudio.duration;
                  $('totTime').textContent = fmtTime(track.duration);
                  $('playerScrubber').max = track.duration;
                }
                if (htmlAudio.ended) {
                  if (state.repeat) { seekTo(0); htmlAudio.play().catch(() => {}); }
                  else nextTrack();
                }
              }
            } else {
              if (dt > 0 && dt < 0.5) state.currentTime += dt;
              if (state.currentTime >= track.duration) {
                if (state.repeat) { state.currentTime = 0; startSynthLoop(track); }
                else nextTrack();
              }
            }
            syncTimeAndLyrics(false);
          }
          lastTickTime = now;

          if (playerOverlay.classList.contains('open') && !document.hidden && cw > 1 && ch > 1) {
            const pal = activeVizPalette;

            // Smooth wind speed: natural swaying wind when playing, ultra-slow breathing drift when paused
            const targetSpeed = state.isPlaying ? 1.38 : 0.14;
            const targetAmp = state.isPlaying ? 1.0 : 0.18;
            const easeRate = Math.min(1, dt * 3.0);
            windSpeedCur += (targetSpeed - windSpeedCur) * easeRate;
            windAmpCur += (targetAmp - windAmpCur) * easeRate;
            windTime += dt * windSpeedCur;

            let beatBoost = 0;
            if (state.isPlaying) {
              if (analyser && currentAudioMode === 'synth') {
                const bins = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(bins);
                beatBoost = ((bins[1] + bins[2] + bins[3]) / (3 * 255)) * 0.28;
              } else {
                beatBoost = 0.11 * Math.abs(Math.sin(windTime * 1.7));
              }
            }
            pulseCur += (beatBoost - pulseCur) * Math.min(1, dt * 5.5);
            const effAmp = windAmpCur + pulseCur;

            ctx.clearRect(0, 0, cw, ch);

            // 1) Dim smoky overcast fog glow behind the bare trees (low-contrast, dark-toned)
            const fogGlow = ctx.createRadialGradient(cw * 0.58, ch * 0.54, cw * 0.05, cw * 0.55, ch * 0.56, cw * 0.78);
            fogGlow.addColorStop(0, pal.glow);
            fogGlow.addColorStop(0.5, pal.mist);
            fogGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = fogGlow;
            ctx.fillRect(0, 0, cw, ch);

            // 2) Subtle drifting dark-chrome crosses high in the mist
            for (let i = 0; i < driftingCrosses.length; i++) {
              const dc = driftingCrosses[i];
              dc.x += dc.speedX * dt * windSpeedCur;
              dc.y += dc.speedY * dt * (0.35 + windSpeedCur * 0.45) + Math.sin(windTime + dc.phase) * 0.0002;
              if (dc.x > 1.06) { dc.x = -0.06; dc.y = 0.16 + ((i * 0.19) % 0.55); }
              if (dc.y < 0.08) dc.y = 0.68;
              const tilt = dc.rot + Math.sin(windTime * 0.8 + dc.phase) * 0.14 * effAmp;
              const shimmer = 0.5 + 0.5 * Math.sin(windTime * 1.9 + dc.phase);
              drawDarkChromeCross(dc.x * cw, dc.y * ch, dc.size * dpr, tilt, dc.alpha, pal, shimmer);
            }

            // 3) Back distant bare trees in heavy mist
            for (let i = 0; i < treesBack.length; i++) {
              drawBranchingTree(treesBack[i], windTime, effAmp, pal);
            }

            // Soft fog veil separating back & mid treeline
            const midFog = ctx.createLinearGradient(0, ch * 0.52, 0, ch);
            midFog.addColorStop(0, 'rgba(0,0,0,0)');
            midFog.addColorStop(0.58, pal.mist);
            midFog.addColorStop(1, 'rgba(3,4,6,0.72)');
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = midFog;
            ctx.fillRect(0, ch * 0.50, cw, ch * 0.50);

            // 4) Mid-ground bare branching trees + mid standing dark-chrome crosses
            for (let i = 0; i < treesMid.length; i++) {
              drawBranchingTree(treesMid[i], windTime, effAmp, pal);
            }
            for (let i = 0; i < standingCrosses.length; i++) {
              const sc = standingCrosses[i];
              if (sc.layer !== 1) continue;
              const swayTilt = sc.tiltBase + Math.sin(windTime * 1.05 - sc.xNorm * 4 + sc.phase) * 0.04 * effAmp;
              const shimmer = 0.5 + 0.5 * Math.sin(windTime * 1.8 + sc.shimmerPhase);
              drawDarkChromeCross(sc.xNorm * cw, ch * 0.94, sc.hNorm * ch, swayTilt, 0.42, pal, shimmer);
            }

            // 5) Whisper-thin mist wind streaks
            ctx.strokeStyle = pal.hi;
            ctx.lineWidth = Math.max(0.7, 0.8 * dpr);
            for (let i = 0; i < windMotes.length; i++) {
              const m = windMotes[i];
              m.x += m.speed * dt * windSpeedCur;
              m.y += Math.sin(windTime * 1.2 + m.phase) * 0.00035;
              if (m.x > 1.05) m.x = -0.05;
              const mx = m.x * cw;
              const my = m.y * ch;
              const sLen = m.len * dpr * (0.4 + effAmp * 0.85);
              ctx.globalAlpha = m.alpha * (state.isPlaying ? 0.85 : 0.35);
              ctx.beginPath();
              ctx.moveTo(mx, my);
              ctx.lineTo(mx + sLen, my - sLen * 0.12);
              ctx.stroke();
            }

            // 6) Foreground dark hillside, gnarled framing branches & dark-chrome crosses
            drawHillSilhouette(pal);
            for (let i = 0; i < treesFore.length; i++) {
              drawBranchingTree(treesFore[i], windTime, effAmp, pal);
            }
            for (let i = 0; i < standingCrosses.length; i++) {
              const sc = standingCrosses[i];
              if (sc.layer !== 2) continue;
              const swayTilt = sc.tiltBase + Math.sin(windTime * 1.15 - sc.xNorm * 4.5 + sc.phase) * 0.05 * effAmp;
              const shimmer = 0.5 + 0.5 * Math.sin(windTime * 2.0 + sc.shimmerPhase);
              drawDarkChromeCross(sc.xNorm * cw, ch * 0.97, sc.hNorm * ch * 1.1, swayTilt, 0.52, pal, shimmer);
            }

            // 7) Dark atmospheric vignette veil so the forest stays shadowed and never distracts from lyrics/controls
            const veil = ctx.createLinearGradient(0, 0, 0, ch);
            veil.addColorStop(0, 'rgba(3, 4, 7, 0.52)');
            veil.addColorStop(0.45, 'rgba(3, 4, 7, 0.28)');
            veil.addColorStop(0.84, 'rgba(3, 4, 7, 0.48)');
            veil.addColorStop(1, 'rgba(2, 3, 5, 0.84)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = veil;
            ctx.fillRect(0, 0, cw, ch);
          }

          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }

      // ================= PROFILE, TELEGRAM ACCOUNT, AVATAR & CLOUD SYNC (v30) =================
      let authPollTimer = null;
      let syncDebounceTimer = null;
      let isApplyingCloudState = false;
      let lastCloudUpdatedAt = 0;

      function setSyncStatus(text, isSyncing = false) {
        const badge = $('syncStatusBadge');
        const lbl = $('syncStatusText');
        if (badge) badge.classList.toggle('syncing', !!isSyncing);
        if (lbl) lbl.textContent = text;
      }

      function resolveUserPhotoUrl(u) {
        if (!u || !u.photoUrl) return '';
        const p = String(u.photoUrl).trim();
        if (!p) return '';
        if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
        return tgApiUrl(p);
      }

      function getSerializableSavedTracks() {
        return state.libraryTracks
          .filter(t => t && (t.fromTelegramBot || t.fromCatalog) && !t.isLocal)
          .slice(0, 300)
          .map(t => ({
            id: t.id,
            tgTrackId: t.tgTrackId || '',
            tgStreamUrl: t.tgStreamUrl || '',
            title: t.title || 'Без названия',
            artist: t.artist || 'Исполнитель',
            album: t.album || 'Telegram Бот',
            duration: t.duration || 180,
            artwork: t.artwork || '',
            coverGrad: t.coverGrad || '',
            source: t.source || 'Telegram',
            inTelegram: !!t.inTelegram,
            fromTelegramBot: true,
            fromCatalog: true
          }));
      }

      function renderProfile() {
        const u = state.user;
        if (u && u.tgId) {
          $('guestBox').style.display = 'none';
          $('userBox').style.display = 'block';
          const displayName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || (u.username ? '@' + u.username : 'Telegram');
          const subHandle = u.username ? ('@' + u.username) : ('ID ' + u.tgId);
          const ini = (displayName.replace(/[^A-Za-zА-Яа-яЁё0-9]/g, '').slice(0, 2) || 'TG').toUpperCase();
          const avatarSrc = resolveUserPhotoUrl(u);

          $('profileDisplayName').textContent = displayName;
          $('profileUsername').textContent = subHandle;

          const avLg = $('profileAvatarLg');
          if (avatarSrc) {
            avLg.innerHTML = `<img src="${escapeHtml(avatarSrc)}" alt="" />`;
            const img = avLg.querySelector('img');
            if (img) img.addEventListener('error', () => { avLg.textContent = ini; });
          } else {
            avLg.textContent = ini;
          }

          const resetBtn = $('resetAvatarBtn');
          if (resetBtn) resetBtn.style.display = u.hasCustomAvatar ? 'inline-flex' : 'none';

          $('statTracks').textContent = state.libraryTracks.length;
          $('statLiked').textContent = state.likedIds.size;
          $('statPlaylists').textContent = state.playlists.length;

          topProfileBtn.classList.add('logged-in');
          if (avatarSrc) {
            topProfileBtn.innerHTML = `<img src="${escapeHtml(avatarSrc)}" alt="" />`;
            const tImg = topProfileBtn.querySelector('img');
            if (tImg) tImg.addEventListener('error', () => { topProfileBtn.textContent = ini; });
          } else {
            topProfileBtn.textContent = ini;
          }
        } else {
          $('guestBox').style.display = 'block';
          $('userBox').style.display = 'none';
          topProfileBtn.classList.remove('logged-in');
          topProfileBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }
      }

      function normalizeCloudTrack(t) {
        if (!t || !t.id) return null;
        const tgId = t.tgTrackId || (String(t.id).startsWith('tg_') ? String(t.id).slice(3) : String(t.id));
        const streamUrl = tgApiUrl(`/api/tg/stream/${encodeURIComponent(tgId)}`);
        let art = t.artwork || '';
        if (art && art.startsWith('/')) art = tgApiUrl(art);
        return {
          id: String(t.id),
          tgTrackId: tgId,
          tgStreamUrl: streamUrl,
          title: t.title || 'Без названия',
          artist: t.artist || 'Исполнитель',
          album: t.album || 'Telegram Бот',
          duration: Number(t.duration || 180) || 180,
          artwork: art,
          coverGrad: t.coverGrad || 'linear-gradient(145deg, #163b5c 0%, #070c14 60%, #2468a3 100%)',
          source: t.source || 'Telegram',
          inTelegram: !!t.inTelegram,
          fromTelegramBot: true,
          fromCatalog: true,
          lyrics: null
        };
      }

      // mode: 'login_merge' (first sign-in: combine guest local + cloud) | 'pull' (authoritative refresh from cloud/bot)
      function applyCloudState(cloudState, mode = 'pull') {
        if (!cloudState || typeof cloudState !== 'object') return;
        const cloudTs = Number(cloudState.updatedAt || 0);
        if (mode === 'pull' && cloudTs > 0 && cloudTs <= lastCloudUpdatedAt) return;

        isApplyingCloudState = true;
        try {
          const cloudTracks = Array.isArray(cloudState.savedTracks)
            ? cloudState.savedTracks.map(normalizeCloudTrack).filter(Boolean)
            : [];
          const cloudPlaylists = Array.isArray(cloudState.playlists) ? cloudState.playlists : [];
          const cloudLikes = Array.isArray(cloudState.likedIds) ? cloudState.likedIds : [];

          const cloudHasData = cloudTracks.length > 0 || cloudLikes.length > 0 || cloudPlaylists.some(p => p && Array.isArray(p.trackIds) && p.trackIds.length > 0);

          if (mode === 'pull' && cloudHasData) {
            // Keep local uploaded files + authoritative cloud tracks (picks up new tracks added via Telegram bot!)
            const localFiles = state.libraryTracks.filter(t => t && t.isLocal);
            state.libraryTracks = [...localFiles, ...cloudTracks];

            if (cloudPlaylists.length > 0) {
              state.playlists = cloudPlaylists
                .filter(p => p && p.id && p.name)
                .map(p => ({
                  id: String(p.id),
                  name: String(p.name),
                  trackIds: Array.isArray(p.trackIds) ? Array.from(new Set(p.trackIds.map(String))) : []
                }));
            }
            state.likedIds = new Set(cloudLikes.map(String));
            if (cloudState.theme && THEME_META[cloudState.theme] && cloudState.theme !== state.theme) {
              applyTheme(cloudState.theme, false);
            }
          } else if (mode === 'login_merge' && cloudHasData) {
            const byId = new Map();
            cloudTracks.forEach(t => byId.set(t.id, t));
            state.libraryTracks.forEach(t => {
              if (t && t.id && !byId.has(t.id)) byId.set(t.id, t);
            });
            state.libraryTracks = Array.from(byId.values());

            const plMap = new Map();
            cloudPlaylists.forEach(p => {
              if (p && p.id && p.name) {
                plMap.set(p.id, {
                  id: String(p.id),
                  name: String(p.name),
                  trackIds: Array.isArray(p.trackIds) ? Array.from(new Set(p.trackIds.map(String))) : []
                });
              }
            });
            state.playlists.forEach(lp => {
              if (!lp || !lp.id) return;
              if (plMap.has(lp.id)) {
                const cp = plMap.get(lp.id);
                (lp.trackIds || []).forEach(tid => {
                  if (!cp.trackIds.includes(tid)) cp.trackIds.push(tid);
                });
              } else if (lp.trackIds && lp.trackIds.length > 0) {
                plMap.set(lp.id, { id: lp.id, name: lp.name, trackIds: [...lp.trackIds] });
              }
            });
            if (plMap.size > 0) state.playlists = Array.from(plMap.values());
            cloudLikes.forEach(id => state.likedIds.add(String(id)));
            if (cloudState.theme && THEME_META[cloudState.theme] && cloudState.theme !== state.theme) {
              applyTheme(cloudState.theme, false);
            }
          }

          if (cloudTs > 0) lastCloudUpdatedAt = cloudTs;

          store.set('playlists', state.playlists);
          store.set('liked', Array.from(state.likedIds));
          store.set('savedCatalogTracks', getSerializableSavedTracks());

          renderLibrary();
          renderSearchResultsList();
          renderProfile();
          updatePlayerLikeUI();
          updatePlayerPlaylistBtn();
        } finally {
          isApplyingCloudState = false;
        }

        renderQuickTags();
        if (!searchInput.value.trim() && getFavoriteArtistsSignature() !== favRecsLastSig) {
          performSearch(false);
        }

        if (mode === 'login_merge') {
          pushCloudSyncNow(false);
        }
      }

      async function pushCloudSyncNow(notify = false) {
        if (!state.tgToken || !state.user || !state.user.tgId) return false;
        clearTimeout(syncDebounceTimer);
        setSyncStatus('Сохранение в аккаунт...', true);
        try {
          const payload = {
            playlists: state.playlists.slice(0, 50),
            likedIds: Array.from(state.likedIds).slice(0, 500),
            savedTracks: getSerializableSavedTracks(),
            theme: state.theme
          };
          const resp = await fetch(`${tgApiUrl('/api/user/sync')}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + state.tgToken
            },
            body: JSON.stringify(payload)
          });
          if (resp.status === 401) {
            const recovered = await tryRecoverSessionViaMiniApp();
            if (recovered) return pushCloudSyncNow(notify);
            let errData = null;
            try { errData = await resp.json(); } catch (e) {}
            if (errData && (errData.error === 'unauthorized' || errData.error === 'token_expired')) {
              clearTgSession(false);
            }
            return false;
          }
          const data = resp.ok ? await resp.json() : null;
          if (data && data.ok) {
            if (data.refreshedToken) persistSessionCredentials(data.refreshedToken, state.user);
            if (data.syncedAt) lastCloudUpdatedAt = Number(data.syncedAt);
            const nowStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            setSyncStatus(`Синхронизировано · ${nowStr}`, false);
            if (notify) showToast('Плейлисты и избранное синхронизированы');
            return true;
          }
        } catch (e) {}
        setSyncStatus('Ожидание сети для синхронизации', true);
        if (notify) showToast('Не удалось связаться с сервером бота');
        return false;
      }

      async function refreshCloudAccountState(notify = false) {
        if (!state.tgToken) return false;
        try {
          const resp = await fetch(`${tgApiUrl('/api/user/me')}?_=${Date.now()}`, {
            headers: { 'Authorization': 'Bearer ' + state.tgToken }
          });
          if (resp.status === 401) {
            const recovered = await tryRecoverSessionViaMiniApp();
            if (recovered) return true;
            let errData = null;
            try { errData = await resp.json(); } catch (e) {}
            if (errData && (errData.error === 'unauthorized' || errData.error === 'token_expired')) {
              clearTgSession(false);
            }
            return false;
          }
          const data = resp.ok ? await resp.json() : null;
          if (data && data.ok && data.user) {
            const nextTok = data.refreshedToken || state.tgToken;
            persistSessionCredentials(nextTok, data.user);
            renderProfile();
            updateAuthGateUI();
            applyCloudState(data.state || {}, 'pull');
            if (notify) showToast('Медиатека аккаунта обновлена');
            return true;
          }
        } catch (e) {}
        return false;
      }

      function scheduleCloudSync() {
        if (isApplyingCloudState || !state.tgToken || !state.user || !state.user.tgId) return;
        setSyncStatus('Сохранение...', true);
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => pushCloudSyncNow(false), 650);
      }

      function stopAuthPolling() {
        if (authPollTimer) {
          clearInterval(authPollTimer);
          authPollTimer = null;
        }
        const pBox = $('tgAuthPendingBox');
        if (pBox) pBox.classList.remove('show');
        const btn = $('tgLoginBtn');
        if (btn) btn.disabled = false;
      }

      function persistSessionCredentials(token, user) {
        if (typeof token === 'string') {
          state.tgToken = token;
          store.set('tgAuthToken', token);
          writeSessionCookie(token);
          idbKvSet('tgAuthToken', token).catch(() => {});
        }
        if (user !== undefined) {
          state.user = user;
          store.set('user', user);
          idbKvSet('tgUser', user || null).catch(() => {});
        }
      }

      async function hydrateSessionFromBackupStorage() {
        let tok = state.tgToken || readSessionCookie() || '';
        let usr = state.user;
        if (!tok) {
          const idbTok = await idbKvGet('tgAuthToken');
          if (idbTok && typeof idbTok === 'string') tok = idbTok;
        }
        if (!usr || !usr.tgId) {
          const idbUsr = await idbKvGet('tgUser');
          if (idbUsr && idbUsr.tgId) usr = idbUsr;
        }
        if (tok) {
          persistSessionCredentials(tok, usr || state.user);
        }
      }

      async function tryRecoverSessionViaMiniApp() {
        try {
          const tgWebApp = window.Telegram && window.Telegram.WebApp;
          if (!tgWebApp || !tgWebApp.initData || tgWebApp.initData.length < 20) return false;
          const resp = await fetch(`${tgApiUrl('/api/auth/webapp')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tgWebApp.initData })
          });
          const data = resp.ok ? await resp.json() : null;
          if (data && data.ok && data.token && data.user) {
            applyAuthorizedSession(data, false);
            setSyncStatus('Подключено через Telegram Mini App', false);
            return true;
          }
        } catch (e) {}
        return false;
      }

      function applyAuthorizedSession(data, notify = true) {
        if (!data || !data.token || !data.user) return;
        stopAuthPolling();
        lastCloudUpdatedAt = 0;
        persistSessionCredentials(data.token, data.user);
        $('authMsg').textContent = '';
        const notice = $('authRedirectNotice');
        if (notice) notice.classList.remove('show');
        renderProfile();
        updateAuthGateUI();
        applyCloudState(data.state || {}, 'login_merge');
        if (notify) {
          const uname = data.user.username ? ('@' + data.user.username) : (data.user.firstName || 'Telegram');
          showToast('Вход через Telegram выполнен: ' + uname);
        }
        if (pendingProtectedTab === 'viewTracks') {
          pendingProtectedTab = '';
          switchTab('viewTracks');
        }
      }

      function clearTgSession(notify = true) {
        const oldToken = state.tgToken;
        stopAuthPolling();
        lastCloudUpdatedAt = 0;
        pendingProtectedTab = '';
        persistSessionCredentials('', null);
        renderProfile();
        updateAuthGateUI();
        if (state.activeTab === 'viewTracks') {
          switchTab('viewProfile');
        }
        if (oldToken) {
          fetch(`${tgApiUrl('/api/user/logout')}`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + oldToken }
          }).catch(() => {});
        }
        if (notify) showToast('Вы вышли из аккаунта Telegram');
      }

      async function initTelegramAuth() {
        await hydrateSessionFromBackupStorage();
        renderProfile();
        updateAuthGateUI();

        if (isOfflineEffective()) {
          if (isTelegramAuthorized()) setSyncStatus('Оффлайн · аккаунт сохранён', false);
          return;
        }

        // 1) Auto-login inside Telegram Mini App
        if (await tryRecoverSessionViaMiniApp()) return;

        // 2) Restore existing long-lived session (180 days, auto-refreshed)
        if (state.tgToken) {
          const ok = await refreshCloudAccountState(false);
          if (ok) {
            setSyncStatus('Синхронизировано с Telegram', false);
            return;
          }
        }

        if (state.user && !state.user.tgId) {
          persistSessionCredentials('', null);
          renderProfile();
          updateAuthGateUI();
        }
      }

      // ---- Custom Avatar Crop & Upload (320x320 JPEG, fast & crisp) ----
      function cropImageFileToDataUrl(file, size = 320) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error('read_error'));
          reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('image_error'));
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                const minSide = Math.min(img.width, img.height);
                const sx = Math.floor((img.width - minSide) / 2);
                const sy = Math.floor((img.height - minSide) / 2);
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', 0.86));
              } catch (e) {
                reject(e);
              }
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        });
      }

      function triggerAvatarPicker() {
        if (!state.tgToken || !state.user || !state.user.tgId) {
          showToast('Сначала войдите через Telegram');
          return;
        }
        $('avatarFileInput').click();
      }

      $('avatarUploadBtn').addEventListener('click', triggerAvatarPicker);
      $('changeAvatarTextBtn').addEventListener('click', triggerAvatarPicker);

      $('avatarFileInput').addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file || !state.tgToken) return;
        if (!file.type.startsWith('image/')) {
          showToast('Выберите изображение (JPG, PNG или WebP)');
          return;
        }
        setSyncStatus('Загрузка нового фото...', true);
        try {
          const dataUrl = await cropImageFileToDataUrl(file, 320);
          const resp = await fetch(`${tgApiUrl('/api/user/avatar')}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + state.tgToken
            },
            body: JSON.stringify({ imageData: dataUrl })
          });
          const data = resp.ok ? await resp.json() : null;
          if (data && data.ok && data.photoUrl) {
            state.user.photoUrl = data.photoUrl;
            state.user.hasCustomAvatar = true;
            store.set('user', state.user);
            renderProfile();
            setSyncStatus('Фото профиля обновлено', false);
            showToast('Аватарка профиля сохранена');
          } else {
            setSyncStatus('Ошибка загрузки фото', false);
            showToast('Не удалось сохранить изображение');
          }
        } catch (err) {
          setSyncStatus('Ошибка загрузки фото', false);
          showToast('Не удалось обработать изображение');
        }
      });

      $('resetAvatarBtn').addEventListener('click', async () => {
        if (!state.tgToken) return;
        setSyncStatus('Возврат фото Telegram...', true);
        try {
          const resp = await fetch(`${tgApiUrl('/api/user/avatar')}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + state.tgToken }
          });
          const data = resp.ok ? await resp.json() : null;
          if (data && data.ok) {
            state.user.photoUrl = data.photoUrl || '';
            state.user.hasCustomAvatar = false;
            store.set('user', state.user);
            renderProfile();
            setSyncStatus('Восстановлено фото из Telegram', false);
            showToast('Аватарка Telegram восстановлена');
          }
        } catch (e) {
          showToast('Не удалось сбросить фото');
        }
      });

      $('plGoLoginBtn').addEventListener('click', () => {
        closePlaylistModal();
        switchTab('viewProfile');
      });

      const tracksGateBtn = $('tracksGateLoginBtn');
      if (tracksGateBtn) {
        tracksGateBtn.addEventListener('click', () => {
          pendingProtectedTab = 'viewTracks';
          switchTab('viewProfile');
          const btn = $('tgLoginBtn');
          if (btn && !btn.disabled) btn.click();
        });
      }

      $('tgLoginBtn').addEventListener('click', async () => {
        const msg = $('authMsg');
        msg.textContent = '';

        const tgWebApp = window.Telegram && window.Telegram.WebApp;
        if (tgWebApp && tgWebApp.initData && tgWebApp.initData.length > 20) {
          $('tgLoginBtn').disabled = true;
          try {
            const r = await fetch(`${tgApiUrl('/api/auth/webapp')}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: tgWebApp.initData })
            });
            const d = r.ok ? await r.json() : null;
            if (d && d.ok && d.token) {
              applyAuthorizedSession(d, true);
              return;
            }
          } catch (e) {}
          $('tgLoginBtn').disabled = false;
        }

        $('tgLoginBtn').disabled = true;
        try {
          const resp = await fetch(`${tgApiUrl('/api/auth/start')}`, { method: 'POST' });
          const data = resp.ok ? await resp.json() : null;
          if (!data || !data.ok || !data.code || !data.botUrl) {
            msg.textContent = 'Не удалось получить ссылку от сервера бота. Проверьте, что бот запущен.';
            $('tgLoginBtn').disabled = false;
            return;
          }

          const openLink = $('tgOpenBotLink');
          openLink.href = data.botUrl;
          $('tgAuthPendingBox').classList.add('show');

          try { window.open(data.botUrl, '_blank', 'noopener'); } catch (e) {}

          const startedAt = Date.now();
          const authCode = data.code;
          if (authPollTimer) clearInterval(authPollTimer);
          authPollTimer = setInterval(async () => {
            if (Date.now() - startedAt > 300000) {
              stopAuthPolling();
              msg.textContent = 'Время ожидания истекло — нажмите «Войти через Telegram» снова.';
              return;
            }
            const poll = await fetchJsonTimeout(`${tgApiUrl('/api/auth/poll')}?code=${encodeURIComponent(authCode)}&_=${Date.now()}`, 3000);
            if (!poll) return;
            if (poll.status === 'authorized' && poll.token && poll.user) {
              applyAuthorizedSession(poll, true);
            } else if (poll.status === 'expired') {
              stopAuthPolling();
              msg.textContent = 'Код входа истёк — попробуйте ещё раз.';
            }
          }, 1600);
        } catch (e) {
          msg.textContent = 'Ошибка соединения с сервером бота.';
          $('tgLoginBtn').disabled = false;
        }
      });

      $('tgCancelAuthBtn').addEventListener('click', () => {
        stopAuthPolling();
        $('authMsg').textContent = '';
      });

      $('manualSyncBtn').addEventListener('click', async () => {
        await refreshCloudAccountState(false);
        await pushCloudSyncNow(true);
      });

      $('logoutBtn').addEventListener('click', () => {
        clearTgSession(true);
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && state.tgToken && !isOfflineEffective()) {
          refreshCloudAccountState(false);
        }
      });

      // ================= UPLOAD LOCAL MP3 / M4A =================
      $('uploadAudioBtn').addEventListener('click', () => $('audioFileInput').click());
      $('audioFileInput').addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        let firstTrack = null;
        files.forEach((file, idx) => {
          const url = URL.createObjectURL(file);
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          const track = {
            id: 'local_' + Date.now() + '_' + idx,
            title: cleanName,
            artist: state.user ? (state.user.username ? '@' + state.user.username : (state.user.firstName || 'Ваш файл')) : 'Ваш файл',
            album: 'Local', duration: 180, source: 'Файл', isLocal: true, audioUrl: url,
            coverGrad: 'linear-gradient(145deg, #323946 0%, #090b0f 60%, #556175 100%)',
            lyrics: null
          };
          if (!firstTrack) firstTrack = track;
          const tempAudio = new Audio(url);
          tempAudio.addEventListener('loadedmetadata', () => {
            if (isFinite(tempAudio.duration) && tempAudio.duration > 0) {
              track.duration = tempAudio.duration;
              renderLibrary();
              if (state.currentTrack && state.currentTrack.id === track.id) updatePlayerUI();
            }
          });
          state.libraryTracks.unshift(track);
          saveBlobOffline(track, file, true);
        });
        e.target.value = '';
        renderLibrary(); renderProfile();
        showToast(`Добавлено файлов: ${files.length}`);
        if (firstTrack) { state.activeQueue = [...state.libraryTracks]; playTrack(firstTrack, true); }
      });

      // ================= SEARCH & UI EVENTS =================
      $('searchForm').addEventListener('submit', (e) => {
        e.preventDefault(); clearTimeout(searchDebounce); searchInput.blur(); performSearch();
      });
      searchInput.addEventListener('input', () => {
        searchClear.classList.toggle('show', searchInput.value.trim().length > 0);
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => performSearch(), 380);
      });
      searchClear.addEventListener('click', () => {
        searchInput.value = ''; clearTimeout(searchDebounce); performSearch(); searchInput.focus();
      });

      $('quickTags').addEventListener('click', (e) => {
        const btn = e.target.closest('.quick-tag');
        if (!btn) return;
        searchInput.value = btn.dataset.q;
        performSearch();
      });

      $('libFilterChips').addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn) return;
        state.libFilter = btn.dataset.filter;
        $('libFilterChips').querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b === btn));
        renderLibrary();
      });

      $('themeGrid').addEventListener('click', (e) => {
        const card = e.target.closest('.theme-card');
        if (card) applyTheme(card.dataset.setTheme, true);
      });

      $('tgRefreshBtn').addEventListener('click', () => {
        const hasFavs = !searchInput.value.trim() && getFavoriteArtistsList(10).length > 0;
        if (hasFavs) {
          favRecsRotateOffset += 1;
        }
        tgSearchCache.clear();
        performSearch(true);
        showToast(hasFavs ? 'Рекомендации по избранному обновлены' : 'Список треков из Telegram-бота обновлён');
      });

      $('offlineModeToggleBtn').addEventListener('click', () => {
        state.offlineMode = !state.offlineMode;
        store.set('offlineMode', state.offlineMode);
        updateOfflineUI();
        performSearch();
        showToast(state.offlineMode ? 'Оффлайн-режим включён' : 'Оффлайн-режим выключен');
      });

      $('autoOfflineToggleBtn').addEventListener('click', () => {
        state.autoOfflineCache = !state.autoOfflineCache;
        store.set('autoOfflineCache', state.autoOfflineCache);
        updateOfflineUI();
        showToast(state.autoOfflineCache ? 'Прослушанные треки сохраняются для оффлайна' : 'Автосохранение для оффлайна выключено');
      });

      $('clearOfflineCacheBtn').addEventListener('click', async () => {
        if (!state.offlineIds.size) { showToast('Оффлайн-кэш уже пуст'); return; }
        await idbClearAll();
        state.offlineIds.clear();
        state.offlineBytes = 0;
        updateOfflineUI();
        renderLibrary();
        renderSearchResultsList();
        showToast('Оффлайн-кэш очищен');
      });

      $('offlineOpenLibBtn').addEventListener('click', () => {
        state.selectedPlaylistId = null;
        state.libFilter = 'offline';
        $('libFilterChips').querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'offline'));
        switchTab('viewTracks');
      });

      window.addEventListener('offline', () => {
        updateOfflineUI();
        showToast(`Нет сети — включён оффлайн-режим (${state.offlineIds.size} трек.)`);
        if (state.activeTab === 'viewSearch') performSearch();
      });

      window.addEventListener('online', () => {
        updateOfflineUI();
        if (!state.offlineMode) {
          showToast('Соединение восстановлено');
          checkTgBotStatus();
          refreshCloudAccountState(false);
          if (state.activeTab === 'viewSearch') performSearch();
        }
      });

      $('testSoundBtn').addEventListener('click', () => {
        unlockAudioForIos();
        playUnlockChime();
        showToast('Тестовый сигнал отправлен! Проверьте переключатель беззвучного режима');
      });

      $('replaySplashBtn').addEventListener('click', () => {
        splashScreen.classList.remove('hidden');
        mainApp.classList.remove('visible');
        startSplashParticlesLoop();
      });

      if (location.protocol === 'file:') {
        setTimeout(() => {
          showToast('Откройте сайт с сервера вашего Telegram-бота');
        }, 1200);
      }

      miniPlayer.addEventListener('click', (e) => {
        if (e.target.closest('#miniPlayBtn')) return;
        openPlayerOverlay();
      });
      $('miniPlayBtn').addEventListener('click', (e) => { e.stopPropagation(); togglePlayPause(); });
      $('closePlayerBtn').addEventListener('click', closePlayerOverlay);
      $('btnPlayPause').addEventListener('click', togglePlayPause);
      $('btnNext').addEventListener('click', nextTrack);
      $('btnPrev').addEventListener('click', prevTrack);
      $('btnShuffle').addEventListener('click', () => {
        state.shuffle = !state.shuffle;
        $('btnShuffle').classList.toggle('toggled', state.shuffle);
        showToast(state.shuffle ? 'Перемешивание включено' : 'Перемешивание выключено');
      });
      $('btnRepeat').addEventListener('click', () => {
        state.repeat = !state.repeat;
        $('btnRepeat').classList.toggle('toggled', state.repeat);
        showToast(state.repeat ? 'Повтор трека включён' : 'Повтор выключен');
      });
      $('playerOfflineBtn').addEventListener('click', () => { if (state.currentTrack) toggleTrackOffline(state.currentTrack); });
      $('playerLikeBtn').addEventListener('click', () => { if (state.currentTrack) toggleLike(state.currentTrack); });
      $('playerAddPlBtn').addEventListener('click', () => { if (state.currentTrack) openPlaylistModal(state.currentTrack); });
      $('playerScrubber').addEventListener('input', (e) => seekTo(parseFloat(e.target.value)));
      $('volumeSlider').addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        applyAudioVolume(isFinite(val) ? val / 100 : 1, true);
      });
      $('btnMuteToggle').addEventListener('click', () => {
        if (state.volume > 0) {
          state.prevVolume = state.volume;
          applyAudioVolume(0, true);
        } else {
          applyAudioVolume(state.prevVolume > 0.05 ? state.prevVolume : 1, true);
        }
      });
      $('toggleLyricsFullBtn').addEventListener('click', () => {
        state.lyricsExpanded = !state.lyricsExpanded;
        playerSplit.classList.toggle('lyrics-expanded', state.lyricsExpanded);
        $('toggleLyricsFullBtn').style.color = state.lyricsExpanded ? 'var(--accent)' : 'var(--text-dim)';
      });

      $('lyricsMinusBtn').addEventListener('click', () => {
        state.lyricsOffset = Math.round((state.lyricsOffset - 0.5) * 10) / 10;
        syncTimeAndLyrics(true);
        showToast(`Сдвиг текста: ${state.lyricsOffset > 0 ? '+' : ''}${state.lyricsOffset}с`);
      });
      $('lyricsPlusBtn').addEventListener('click', () => {
        state.lyricsOffset = Math.round((state.lyricsOffset + 0.5) * 10) / 10;
        syncTimeAndLyrics(true);
        showToast(`Сдвиг текста: ${state.lyricsOffset > 0 ? '+' : ''}${state.lyricsOffset}с`);
      });

      let pStartY = 0;
      $('playerOverlay').querySelector('.player-top').addEventListener('touchstart', (e) => { pStartY = e.touches[0].clientY; }, { passive: true });
      $('playerOverlay').querySelector('.player-top').addEventListener('touchend', (e) => {
        if (e.changedTouches[0].clientY - pStartY > 45) closePlayerOverlay();
      }, { passive: true });

      // ================= INIT =================
      applyTheme(state.theme, false);
      applyAudioVolume(state.volume, false);
      renderQuickTags();
      renderLibrary();
      renderProfile();
      initSplashParticles();
      initCrossSwipe();
      initPlayerLoopAndVisualizer();
      initTelegramMiniApp();
      initOfflineStorage().then(async () => {
        updateOfflineUI();
        await initTelegramAuth();
        if (!isOfflineEffective()) {
          checkTgBotStatus();
        }
        performSearch();
      });
    })();
