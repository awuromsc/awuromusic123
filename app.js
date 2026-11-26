
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

      // ================= PLATFORM IMPORT PACKS =================
      const PLATFORM_PACKS = {
        yandex: {
          label: 'Яндекс',
          tracks: [
            {
              id: 'imp_ya_1', title: 'Ночной Проспект', artist: 'Serebrov', album: 'APATHY Import', duration: 64, source: 'Яндекс', imported: true,
              coverGrad: 'linear-gradient(145deg, #4a3f1d 0%, #0d0b06 60%, #7a662b 100%)',
              synth: { bpm: 120, root: 45, scale: [0, 2, 3, 7, 8, 12], wave: 'triangle', arp: [0, 3, 4, 2, 5, 3, 1, 0], pad: true },
              lyrics: [{ t: 0, text: 'Мокрый асфальт отражает огни' }, { t: 8, text: 'Мы по проспекту едем одни' }, { t: 18, text: 'Перенесено прямо в тёмный поток' }, { t: 30, text: 'Ветер в окно, прохладная ночь' }, { t: 45, text: 'Музыка держит невидимый мост' }]
            },
            {
              id: 'imp_ya_2', title: 'Пепел и Неон', artist: 'Kholod', album: 'APATHY Import', duration: 62, source: 'Яндекс', imported: true,
              coverGrad: 'linear-gradient(145deg, #3c3a47 0%, #09090d 60%, #635e78 100%)',
              synth: { bpm: 114, root: 43, scale: [0, 3, 5, 7, 10, 12], wave: 'sawtooth', arp: [0, 2, 3, 5, 4, 3, 1, 0], pad: true },
              lyrics: [{ t: 0, text: 'Пепел ложится на чёрный бетон' }, { t: 9, text: 'В окнах высоток мигает неон' }, { t: 20, text: 'Твой силуэт растворился в дыму' }, { t: 35, text: 'Тяжёлый синт накрывает волной' }, { t: 50, text: 'Пепел и неон до рассвета горят' }]
            }
          ]
        },
        spotify: {
          label: 'Spotify',
          tracks: [
            {
              id: 'imp_sp_1', title: 'Velvet Abyss', artist: 'Nyx Static', album: 'APATHY Import', duration: 66, source: 'Spotify', imported: true,
              coverGrad: 'linear-gradient(145deg, #173d29 0%, #060d09 60%, #276645 100%)',
              synth: { bpm: 126, root: 47, scale: [0, 3, 5, 7, 10, 12], wave: 'sawtooth', arp: [0, 4, 2, 5, 3, 2, 1, 0], pad: true },
              lyrics: [{ t: 0, text: 'Falling through the velvet dark' }, { t: 10, text: 'Chrome horizon leaves a spark' }, { t: 22, text: 'Echoes bouncing off the glass' }, { t: 36, text: 'Sync the heartbeat to the wire' }, { t: 50, text: 'Lost inside the velvet abyss' }]
            }
          ]
        },
        apple: {
          label: 'Apple Music',
          tracks: [
            {
              id: 'imp_ap_1', title: 'Scarlet Mirror', artist: 'Vespera', album: 'APATHY Import', duration: 68, source: 'Apple', imported: true,
              coverGrad: 'linear-gradient(145deg, #591b27 0%, #0c0507 60%, #8f293d 100%)',
              synth: { bpm: 98, root: 44, scale: [0, 3, 7, 10, 12, 15], wave: 'sine', arp: [0, 2, 3, 5, 4, 2, 1, 0], pad: true },
              lyrics: [{ t: 0, text: 'Алое зеркало держит секрет' }, { t: 12, text: 'В нём отражается призрачный свет' }, { t: 26, text: 'Мягкий поток обнимает пространство' }, { t: 44, text: 'Scarlet mirror — покой внутри' }]
            }
          ]
        },
        vk: {
          label: 'VK Музыка',
          tracks: [
            {
              id: 'imp_vk_1', title: 'Холодный Пульс', artist: 'MRAK', album: 'APATHY Import', duration: 62, source: 'VK', imported: true,
              coverGrad: 'linear-gradient(145deg, #21344d 0%, #070a0f 60%, #375780 100%)',
              synth: { bpm: 134, root: 43, scale: [0, 1, 5, 7, 8, 12], wave: 'square', arp: [0, 2, 0, 4, 3, 2, 1, 0], pad: false },
              lyrics: [{ t: 0, text: 'Холодный пульс на экране горит' }, { t: 12, text: 'Город уснул, но динамик не спит' }, { t: 28, text: 'Плотный удар и холодный металл' }, { t: 46, text: 'Холодный пульс — не сбавляем ход' }]
            }
          ]
        },
        soundcloud: {
          label: 'SoundCloud',
          tracks: [
            {
              id: 'imp_sc_1', title: 'Static Cathedral', artist: 'XEN0', album: 'APATHY Import', duration: 65, source: 'SoundCloud', imported: true,
              coverGrad: 'linear-gradient(145deg, #542d18 0%, #0d0805 60%, #874725 100%)',
              synth: { bpm: 128, root: 40, scale: [0, 3, 5, 6, 7, 10], wave: 'sawtooth', arp: [0, 5, 3, 4, 2, 3, 1, 0], pad: true },
              lyrics: [{ t: 0, text: 'Underground signal cuts the air' }, { t: 14, text: 'Chrome cathedral standing bare' }, { t: 30, text: 'Heavy sub beneath our feet' }, { t: 48, text: 'Static cathedral never sleeps' }]
            }
          ]
        }
      };

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
        importedPlatforms: store.get('importedPlatforms', []),
        user: store.get('user', null),
        usersDb: store.get('usersDb', {}),
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
        selectedPlatform: 'yandex',
        authMode: 'login',
        lyricsExpanded: false,
        modalTrack: null
      };

      savedCatalogTracks.forEach(t => {
        if (!state.libraryTracks.some(x => x.id === t.id)) state.libraryTracks.push(t);
      });
      state.importedPlatforms.forEach(p => {
        if (PLATFORM_PACKS[p]) {
          PLATFORM_PACKS[p].tracks.forEach(t => {
            if (!state.libraryTracks.some(x => x.id === t.id)) state.libraryTracks.push({ ...t });
          });
        }
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
      }
      function persistPlaylists() { store.set('playlists', state.playlists); }

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
        chrome: { label: 'Тёмный хром', color: '#06070a' },
        purple: { label: 'Тёмно-фиолетовый', color: '#08050f' },
        red:    { label: 'Красно-тёмный', color: '#0b0406' }
      };

      function applyTheme(themeKey, notify = false) {
        if (!THEME_META[themeKey]) themeKey = 'chrome';
        state.theme = themeKey;
        document.documentElement.setAttribute('data-theme', themeKey);
        $('metaThemeColor').setAttribute('content', THEME_META[themeKey].color);
        $('activeThemeLabel').textContent = THEME_META[themeKey].label;
        document.querySelectorAll('.theme-card').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.setTheme === themeKey);
        });
        store.set('theme', themeKey);
        if (notify) showToast('Тема: ' + THEME_META[themeKey].label);
      }

      // ================= TELEGRAM BOT ONLY ENGINE (v23) =================
      // Весь поиск и вся загрузка аудио идут СТРОГО через ваш Telegram-бот!
      let tgBotBaseUrl = (() => {
        try {
          const sp = new URLSearchParams(location.search);
          const paramApi = (sp.get('api') || sp.get('bot') || '').trim().replace(/\/+$/, '');
          if (paramApi && /^https?:\/\//i.test(paramApi)) {
            store.set('tgBotBaseUrl', paramApi);
            return paramApi;
          }
        } catch (e) {}
        return String(store.get('tgBotBaseUrl', '') || '').trim().replace(/\/+$/, '');
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
            store.set('lastTgLibraryV24', { tracks: tracks.slice(0, 30), sources });
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

      async function performSearch() {
        const q = searchInput.value.trim();
        searchClear.classList.toggle('show', q.length > 0);
        viewSearch.classList.toggle('has-results', q.length > 0);

        const seq = ++searchSeq;
        searchLoader.classList.add('show');
        $('searchLoaderText').textContent = q
          ? `Бот ищет «${q}»...`
          : 'Загрузка треков из вашего Telegram-бота...';
        $('searchResultTitle').textContent = q ? `Поиск в боте: «${q}»` : 'Треки из Telegram-бота';
        renderSourcesLiveBar([]);

        // Instant cached library preview on startup while live bot library loads
        if (!q) {
          const cachedLib = store.get('lastTgLibraryV24', null);
          if (cachedLib && Array.isArray(cachedLib.tracks) && cachedLib.tracks.length) {
            state.searchResults = cachedLib.tracks;
            renderSearchResultsList();
          }
        }

        const res = await searchViaTgBotOnly(q);
        if (seq !== searchSeq) return;
        searchLoader.classList.remove('show');

        if (!res.ok) {
          state.searchResults = [];
          renderSourcesLiveBar([]);
          renderSearchResultsList(true);
          return;
        }

        renderSourcesLiveBar(res.sources);
        $('searchResultTitle').textContent = q
          ? `Найдено ботом: «${q}»`
          : (res.tracks.length ? 'Треки из Telegram-бота' : 'В боте пока нет треков');
        state.searchResults = res.tracks;
        renderSearchResultsList(false);
      }

      function renderSearchResultsList(botOffline = false) {
        $('searchCount').textContent = String(state.searchResults.length);
        searchTrackList.innerHTML = '';
        if (!state.searchResults.length) {
          const q = searchInput.value.trim();
          let msg = '';
          if (botOffline) {
            msg = 'Telegram-бот ещё не подключён.<br/>Откройте плеер через кнопку <b>«Открыть плеер APATHY»</b> внутри вашего бота (или добавьте <code>?api=https://адрес-бота</code> к ссылке).';
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
      htmlAudio.volume = 1.0;

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
          masterGain.gain.value = 0.28;
          analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          masterGain.connect(analyser);
          analyser.connect(audioCtx.destination);
        }
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        return audioCtx;
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

      // ================= SPLASH SCREEN =================
      function initSplashParticles() {
        const canvas = $('splashParticles'), ctx = canvas.getContext('2d');
        let w = 0, h = 0;
        const pts = Array.from({ length: 34 }, () => ({
          x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.5,
          vx: (Math.random() - 0.5) * 0.00045, vy: -Math.random() * 0.0007 - 0.0002, a: Math.random() * 0.5 + 0.2
        }));
        function resize() {
          const rect = splashScreen.getBoundingClientRect();
          w = canvas.width = rect.width * devicePixelRatio;
          h = canvas.height = rect.height * devicePixelRatio;
        }
        resize(); window.addEventListener('resize', resize);
        function draw() {
          if (!splashScreen.classList.contains('hidden')) {
            ctx.clearRect(0, 0, w, h);
            const col = getComputedStyle(document.documentElement).getPropertyValue('--viz-color-1').trim() || '#e4ecf8';
            pts.forEach(p => {
              p.x += p.vx; p.y += p.vy;
              if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
              if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
              ctx.globalAlpha = p.a; ctx.fillStyle = col;
              ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
            });
          }
          requestAnimationFrame(draw);
        }
        draw();
      }

      function triggerChromeFlash() {
        chromeFlash.classList.remove('active');
        void chromeFlash.offsetWidth;
        chromeFlash.classList.add('active');
      }

      function unlockFromSplash() {
        try { playUnlockChime(); } catch (e) {}
        triggerChromeFlash();
        splashScreen.classList.add('hidden');
        mainApp.classList.add('visible');
      }

      function initCrossSwipe() {
        const cross = $('draggableCross'), ring = $('crossRing');
        let dragging = false, startX = 0, startY = 0, dx = 0, dy = 0, startTime = 0;
        function onStart(e) {
          unlockAudioForIos(); dragging = true;
          const pt = e.touches ? e.touches[0] : e;
          startX = pt.clientX; startY = pt.clientY; dx = 0; dy = 0; startTime = performance.now();
          cross.style.transition = 'none';
        }
        function onMove(e) {
          if (!dragging) return;
          if (e.cancelable) e.preventDefault();
          const pt = e.touches ? e.touches[0] : e;
          dx = pt.clientX - startX; dy = pt.clientY - startY;
          const dist = Math.hypot(dx, dy), prog = Math.min(dist / 100, 1);
          cross.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${dx * 0.14}deg) scale(${1 + prog * 0.12})`;
          cross.style.filter = `drop-shadow(0 0 ${24 + prog * 34}px var(--accent-glow)) brightness(${1 + prog * 0.35})`;
          ring.style.transform = `scale(${1 + prog * 0.32})`; ring.style.opacity = String(0.55 + prog * 0.45);
        }
        function onEnd() {
          if (!dragging) return; dragging = false;
          const dist = Math.hypot(dx, dy), velocity = dist / Math.max(performance.now() - startTime, 1);
          if (dist > 78 || (dist > 36 && velocity > 0.42)) {
            const angle = Math.atan2(dy, dx);
            cross.style.transition = 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease';
            cross.style.transform = `translate3d(${Math.cos(angle) * 320}px, ${Math.sin(angle) * 320}px, 0) rotate(${dx * 0.3}deg) scale(1.35)`;
            cross.style.opacity = '0';
            unlockFromSplash();
            setTimeout(() => {
              cross.style.transition = 'none'; cross.style.transform = 'translate3d(0,0,0)';
              cross.style.opacity = '1'; cross.style.filter = ''; ring.style.transform = ''; ring.style.opacity = '';
            }, 650);
          } else {
            cross.style.transition = 'transform 0.45s cubic-bezier(0.22, 1.4, 0.36, 1), filter 0.3s ease';
            cross.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
            cross.style.filter = ''; ring.style.transform = 'scale(1)'; ring.style.opacity = '0.55';
          }
        }
        cross.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        cross.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
        const pill = splashScreen.querySelector('.swipe-pill');
        if (pill) {
          pill.style.cursor = 'pointer';
          pill.addEventListener('click', () => { unlockAudioForIos(); unlockFromSplash(); });
        }
      }

      // ================= NAVIGATION =================
      function switchTab(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll('.tab-view').forEach(v => v.classList.toggle('active', v.id === tabId));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        if (tabId === 'viewTracks') renderLibrary();
        if (tabId === 'viewProfile') renderProfile();
      }
      document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
      topProfileBtn.addEventListener('click', () => switchTab('viewProfile'));

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

        let badgeLabel = track.inTelegram ? 'Telegram' : (track.source || 'Бот');
        let badgeClass = (track.fromTelegramBot || track.fromCatalog) ? 'tg-tag' : '';

        const div = document.createElement('div');
        div.className = 'track-item' + (isCurrent ? ' playing' : '') + (isCurrent && state.isPlaying ? ' is-running' : '');

        const artContent = track.artwork
          ? `<img src="${escapeHtml(track.artwork)}" alt="" loading="lazy" /><span>${trackInitials(track.title)}</span>`
          : `<span>${trackInitials(track.title)}</span>`;

        const showRemoveFromPl = (context === 'playlist' && state.selectedPlaylistId);

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
          </div>
        `;

        const rowImg = div.querySelector('.track-art img');
        if (rowImg) rowImg.addEventListener('error', () => rowImg.remove());
        div.addEventListener('click', (e) => {
          if (e.target.closest('[data-add-pl]')) { e.stopPropagation(); openPlaylistModal(track); return; }
          if (e.target.closest('[data-remove-pl]')) { e.stopPropagation(); removeTrackFromPlaylist(state.selectedPlaylistId, track.id); return; }
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
          if (state.libFilter === 'liked') return state.likedIds.has(t.id);
          if (state.libFilter === 'telegram') return !!(t.fromTelegramBot || t.fromCatalog);
          if (state.libFilter === 'imported') return !!t.imported;
          if (state.libFilter === 'local') return !!t.isLocal;
          return true;
        });
      }

      function renderLibrary() {
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
              : 'Здесь пока пусто — добавьте треки из поиска, площадок или свои MP3'}
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
        $('plModalHeading').textContent = track ? 'Добавить в плейлист' : 'Новый плейлист';
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
              showToast(`Добавлено в «${pl.name}»`);
            }
            persistPlaylists();
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
        persistPlaylists();
        renderLibrary();
        renderSearchResultsList();
        showToast(`Убрано из «${pl.name}»`);
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
        persistPlaylists();
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

      $('deleteActivePlBtn').addEventListener('click', () => {
        if (!state.selectedPlaylistId) return;
        const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
        state.playlists = state.playlists.filter(p => p.id !== state.selectedPlaylistId);
        state.selectedPlaylistId = null;
        persistPlaylists();
        renderLibrary();
        renderProfile();
        if (pl) showToast(`Плейлист «${pl.name}» удалён`);
      });

      function toggleLike(track) {
        ensureTrackInLibrary(track);
        if (state.likedIds.has(track.id)) state.likedIds.delete(track.id);
        else { state.likedIds.add(track.id); showToast('Добавлено в избранное'); }
        store.set('liked', Array.from(state.likedIds));
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
          clearStreamWatchdog();
          state.currentTime = 0;
          state.lyricsOffset = 0;
          stopSynthLoop();
          htmlAudio.pause();

          // Local uploaded file
          if (track.audioUrl) {
            currentAudioMode = 'stream';
            htmlAudio.muted = false;
            htmlAudio.volume = 1.0;
            htmlAudio.src = track.audioUrl;
            try { htmlAudio.currentTime = 0; } catch (e) {}
            htmlAudio.play().catch(() => showToast('Нажмите Play для запуска звука'));
          } else if (track.synth && !track.fromTelegramBot && !track.fromCatalog) {
            currentAudioMode = 'synth';
            state.isPlaying = true;
            startSynthLoop(track);
          } else {
            // ONLY Telegram Bot stream!
            let streamUrl = track.tgStreamUrl || (track.tgTrackId ? tgApiUrl(`/api/tg/stream/${encodeURIComponent(track.tgTrackId)}`) : '');
            if (streamUrl) {
              currentAudioMode = 'stream';
              htmlAudio.muted = false;
              htmlAudio.volume = 1.0;
              htmlAudio.src = streamUrl;
              try { htmlAudio.currentTime = 0; } catch (e) {}
              armStreamWatchdog(track.id, 12000);
              const p = htmlAudio.play();
              if (p && typeof p.catch === 'function') {
                p.catch(() => showToast('Нажмите кнопку Play ещё раз для старта звука'));
              }
            } else {
              // Legacy track saved before v23 -> resolve strictly via Telegram Bot /api/tg/resolve
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
                htmlAudio.muted = false;
                htmlAudio.volume = 1.0;
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

        const activeSource = track.isLocal ? 'Файл' : (track.inTelegram ? 'Telegram Бот' : (track.source || 'Telegram Бот'));
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
        const canvas = $('playerVizCanvas'), ctx = canvas.getContext('2d');
        let cw = 0, ch = 0, phase = 0;
        function resize() {
          const rect = playerOverlay.getBoundingClientRect();
          cw = canvas.width = Math.max(1, rect.width) * devicePixelRatio;
          ch = canvas.height = Math.max(1, rect.height) * devicePixelRatio;
        }
        resize(); window.addEventListener('resize', resize);

        function tick(now) {
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
              const dt = (now - lastTickTime) / 1000;
              if (dt > 0 && dt < 0.5) state.currentTime += dt;
              if (state.currentTime >= track.duration) {
                if (state.repeat) { state.currentTime = 0; startSynthLoop(track); }
                else nextTrack();
              }
            }
            syncTimeAndLyrics(false);
          }
          lastTickTime = now;

          if (playerOverlay.classList.contains('open')) {
            ctx.clearRect(0, 0, cw, ch);
            const cs = getComputedStyle(document.documentElement);
            const c1 = cs.getPropertyValue('--viz-color-1').trim() || '#e4ecf8';
            const c2 = cs.getPropertyValue('--viz-color-2').trim() || '#768499';
            const amp = state.isPlaying ? 1.0 : 0.18;

            let dataArr = null;
            if (analyser && state.isPlaying && currentAudioMode === 'synth') {
              dataArr = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(dataArr);
            }

            phase += state.isPlaying ? 0.055 : 0.012;
            const baseY = ch * 0.86, bars = 40, step = cw / bars;

            ctx.beginPath();
            for (let i = 0; i <= bars; i++) {
              const x = i * step;
              const sim = 0.25 + 0.35 * Math.abs(Math.sin(phase * 1.4 + i * 0.31)) + 0.22 * Math.abs(Math.cos(phase * 2.1 - i * 0.19));
              const fVal = dataArr ? dataArr[i % dataArr.length] / 255 : sim;
              const wave = Math.sin(phase * 1.3 + i * 0.28) * 12 * devicePixelRatio * amp;
              const y = baseY - (fVal * 52 * devicePixelRatio * amp) + wave;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const grad = ctx.createLinearGradient(0, baseY - 60 * devicePixelRatio, cw, baseY + 20 * devicePixelRatio);
            grad.addColorStop(0, c2); grad.addColorStop(0.5, c1); grad.addColorStop(1, c2);
            ctx.strokeStyle = grad; ctx.lineWidth = 2 * devicePixelRatio; ctx.stroke();

            ctx.fillStyle = c1; ctx.globalAlpha = 0.14;
            for (let i = 0; i < bars; i++) {
              const sim = 0.22 + 0.45 * Math.abs(Math.sin(phase * 1.6 + i * 0.37));
              const fVal = dataArr ? dataArr[i % dataArr.length] / 255 : sim;
              const bh = Math.max(4, fVal * 46 * devicePixelRatio * amp);
              ctx.fillRect(i * step + 2 * devicePixelRatio, ch - bh - 12 * devicePixelRatio, step - 4 * devicePixelRatio, bh);
            }
            ctx.globalAlpha = 1;
          }
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }

      // ================= PROFILE & AUTH =================
      function renderProfile() {
        const u = state.user;
        if (u) {
          $('guestBox').style.display = 'none';
          $('userBox').style.display = 'block';
          const ini = u.login.slice(0, 2).toUpperCase();
          $('profileAvatarLg').textContent = ini;
          $('profileUsername').textContent = '@' + u.login;
          $('statTracks').textContent = state.libraryTracks.length;
          $('statLiked').textContent = state.likedIds.size;
          $('statPlaylists').textContent = state.playlists.length;
          topProfileBtn.classList.add('logged-in');
          topProfileBtn.textContent = ini;
        } else {
          $('guestBox').style.display = 'block';
          $('userBox').style.display = 'none';
          topProfileBtn.classList.remove('logged-in');
          topProfileBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }
      }

      document.querySelectorAll('.auth-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          state.authMode = btn.dataset.auth;
          document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b === btn));
          $('authSubmitBtn').textContent = state.authMode === 'login' ? 'Войти в APATHY' : 'Создать аккаунт';
          $('authMsg').textContent = '';
        });
      });

      $('authForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const login = $('authLogin').value.trim(), pass = $('authPass').value, msg = $('authMsg');
        if (login.length < 3 || pass.length < 4) { msg.textContent = 'Логин от 3 символов, пароль от 4 символов'; return; }
        const key = login.toLowerCase();
        if (state.authMode === 'register') {
          if (state.usersDb[key]) { msg.textContent = 'Такой логин уже занят — войдите в аккаунт'; return; }
          state.usersDb[key] = { login, pass }; store.set('usersDb', state.usersDb);
          state.user = { login }; store.set('user', state.user);
          showToast('Аккаунт создан: @' + login);
        } else {
          const existing = state.usersDb[key];
          if (!existing) { msg.textContent = 'Аккаунт не найден. Переключитесь на «Регистрация»'; return; }
          if (existing.pass !== pass) { msg.textContent = 'Неверный пароль'; return; }
          state.user = { login: existing.login }; store.set('user', state.user);
          showToast('С возвращением, @' + existing.login);
        }
        $('authLogin').value = ''; $('authPass').value = ''; msg.textContent = '';
        renderProfile();
      });

      $('logoutBtn').addEventListener('click', () => {
        state.user = null; store.set('user', null);
        renderProfile(); showToast('Вы вышли из аккаунта');
      });

      // ================= IMPORT FROM PLATFORMS =================
      const importModal = $('importModal');
      $('openImportBtn').addEventListener('click', () => importModal.classList.add('open'));
      $('closeImportBtn').addEventListener('click', () => importModal.classList.remove('open'));
      importModal.addEventListener('click', (e) => { if (e.target === importModal) importModal.classList.remove('open'); });

      const PLATFORM_PLACEHOLDERS = {
        yandex: 'https://music.yandex.ru/users/.../playlists/...',
        spotify: 'https://open.spotify.com/playlist/...',
        apple: 'https://music.apple.com/ru/playlist/...',
        vk: 'https://vk.com/music/playlist/...',
        soundcloud: 'https://soundcloud.com/...'
      };
      document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.selectedPlatform = btn.dataset.platform;
          document.querySelectorAll('.platform-btn').forEach(b => b.classList.toggle('selected', b === btn));
          $('importLinkInput').placeholder = PLATFORM_PLACEHOLDERS[state.selectedPlatform] || '';
        });
      });

      $('startImportBtn').addEventListener('click', () => {
        const p = state.selectedPlatform, pack = PLATFORM_PACKS[p];
        if (!pack) return;
        const wrap = $('importProgressWrap'), fill = $('importBarFill'), pctEl = $('importPercent'), statusEl = $('importStatusText'), startBtn = $('startImportBtn');
        startBtn.disabled = true; wrap.classList.add('show');
        let progress = 0; fill.style.width = '0%'; statusEl.textContent = `Подключение к ${pack.label}...`;
        const timer = setInterval(() => {
          progress += Math.floor(Math.random() * 18) + 14;
          if (progress >= 100) {
            progress = 100; clearInterval(timer);
            fill.style.width = '100%'; pctEl.textContent = '100%'; statusEl.textContent = 'Треки успешно перенесены!';
            let added = 0;
            pack.tracks.forEach(t => {
              if (!state.libraryTracks.some(x => x.id === t.id)) { state.libraryTracks.unshift({ ...t }); added++; }
            });
            if (!state.importedPlatforms.includes(p)) {
              state.importedPlatforms.push(p); store.set('importedPlatforms', state.importedPlatforms);
            }
            renderLibrary(); renderProfile();
            setTimeout(() => {
              startBtn.disabled = false; wrap.classList.remove('show');
              $('importLinkInput').value = ''; importModal.classList.remove('open');
              showToast(added > 0 ? `Перенесено ${added} трек(а) из ${pack.label}` : `Треки из ${pack.label} уже в медиатеке`);
            }, 600);
          } else {
            fill.style.width = progress + '%'; pctEl.textContent = progress + '%';
            if (progress > 40) statusEl.textContent = 'Загрузка метаданных и текстов...';
          }
        }, 200);
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
            artist: state.user ? '@' + state.user.login : 'Ваш файл',
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
        tgSearchCache.clear();
        performSearch();
        showToast('Список треков из Telegram-бота обновлён');
      });

      $('testSoundBtn').addEventListener('click', () => {
        unlockAudioForIos();
        playUnlockChime();
        showToast('Тестовый сигнал отправлен! Проверьте переключатель беззвучного режима');
      });

      $('replaySplashBtn').addEventListener('click', () => {
        splashScreen.classList.remove('hidden');
        mainApp.classList.remove('visible');
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
      $('playerLikeBtn').addEventListener('click', () => { if (state.currentTrack) toggleLike(state.currentTrack); });
      $('playerAddPlBtn').addEventListener('click', () => { if (state.currentTrack) openPlaylistModal(state.currentTrack); });
      $('playerScrubber').addEventListener('input', (e) => seekTo(parseFloat(e.target.value)));
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
      renderLibrary();
      renderProfile();
      initSplashParticles();
      initCrossSwipe();
      initPlayerLoopAndVisualizer();
      initTelegramMiniApp();
      checkTgBotStatus();
      performSearch();
    })();
