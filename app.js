
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
        routeMode: 'mp3hub', // 'mp3hub' | 'hitmo' | 'muzmo' | 'ru' | 'soundcloud' | 'intl'
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
          .filter(t => t.fromCatalog || t.fromSoundCloud)
          .slice(0, 200)
          .map(t => ({
            id: t.id,
            deezerId: t.deezerId || '',
            mp3PartyId: t.mp3PartyId || '',
            mp3PartyUrls: t.mp3PartyUrls || null,
            directMp3Url: t.directMp3Url || '',
            backupMp3Urls: Array.isArray(t.backupMp3Urls) ? t.backupMp3Urls.slice(0, 6) : null,
            detailPageUrl: t.detailPageUrl || '',
            portalKey: t.portalKey || '',
            portalHost: t.portalHost || '',
            portalLabel: t.portalLabel || '',
            tgTrackId: t.tgTrackId || '',
            tgStreamUrl: t.tgStreamUrl || '',
            ytVideoId: t.ytVideoId || '',
            scTrackId: t.scTrackId || '',
            scPermalink: t.scPermalink || '',
            scTranscodings: t.scTranscodings || null,
            scTrackAuth: t.scTrackAuth || '',
            title: t.title,
            artist: t.artist,
            album: t.album || '',
            duration: t.duration || 180,
            artwork: t.artwork || '',
            coverGrad: t.coverGrad || '',
            previewUrl: t.previewUrl || '',
            catalogOrigin: t.catalogOrigin || 'deezer',
            fromCatalog: !!t.fromCatalog,
            fromSoundCloud: !!t.fromSoundCloud
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

      // ================= TELEGRAM BOT MUSIC ENGINE (v22) =================
      // Supports:
      //  1) Same-origin hosting (APATHY opened directly from the Python Telegram Bot server)
      //  2) Telegram Mini App (launched via Bot's WebApp button)
      //  3) External static hosting (Cloudflare Pages opened with ?api=https://your-bot-server)
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

      let tgBotAvailable = (location.protocol === 'https:' || location.protocol === 'http:') || Boolean(tgBotBaseUrl);
      let tgBotVerified = false;
      let tgBotUsername = '';
      let tgBotProbePromise = null;

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

      function probeTgBotSilently(force = false) {
        if (!tgBotAvailable && !force) return Promise.resolve(false);
        if (tgBotProbePromise && !force) return tgBotProbePromise;
        tgBotProbePromise = fetchJsonTimeout(`${tgApiUrl('/api/tg/ping')}?_=${Date.now()}`, 2600).then(data => {
          if (data && data.ok === true) {
            tgBotAvailable = true;
            tgBotVerified = true;
            tgBotUsername = data.bot || '';
            const rBtn = $('tgRefreshBtn');
            if (rBtn) rBtn.classList.add('show');
            return true;
          }
          tgBotAvailable = false;
          tgBotVerified = false;
          return false;
        });
        return tgBotProbePromise;
      }

      function mapTgBotTrack(item) {
        if (!item || !item.id) return null;
        const rawStream = item.streamUrl || `/api/tg/stream/${encodeURIComponent(item.id)}`;
        const fullStream = rawStream.startsWith('http') ? rawStream : tgApiUrl(rawStream);
        let art = item.artwork || '';
        if (art && art.startsWith('/')) art = tgApiUrl(art);
        const isSavedTg = item.source === 'telegram' || Boolean(item.inTelegram);
        return {
          id: 'tg_' + item.id,
          tgTrackId: String(item.id),
          tgStreamUrl: fullStream,
          directMp3Url: fullStream,
          backupMp3Urls: [],
          ytVideoId: item.ytVideoId || '',
          deezerId: '',
          portalKey: 'telegram',
          portalLabel: isSavedTg ? 'Telegram' : (item.sourceLabel || 'Бот · Поиск'),
          title: item.title || 'Без названия',
          artist: item.artist || 'Исполнитель',
          album: isSavedTg ? 'Telegram Бот' : (item.album || 'Бот · Поиск'),
          duration: item.duration || 180,
          artwork: art,
          coverGrad: 'linear-gradient(145deg, #163b5c 0%, #070c14 60%, #2468a3 100%)',
          source: isSavedTg ? 'Telegram' : (item.sourceLabel || 'Бот'),
          catalogOrigin: 'telegram',
          fromTelegramBot: true,
          fromCatalog: true,
          resolvedAudio: null,
          lyrics: null
        };
      }

      async function fetchTgBotTracks(query) {
        if (!tgBotAvailable) return null;
        const q = String(query || '').trim();
        const endpoint = q
          ? `${tgApiUrl('/api/tg/search')}?q=${encodeURIComponent(q)}`
          : `${tgApiUrl('/api/tg/library')}?limit=50`;
        const data = await fetchJsonTimeout(endpoint, q ? 6500 : 3200);
        if (!data || !data.ok || !Array.isArray(data.tracks)) return null;
        tgBotVerified = true;
        const rBtn = $('tgRefreshBtn');
        if (rBtn) rBtn.classList.add('show');
        const tracks = data.tracks.map(mapTgBotTrack).filter(Boolean);
        return {
          tracks,
          sources: Array.isArray(data.sources) && data.sources.length ? data.sources : ['Telegram Бот']
        };
      }

      async function resolveViaTgBot(track) {
        if (!tgBotAvailable || !track) return null;
        if (track.tgStreamUrl) {
          return {
            url: track.tgStreamUrl,
            rawUrl: track.tgStreamUrl,
            backupUrls: [],
            provider: 'telegram',
            label: 'Telegram · Полный',
            duration: track.duration || 180,
            subtitles: []
          };
        }
        const params = new URLSearchParams({
          artist: track.artist || '',
          title: track.title || ''
        });
        if (track.ytVideoId) params.set('v', track.ytVideoId);
        const data = await fetchJsonTimeout(`${tgApiUrl('/api/tg/resolve')}?${params.toString()}`, 7000);
        if (!data || !data.ok || !data.streamUrl) return null;
        const fullUrl = data.streamUrl.startsWith('http') ? data.streamUrl : tgApiUrl(data.streamUrl);
        track.tgStreamUrl = fullUrl;
        if (data.id) track.tgTrackId = String(data.id);
        return {
          url: fullUrl,
          rawUrl: fullUrl,
          backupUrls: [],
          provider: 'telegram',
          label: data.label || 'Telegram · Полный',
          duration: data.duration || track.duration || 180,
          subtitles: []
        };
      }

      // ================= v20 SILENT UNIFIED HIGH-SPEED NETWORK LAYER =================
      let cfProxyUsable = (location.protocol === 'https:' || location.protocol === 'http:');
      let cfProxyVerified = false;
      let cfProxyProbePromise = null;

      function toCfProxyUrl(targetUrl, mode = 'text') {
        if (!cfProxyUsable || !targetUrl) return '';
        if (targetUrl.includes('/api/proxy?')) return targetUrl;
        const m = mode === 'media' ? '&mode=media' : '';
        return `/api/proxy?url=${encodeURIComponent(targetUrl)}${m}`;
      }

      // Silent background check: uses Cloudflare Pages Edge Worker automatically if present, otherwise stays quiet
      function probeEdgeWorkerSilently() {
        if (!cfProxyUsable) return Promise.resolve(false);
        if (cfProxyProbePromise) return cfProxyProbePromise;
        cfProxyProbePromise = fetchJsonTimeout(`/api/proxy?ping=1&_=${Date.now()}`, 1800).then(data => {
          if (data && data.ok === true) {
            cfProxyUsable = true;
            cfProxyVerified = true;
            return true;
          }
          cfProxyUsable = false;
          cfProxyVerified = false;
          return false;
        });
        return cfProxyProbePromise;
      }

      function fetchJsonTimeout(url, timeoutMs = 3600) {
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

      function fetchTextTimeout(url, timeoutMs = 3600) {
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
            .then(res => (res && res.ok) ? res.text() : null)
            .then(txt => done(txt))
            .catch(() => done(null));
        });
      }

      function fetchJsonp(url, timeoutMs = 2600) {
        return new Promise((resolve) => {
          const cbName = 'apathy_jp_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
          const el = document.createElement('script');
          let done = false;
          const finish = (val) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
            if (el.parentNode) el.parentNode.removeChild(el);
            resolve(val);
          };
          const timer = setTimeout(() => finish(null), timeoutMs);
          window[cbName] = (data) => finish(data);
          el.onerror = () => finish(null);
          el.async = true;
          const sep = url.includes('?') ? '&' : '?';
          el.src = `${url}${sep}callback=${cbName}`;
          document.head.appendChild(el);
        });
      }

      // Adaptive CORS relay pool for static-only hosting (learns fastest live relays automatically)
      const CORS_RELAYS = [
        { id: 'codetabs',   type: 'raw',             build: u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` },
        { id: 'allorig_r',  type: 'raw',             build: u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
        { id: 'corsproxy',  type: 'raw',             build: u => `https://corsproxy.io/?url=${encodeURIComponent(u)}` },
        { id: 'allorig_j',  type: 'allorigins_json', build: u => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}` },
        { id: 'corslol',    type: 'raw',             build: u => `https://api.cors.lol/?url=${encodeURIComponent(u)}` }
      ];
      const relayStats = new Map();

      function getFastestRelays(count = 3) {
        const now = Date.now();
        return CORS_RELAYS.map((r, idx) => {
          const st = relayStats.get(r.id) || { ms: 750 + idx * 110, failUntil: 0 };
          return { r, score: st.ms + (st.failUntil > now ? 10000 : 0) };
        }).sort((a, b) => a.score - b.score).slice(0, count).map(x => x.r);
      }

      function markRelayResult(id, ok, elapsedMs) {
        const prev = relayStats.get(id) || { ms: 900, failUntil: 0 };
        if (ok) relayStats.set(id, { ms: Math.round(prev.ms * 0.4 + elapsedMs * 0.6), failUntil: 0 });
        else relayStats.set(id, { ms: Math.min(prev.ms + 700, 4000), failUntil: Date.now() + 75 * 1000 });
      }

      const MEDIA_PROXIES = [
        u => (cfProxyUsable ? toCfProxyUrl(u, 'media') : '') || `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
        u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
      ];

      function firstNonNull(promises) {
        return new Promise((resolve) => {
          let pending = promises.length;
          if (!pending) { resolve(null); return; }
          let settled = false;
          promises.forEach(p => {
            Promise.resolve(p).then(val => {
              if (!settled && val !== null && val !== undefined) {
                settled = true;
                resolve(val);
              } else {
                pending--;
                if (!settled && pending === 0) resolve(null);
              }
            }).catch(() => {
              pending--;
              if (!settled && pending === 0) resolve(null);
            });
          });
        });
      }

      function withHardTimeout(promise, ms, fallbackVal = null) {
        return Promise.race([
          Promise.resolve(promise).catch(() => fallbackVal),
          new Promise(res => setTimeout(() => res(fallbackVal), ms))
        ]);
      }

      function isOwnAppFallbackHtml(txt) {
        return typeof txt === 'string' && txt.includes('APATHY — Chrome Music Player') && txt.includes('id="splashScreen"');
      }

      async function fetchTextViaRelay(targetUrl, timeoutMs = 3600, minLen = 120, validator = null) {
        if (cfProxyUsable) {
          const cfUrl = toCfProxyUrl(targetUrl, 'text');
          if (cfUrl) {
            const cfTxt = await fetchTextTimeout(cfUrl, Math.min(timeoutMs, 3000));
            if (cfTxt && cfTxt.length >= minLen && !isOwnAppFallbackHtml(cfTxt) && (!validator || validator(cfTxt))) {
              return cfTxt;
            }
            if (isOwnAppFallbackHtml(cfTxt)) cfProxyUsable = false;
          }
        }

        const picked = getFastestRelays(3);
        const tasks = picked.map(async (r) => {
          const t0 = performance.now();
          let txt = '';
          if (r.type === 'allorigins_json') {
            const j = await fetchJsonTimeout(r.build(targetUrl), timeoutMs);
            txt = (j && typeof j.contents === 'string') ? j.contents : '';
          } else {
            txt = await fetchTextTimeout(r.build(targetUrl), timeoutMs) || '';
          }
          const ok = Boolean(txt && txt.length >= minLen && !isOwnAppFallbackHtml(txt) && (!validator || validator(txt)));
          markRelayResult(r.id, ok, performance.now() - t0);
          return ok ? txt : null;
        });

        return await withHardTimeout(firstNonNull(tasks), timeoutMs + 200, null);
      }

      async function fetchJsonViaRelay(targetUrl, timeoutMs = 3400) {
        if (cfProxyUsable) {
          const cfUrl = toCfProxyUrl(targetUrl, 'text');
          if (cfUrl) {
            const cfData = await fetchJsonTimeout(cfUrl, Math.min(timeoutMs, 2800));
            if (cfData) return cfData;
          }
        }

        const picked = getFastestRelays(3);
        const tasks = picked.map(async (r) => {
          const t0 = performance.now();
          let data = null;
          if (r.type === 'allorigins_json') {
            const j = await fetchJsonTimeout(r.build(targetUrl), timeoutMs);
            if (j && typeof j.contents === 'string') {
              try { data = JSON.parse(j.contents); } catch (e) {}
            }
          } else {
            data = await fetchJsonTimeout(r.build(targetUrl), timeoutMs);
          }
          markRelayResult(r.id, Boolean(data), performance.now() - t0);
          return data;
        });

        return await withHardTimeout(firstNonNull(tasks), timeoutMs + 200, null);
      }

      // =========================================================================
      // STEP 1: CATALOG SEARCH (DEEZER DIRECT + EU RELAY BYPASS -> ITUNES FALLBACK)
      // Fixes regional ISP blocks on api.deezer.com so search ALWAYS works!
      // =========================================================================
      function mapDeezerTrack(item) {
        const cover = (item.album && (item.album.cover_big || item.album.cover_xl || item.album.cover_medium || item.album.cover)) || '';
        return {
          id: 'dz_' + item.id,
          deezerId: item.id,
          title: item.title || 'Без названия',
          artist: (item.artist && item.artist.name) || 'Unknown',
          album: (item.album && item.album.title) || '',
          duration: item.duration || 180,
          artwork: cover,
          coverGrad: 'linear-gradient(145deg, #272d3d 0%, #090b10 60%, #45516b 100%)',
          previewUrl: item.preview || '',
          previewFetchedAt: Date.now(),
          catalogOrigin: 'deezer',
          fromCatalog: true,
          resolvedAudio: null,
          lyrics: null
        };
      }

      function mapItunesTrack(item) {
        const durSec = item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 180;
        return {
          id: 'itu_' + item.trackId,
          deezerId: '',
          title: item.trackName || 'Без названия',
          artist: item.artistName || 'Unknown',
          album: item.collectionName || '',
          duration: durSec || 180,
          artwork: (item.artworkUrl100 || '').replace('100x100bb', '500x500bb'),
          coverGrad: 'linear-gradient(145deg, #32243a 0%, #0a080d 60%, #573866 100%)',
          previewUrl: item.previewUrl || '',
          previewFetchedAt: Date.now(),
          catalogOrigin: 'itunes',
          fromCatalog: true,
          resolvedAudio: null,
          lyrics: null
        };
      }

      function dedupCatalogTracks(list) {
        const seen = new Set();
        const out = [];
        for (const t of list) {
          const key = (t.artist + '|' + t.title).toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
          if (!key || seen.has(key)) continue;
          seen.add(key);
          out.push(t);
        }
        return out;
      }

      async function searchDeezerRobust(query) {
        const q = (query || '').trim();
        const jsonUrl = q
          ? `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=25`
          : `https://api.deezer.com/chart/0/tracks?limit=25`;
        const jsonpUrl = jsonUrl + '&output=jsonp';
        const data = await firstNonNull([
          fetchJsonp(jsonpUrl, 2800).then(d => (d && Array.isArray(d.data) && d.data.length) ? d : null),
          fetchJsonViaRelay(jsonUrl, 3600).then(d => (d && Array.isArray(d.data) && d.data.length) ? d : null)
        ]);

        if (!data || !Array.isArray(data.data)) return [];
        return dedupCatalogTracks(
          data.data.filter(item => item && item.id && item.title).map(mapDeezerTrack)
        );
      }

      async function searchItunesCatalogFallback(query) {
        const q = (query || '').trim() || 'Pharaoh';
        const urlRu = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=ru&lang=ru_ru&media=music&entity=song&limit=25`;
        const urlUs = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=us&media=music&entity=song&limit=25`;

        const data = await firstNonNull([
          fetchJsonTimeout(urlRu, 4200).then(d => (d && Array.isArray(d.results) && d.results.length) ? d : null),
          fetchJsonTimeout(urlUs, 4500).then(d => (d && Array.isArray(d.results) && d.results.length) ? d : null)
        ]);

        if (!data || !Array.isArray(data.results)) return [];
        return dedupCatalogTracks(
          data.results.filter(item => item && item.trackId && item.trackName).map(mapItunesTrack)
        );
      }

      async function searchMainCatalog(query) {
        // 1) Primary: Deezer (Direct + Relay bypass)
        const dzTracks = await searchDeezerRobust(query);
        if (dzTracks.length) return { origin: 'Deezer', tracks: dzTracks };

        // 2) Guaranteed Fallback: iTunes Catalog (never geo-blocked in RU/CIS)
        const ituTracks = await searchItunesCatalogFallback(query);
        if (ituTracks.length) return { origin: 'Каталог (резерв)', tracks: ituTracks };

        return { origin: 'Deezer', tracks: [] };
      }

      async function refreshDeezerPreview(deezerId) {
        if (!deezerId) return '';
        const jsonUrl = `https://api.deezer.com/track/${deezerId}`;
        const d = await firstNonNull([
          fetchJsonp(jsonUrl + '?output=jsonp', 2800).then(x => (x && x.preview) ? x : null),
          fetchJsonViaRelay(jsonUrl, 3600).then(x => (x && x.preview) ? x : null)
        ]);
        return (d && d.preview) ? d.preview : '';
      }

      // =========================================================================
      // OPTIMAL RUSSIAN SEARCH ENGINE (iTunes RU + Mp3Party + Hitmos + Deezer)
      // Handles Cyrillic, Latin translit, ё/е folding, EN-keyboard typos, & instant MP3 fusion
      // =========================================================================
      const RU_ARTIST_ALIASES = [
        ['фараон', 'pharaoh'], ['мияги', 'miyagi'], ['эндшпиль', 'andy panda'],
        ['кай ангел', 'kai angel'], ['найнмайс', '9mice'], ['9майс', '9mice'],
        ['кизару', 'kizaru'], ['макан', 'macan'], ['токсис', 'toxis'],
        ['зиверт', 'zivert'], ['мэдкид', 'madk1d'], ['медкид', 'madk1d'],
        ['айсгергерт', 'icegergert'], ['ог буда', 'og buda'], ['биг бейби тейп', 'big baby tape'],
        ['бушидо жо', 'bushido zho'], ['сода лав', 'soda luv'], ['майот', 'mayot'],
        ['салуки', 'saluki'], ['маркул', 'markul'], ['обладает', 'obladaet'],
        ['яникс', 'yanix'], ['скриптонит', 'skryptonite'], ['баста', 'basta'],
        ['гуф', 'guf'], ['джони', 'jony'], ['мот', 'mot'], ['хчо', 'xcho'],
        ['федук', 'feduk'], ['элджей', 'eldzhey'], ['егор крид', 'egor kreed'],
        ['моргенштерн', 'morgenshtern'], ['оксимирон', 'oxxxymiron'],
        ['френдли таг', 'friendly thug 52 ngg'], ['алблак', 'alblak 52'],
        ['скэлли милано', 'scally milano'], ['скелли милано', 'scally milano'],
        ['платина', 'platina'], ['лсп', 'lsp'], ['молчат дома', 'molchat doma'],
        ['король и шут', 'korol i shut'], ['киш', 'король и шут'],
        ['три дня дождя', 'tri dnya dozhdya'], ['земфира', 'zemfira'],
        ['макс корж', 'maks korzh'], ['пошлая молли', 'poshlaya molly'],
        ['инстасамка', 'instasamka'], ['бируолф', 'bearwolf'], ['бирвульф', 'bearwolf'],
        ['хаммали', 'hammali & navai'], ['артик', 'artik & asti'],
        ['гаязов', 'gayazov$ brother$'], ['темный принц', 'тёмный принц'],
        ['виллиан', 'villian'], ['дк', 'dk'], ['гспд', 'gspd'],
        ['дед блонд', 'dead blonde'], ['пирокинезис', 'pyrokinesis'],
        ['шадоурейз', 'shadowraze'], ['херонвотер', 'heronwater'],
        ['воскресенский', 'voskresenskii'], ['аарне', 'aarne'],
        ['анну асти', 'anna asti'], ['анна асти', 'anna asti'],
        ['дмитриенко', 'ваня дмитриенко'], ['миа бойка', 'mia boyka'],
        ['энзро', 'enzro'], ['холлифлейм', 'hollyflame'], ['джейкон', 'jakone'],
        ['килиана', 'kiliana'], ['нойз', 'noize mc'], ['цой', 'кино'],
        ['буерак', 'buerak'], ['айспик', 'ic3peak'], ['гон флад', 'gone.fludd'],
        ['гон фладд', 'gone.fludd'], ['лизер', 'lizer'], ['фейс', 'face'],
        ['ловв66', 'lovv66'], ['бульвар депо', 'boulevard depo'], ['атл', 'atl'],
        ['ракета', 'rocket'], ['фортуна 812', 'fortuna 812']
      ];

      const EN_TO_RU_KEYS = {
        q:'й',w:'ц',e:'у',r:'к',t:'е',y:'н',u:'г',i:'ш',o:'щ',p:'з','[':'х',']':'ъ',
        a:'ф',s:'ы',d:'в',f:'а',g:'п',h:'р',j:'о',k:'л',l:'д',';':'ж',"'":'э',
        z:'я',x:'ч',c:'с',v:'м',b:'и',n:'т',m:'ь',',':'б','.':'ю','`':'ё'
      };

      function foldRuText(str) {
        return String(str || '')
          .toLowerCase()
          .replace(/ё/g, 'е')
          .replace(/\(.*?\)|\[.*?\]/g, ' ')
          .replace(/\b(feat\.?|ft\.?|при уч\.?|official|audio|video|remix|original mix|radio edit|explicit|remastered)\b/gi, ' ')
          .replace(/[^a-zа-я0-9]+/gi, ' ')
          .trim();
      }

      function maybeFixEnLayoutToRu(raw) {
        const s = String(raw || '').trim();
        if (!s || /[а-яё]/i.test(s)) return '';
        const low = s.toLowerCase();
        // Trigger only if string has Russian-keyboard punctuation or clearly non-English consonant clusters
        const hasRuKeyPunct = /[;'\[\]`]/.test(low);
        const words = low.split(/\s+/).filter(Boolean);
        const looksMistyped = hasRuKeyPunct || words.some(w =>
          w.length >= 4 && !/[aeiouy]/.test(w) && /^[a-z;,.'\[\]`]+$/.test(w)
        ) || /(fhf|vbf|crh|rjh|gjh|ghb|lhb|nht|cnf|pdj|ctk|jrc)/.test(low);
        if (!looksMistyped) return '';
        const converted = low.split('').map(ch => EN_TO_RU_KEYS[ch] || ch).join('').trim();
        return /[а-яё]{3,}/i.test(converted) ? converted : '';
      }

      function expandRuQueries(rawQuery) {
        const base = String(rawQuery || '').trim();
        if (!base) return [];
        const queries = [base];
        const low = base.toLowerCase().replace(/ё/g, 'е');

        // 1) Check mistaken EN keyboard layout (e.g. "afhfjy" -> "фараон")
        const fixedLayout = maybeFixEnLayoutToRu(base);
        if (fixedLayout && !queries.some(x => x.toLowerCase() === fixedLayout.toLowerCase())) {
          queries.push(fixedLayout);
        }

        // 2) Bidirectional RU <-> Latin artist alias replacement
        const checkPool = [low, ...(fixedLayout ? [fixedLayout.toLowerCase().replace(/ё/g, 'е')] : [])];
        for (const src of checkPool) {
          for (const [ruForm, altForm] of RU_ARTIST_ALIASES) {
            const ruFold = ruForm.replace(/ё/g, 'е');
            const altFold = altForm.replace(/ё/g, 'е');
            if (src.includes(ruFold) && ruFold !== altFold) {
              const swapped = src.replace(ruFold, altForm).trim();
              if (swapped && !queries.some(x => x.toLowerCase() === swapped.toLowerCase())) {
                queries.push(swapped);
                break;
              }
            } else if (src.includes(altFold) && ruFold !== altFold) {
              const swapped = src.replace(altFold, ruForm).trim();
              if (swapped && !queries.some(x => x.toLowerCase() === swapped.toLowerCase())) {
                queries.push(swapped);
                break;
              }
            }
          }
        }
        return queries.slice(0, 2);
      }

      // =========================================================================
      // DIRECT RU MP3 ENGINE: MP3PARTY.NET (ZAYCEV.NET FAMILY, NO CLOUDFLARE)
      // Returns tracks with instant full MP3 URLs: dl2.mp3party.net/online/<id>.mp3
      // =========================================================================
      function buildMp3PartyUrls(id) {
        const cleanId = String(id || '').replace(/\D+/g, '');
        if (!cleanId) return [];
        return [
          `https://dl2.mp3party.net/online/${cleanId}.mp3`,
          `https://dl2.mp3party.net/download/${cleanId}`,
          `https://dl1.mp3party.net/download/${cleanId}`
        ];
      }

      function parseMp3PartyHtml(htmlText) {
        const out = [];
        const seenIds = new Set();
        if (!htmlText || htmlText.length < 300) return out;
        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');
          doc.querySelectorAll('a[href*="/music/"]').forEach(a => {
            const href = a.getAttribute('href') || '';
            const idM = href.match(/\/music\/(\d{4,12})(?:$|[/?#])/);
            if (!idM) return;
            const id = idM[1];
            if (seenIds.has(id)) return;

            const rawLabel = (a.textContent || '').replace(/\s+/g, ' ').trim();
            if (!rawLabel || rawLabel.length < 3 || /^(скачать|слушать|подробнее|далее)$/i.test(rawLabel)) return;

            let artist = '';
            let title = rawLabel;
            const splitM = rawLabel.match(/^(.+?)\s+[–—-]\s+(.+)$/);
            if (splitM) {
              artist = splitM[1].trim();
              title = splitM[2].trim();
            }

            const card = a.closest('li, tr, article, .track, .song-item, .playlist__item, div[class*="track"], div[class*="song"], div[class*="music"]') || a.parentElement;
            let durSec = 0;
            let cover = '';
            if (card) {
              if (!artist) {
                const artA = card.querySelector('a[href*="/artist/"]');
                if (artA) artist = (artA.textContent || '').trim();
              }
              const durM = (card.textContent || '').match(/\b(\d{1,2}:\d{2})\b/);
              if (durM) durSec = parseDurText(durM[1]);
              const img = card.querySelector('img[src], img[data-src]');
              if (img) {
                const rawImg = img.getAttribute('data-src') || img.getAttribute('src') || '';
                if (rawImg && !/blank|spacer|logo|icon|pixel|avatar/i.test(rawImg)) {
                  try { cover = new URL(rawImg, 'https://mp3party.net').href; } catch (e) {}
                }
              }
            }

            // Strip duplicated artist prefix from title if needed
            if (artist && title.toLowerCase().startsWith(artist.toLowerCase() + ' - ')) {
              title = title.slice(artist.length + 3).trim();
            }
            if (!title) return;

            seenIds.add(id);
            const urls = buildMp3PartyUrls(id);
            out.push({
              id: 'mp3p_' + id,
              mp3PartyId: id,
              mp3PartyUrls: urls,
              deezerId: '',
              title,
              artist: artist || 'Исполнитель',
              album: 'Mp3Party · RU',
              duration: durSec || 180,
              artwork: cover,
              coverGrad: 'linear-gradient(145deg, #1a3833 0%, #070d0c 60%, #2d6359 100%)',
              previewUrl: '',
              catalogOrigin: 'mp3party',
              fromCatalog: true,
              resolvedAudio: null,
              lyrics: null
            });
          });
        } catch (e) {}
        return out;
      }

      async function searchMp3Party(query, maxItems = 20) {
        const q = String(query || '').trim();
        const url = q
          ? `https://mp3party.net/search?q=${encodeURIComponent(q)}`
          : `https://mp3party.net/music-new`;
        const htmlTxt = await fetchTextViaRelay(url, 3800, 400, txt => txt.includes('/music/'));
        if (!htmlTxt) return [];
        return parseMp3PartyHtml(htmlTxt).slice(0, maxItems);
      }

      async function resolveFromMp3Party(track) {
        if (track.mp3PartyId) {
          const urls = (Array.isArray(track.mp3PartyUrls) && track.mp3PartyUrls.length)
            ? [...track.mp3PartyUrls]
            : buildMp3PartyUrls(track.mp3PartyId);
          if (urls.length) {
            return {
              url: urls[0],
              rawUrl: urls[0],
              backupUrls: urls.slice(1),
              provider: 'mp3party',
              label: 'Mp3Party · MP3',
              duration: track.duration || 180,
              subtitles: []
            };
          }
        }

        const queries = buildHitmosQueries(track);
        for (const q of queries) {
          const candidates = await searchMp3Party(q, 12);
          if (!candidates.length) continue;
          candidates.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          const best = candidates[0];
          const sc = scoreCandidateMatch(best.artist, best.title, best.duration, track);
          if (sc < 3) continue;
          const urls = buildMp3PartyUrls(best.mp3PartyId);
          if (urls.length) {
            track.mp3PartyId = best.mp3PartyId;
            track.mp3PartyUrls = urls;
            return {
              url: urls[0],
              rawUrl: urls[0],
              backupUrls: urls.slice(1),
              provider: 'mp3party',
              label: 'Mp3Party · MP3',
              duration: best.duration || track.duration || 180,
              subtitles: []
            };
          }
        }
        return null;
      }

      async function searchItunesCountryFast(query, country = 'ru', limit = 25) {
        const q = String(query || '').trim();
        if (!q) return [];
        const lang = country === 'ru' ? '&lang=ru_ru' : '';
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=${country}${lang}&media=music&entity=song&limit=${limit}`;
        // Race native JSONP (~180ms, zero CORS on iOS Safari) + direct fetch + Edge proxy!
        const data = await firstNonNull([
          fetchJsonp(url, 2800).then(d => (d && Array.isArray(d.results) && d.results.length) ? d : null),
          fetchJsonTimeout(url, 2800).then(d => (d && Array.isArray(d.results) && d.results.length) ? d : null),
          cfProxyUsable ? fetchJsonTimeout(toCfProxyUrl(url, 'text'), 2800).then(d => (d && Array.isArray(d.results) && d.results.length) ? d : null) : Promise.resolve(null)
        ]);
        if (!data || !Array.isArray(data.results)) return [];
        return data.results
          .filter(item => item && item.trackId && item.trackName)
          .map(mapItunesTrack);
      }

      async function searchItunesRuDirect(query, limit = 25) {
        const [ruRes, usRes] = await Promise.all([
          searchItunesCountryFast(query, 'ru', limit),
          searchItunesCountryFast(query, 'us', Math.min(limit, 18))
        ]);
        return dedupCatalogTracks([...ruRes, ...usRes]);
      }

      async function fetchAppleRuTopChart() {
        const rssUrl = 'https://rss.applemarketingtools.com/api/v2/ru/music/most-played/25/songs.json';
        const data = await firstNonNull([
          fetchJsonTimeout(rssUrl, 3200).then(d => (d && d.feed && Array.isArray(d.feed.results)) ? d : null),
          fetchJsonViaRelay(rssUrl, 4500).then(d => (d && d.feed && Array.isArray(d.feed.results)) ? d : null)
        ]);
        if (!data || !data.feed || !Array.isArray(data.feed.results)) return [];
        return data.feed.results.map(item => ({
          id: 'itu_' + item.id,
          deezerId: '',
          title: item.name || 'Без названия',
          artist: item.artistName || 'Unknown',
          album: 'Топ Чарт РФ',
          duration: 180,
          artwork: (item.artworkUrl100 || '').replace(/100x100(bb)?/i, '500x500bb'),
          coverGrad: 'linear-gradient(145deg, #2d263d 0%, #09080f 60%, #4d3d6e 100%)',
          previewUrl: '',
          previewFetchedAt: Date.now(),
          catalogOrigin: 'itunes',
          fromCatalog: true,
          resolvedAudio: null,
          lyrics: null
        }));
      }

      function buildTrackFusionKey(artist, title) {
        const a = foldRuText(artist).split(' ').filter(w => w.length >= 2).slice(0, 2).join(' ');
        const t = foldRuText(title);
        return `${a}|${t}`;
      }

      function scoreRuQueryRelevance(track, expandedQueries) {
        let best = 0;
        const tFold = foldRuText(track.title);
        const aFold = foldRuText(track.artist);
        const allFold = `${aFold} ${tFold}`.trim();

        for (const q of expandedQueries) {
          const qFold = foldRuText(q);
          if (!qFold) continue;
          let sc = 0;
          if (aFold === qFold || tFold === qFold) sc += 26;
          if (allFold === qFold) sc += 32;
          if (aFold.startsWith(qFold) || tFold.startsWith(qFold)) sc += 16;
          if (allFold.includes(qFold)) sc += 12;

          const tokens = qFold.split(' ').filter(w => w.length >= 2);
          let matchedTokens = 0;
          tokens.forEach(tok => {
            if (aFold.includes(tok) || tFold.includes(tok)) {
              sc += 6;
              matchedTokens++;
            }
          });
          if (tokens.length >= 2 && matchedTokens === tokens.length) sc += 14;
          if (sc > best) best = sc;
        }

        // Russian / CIS relevance bonus
        const textRaw = `${track.artist || ''} ${track.title || ''}`;
        if (/[а-яё]/i.test(textRaw)) best += 7;
        else {
          const aLow = String(track.artist || '').toLowerCase().trim();
          if (RU_LATIN_ARTISTS.has(aLow)) best += 6;
        }

        // Instant MP3 & HD artwork quality bonus
        if (track.mp3PartyId) best += 5;
        if (track.artwork) best += 3;

        // Slight penalty for karaoke/minus/ringtone unless explicitly requested
        const wantStr = expandedQueries.join(' ').toLowerCase();
        const lowFull = textRaw.toLowerCase();
        ['karaoke', 'караоке', 'минус', 'рингтон', 'ringtone', '8d'].forEach(bad => {
          if (lowFull.includes(bad) && !wantStr.includes(bad)) best -= 10;
        });

        return best;
      }

      function fuseAndRankRuTracks(catalogLists, mp3PartyList, expandedQueries) {
        const byKey = new Map();
        const order = [];

        // 1) Insert official HD metadata tracks first (iTunes RU + Deezer)
        for (const list of catalogLists) {
          for (const t of list) {
            if (!t || !t.title) continue;
            const key = buildTrackFusionKey(t.artist, t.title);
            if (!key || key === '|') continue;
            if (!byKey.has(key)) {
              const copy = { ...t };
              byKey.set(key, copy);
              order.push(copy);
            } else {
              const ex = byKey.get(key);
              if (!ex.artwork && t.artwork) ex.artwork = t.artwork;
              if (!ex.deezerId && t.deezerId) ex.deezerId = t.deezerId;
              if (!ex.previewUrl && t.previewUrl) ex.previewUrl = t.previewUrl;
              if ((!ex.duration || ex.duration === 180) && t.duration && t.duration !== 180) ex.duration = t.duration;
            }
          }
        }

        // 2) Fuse Mp3Party full MP3 IDs into matching catalog cards, AND append exclusive Mp3Party tracks!
        for (const mp of mp3PartyList) {
          if (!mp || !mp.title) continue;
          const exactKey = buildTrackFusionKey(mp.artist, mp.title);
          let matched = byKey.get(exactKey);

          // Loose match by identical folded title + overlapping artist word
          if (!matched) {
            const mpTitleF = foldRuText(mp.title);
            const mpArtWords = foldRuText(mp.artist).split(' ').filter(w => w.length >= 3);
            if (mpTitleF.length >= 3) {
              matched = order.find(ex => {
                if (ex.mp3PartyId) return false;
                if (foldRuText(ex.title) !== mpTitleF) return false;
                const exArtF = foldRuText(ex.artist);
                return !mpArtWords.length || mpArtWords.some(w => exArtF.includes(w));
              });
            }
          }

          if (matched) {
            if (!matched.mp3PartyId && mp.mp3PartyId) {
              matched.mp3PartyId = mp.mp3PartyId;
              matched.mp3PartyUrls = mp.mp3PartyUrls;
            }
            if (!matched.artwork && mp.artwork) matched.artwork = mp.artwork;
          } else {
            const copy = { ...mp };
            byKey.set(exactKey, copy);
            order.push(copy);
          }
        }

        // 3) Rank by relevance if query was provided
        if (expandedQueries && expandedQueries.length) {
          order.sort((a, b) => scoreRuQueryRelevance(b, expandedQueries) - scoreRuQueryRelevance(a, expandedQueries));
        }
        return order.slice(0, 35);
      }

      async function searchRussianOptimal(query) {
        const raw = String(query || '').trim();

        // Empty query -> Live Russian Top Chart (Apple Music RU Top 25 + Mp3Party New Hits + iTunes RU fallback)
        if (!raw) {
          const [rssRes, mp3NewRes] = await Promise.allSettled([
            fetchAppleRuTopChart(),
            searchMp3Party('', 18)
          ]);
          let chartCatalog = (rssRes.status === 'fulfilled' && Array.isArray(rssRes.value)) ? rssRes.value : [];
          const mp3New = (mp3NewRes.status === 'fulfilled' && Array.isArray(mp3NewRes.value)) ? mp3NewRes.value : [];

          if (chartCatalog.length < 6) {
            const seeds = await Promise.allSettled([
              searchItunesRuDirect('Miyagi', 6),
              searchItunesRuDirect('Pharaoh', 6),
              searchItunesRuDirect('Баста', 6),
              searchItunesRuDirect('MACAN', 6)
            ]);
            seeds.forEach(s => {
              if (s.status === 'fulfilled' && Array.isArray(s.value)) chartCatalog.push(...s.value);
            });
          }

          const fused = fuseAndRankRuTracks([chartCatalog], mp3New, []);
          return {
            origin: 'РУ Чарт · Топ сегодня',
            correctedHint: '',
            tracks: fused
          };
        }

        const expanded = expandRuQueries(raw);
        const primaryQ = expanded[0];
        const altQ = expanded[1] || '';

        // Parallel race of the strongest RU engines:
        //   1) iTunes RU (primary + alias/layout fix) -> instant, unblocked, HD covers
        //   2) Mp3Party.net (primary + alias) -> instant direct full MP3s + remixes/VK hits
        //   3) Deezer (Direct + Relay) -> extra HD covers & CIS releases
        const tasks = [
          searchItunesRuDirect(primaryQ, 22),
          altQ ? searchItunesRuDirect(altQ, 16) : Promise.resolve([]),
          searchMp3Party(primaryQ, 18),
          altQ ? searchMp3Party(altQ, 12) : Promise.resolve([]),
          searchDeezerRobust(altQ || primaryQ)
        ];

        const settled = await withHardTimeout(Promise.allSettled(tasks), 4500, []);
        const itu1 = settled[0].status === 'fulfilled' ? settled[0].value : [];
        const itu2 = settled[1].status === 'fulfilled' ? settled[1].value : [];
        const mp1  = settled[2].status === 'fulfilled' ? settled[2].value : [];
        const mp2  = settled[3].status === 'fulfilled' ? settled[3].value : [];
        const dz   = settled[4].status === 'fulfilled' ? settled[4].value : [];

        const fused = fuseAndRankRuTracks([itu1, itu2, dz], [...mp1, ...mp2], expanded);

        let hint = '';
        if (altQ && altQ.toLowerCase() !== primaryQ.toLowerCase()) {
          hint = altQ;
        }
        return {
          origin: 'РУ-Поиск',
          correctedHint: hint,
          tracks: fused
        };
      }

      // =========================================================================
      // NEW SEARCH SYSTEM: SOUNDCLOUD (AUTO CLIENT_ID + API V2 + SSR HYDRATION)
      // =========================================================================
      let scClientId = store.get('scClientId', '');
      let scClientIdTs = store.get('scClientIdTs', 0);
      let scClientIdPromise = null;

      async function harvestSoundCloudClientId(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && scClientId && (now - scClientIdTs < 12 * 3600 * 1000)) {
          return scClientId;
        }
        if (scClientIdPromise) return scClientIdPromise;

        scClientIdPromise = (async () => {
          try {
            const pageHtml = await fetchTextViaRelay('https://soundcloud.com/', 5500, 500);
            if (!pageHtml) return scClientId || '';

            const assetUrls = [];
            const re = /https:\/\/a-v2\.sndcdn\.com\/assets\/[0-9a-zA-Z-]+\.js/g;
            let m;
            while ((m = re.exec(pageHtml)) !== null) {
              if (!assetUrls.includes(m[0])) assetUrls.push(m[0]);
            }

            // client_id lives in one of the last few JS chunks on soundcloud.com
            const toCheck = assetUrls.slice(-6).reverse();
            for (const jsUrl of toCheck) {
              const jsTxt = await firstNonNull([
                fetchTextTimeout(jsUrl, 3800),
                fetchTextViaRelay(jsUrl, 4500, 200)
              ]);
              if (!jsTxt) continue;
              const match = jsTxt.match(/client_id\s*[:=]\s*["']([a-zA-Z0-9]{24,40})["']/);
              if (match && match[1]) {
                scClientId = match[1];
                scClientIdTs = Date.now();
                store.set('scClientId', scClientId);
                store.set('scClientIdTs', scClientIdTs);
                return scClientId;
              }
            }
          } catch (e) {}
          return scClientId || '';
        })().finally(() => { scClientIdPromise = null; });

        return scClientIdPromise;
      }

      function mapSoundCloudTrack(item) {
        if (!item || !item.id || !item.title) return null;
        let art = item.artwork_url || (item.user && item.user.avatar_url) || '';
        if (art) art = art.replace('-large', '-t500x500');
        const durSec = Math.round((item.full_duration || item.duration || 180000) / 1000);
        const transcodings = (item.media && Array.isArray(item.media.transcodings))
          ? item.media.transcodings.map(tr => ({
              url: tr.url,
              protocol: tr.format && tr.format.protocol ? tr.format.protocol : '',
              mime: tr.format && tr.format.mime_type ? tr.format.mime_type : '',
              snipped: !!tr.snipped
            }))
          : [];

        // Split "Artist - Title" if uploader is a repost/channel name
        let artist = (item.user && item.user.username) || 'SoundCloud';
        let title = String(item.title || '').trim();
        const dash = title.match(/^(.+?)\s+[-—–]\s+(.+)$/);
        if (dash && dash[1].trim().length >= 2 && dash[1].trim().length <= 40 && dash[2].trim().length >= 2) {
          artist = dash[1].trim();
          title = dash[2].trim();
        }

        return {
          id: 'sc_' + item.id,
          scTrackId: String(item.id),
          scPermalink: item.permalink_url || '',
          scTranscodings: transcodings,
          scTrackAuth: item.track_authorization || '',
          title,
          artist,
          album: item.genre || 'SoundCloud',
          duration: durSec || 180,
          artwork: art,
          coverGrad: 'linear-gradient(145deg, #522814 0%, #0c0705 60%, #87411e 100%)',
          source: 'SoundCloud',
          fromSoundCloud: true,
          fromCatalog: false,
          resolvedAudio: null,
          lyrics: null
        };
      }

      function parseSoundCloudHydration(htmlText) {
        const out = [];
        try {
          const marker = 'window.__sc_hydration = ';
          const idx = htmlText.indexOf(marker);
          if (idx === -1) return out;
          const rest = htmlText.slice(idx + marker.length);
          const endIdx = rest.indexOf(';</');
          if (endIdx === -1) return out;
          const hydrated = JSON.parse(rest.slice(0, endIdx));
          if (!Array.isArray(hydrated)) return out;
          for (const block of hydrated) {
            if (!block || !block.data) continue;
            const coll = Array.isArray(block.data.collection) ? block.data.collection
              : (Array.isArray(block.data) ? block.data : []);
            for (const entry of coll) {
              const tObj = (entry && entry.track) ? entry.track : entry;
              if (tObj && (tObj.kind === 'track' || tObj.media)) {
                const mapped = mapSoundCloudTrack(tObj);
                if (mapped) out.push(mapped);
              }
            }
          }
        } catch (e) {}
        return dedupCatalogTracks(out);
      }

      async function searchSoundCloud(query) {
        const q = (query || '').trim() || 'Pharaoh';
        const cid = await harvestSoundCloudClientId(false);

        // Method 1: SoundCloud API v2 search/tracks (with auto-harvested client_id)
        if (cid) {
          const apiUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${encodeURIComponent(cid)}&limit=20&offset=0`;
          let data = await firstNonNull([
            fetchJsonTimeout(apiUrl, 3600).then(d => (d && Array.isArray(d.collection)) ? d : null),
            fetchJsonViaRelay(apiUrl, 5200).then(d => (d && Array.isArray(d.collection)) ? d : null)
          ]);

          // Retry once with freshly harvested client_id if old cached one expired
          if (!data) {
            const freshCid = await harvestSoundCloudClientId(true);
            if (freshCid && freshCid !== cid) {
              const retryUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${encodeURIComponent(freshCid)}&limit=20&offset=0`;
              data = await firstNonNull([
                fetchJsonTimeout(retryUrl, 3600).then(d => (d && Array.isArray(d.collection)) ? d : null),
                fetchJsonViaRelay(retryUrl, 5200).then(d => (d && Array.isArray(d.collection)) ? d : null)
              ]);
            }
          }

          if (data && Array.isArray(data.collection) && data.collection.length) {
            const mapped = data.collection.map(mapSoundCloudTrack).filter(Boolean);
            if (mapped.length) return dedupCatalogTracks(mapped);
          }
        }

        // Method 2: SoundCloud SSR Hydration page parser (works even without API v2!)
        const ssrHtml = await fetchTextViaRelay(`https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}`, 5500, 600);
        if (ssrHtml) {
          const parsed = parseSoundCloudHydration(ssrHtml);
          if (parsed.length) return parsed;
        }

        return [];
      }

      async function resolveSoundCloudStream(track) {
        const cid = await harvestSoundCloudClientId(false);
        let transcodings = Array.isArray(track.scTranscodings) ? track.scTranscodings : [];
        let trackAuth = track.scTrackAuth || '';

        // If transcodings weren't cached (e.g. restored from old playlist), fetch track info from API v2
        if (!transcodings.length && track.scTrackId && cid) {
          const tUrl = `https://api-v2.soundcloud.com/tracks/${encodeURIComponent(track.scTrackId)}?client_id=${encodeURIComponent(cid)}`;
          const tInfo = await firstNonNull([
            fetchJsonTimeout(tUrl, 3600),
            fetchJsonViaRelay(tUrl, 4800)
          ]);
          if (tInfo && tInfo.media && Array.isArray(tInfo.media.transcodings)) {
            transcodings = tInfo.media.transcodings.map(tr => ({
              url: tr.url,
              protocol: tr.format && tr.format.protocol ? tr.format.protocol : '',
              mime: tr.format && tr.format.mime_type ? tr.format.mime_type : '',
              snipped: !!tr.snipped
            }));
            trackAuth = tInfo.track_authorization || trackAuth;
            track.scTranscodings = transcodings;
            track.scTrackAuth = trackAuth;
          }
        }

        if (!transcodings.length || !cid) return null;

        // Prefer non-snipped progressive MP3, then non-snipped HLS (iOS Safari plays HLS natively!)
        const progressiveFull = transcodings.find(t => t.protocol === 'progressive' && !t.snipped);
        const hlsMp3Full = transcodings.find(t => t.protocol === 'hls' && /mpeg/i.test(t.mime) && !t.snipped);
        const hlsAnyFull = transcodings.find(t => t.protocol === 'hls' && !t.snipped);
        const progressiveAny = transcodings.find(t => t.protocol === 'progressive');
        const ordered = [progressiveFull, hlsMp3Full, hlsAnyFull, progressiveAny, transcodings[0]].filter(Boolean);

        for (const tr of ordered) {
          const authParam = trackAuth ? `&track_authorization=${encodeURIComponent(trackAuth)}` : '';
          const sep = tr.url.includes('?') ? '&' : '?';
          const reqUrl = `${tr.url}${sep}client_id=${encodeURIComponent(cid)}${authParam}`;
          const res = await firstNonNull([
            fetchJsonTimeout(reqUrl, 3800).then(d => (d && d.url) ? d : null),
            fetchJsonViaRelay(reqUrl, 4800).then(d => (d && d.url) ? d : null)
          ]);
          if (res && res.url) {
            return {
              url: res.url,
              provider: 'soundcloud',
              label: tr.snipped ? 'SoundCloud · Превью' : 'SoundCloud',
              duration: tr.snipped ? 30 : (track.duration || 180),
              subtitles: []
            };
          }
        }
        return null;
      }

      async function resolveMatchingSoundCloudTrack(track) {
        const q = `${track.artist} ${track.title}`.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();
        const found = await searchSoundCloud(q);
        if (!found.length) return null;
        found.sort((a, b) =>
          scoreCandidateMatch(b.artist, b.title, b.duration, track) -
          scoreCandidateMatch(a.artist, a.title, a.duration, track)
        );
        const best = found[0];
        if (scoreCandidateMatch(best.artist, best.title, best.duration, track) < 2) return null;
        return await resolveSoundCloudStream(best);
      }

      // =========================================================================
      // STEP 2: REGION ROUTER (RU -> HITMOS -> YOUTUBE | INTL -> YT MUSIC -> YOUTUBE)
      // =========================================================================
      const RU_LATIN_ARTISTS = new Set([
        'miyagi', 'andy panda', 'miyagi & andy panda', 'miyagi & эндшпиль', 'pharaoh',
        'kai angel', '9mice', 'kizaru', 'big baby tape', 'og buda', 'friendly thug 52 ngg',
        'alblak 52', 'morgenshtern', 'oxxxymiron', 'ic3peak', 'gone.fludd', 'lizer',
        'face', 'toxis', 'bushido zho', 'lovv66', 'mayot', 'saluki', 'scriptonite',
        'skryptonite', 'zivert', 'anna asti', 'jony', 'xcho', 'mot', 'macan', 'a.v.g',
        'jakone', 'kiliana', 'basta', 'guf', 'noize mc', 'markul', 'obladaet', 'yanix',
        'platina', 'lil krystalll', 'thrill pill', 'sqwoz bab', 'instasamka', 'dora',
        'ramil', 'hammali & navai', 'artik & asti', 'gayazov$ brother$', 'feduk',
        'eldzhey', 't-fest', "l'one", 'jah khalib', 'heronwater', 'voskresenskii',
        'madk1d', 'icegergert', 'enzro', 'ap$ent', 'hollyflame', 'sayan', 'niletto',
        'rakhim', 'slava marlow', 'egor kreed', 'timati', 'monetochka', 'zemfira',
        'lsp', 'akmal', "akmal'", 'polnalyubvi', 'pyrokinesis', 'mzlff', 'cmh', 'dk',
        'gspd', 'dead blonde', 'molchat doma', 'buerak', 'motorama', 'shortparis',
        'little big', 'cream soda', 'iowa', 'loboda', 'max barskih', 'kambulat',
        'santiz', 'schokk', 'anacondaz', 'atl', 'boulevard depo', 'jeembo', 'tveth',
        'thomas mraz', 'i61', 'mnogoznaal', 'white punk', 'loqiemean', 'blago white',
        'soda luv', 'scally milano', 'uglystephan', '163onmyneck', 'semee', 'rocket',
        'shadowraze', 'zxcursed', 'fem.love', 'mukka', 'mary gu', 'klava koka', 'nyusha',
        't.a.t.u.', 'tatu', 'filatov & karas', 'kimo sounds', 'nextime', 'villian', 'mrak', 'mia boyka', 'bearwolf', 'koss', 'yungmeechy', 'kanatbek', 'imael angel', 'yasmi', 'sabi', 'taketake', 'whole lotta swag', 'fortuna 812', 'elox1m', 'newlightchild', 'greyrock', 'tewiq', 'sabu', 'xolidayboy', 'sky rae', 'aarne', 'valid', 'vonamour', 'marcel', 'liza boyka', 'mr. credo', 'mr lambo', 'ivan valeev', 'lil morty', 'lightprey', 'gazan', 'dava'
      ]);

      function isRussianTrack(track) {
        if (track && (track.portalKey || track.directMp3Url || track.detailPageUrl)) return true;
        const text = `${track.artist || ''} ${track.title || ''} ${track.album || ''}`;
        if (/[а-яё]/i.test(text)) return true;
        const artistNorm = String(track.artist || '').toLowerCase().trim();
        if (RU_LATIN_ARTISTS.has(artistNorm)) return true;
        for (const known of RU_LATIN_ARTISTS) {
          if (known.length >= 4 && artistNorm.includes(known)) return true;
        }
        return false;
      }

      function normalizeForMatch(str) {
        return String(str || '')
          .toLowerCase()
          .replace(/\(.*?\)|\[.*?\]/g, ' ')
          .replace(/[^a-zа-яё0-9]+/gi, ' ')
          .trim();
      }

      function scoreCandidateMatch(candArtist, candTitle, candDur, targetTrack) {
        const wantA = normalizeForMatch(targetTrack.artist);
        const wantT = normalizeForMatch(targetTrack.title);
        const gotAll = normalizeForMatch(`${candArtist} ${candTitle}`);
        const gotT = normalizeForMatch(candTitle);
        let score = 0;

        const wantTokensT = wantT.split(' ').filter(w => w.length >= 2);
        const wantTokensA = wantA.split(' ').filter(w => w.length >= 2);

        wantTokensT.forEach(tok => { if (gotT.includes(tok) || gotAll.includes(tok)) score += 4; });
        wantTokensA.forEach(tok => { if (gotAll.includes(tok)) score += 3; });

        if (gotT === wantT) score += 8;
        if (wantT && gotAll.includes(wantT)) score += 6;
        if (wantA && gotAll.includes(wantA)) score += 4;

        const lowRaw = `${candArtist} ${candTitle}`.toLowerCase();
        const wantLow = `${targetTrack.artist} ${targetTrack.title}`.toLowerCase();
        ['remix', 'cover', 'karaoke', 'instrumental', 'slowed', 'speed up', 'nightcore', '8d', 'live'].forEach(tag => {
          if (lowRaw.includes(tag) && !wantLow.includes(tag)) score -= 5;
        });

        if (candDur > 20 && targetTrack.duration > 20) {
          const diff = Math.abs(candDur - targetTrack.duration);
          if (diff <= 6) score += 6;
          else if (diff <= 15) score += 3;
          else if (diff > 60) score -= 4;
        }
        return score;
      }

      // =========================================================================
      // AUDIO ENGINE A: RUSSIAN MP3 PORTALS HUB
      // Hitmo + Muzmo + Muzofond + Sefon + LightAudio + Mp3Party
      // Full live search + direct MP3 extraction + 2-step detail-page resolution
      // =========================================================================
      const HITMO_CLASSIC_HOSTS = [
        'https://mp3.hitmo.net',
        'https://hitmo.club',
        'https://hitmo.me',
        'https://rus.hitmotop.com',
        'https://eu.hitmotop.com'
      ];
      const HITMOS_NEXT_HOSTS = [
        'https://rus.hitmos.fm',
        'https://new.hitmos.fm'
      ];
      const MUZMO_HOSTS = [
        'https://muzmo.org',
        'https://muzmos.org'
      ];
      const MUZOFOND_HOSTS = [
        'https://muzofond.fm'
      ];
      const SEFON_HOSTS = [
        'https://sefon.pro'
      ];
      const LIGHTAUDIO_HOSTS = [
        'https://lightaudio.ru'
      ];

      const PORTAL_META = {
        hitmo:      { label: 'Hitmo',      grad: 'linear-gradient(145deg, #1b3654 0%, #070b12 60%, #2c5b8c 100%)', tag: 'hitmos-tag' },
        muzmo:      { label: 'Muzmo',      grad: 'linear-gradient(145deg, #4f3817 0%, #0d0905 60%, #8a6223 100%)', tag: 'muzmo-tag' },
        muzofond:   { label: 'Muzofond',   grad: 'linear-gradient(145deg, #1d2f52 0%, #070a12 60%, #345694 100%)', tag: 'mzf-tag' },
        mp3party:   { label: 'Mp3Party',   grad: 'linear-gradient(145deg, #1a3833 0%, #070d0c 60%, #2d6359 100%)', tag: 'mp3p-tag' },
        sefon:      { label: 'Sefon',      grad: 'linear-gradient(145deg, #3c1f52 0%, #0b0712 60%, #6b3694 100%)', tag: 'sefon-tag' },
        lightaudio: { label: 'LightAudio', grad: 'linear-gradient(145deg, #163e3c 0%, #060d0d 60%, #26706c 100%)', tag: 'light-tag' },
        drivemusic: { label: 'DriveMusic', grad: 'linear-gradient(145deg, #2a2854 0%, #080712 60%, #4d4899 100%)', tag: 'mzf-tag' },
        soundcloud: { label: 'SoundCloud', grad: 'linear-gradient(145deg, #522814 0%, #0c0705 60%, #87411e 100%)', tag: 'sc-tag' },
        audius:     { label: 'Audius',     grad: 'linear-gradient(145deg, #3c1c5e 0%, #0a0612 60%, #6f33ad 100%)', tag: 'dz-tag' },
        telegram:   { label: 'Telegram',   grad: 'linear-gradient(145deg, #163b5c 0%, #070c14 60%, #2468a3 100%)', tag: 'tg-tag' }
      };

      function parseDurText(raw) {
        if (raw === null || raw === undefined) return 0;
        if (typeof raw === 'number' && isFinite(raw)) return Math.round(raw > 10000 ? raw / 1000 : raw);
        const s = String(raw).trim();
        if (/^\d+$/.test(s)) {
          const n = parseInt(s, 10) || 0;
          return n > 10000 ? Math.round(n / 1000) : n;
        }
        const m = s.match(/(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0;
      }

      function isPortalBotWall(htmlText) {
        if (!htmlText || htmlText.length < 300) return true;
        const low = htmlText.slice(0, 4000).toLowerCase();
        if (low.includes('cf-browser-verification') || low.includes('attention required! | cloudflare') || low.includes('just a moment...') || low.includes('ddos-guard')) {
          return true;
        }
        if (low.includes('возможно вы используете vpn') && !htmlText.includes('/song/') && !htmlText.includes('.mp3') && !htmlText.includes('info?id=')) {
          return true;
        }
        return false;
      }

      function resolveAbsUrl(rawUrl, baseHost) {
        if (!rawUrl) return '';
        let u = String(rawUrl).trim()
          .replace(/\\u002F/gi, '/')
          .replace(/\\u0026/gi, '&')
          .replace(/\\\//g, '/')
          .replace(/&amp;/g, '&');
        if (!u || u.startsWith('#') || u.startsWith('data:')) return '';
        if (u.startsWith('//')) u = 'https:' + u;
        try {
          const abs = new URL(u, baseHost).href;
          if (/^https?:\/\//i.test(abs)) return abs;
        } catch (e) {}
        return '';
      }

      function isLikelyAudioUrl(url) {
        if (!url) return false;
        const low = url.toLowerCase();
        if (/\.(jpg|jpeg|png|webp|gif|svg|css|js|woff2?|ico|json|html|php\?id=)(\?|$)/i.test(low)) return false;
        return /\.mp3(\?|$|#)/i.test(low)
          || /\.m4a(\?|$|#)/i.test(low)
          || low.includes('/get/music/')
          || low.includes('/get/cuts/')
          || low.includes('/download/music/')
          || low.includes('/api/download/')
          || low.includes('/api/mp3_download/')
          || low.includes('/stream/')
          || /muzmo[a-z0-9.-]*\/(?:get|download|file)/i.test(low)
          || /hitmos?\.fm\/.*(audio|track|mp3|download|music|get)/i.test(low);
      }

      function makePortalTrackObj({ portalKey, host, artist, title, duration, artwork, mp3Url, backupUrls, detailPageUrl }) {
        const meta = PORTAL_META[portalKey] || PORTAL_META.hitmo;
        const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
        let cleanArtist = String(artist || '').replace(/\s+/g, ' ').trim();
        let finalTitle = cleanTitle;

        if (!cleanArtist && cleanTitle.includes(' - ')) {
          const parts = cleanTitle.split(' - ');
          cleanArtist = parts[0].trim();
          finalTitle = parts.slice(1).join(' - ').trim();
        } else if (!cleanArtist && cleanTitle.includes(' — ')) {
          const parts = cleanTitle.split(' — ');
          cleanArtist = parts[0].trim();
          finalTitle = parts.slice(1).join(' — ').trim();
        }
        if (!finalTitle) return null;

        const keyHash = `${portalKey}_${foldRuText(cleanArtist).slice(0, 18)}_${foldRuText(finalTitle).slice(0, 26)}`.replace(/\s+/g, '_');
        const allBackups = Array.isArray(backupUrls) ? backupUrls.filter(u => u && u !== mp3Url) : [];

        return {
          id: keyHash + '_' + Math.abs(Array.from(mp3Url || detailPageUrl || finalTitle).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)).toString(36),
          deezerId: '',
          mp3PartyId: '',
          mp3PartyUrls: null,
          directMp3Url: mp3Url || '',
          backupMp3Urls: allBackups,
          detailPageUrl: detailPageUrl || '',
          portalKey,
          portalHost: host || '',
          portalLabel: meta.label,
          title: finalTitle,
          artist: cleanArtist || meta.label,
          album: meta.label + ' · MP3',
          duration: parseDurText(duration) || 180,
          artwork: artwork || '',
          coverGrad: meta.grad,
          previewUrl: '',
          source: meta.label,
          catalogOrigin: portalKey,
          fromCatalog: true,
          resolvedAudio: null,
          lyrics: null
        };
      }

      // Extract & decode Next.js App Router RSC payload chunks (self.__next_f.push([1,"..."])) + __NEXT_DATA__
      function extractNextPayloads(htmlText) {
        const chunks = [];
        try {
          if (htmlText.includes('__NEXT_DATA__')) {
            const ndDoc = new DOMParser().parseFromString(htmlText, 'text/html');
            const ndEl = ndDoc.getElementById('__NEXT_DATA__');
            if (ndEl && ndEl.textContent) chunks.push(ndEl.textContent);
          }
        } catch (e) {}

        try {
          const rscRe = /self\.__next_f\.push\(\[\s*\d+\s*,\s*("(?:\\.|[^"\\])*")\s*\]\)/g;
          let m;
          while ((m = rscRe.exec(htmlText)) !== null) {
            try {
              const decoded = JSON.parse(m[1]);
              if (typeof decoded === 'string' && decoded.length > 10) chunks.push(decoded);
            } catch (e) {
              chunks.push(m[1].replace(/\\"/g, '"').replace(/\\\//g, '/'));
            }
          }
        } catch (e) {}

        return chunks.join('\n');
      }

      function extractMetaAroundPos(text, pos) {
        const start = Math.max(0, pos - 420);
        const end = Math.min(text.length, pos + 420);
        const win = text.slice(start, end);

        const pickStr = (keys) => {
          for (const k of keys) {
            const m = win.match(new RegExp(`"${k}"\\s*:\\s*"([^"]{1,160})"`, 'i'));
            if (m && m[1]) return m[1].trim();
          }
          return '';
        };

        let title = pickStr(['title', 'trackName', 'songTitle', 'name']);
        let artist = pickStr(['artist', 'artistName', 'artist_name', 'singer', 'performer', 'author']);
        if (!artist) {
          const arrM = win.match(/"artists"\s*:\s*\[\s*\{[^}]{0,220}?"name"\s*:\s*"([^"]{1,120})"/i);
          if (arrM && arrM[1]) artist = arrM[1].trim();
        }
        let duration = 0;
        const durM = win.match(/"(?:duration|length|time|durationSec|duration_sec)"\s*:\s*"?(\d{1,2}:\d{2}|\d{2,6})"?/i);
        if (durM && durM[1]) duration = parseDurText(durM[1]);

        return { artist, title, duration };
      }

      // ================= PORTAL 1: HITMO (hitmo.me, rus.hitmotop.com, rus.hitmos.fm) =================
      function parseHitmosPage(htmlText, baseHost) {
        const audioCandidates = [];
        const songPages = [];
        const seenAudio = new Set();
        const seenSongs = new Set();

        if (isPortalBotWall(htmlText)) return { audioCandidates, songPages };

        const addAudio = (rawUrl, artist, title, duration, artwork = '') => {
          const abs = resolveAbsUrl(rawUrl, baseHost);
          if (!abs || seenAudio.has(abs) || !isLikelyAudioUrl(abs)) return;
          seenAudio.add(abs);
          const absArt = artwork ? resolveAbsUrl(artwork, baseHost) : '';
          audioCandidates.push({
            artist: (artist || '').trim(),
            title: (title || '').trim(),
            url: abs,
            artwork: absArt,
            duration: parseDurText(duration),
            host: baseHost
          });
        };

        const addSong = (songPathOrId, artist, title, duration, artwork = '') => {
          const path = /^\d+$/.test(String(songPathOrId)) ? `/song/${songPathOrId}` : String(songPathOrId);
          const abs = resolveAbsUrl(path, baseHost);
          if (!abs || seenSongs.has(abs)) return;
          seenSongs.add(abs);
          const idM = abs.match(/\/song\/(\d+)/);
          const absArt = artwork ? resolveAbsUrl(artwork, baseHost) : '';
          songPages.push({
            songId: idM ? idM[1] : '',
            songUrl: abs,
            artist: (artist || '').trim(),
            title: (title || '').trim(),
            artwork: absArt,
            duration: parseDurText(duration),
            host: baseHost
          });
        };

        // 1) Next.js App Router RSC payload + __NEXT_DATA__
        const nextText = extractNextPayloads(htmlText);
        if (nextText) {
          const fieldRe = /"(?:url|audio|audioUrl|audio_url|mp3|mp3Url|mp3_url|stream|streamUrl|stream_url|file|fileUrl|file_url|download|downloadUrl|download_url|src|trackUrl)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/gi;
          let m;
          while ((m = fieldRe.exec(nextText)) !== null) {
            const val = m[1];
            if (isLikelyAudioUrl(resolveAbsUrl(val, baseHost))) {
              const meta = extractMetaAroundPos(nextText, m.index);
              addAudio(val, meta.artist, meta.title, meta.duration);
            }
          }

          const directRe = /(?:https?:\\?\/\\?\/[^"'\s<>\\]+?\.(?:mp3|m4a)(?:\?[^"'\s<>\\]*)?|\\?\/get\\?\/music\\?\/[^"'\s<>\\]+?\.mp3)/gi;
          while ((m = directRe.exec(nextText)) !== null) {
            const meta = extractMetaAroundPos(nextText, m.index);
            addAudio(m[0], meta.artist, meta.title, meta.duration);
          }

          const songRe = /"(\/song\/(\d+))"/g;
          while ((m = songRe.exec(nextText)) !== null) {
            const meta = extractMetaAroundPos(nextText, m.index);
            addSong(m[1], meta.artist, meta.title, meta.duration);
          }
        }

        // 2) DOM parsing (hitmo.me, rus.hitmotop.com, rus.hitmos.fm)
        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');

          doc.querySelectorAll('[data-musmeta]').forEach(el => {
            try {
              const meta = JSON.parse(el.getAttribute('data-musmeta'));
              if (!meta || !meta.url) return;
              const timeEl = el.querySelector('.track__fulltime, .track__time');
              let art = meta.img || '';
              if (!art) {
                const imgDiv = el.querySelector('.track__img[style]');
                if (imgDiv) {
                  const bgM = (imgDiv.getAttribute('style') || '').match(/url\(['"]?([^'")]+)['"]?\)/i);
                  if (bgM) art = bgM[1];
                }
              }
              addAudio(meta.url, meta.artist, meta.title, timeEl ? timeEl.textContent : 0, art);
            } catch (e) {}
          });

          doc.querySelectorAll('.tracks__item, li.track').forEach(el => {
            const dl = el.querySelector('a.track__download-btn[href], a[href*="/get/music/"], a[href*=".mp3"], a[download][href]');
            if (!dl) return;
            const tEl = el.querySelector('.track__title');
            const aEl = el.querySelector('.track__desc');
            const dEl = el.querySelector('.track__fulltime, .track__time');
            let art = '';
            const imgDiv = el.querySelector('.track__img[style]');
            if (imgDiv) {
              const bgM = (imgDiv.getAttribute('style') || '').match(/url\(['"]?([^'")]+)['"]?\)/i);
              if (bgM) art = bgM[1];
            }
            addAudio(
              dl.getAttribute('href'),
              aEl ? aEl.textContent : '',
              tEl ? tEl.textContent : '',
              dEl ? dEl.textContent : '',
              art
            );
          });

          const pageH1 = (doc.querySelector('h1') && doc.querySelector('h1').textContent) ? doc.querySelector('h1').textContent.trim() : '';
          let h1Artist = '', h1Title = '';
          if (pageH1.includes(' - ')) {
            const parts = pageH1.split(' - ');
            h1Artist = parts[0].trim();
            h1Title = parts.slice(1).join(' - ').trim();
          }

          doc.querySelectorAll('audio[src], audio source[src], a[href*=".mp3"], a[href*="/get/music/"], a[download][href]').forEach(el => {
            const raw = el.getAttribute('src') || el.getAttribute('href') || '';
            const card = el.closest('li, article, tr, [class*="track"], [class*="song"], [class*="item"], section') || el.parentElement;
            const cardText = card ? card.textContent : '';
            const durM = cardText.match(/\b(\d{1,2}:\d{2})\b/);
            const songLink = card ? card.querySelector('a[href^="/song/"]') : null;
            const artistLink = card ? card.querySelector('a[href^="/artist/"]') : null;
            addAudio(
              raw,
              (artistLink && artistLink.textContent.trim()) || h1Artist,
              (songLink && songLink.textContent.trim()) || h1Title,
              durM ? durM[1] : 0
            );
          });

          doc.querySelectorAll('a[href^="/song/"]').forEach(a => {
            const href = a.getAttribute('href') || '';
            if (!/^\/song\/\d+/.test(href)) return;
            const title = (a.textContent || '').trim();
            if (!title || title.length < 2) return;
            const row = a.closest('li, article, [class*="track"], [class*="song"], [class*="item"], div') || a.parentElement;
            let artist = '', dur = 0, art = '';
            if (row) {
              const artistLinks = Array.from(row.querySelectorAll('a[href^="/artist/"]'))
                .map(x => (x.textContent || '').trim())
                .filter(Boolean);
              if (artistLinks.length) {
                artist = artistLinks.join(', ');
              } else {
                const rowText = (row.textContent || '').replace(title, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();
                if (rowText.length > 0 && rowText.length < 80) artist = rowText;
              }
              const durM = (row.textContent || '').match(/\b(\d{1,2}:\d{2})\b/);
              if (durM) dur = parseDurText(durM[1]);
              const img = row.querySelector('img[src]');
              if (img && /static/i.test(img.getAttribute('src') || '')) art = img.getAttribute('src');
            }
            addSong(href, artist, title, dur, art);
          });
        } catch (e) {}

        // 3) Raw regex sweep across entire HTML
        const rawMp3Matches = htmlText.match(/(?:https?:\/\/|\/\/)[^\s"'<>\\]+?(?:\/get\/music\/[^\s"'<>\\]+|\.mp3(?:\?[^\s"'<>\\]*)?)/gi) || [];
        rawMp3Matches.forEach(mp3 => addAudio(mp3, '', '', 0));

        const relGetMatches = htmlText.match(/\/get\/music\/[^\s"'<>\\]+\.mp3/gi) || [];
        relGetMatches.forEach(rel => addAudio(rel, '', '', 0));

        return { audioCandidates, songPages };
      }

      async function searchHitmoPortal(query, maxItems = 20) {
        const q = String(query || '').trim();
        const hosts = ['https://mp3.hitmo.net', 'https://hitmo.club', 'https://hitmo.me', 'https://rus.hitmotop.com', 'https://rus.hitmos.fm'];

        const tasks = hosts.map(async (host) => {
          const isNext = /hitmos\.fm/i.test(host);
          const url = q
            ? `${host}/search?q=${encodeURIComponent(q)}`
            : (isNext ? `${host}/songs/top-today` : `${host}/`);

          const htmlTxt = await fetchTextViaRelay(url, 3800, 400, txt => {
            if (isPortalBotWall(txt)) return false;
            return txt.includes('data-musmeta') || txt.includes('/get/music/') || txt.includes('.mp3') || txt.includes('/song/');
          });
          if (!htmlTxt) return null;

          const parsed = parseHitmosPage(htmlTxt, host);
          const out = [];
          parsed.audioCandidates.forEach(c => {
            if (!c.title && !c.artist) return;
            const obj = makePortalTrackObj({
              portalKey: 'hitmo',
              host,
              artist: c.artist,
              title: c.title,
              duration: c.duration,
              artwork: c.artwork,
              mp3Url: c.url
            });
            if (obj) out.push(obj);
          });

          if (!out.length && parsed.songPages.length) {
            parsed.songPages.forEach(s => {
              const obj = makePortalTrackObj({
                portalKey: 'hitmo',
                host,
                artist: s.artist,
                title: s.title,
                duration: s.duration,
                artwork: s.artwork,
                detailPageUrl: s.songUrl
              });
              if (obj) out.push(obj);
            });
          }
          return out.length ? out.slice(0, maxItems) : null;
        });

        const res = await withHardTimeout(firstNonNull(tasks), 4400, null);
        return res || [];
      }

      // ================= PORTAL 2: MUZMO (muzmo.org / muzmos.org) =================
      function parseMuzmoSearchHtml(htmlText, baseHost) {
        const out = [];
        const seen = new Set();
        if (isPortalBotWall(htmlText)) return out;

        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');

          // 1) Look for track cards / links pointing to /info?id=...
          doc.querySelectorAll('a[href*="info?id="], a[href*="info?song="]').forEach(a => {
            const href = a.getAttribute('href') || '';
            const detailUrl = resolveAbsUrl(href, baseHost);
            if (!detailUrl || seen.has(detailUrl)) return;

            const rawText = (a.textContent || '').replace(/\s+/g, ' ').trim();
            if (!rawText || rawText.length < 2 || /^(скачать|слушать|подробнее|текст|инфо)$/i.test(rawText)) return;

            const card = a.closest('li, tr, article, .block, .item, .mz_item, div[class*="song"], div[class*="track"], div') || a.parentElement;
            let artist = '', title = rawText, dur = 0, mp3Url = '', artwork = '';

            if (rawText.includes(' - ')) {
              const parts = rawText.split(' - ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' - ').trim();
            } else if (rawText.includes(' — ')) {
              const parts = rawText.split(' — ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' — ').trim();
            }

            if (card) {
              if (!artist) {
                const artEl = card.querySelector('a[href*="artist"], .artist, .author, .singer');
                if (artEl && artEl !== a) artist = (artEl.textContent || '').trim();
              }
              const durM = (card.textContent || '').match(/\b(\d{1,2}:\d{2})\b/);
              if (durM) dur = parseDurText(durM[1]);

              // Inline play/download link if available on search page
              const playEl = card.querySelector('[data-url], [data-mp3], [data-src], a[href*="/get/"], a[href*=".mp3"]');
              if (playEl) {
                const candidateUrl = playEl.getAttribute('data-url') || playEl.getAttribute('data-mp3') || playEl.getAttribute('data-src') || playEl.getAttribute('href') || '';
                const abs = resolveAbsUrl(candidateUrl, baseHost);
                if (isLikelyAudioUrl(abs)) mp3Url = abs;
              }

              const img = card.querySelector('img[src], img[data-src]');
              if (img) {
                const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
                if (src && !/icon|logo|blank|pixel|sprite|flag|gif/i.test(src)) {
                  artwork = resolveAbsUrl(src, baseHost);
                }
              }
            }

            seen.add(detailUrl);
            const obj = makePortalTrackObj({
              portalKey: 'muzmo',
              host: baseHost,
              artist,
              title,
              duration: dur,
              artwork,
              mp3Url,
              detailPageUrl: detailUrl
            });
            if (obj) out.push(obj);
          });
        } catch (e) {}
        return out;
      }

      function extractMuzmoDetailMp3Urls(htmlText, baseHost) {
        const urls = [];
        const seen = new Set();
        const pushUrl = (raw, prio = 5) => {
          const abs = resolveAbsUrl(raw, baseHost);
          if (!abs || seen.has(abs)) return;
          if (!isLikelyAudioUrl(abs) && !/\/(?:get|download|file|mp3)\b/i.test(abs)) return;
          if (/\.(jpg|jpeg|png|webp|gif|svg|css|js|ico|html)(\?|$)/i.test(abs)) return;
          seen.add(abs);
          urls.push({ url: abs, prio });
        };

        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');
          doc.querySelectorAll('a[href], audio[src], source[src], [data-url], [data-mp3], [data-file]').forEach(el => {
            const raw = el.getAttribute('data-url') || el.getAttribute('data-mp3') || el.getAttribute('data-file') || el.getAttribute('src') || el.getAttribute('href') || '';
            if (!raw) return;
            const txt = (el.textContent || '').toLowerCase();
            if (isLikelyAudioUrl(resolveAbsUrl(raw, baseHost)) || txt.includes('скачать оригинал') || txt.includes('скачать mp3')) {
              let prio = 5;
              if (/\.mp3(\?|$)/i.test(raw)) prio += 10;
              if (txt.includes('оригинал') || txt.includes('320')) prio += 6;
              else if (txt.includes('128')) prio += 3;
              if (raw.includes('/get/')) prio += 4;
              pushUrl(raw, prio);
            }
          });
        } catch (e) {}

        // Raw regex sweep for direct MP3 links in Muzmo HTML
        const regexMatches = htmlText.match(/(?:https?:\/\/|\/\/)[^\s"'<>\\]+?(?:\/get\/[^\s"'<>\\]+|\.mp3(?:\?[^\s"'<>\\]*)?)/gi) || [];
        regexMatches.forEach(u => pushUrl(u, 12));

        const relMatches = htmlText.match(/\/get\/(?:music|cuts|new)?[^\s"'<>\\]+/gi) || [];
        relMatches.forEach(u => pushUrl(u, 9));

        urls.sort((a, b) => b.prio - a.prio);
        return urls.map(x => x.url);
      }

      async function searchMuzmoPortal(query, maxItems = 20) {
        const q = String(query || '').trim();
        const tasks = MUZMO_HOSTS.map(async (host) => {
          const url = q
            ? `${host}/search?q=${encodeURIComponent(q)}`
            : `${host}/top`;
          const htmlTxt = await fetchTextViaRelay(url, 3800, 400, txt => !isPortalBotWall(txt) && (txt.includes('info?id=') || txt.includes('.mp3')));
          if (!htmlTxt) return null;
          const items = parseMuzmoSearchHtml(htmlTxt, host);
          return items.length ? items.slice(0, maxItems) : null;
        });
        const res = await firstNonNull(tasks);
        return res || [];
      }

      async function resolveMuzmoDetailPage(detailUrl, host = 'https://muzmo.org') {
        if (!detailUrl) return null;
        const htmlTxt = await fetchTextViaRelay(detailUrl, 5600, 350, txt => !isPortalBotWall(txt));
        if (!htmlTxt) return null;
        const mp3List = extractMuzmoDetailMp3Urls(htmlTxt, host);
        if (!mp3List.length) return null;
        return {
          url: mp3List[0],
          rawUrl: mp3List[0],
          backupUrls: mp3List.slice(1, 5),
          provider: 'muzmo',
          label: 'Muzmo · MP3',
          duration: 0,
          subtitles: []
        };
      }

      // ================= PORTAL 3: MUZOFOND (muzofond.fm) =================
      function parseMuzofondHtml(htmlText, baseHost) {
        const out = [];
        const seen = new Set();
        if (isPortalBotWall(htmlText)) return out;

        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');
          doc.querySelectorAll('li.item, .mainSongs li, .item[data-id]').forEach(el => {
            const playEl = el.querySelector('.play[data-url], [data-url*=".mp3"], [data-url], a.dl[href], a[href*=".mp3"]');
            if (!playEl) return;
            const rawUrl = playEl.getAttribute('data-url') || playEl.getAttribute('href') || '';
            const mp3Url = resolveAbsUrl(rawUrl, baseHost);
            if (!mp3Url || seen.has(mp3Url) || !isLikelyAudioUrl(mp3Url)) return;

            const artEl = el.querySelector('.artist, .desc h3 span:first-child, a[href*="/artist/"]');
            const titEl = el.querySelector('.track, .desc h3 span:last-child, .title');
            const durEl = el.querySelector('.duration, .time');
            let artist = artEl ? artEl.textContent.trim() : '';
            let title = titEl ? titEl.textContent.trim() : '';
            if (!title) {
              const h3 = el.querySelector('h3, .desc');
              if (h3) title = h3.textContent.trim();
            }
            if (artist && title && title.toLowerCase() === artist.toLowerCase()) artist = '';
            if (!title) return;

            seen.add(mp3Url);
            const obj = makePortalTrackObj({
              portalKey: 'muzofond',
              host: baseHost,
              artist,
              title,
              duration: durEl ? durEl.textContent : 0,
              mp3Url
            });
            if (obj) out.push(obj);
          });

          // Fallback: any element with data-url containing .mp3
          if (!out.length) {
            doc.querySelectorAll('[data-url*=".mp3"], a[href*=".mp3"]').forEach(el => {
              const raw = el.getAttribute('data-url') || el.getAttribute('href') || '';
              const mp3Url = resolveAbsUrl(raw, baseHost);
              if (!mp3Url || seen.has(mp3Url)) return;
              const row = el.closest('li, tr, div') || el.parentElement;
              const txt = row ? row.textContent.replace(/\b\d{1,2}:\d{2}\b/g, '').replace(/\s+/g, ' ').trim() : '';
              const durM = row ? (row.textContent || '').match(/\b(\d{1,2}:\d{2})\b/) : null;
              if (!txt || txt.length > 140) return;
              seen.add(mp3Url);
              const obj = makePortalTrackObj({
                portalKey: 'muzofond',
                host: baseHost,
                artist: '',
                title: txt,
                duration: durM ? durM[1] : 0,
                mp3Url
              });
              if (obj) out.push(obj);
            });
          }
        } catch (e) {}
        return out;
      }

      async function searchMuzofondPortal(query, maxItems = 20) {
        const q = String(query || '').trim();
        const tasks = MUZOFOND_HOSTS.map(async (host) => {
          const url = q ? `${host}/search/${encodeURIComponent(q)}` : `${host}/`;
          const htmlTxt = await fetchTextViaRelay(url, 3800, 400, txt => !isPortalBotWall(txt) && (txt.includes('data-url') || txt.includes('.mp3')));
          if (!htmlTxt) return null;
          const items = parseMuzofondHtml(htmlTxt, host);
          return items.length ? items.slice(0, maxItems) : null;
        });
        const res = await firstNonNull(tasks);
        return res || [];
      }

      // ================= PORTAL 4: SEFON (sefon.pro) =================
      function parseSefonHtml(htmlText, baseHost) {
        const out = [];
        const seen = new Set();
        if (isPortalBotWall(htmlText)) return out;

        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');
          doc.querySelectorAll('.mp3, [data-mp3_id], .b_list_mp3s > div').forEach(el => {
            const artEl = el.querySelector('.artist_name, a[href*="/artist/"]');
            const titEl = el.querySelector('.song_name, a[href*="/mp3/"]');
            const durEl = el.querySelector('.value, .duration');
            const dlEl = el.querySelector('a.download[href], a[href*="/api/mp3_download/"], a[href*=".mp3"], [data-url]');
            const detailEl = el.querySelector('a[href*="/mp3/"]');

            const title = titEl ? titEl.textContent.trim() : '';
            const artist = artEl ? artEl.textContent.trim() : '';
            if (!title) return;

            const rawMp3 = dlEl ? (dlEl.getAttribute('data-url') || dlEl.getAttribute('href') || '') : '';
            const mp3Url = isLikelyAudioUrl(resolveAbsUrl(rawMp3, baseHost)) ? resolveAbsUrl(rawMp3, baseHost) : '';
            const detailUrl = detailEl ? resolveAbsUrl(detailEl.getAttribute('href'), baseHost) : '';
            const uniq = mp3Url || detailUrl || `${artist}|${title}`;
            if (!uniq || seen.has(uniq)) return;
            if (!mp3Url && !detailUrl) return;
            seen.add(uniq);

            const obj = makePortalTrackObj({
              portalKey: 'sefon',
              host: baseHost,
              artist,
              title,
              duration: durEl ? durEl.textContent : 0,
              mp3Url,
              detailPageUrl: detailUrl
            });
            if (obj) out.push(obj);
          });
        } catch (e) {}
        return out;
      }

      async function searchSefonPortal(query, maxItems = 18) {
        const q = String(query || '').trim();
        const tasks = SEFON_HOSTS.map(async (host) => {
          const url = q ? `${host}/search/${encodeURIComponent(q)}/` : `${host}/`;
          const htmlTxt = await fetchTextViaRelay(url, 3800, 400, txt => !isPortalBotWall(txt) && (txt.includes('mp3') || txt.includes('artist_name')));
          if (!htmlTxt) return null;
          const items = parseSefonHtml(htmlTxt, host);
          return items.length ? items.slice(0, maxItems) : null;
        });
        const res = await firstNonNull(tasks);
        return res || [];
      }

      // ================= PORTAL 5: LIGHTAUDIO (lightaudio.ru) =================
      function parseLightAudioHtml(htmlText, baseHost) {
        const out = [];
        const seen = new Set();
        if (isPortalBotWall(htmlText)) return out;

        try {
          const doc = new DOMParser().parseFromString(htmlText, 'text/html');
          doc.querySelectorAll('li.item, .item, [data-url], [data-audio]').forEach(el => {
            const rawUrl = el.getAttribute('data-url') || el.getAttribute('data-src')
              || (el.querySelector('[data-url]') && el.querySelector('[data-url]').getAttribute('data-url'))
              || (el.querySelector('a[href*=".mp3"], a[href*="/download/"], a[href*="/get/"]') && el.querySelector('a[href*=".mp3"], a[href*="/download/"], a[href*="/get/"]').getAttribute('href'))
              || '';
            const mp3Url = resolveAbsUrl(rawUrl, baseHost);
            const hasMp3 = isLikelyAudioUrl(mp3Url);

            const rawText = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!rawText || rawText.length < 4 || rawText.length > 160) return;

            const durM = rawText.match(/\b(\d{1,2}:\d{2})\b/);
            const cleanLine = rawText.replace(/\b\d{1,2}:\d{2}\b/g, '').trim();
            let title = cleanLine, artist = '';

            // LightAudio often uses "Title — Artist"
            if (cleanLine.includes(' — ')) {
              const p = cleanLine.split(' — ');
              title = p[0].trim();
              artist = p.slice(1).join(' — ').trim();
            } else if (cleanLine.includes(' - ')) {
              const p = cleanLine.split(' - ');
              artist = p[0].trim();
              title = p.slice(1).join(' - ').trim();
            }

            if (!title || !hasMp3) return;
            if (seen.has(mp3Url)) return;
            seen.add(mp3Url);

            const obj = makePortalTrackObj({
              portalKey: 'lightaudio',
              host: baseHost,
              artist,
              title,
              duration: durM ? durM[1] : 0,
              mp3Url
            });
            if (obj) out.push(obj);
          });
        } catch (e) {}
        return out;
      }

      async function searchLightAudioPortal(query, maxItems = 18) {
        const q = String(query || '').trim();
        const tasks = LIGHTAUDIO_HOSTS.map(async (host) => {
          const url = q ? `${host}/mp3/${encodeURIComponent(q)}` : `${host}/`;
          const htmlTxt = await fetchTextViaRelay(url, 3800, 400, txt => !isPortalBotWall(txt) && (txt.includes('.mp3') || txt.includes('data-url')));
          if (!htmlTxt) return null;
          const items = parseLightAudioHtml(htmlTxt, host);
          return items.length ? items.slice(0, maxItems) : null;
        });
        const res = await firstNonNull(tasks);
        return res || [];
      }

      // ================= GENERIC 2-STEP DETAIL PAGE RESOLVER (Hitmos /song/, Muzmo /info?id=, Sefon /mp3/) =================
      async function resolvePortalDetailPage(track) {
        if (!track || !track.detailPageUrl) return null;
        const host = track.portalHost || (new URL(track.detailPageUrl).origin);

        if (track.portalKey === 'muzmo' || /muzmo/i.test(track.detailPageUrl)) {
          const res = await resolveMuzmoDetailPage(track.detailPageUrl, host);
          if (res && res.url) return { ...res, duration: res.duration || track.duration };
          return null;
        }

        const htmlTxt = await fetchTextViaRelay(track.detailPageUrl, 5800, 350, txt => !isPortalBotWall(txt));
        if (!htmlTxt) return null;

        const parsed = parseHitmosPage(htmlTxt, host);
        if (parsed.audioCandidates.length) {
          const best = parsed.audioCandidates[0];
          const backups = parsed.audioCandidates.slice(1, 4).map(c => c.url);
          const meta = PORTAL_META[track.portalKey] || PORTAL_META.hitmo;
          return {
            url: best.url,
            rawUrl: best.url,
            backupUrls: backups,
            provider: track.portalKey || 'hitmo',
            label: meta.label + ' · MP3',
            duration: best.duration || track.duration,
            subtitles: []
          };
        }

        // Generic MP3 fallback sweep (for Sefon / other detail pages)
        const extraUrls = extractMuzmoDetailMp3Urls(htmlTxt, host);
        if (extraUrls.length) {
          const meta = PORTAL_META[track.portalKey] || PORTAL_META.sefon;
          return {
            url: extraUrls[0],
            rawUrl: extraUrls[0],
            backupUrls: extraUrls.slice(1, 4),
            provider: track.portalKey || 'sefon',
            label: meta.label + ' · MP3',
            duration: track.duration,
            subtitles: []
          };
        }
        return null;
      }

      // ================= UNIFIED MP3 HUB SEARCH (ALL 6 RU MP3 PORTALS IN PARALLEL) =================
      function fusePortalSearchResults(lists, expandedQueries) {
        const byKey = new Map();
        const order = [];

        for (const list of lists) {
          for (const t of (list || [])) {
            if (!t || !t.title) continue;
            const key = buildTrackFusionKey(t.artist, t.title);
            if (!key || key === '|') continue;

            if (!byKey.has(key)) {
              const copy = {
                ...t,
                backupMp3Urls: Array.isArray(t.backupMp3Urls) ? [...t.backupMp3Urls] : []
              };
              if (copy.mp3PartyUrls && copy.mp3PartyUrls.length && !copy.directMp3Url) {
                copy.directMp3Url = copy.mp3PartyUrls[0];
                copy.backupMp3Urls.push(...copy.mp3PartyUrls.slice(1));
                copy.portalKey = 'mp3party';
                copy.portalLabel = 'Mp3Party';
              }
              byKey.set(key, copy);
              order.push(copy);
            } else {
              // Fuse additional portal MP3 URLs as instant backup URLs on the same card!
              const ex = byKey.get(key);
              const incomingMp3 = t.directMp3Url || (t.mp3PartyUrls && t.mp3PartyUrls[0]) || '';
              if (incomingMp3) {
                if (!ex.directMp3Url) {
                  ex.directMp3Url = incomingMp3;
                  if (t.portalKey) {
                    ex.portalKey = t.portalKey;
                    ex.portalLabel = t.portalLabel || (PORTAL_META[t.portalKey] && PORTAL_META[t.portalKey].label) || ex.portalLabel;
                  }
                } else if (incomingMp3 !== ex.directMp3Url && !ex.backupMp3Urls.includes(incomingMp3)) {
                  ex.backupMp3Urls.push(incomingMp3);
                }
              }
              if (Array.isArray(t.backupMp3Urls)) {
                t.backupMp3Urls.forEach(u => {
                  if (u && u !== ex.directMp3Url && !ex.backupMp3Urls.includes(u)) ex.backupMp3Urls.push(u);
                });
              }
              if (Array.isArray(t.mp3PartyUrls)) {
                t.mp3PartyUrls.forEach(u => {
                  if (u && u !== ex.directMp3Url && !ex.backupMp3Urls.includes(u)) ex.backupMp3Urls.push(u);
                });
              }
              if (!ex.tgStreamUrl && t.tgStreamUrl) {
                ex.tgStreamUrl = t.tgStreamUrl;
                ex.tgTrackId = t.tgTrackId || ex.tgTrackId;
                ex.directMp3Url = t.tgStreamUrl;
                ex.portalKey = 'telegram';
                ex.portalLabel = t.portalLabel || 'Telegram';
              }
              if (!ex.mp3PartyId && t.mp3PartyId) {
                ex.mp3PartyId = t.mp3PartyId;
                ex.mp3PartyUrls = t.mp3PartyUrls;
              }
              if (!ex.detailPageUrl && t.detailPageUrl) ex.detailPageUrl = t.detailPageUrl;
              if (!ex.artwork && t.artwork) ex.artwork = t.artwork;
              if ((!ex.duration || ex.duration === 180) && t.duration && t.duration !== 180) ex.duration = t.duration;
            }
          }
        }

        if (expandedQueries && expandedQueries.length) {
          order.sort((a, b) => {
            const sa = scoreRuQueryRelevance(a, expandedQueries) + (a.directMp3Url ? 8 : 0) + Math.min((a.backupMp3Urls || []).length * 2, 6);
            const sb = scoreRuQueryRelevance(b, expandedQueries) + (b.directMp3Url ? 8 : 0) + Math.min((b.backupMp3Urls || []).length * 2, 6);
            return sb - sa;
          });
        } else {
          // On empty query (top chart), prioritize cards that have direct ready-to-play MP3 URLs
          order.sort((a, b) => (b.directMp3Url ? 1 : 0) - (a.directMp3Url ? 1 : 0));
        }

        return order.slice(0, 40);
      }

      const unifiedSearchCache = new Map(); // normalized query -> { ts, origin, correctedHint, sources, tracks }

      async function fetchFastRuChartFallback() {
        const seeds = await withHardTimeout(
          Promise.allSettled([
            searchItunesCountryFast('Miyagi', 'ru', 6),
            searchItunesCountryFast('Pharaoh', 'ru', 6),
            searchItunesCountryFast('Скриптонит', 'ru', 6),
            searchItunesCountryFast('MACAN', 'ru', 5),
            searchItunesCountryFast('onda andar', 'ru', 5)
          ]),
          2200,
          []
        );
        const out = [];
        (seeds || []).forEach(s => {
          if (s.status === 'fulfilled' && Array.isArray(s.value)) out.push(...s.value);
        });
        return dedupCatalogTracks(out);
      }

      // Direct CORS YouTube/YT Music search via Piped + Invidious (works without proxy, returns playable videoId!)
      async function searchPipedInvidiousFast(query, maxItems = 14) {
        const q = String(query || '').trim();
        if (!q) return [];
        const pNodes = getOrderedPipedNodes([]).slice(0, 3);
        const iNodes = getOrderedInvidiousNodes([]).slice(0, 2);

        const pTasks = pNodes.map(async (host) => {
          const data = await fetchJsonTimeout(`${host}/search?q=${encodeURIComponent(q)}&filter=music_songs`, 2600);
          if (!data || data.error || !Array.isArray(data.items) || !data.items.length) {
            if (!data || data.error) markYtNodeDead(host);
            return null;
          }
          activeYtNode = { type: 'piped', url: host };
          const items = [];
          for (const it of data.items) {
            if (!it || it.isShort) continue;
            const vid = extractVideoId(it.url);
            if (!vid) continue;
            const artist = String(it.uploaderName || '').replace(/\s*-\s*Topic$/i, '').trim() || 'YouTube';
            const title = String(it.title || '').trim();
            if (!title) continue;
            items.push({
              id: 'yt_' + vid,
              ytVideoId: vid,
              ytCandidates: null,
              deezerId: '',
              title,
              artist,
              album: 'YouTube Music',
              duration: it.duration || 180,
              artwork: it.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              coverGrad: 'linear-gradient(145deg, #4a1a24 0%, #0b0608 60%, #7d293a 100%)',
              source: 'YT Music',
              catalogOrigin: 'youtube',
              fromCatalog: true,
              resolvedAudio: null,
              lyrics: null
            });
            if (items.length >= maxItems) break;
          }
          return items.length ? items : null;
        });

        const iTasks = iNodes.map(async (host) => {
          const data = await fetchJsonTimeout(`${host}/api/v1/search?q=${encodeURIComponent(q + ' audio')}&type=video&sort_by=relevance`, 2800);
          if (!Array.isArray(data) || !data.length) {
            markYtNodeDead(host);
            return null;
          }
          activeYtNode = { type: 'invidious', url: host };
          const items = [];
          for (const it of data) {
            if (!it || !it.videoId || it.liveNow || (it.lengthSeconds && it.lengthSeconds < 25)) continue;
            const artist = String(it.author || '').replace(/\s*-\s*Topic$/i, '').trim() || 'YouTube';
            const title = String(it.title || '').trim();
            if (!title) continue;
            items.push({
              id: 'yt_' + it.videoId,
              ytVideoId: it.videoId,
              ytCandidates: null,
              deezerId: '',
              title,
              artist,
              album: 'YouTube',
              duration: it.lengthSeconds || 180,
              artwork: `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg`,
              coverGrad: 'linear-gradient(145deg, #4a1a24 0%, #0b0608 60%, #7d293a 100%)',
              source: 'YouTube',
              catalogOrigin: 'youtube',
              fromCatalog: true,
              resolvedAudio: null,
              lyrics: null
            });
            if (items.length >= maxItems) break;
          }
          return items.length ? items : null;
        });

        const res = await withHardTimeout(firstNonNull([...pTasks, ...iTasks]), 3000, null);
        return res || [];
      }

      // Cloudflare Edge Single-Request Aggregator (/api/search?q=...)
      async function searchViaCfWorkerEdge(query) {
        if (!cfProxyUsable) return null;
        const url = `/api/search?q=${encodeURIComponent(query || '')}`;
        const data = await fetchJsonTimeout(url, 5200);
        if (!data || !data.ok || !Array.isArray(data.tracks)) return null;
        cfProxyVerified = true;
        const mapped = data.tracks.map(t => {
          const meta = (t.portalKey && PORTAL_META[t.portalKey]) ? PORTAL_META[t.portalKey] : null;
          return {
            id: t.id || ('edge_' + Math.random().toString(36).slice(2, 9)),
            deezerId: t.deezerId || '',
            mp3PartyId: t.mp3PartyId || '',
            mp3PartyUrls: Array.isArray(t.mp3PartyUrls) ? t.mp3PartyUrls : null,
            directMp3Url: t.directMp3Url || '',
            backupMp3Urls: Array.isArray(t.backupMp3Urls) ? t.backupMp3Urls : [],
            detailPageUrl: t.detailPageUrl || '',
            ytVideoId: t.ytVideoId || '',
            ytCandidates: t.ytVideoId ? [{ videoId: t.ytVideoId, artist: t.artist || '', title: t.title || '', duration: t.duration || 180, host: '', backend: 'ytdirect' }] : null,
            portalKey: t.portalKey || '',
            portalHost: t.portalHost || '',
            portalLabel: t.portalLabel || (meta ? meta.label : ''),
            title: t.title || 'Без названия',
            artist: t.artist || 'Исполнитель',
            album: t.album || '',
            duration: t.duration || 180,
            artwork: t.artwork || '',
            coverGrad: (meta && meta.grad) || t.coverGrad || 'linear-gradient(145deg, #272d3d 0%, #090b10 60%, #45516b 100%)',
            previewUrl: t.previewUrl || '',
            previewFetchedAt: Date.now(),
            source: t.source || (meta ? meta.label : 'Каталог'),
            catalogOrigin: t.catalogOrigin || t.portalKey || 'edge',
            requiresProxy: !!t.requiresProxy,
            scTrackId: t.scTrackId || '',
            scTranscodings: t.scTranscodings || null,
            scTrackAuth: t.scTrackAuth || '',
            fromSoundCloud: !!t.fromSoundCloud,
            fromCatalog: !t.fromSoundCloud,
            resolvedAudio: null,
            lyrics: null
          };
        });
        return { tracks: mapped, sources: Array.isArray(data.sources) ? data.sources : [] };
      }

      // Smart fusion across ALL platforms (Edge MP3 portals + iTunes + Deezer + YouTube/Piped + SoundCloud)
      function fuseUnifiedTracks(lists, expandedQueries) {
        const byKey = new Map();
        const order = [];

        for (const list of lists) {
          for (const t of (list || [])) {
            if (!t || !t.title) continue;
            const key = buildTrackFusionKey(t.artist, t.title);
            if (!key || key === '|') continue;

            if (!byKey.has(key)) {
              const copy = {
                ...t,
                backupMp3Urls: Array.isArray(t.backupMp3Urls) ? [...t.backupMp3Urls] : []
              };
              if (copy.mp3PartyUrls && copy.mp3PartyUrls.length && !copy.directMp3Url) {
                copy.directMp3Url = copy.mp3PartyUrls[0];
                copy.backupMp3Urls.push(...copy.mp3PartyUrls.slice(1));
                copy.portalKey = 'mp3party';
                copy.portalLabel = 'Mp3Party';
              }
              byKey.set(key, copy);
              order.push(copy);
            } else {
              const ex = byKey.get(key);
              const incomingMp3 = t.directMp3Url || (t.mp3PartyUrls && t.mp3PartyUrls[0]) || '';
              if (incomingMp3) {
                if (!ex.directMp3Url) {
                  ex.directMp3Url = incomingMp3;
                  if (t.portalKey) {
                    ex.portalKey = t.portalKey;
                    ex.portalLabel = t.portalLabel || (PORTAL_META[t.portalKey] && PORTAL_META[t.portalKey].label) || ex.portalLabel;
                  }
                } else if (incomingMp3 !== ex.directMp3Url && !ex.backupMp3Urls.includes(incomingMp3)) {
                  ex.backupMp3Urls.push(incomingMp3);
                }
              }
              if (Array.isArray(t.backupMp3Urls)) {
                t.backupMp3Urls.forEach(u => {
                  if (u && u !== ex.directMp3Url && !ex.backupMp3Urls.includes(u)) ex.backupMp3Urls.push(u);
                });
              }
              if (Array.isArray(t.mp3PartyUrls)) {
                t.mp3PartyUrls.forEach(u => {
                  if (u && u !== ex.directMp3Url && !ex.backupMp3Urls.includes(u)) ex.backupMp3Urls.push(u);
                });
              }
              if (!ex.mp3PartyId && t.mp3PartyId) {
                ex.mp3PartyId = t.mp3PartyId;
                ex.mp3PartyUrls = t.mp3PartyUrls;
              }
              if (!ex.detailPageUrl && t.detailPageUrl) ex.detailPageUrl = t.detailPageUrl;
              if (!ex.ytVideoId && t.ytVideoId) {
                ex.ytVideoId = t.ytVideoId;
                ex.ytCandidates = t.ytCandidates || ex.ytCandidates;
              }
              if (!ex.deezerId && t.deezerId) ex.deezerId = t.deezerId;
              if (!ex.previewUrl && t.previewUrl) ex.previewUrl = t.previewUrl;
              // Prefer official 500x500 HD artwork over YouTube thumbnail or empty artwork
              if ((!ex.artwork || /ytimg\.com/i.test(ex.artwork)) && t.artwork && !/ytimg\.com/i.test(t.artwork)) {
                ex.artwork = t.artwork;
              } else if (!ex.artwork && t.artwork) {
                ex.artwork = t.artwork;
              }
              if ((!ex.duration || ex.duration === 180) && t.duration && t.duration !== 180) ex.duration = t.duration;
            }
          }
        }

        if (expandedQueries && expandedQueries.length) {
          order.sort((a, b) => {
            const sa = scoreRuQueryRelevance(a, expandedQueries)
              + (a.directMp3Url ? 10 : 0)
              + (a.ytVideoId ? 4 : 0)
              + (a.previewUrl ? 2 : 0)
              + Math.min((a.backupMp3Urls || []).length * 2, 6);
            const sb = scoreRuQueryRelevance(b, expandedQueries)
              + (b.directMp3Url ? 10 : 0)
              + (b.ytVideoId ? 4 : 0)
              + (b.previewUrl ? 2 : 0)
              + Math.min((b.backupMp3Urls || []).length * 2, 6);
            return sb - sa;
          });
        } else {
          order.sort((a, b) => (b.directMp3Url ? 2 : 0) + (b.artwork ? 1 : 0) - ((a.directMp3Url ? 2 : 0) + (a.artwork ? 1 : 0)));
        }

        return order.slice(0, 45);
      }

      // Background silent MP3 pre-resolver: attaches direct MP3 URLs BEFORE the user even taps!
      const prefetchInFlight = new Set();

      async function prefetchSingleTrackMp3(track) {
        if (!track || track.directMp3Url || track.resolvedAudio || track.audioUrl || track.synth) return;
        if (prefetchInFlight.has(track.id)) return;
        prefetchInFlight.add(track.id);
        try {
          let res = null;
          if (cfProxyUsable) {
            res = await withHardTimeout(resolveViaCfWorkerEdge(track), 2400, null);
          } else {
            res = await withHardTimeout(
              firstNonNull([resolveFromMp3Party(track), resolveFromHitmos(track), resolveFromMuzofond(track)]),
              2800,
              null
            );
          }
          if (res && res.url && !res.isYtIframe) {
            track.directMp3Url = res.rawUrl || res.url;
            if (Array.isArray(res.backupUrls) && res.backupUrls.length) {
              track.backupMp3Urls = res.backupUrls;
            }
            if (res.provider) {
              track.portalKey = res.provider;
              track.portalLabel = (PORTAL_META[res.provider] && PORTAL_META[res.provider].label) || res.label || 'MP3';
            }
            if (res.duration > 30 && (!track.duration || track.duration === 180)) {
              track.duration = res.duration;
            }
          }
        } catch (e) {} finally {
          prefetchInFlight.delete(track.id);
        }
      }

      function prefetchTopTracks(tracks, limit = 3) {
        if (!Array.isArray(tracks) || !tracks.length) return;
        const targets = tracks.filter(t => t && t.fromCatalog && !t.directMp3Url && !t.resolvedAudio).slice(0, limit);
        targets.forEach((t, idx) => {
          setTimeout(() => prefetchSingleTrackMp3(t), 120 + idx * 180);
        });
      }

      function prefetchNextInQueue() {
        const q = getQueue();
        if (!q || q.length < 2 || !state.currentTrack) return;
        const idx = q.findIndex(t => t.id === state.currentTrack.id);
        if (idx === -1) return;
        const nextT = q[(idx + 1) % q.length];
        if (nextT && nextT.id !== state.currentTrack.id) {
          setTimeout(() => prefetchSingleTrackMp3(nextT), 600);
        }
      }

            // Direct Open-CORS Full-Track API: Audius (works in browser with ZERO proxy, ZERO VPN, full-length MP3 streams!)
      async function searchAudiusOpen(query, limit = 14) {
        const q = String(query || '').trim();
        const url = q
          ? `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=APATHY`
          : `https://api.audius.co/v1/tracks/trending?app_name=APATHY`;
        const data = await fetchJsonTimeout(url, 2600);
        if (!data || !Array.isArray(data.data)) return [];
        const out = [];
        for (const it of data.data) {
          if (!it || !it.id || !it.title || (it.duration && it.duration < 35)) continue;
          const art = (it.artwork && (it.artwork['480x480'] || it.artwork['1000x1000'] || it.artwork['150x150'])) || '';
          const streamUrl = `https://api.audius.co/v1/tracks/${encodeURIComponent(it.id)}/stream?app_name=APATHY`;
          out.push({
            id: 'aud_' + it.id,
            deezerId: '',
            directMp3Url: streamUrl,
            backupMp3Urls: [],
            portalKey: 'audius',
            portalLabel: 'Audius',
            title: String(it.title).trim(),
            artist: (it.user && (it.user.name || it.user.handle)) || 'Audius',
            album: it.genre || 'Audius',
            duration: it.duration || 180,
            artwork: art,
            coverGrad: 'linear-gradient(145deg, #3c1c5e 0%, #0a0612 60%, #6f33ad 100%)',
            source: 'Audius',
            catalogOrigin: 'audius',
            fromCatalog: true,
            resolvedAudio: null,
            lyrics: null
          });
          if (out.length >= limit) break;
        }
        return out;
      }

      async function resolveFromAudius(track) {
        const q = `${track.artist || ''} ${track.title || ''}`.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!q) return null;
        const items = await searchAudiusOpen(q, 8);
        if (!items.length) return null;
        items.sort((a, b) =>
          scoreCandidateMatch(b.artist, b.title, b.duration, track) -
          scoreCandidateMatch(a.artist, a.title, a.duration, track)
        );
        const best = items[0];
        if (scoreCandidateMatch(best.artist, best.title, best.duration, track) < 4) return null;
        return {
          url: best.directMp3Url,
          rawUrl: best.directMp3Url,
          backupUrls: [],
          provider: 'audius',
          label: 'Audius · Полный',
          duration: best.duration || track.duration || 180,
          subtitles: []
        };
      }

      // MASTER RU NO-VPN UNIFIED PROGRESSIVE SEARCH:
      // 1) Instant 0ms stale-while-revalidate top chart from localStorage
      // 2) Parallel race: Edge /api/search + iTunes RU/US JSONP (~150ms, works in RU without VPN!) + RU MP3 Portals (Mp3Party, Hitmo, Muzofond)
      // 3) ZERO YouTube / SoundCloud blocking on RU networks!
      async function searchUnifiedAllPlatforms(query, onBatch = null) {
        const raw = String(query || '').trim();
        const cacheKey = raw.toLowerCase();
        const cached = unifiedSearchCache.get(cacheKey);
        if (cached && (Date.now() - cached.ts < 8 * 60 * 1000) && cached.tracks.length) {
          if (onBatch) onBatch({ ...cached, stillLoading: false });
          return cached;
        }

        // Instant 0ms startup: render cached RU chart immediately while live chart refreshes in background!
        if (!raw && onBatch) {
          const savedChart = store.get('lastChartV22', null);
          if (savedChart && Array.isArray(savedChart.tracks) && savedChart.tracks.length) {
            onBatch({
              origin: savedChart.origin || 'Топ РФ',
              correctedHint: '',
              sources: savedChart.sources || ['РФ Топ'],
              tracks: savedChart.tracks,
              stillLoading: true
            });
          }
        }

        const expanded = raw ? expandRuQueries(raw) : [];
        const q1 = expanded[0] || '';
        const q2 = expanded[1] || '';
        const hint = (q2 && q2.toLowerCase() !== q1.toLowerCase()) ? q2 : '';

        const bucketLists = new Map();
        const activeSources = [];
        const addSourceTag = (name) => {
          if (name && !activeSources.includes(name)) activeSources.push(name);
        };

        const publish = (stillLoading = false) => {
          // Put direct-MP3 RU portals first so instant full MP3 links fuse onto HD iTunes cards!
          const orderedKeys = ['tgbot', 'edge', 'hitmo', 'mp3party', 'muzofond', 'lightaudio', 'sefon', 'audius', 'piped', 'itu_ru', 'itu_us', 'itu_alt', 'deezer'];
          const lists = orderedKeys.map(k => bucketLists.get(k) || []);
          const fused = fuseUnifiedTracks(lists, expanded);
          const origin = activeSources.length ? activeSources.slice(0, 4).join(' · ') : 'Быстрый поиск РФ';
          const payload = { origin, correctedHint: hint, sources: [...activeSources], tracks: fused, stillLoading };
          if (onBatch && fused.length) onBatch(payload);
          return payload;
        };

        const runBucket = (key, label, promise, capMs = 2800) => {
          return withHardTimeout(promise, capMs, null).then(res => {
            if (!res) return;
            if ((key === 'tgbot' || key === 'edge') && res.tracks && res.tracks.length) {
              bucketLists.set(key, res.tracks);
              (res.sources || []).forEach(addSourceTag);
              if (!res.sources || !res.sources.length) addSourceTag(key === 'tgbot' ? 'Telegram Бот' : 'Edge MP3');
              publish(true);
            } else if (Array.isArray(res) && res.length) {
              bucketLists.set(key, res);
              addSourceTag(label);
              publish(true);
            }
          }).catch(() => {});
        };

        const tasks = [];

        // 0) Telegram Bot Server (saved Telegram tracks + live yt-dlp bot search — full-length tracks!)
        if (tgBotAvailable) {
          tasks.push(runBucket('tgbot', 'Telegram Бот', fetchTgBotTracks(q1), q1 ? 6600 : 3400));
        }

        // 1) Cloudflare Edge Single-Request Aggregator (Hitmo + Hitmotop + Muzofond + LightAudio + Mp3Party + Sefon + Muzmo + SoundCloud + iTunes)
        if (cfProxyUsable) {
          tasks.push(runBucket('edge', 'Edge', searchViaCfWorkerEdge(q1), 5400));
        }

        if (raw) {
          // 2) Guaranteed No-VPN Direct Browser JSONP to Apple iTunes RU & US (~150-250ms in Russia!)
          tasks.push(runBucket('itu_ru', 'iTunes РФ', searchItunesCountryFast(q1, 'ru', 22), 2400));
          tasks.push(runBucket('itu_us', 'iTunes',    searchItunesCountryFast(q1, 'us', 14), 2400));
          if (q2) {
            tasks.push(runBucket('itu_alt', 'iTunes РФ', searchItunesCountryFast(q2, 'ru', 14), 2400));
          }
          // 3) Direct RU MP3 Portals in parallel when Edge Worker isn't verified (attaches instant playable MP3s!)
          // Open direct-CORS full-track platforms (zero proxy needed!)
          tasks.push(runBucket('audius', 'Audius', searchAudiusOpen(q1, 10), 2800));
          tasks.push(runBucket('piped',  'YT Audio', searchPipedInvidiousFast(q1, 10), 3000));

          if (!cfProxyVerified) {
            tasks.push(runBucket('hitmo',      'Hitmo',      searchHitmoPortal(q1, 16), 4400));
            tasks.push(runBucket('muzofond',   'Muzofond',   searchMuzofondPortal(q1, 14), 4400));
            tasks.push(runBucket('mp3party',   'Mp3Party',   searchMp3Party(q1, 16), 4400));
            tasks.push(runBucket('lightaudio', 'LightAudio', searchLightAudioPortal(q1, 14), 4400));
            tasks.push(runBucket('sefon',      'Sefon',      searchSefonPortal(q1, 12), 4400));
          }
        } else {
          // Empty query -> Live Russian Top Chart (Apple RU + Mp3Party New Hits + Hitmo Top)
          tasks.push(runBucket('itu_ru', 'Топ РФ', fetchFastRuChartFallback(), 2600));
          if (!cfProxyVerified) {
            tasks.push(runBucket('mp3party', 'Mp3Party', searchMp3Party('', 16), 2800));
            tasks.push(runBucket('hitmo',    'Hitmo',    searchHitmoPortal('', 14), 2800));
          }
        }

        // Strict 3.1s total cap — search feels snappy and NEVER hangs!
        await withHardTimeout(Promise.allSettled(tasks), tgBotAvailable ? 6600 : 5200, null);
        const finalRes = publish(false);

        if (finalRes.tracks.length) {
          unifiedSearchCache.set(cacheKey, { ...finalRes, ts: Date.now() });
          if (unifiedSearchCache.size > 50) {
            const firstKey = unifiedSearchCache.keys().next().value;
            unifiedSearchCache.delete(firstKey);
          }
          if (!raw) {
            store.set('lastChartV22', {
              origin: finalRes.origin,
              sources: finalRes.sources,
              tracks: finalRes.tracks.slice(0, 20).map(t => ({
                id: t.id, title: t.title, artist: t.artist, album: t.album, duration: t.duration,
                artwork: t.artwork, coverGrad: t.coverGrad, previewUrl: t.previewUrl,
                directMp3Url: t.directMp3Url || '', backupMp3Urls: (t.backupMp3Urls || []).slice(0, 3),
                mp3PartyId: t.mp3PartyId || '', mp3PartyUrls: t.mp3PartyUrls || null,
                portalKey: t.portalKey || '', portalLabel: t.portalLabel || '',
                source: t.source || '', catalogOrigin: t.catalogOrigin || 'itunes', fromCatalog: true
              }))
            });
          }
          // Pre-warm direct MP3 URLs for top 3 tracks so tapping plays instantaneously!
          prefetchTopTracks(finalRes.tracks, 4);
        }
        return finalRes;
      }

      // Single-call Cloudflare Edge Audio Resolver (/api/resolve?artist=...&title=...)
      async function resolveViaCfWorkerEdge(track) {
        if (!cfProxyUsable || !track) return null;
        const params = new URLSearchParams({
          artist: track.artist || '',
          title: track.title || '',
          dur: String(track.duration || 0)
        });
        if (track.detailPageUrl) params.set('detail', track.detailPageUrl);
        if (track.scTrackId) params.set('scId', track.scTrackId);

        const url = `/api/resolve?${params.toString()}`;
        const data = await fetchJsonTimeout(url, 6200);
        if (!data || !data.ok) return null;
        if (data.mp3Url) {
          return {
            url: data.mp3Url,
            rawUrl: data.mp3Url,
            backupUrls: Array.isArray(data.backupUrls) ? data.backupUrls : [],
            requiresProxy: !!data.requiresProxy,
            provider: data.provider || 'hitmo',
            label: data.label || 'MP3 · Полный',
            duration: data.duration || track.duration || 180,
            subtitles: []
          };
        }
        if (data.proxiedStreamUrl) {
          const finalUrl = data.proxiedStreamUrl;
          return {
            url: finalUrl,
            rawUrl: finalUrl,
            backupUrls: Array.isArray(data.backupUrls) ? data.backupUrls : [],
            videoId: data.videoId || track.ytVideoId || '',
            altVideoIds: Array.isArray(data.altVideoIds) ? data.altVideoIds : [],
            requiresProxy: false,
            provider: data.provider || 'edge_yt',
            label: data.label || 'YouTube · Аудио',
            duration: data.duration || track.duration || 180,
            subtitles: []
          };
        }
        if (data.videoId) {
          track.ytVideoId = data.videoId;
          const alts = Array.isArray(data.altVideoIds) ? data.altVideoIds : [];
          return {
            url: 'ytiframe://' + data.videoId,
            isYtIframe: true,
            videoId: data.videoId,
            altVideoIds: alts,
            provider: 'ytiframe',
            label: 'YouTube · Аудио',
            duration: data.duration || track.duration || 180,
            subtitles: []
          };
        }
        return null;
      }

            // ================= RESOLVERS USED BY MASTER AUDIO CASCADE =================
      function buildHitmosQueries(track) {
        const cleanFull = `${track.artist || ''} ${track.title || ''}`
          .replace(/\(.*?\)|\[.*?\]/g, ' ')
          .replace(/\b(feat\.?|ft\.?|при уч\.?|explicit|remastered)\b/gi, ' ')
          .replace(/[—–|/&]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const primaryArtist = String(track.artist || '')
          .split(/,|&|\sx\s|\s×\s|feat\.|ft\./i)[0]
          .replace(/\(.*?\)|\[.*?\]/g, ' ')
          .trim();

        const cleanTitle = String(track.title || '')
          .replace(/\(.*?\)|\[.*?\]/g, ' ')
          .replace(/\s*(feat\.?|ft\.?|при уч\.?).*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();

        const shortCombo = `${primaryArtist} ${cleanTitle}`.trim();
        const queries = [];
        if (cleanFull) queries.push(cleanFull);
        if (shortCombo && shortCombo.toLowerCase() !== cleanFull.toLowerCase()) queries.push(shortCombo);
        if (cleanTitle.length >= 4 && !queries.some(q => q.toLowerCase() === cleanTitle.toLowerCase())) queries.push(cleanTitle);
        return queries.slice(0, 2);
      }

      async function searchSingleHitmosHost(host, query, track) {
        const searchUrl = `${host}/search?q=${encodeURIComponent(query)}`;
        const isFm = /hitmos\.fm/i.test(host);

        const htmlTxt = await fetchTextViaRelay(searchUrl, 5500, 400, (txt) => {
          if (isPortalBotWall(txt)) return false;
          return txt.includes('.mp3') || txt.includes('/get/music/') || txt.includes('/song/') || txt.includes('data-musmeta') || txt.includes('__next_f');
        });
        if (!htmlTxt) return null;

        const parsed = parseHitmosPage(htmlTxt, host);

        if (parsed.audioCandidates.length) {
          parsed.audioCandidates.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          const best = parsed.audioCandidates[0];
          const bestScore = scoreCandidateMatch(best.artist, best.title, best.duration, track);
          if ((best.title || best.artist) && bestScore < 2) return null;

          const backups = parsed.audioCandidates.slice(1, 4).map(c => c.url);
          return {
            url: best.url,
            rawUrl: best.url,
            backupUrls: backups,
            provider: 'hitmo',
            label: isFm ? 'Hitmos.fm · MP3' : 'Hitmo · MP3',
            duration: best.duration || track.duration,
            subtitles: []
          };
        }

        if (parsed.songPages.length) {
          parsed.songPages.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          const topSongs = parsed.songPages.slice(0, 2).filter(s => {
            const sc = scoreCandidateMatch(s.artist, s.title, s.duration, track);
            return (!s.title && !s.artist) || sc >= 2;
          });
          if (!topSongs.length) return null;

          const songTasks = topSongs.map(async (songItem) => {
            const songHtml = await fetchTextViaRelay(songItem.songUrl, 5400, 400, (txt) => {
              if (isPortalBotWall(txt)) return false;
              return txt.includes('.mp3') || txt.includes('/get/music/') || txt.includes('__next_f');
            });
            if (!songHtml) return null;
            const songParsed = parseHitmosPage(songHtml, host);
            if (!songParsed.audioCandidates.length) return null;
            const bestAudio = songParsed.audioCandidates[0];
            return {
              url: bestAudio.url,
              rawUrl: bestAudio.url,
              backupUrls: songParsed.audioCandidates.slice(1, 3).map(c => c.url),
              provider: 'hitmo',
              label: isFm ? 'Hitmos.fm · MP3' : 'Hitmo · MP3',
              duration: bestAudio.duration || songItem.duration || track.duration,
              subtitles: []
            };
          });
          const resolvedSong = await firstNonNull(songTasks);
          if (resolvedSong) return resolvedSong;
        }
        return null;
      }

      async function resolveFromHitmos(track) {
        const queries = buildHitmosQueries(track);
        const allHosts = [...HITMO_CLASSIC_HOSTS, ...HITMOS_NEXT_HOSTS];
        for (const q of queries) {
          const res = await firstNonNull(allHosts.map(host => searchSingleHitmosHost(host, q, track)));
          if (res && res.url) return res;
        }
        return null;
      }

      async function resolveFromMuzmo(track) {
        if (track.detailPageUrl && /muzmo/i.test(track.detailPageUrl)) {
          const direct = await resolveMuzmoDetailPage(track.detailPageUrl, track.portalHost || 'https://muzmo.org');
          if (direct && direct.url) return direct;
        }
        const queries = buildHitmosQueries(track);
        for (const q of queries) {
          const items = await searchMuzmoPortal(q, 8);
          if (!items.length) continue;
          items.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          const best = items[0];
          if (scoreCandidateMatch(best.artist, best.title, best.duration, track) < 2) continue;
          if (best.directMp3Url) {
            return {
              url: best.directMp3Url,
              rawUrl: best.directMp3Url,
              backupUrls: best.backupMp3Urls || [],
              provider: 'muzmo',
              label: 'Muzmo · MP3',
              duration: best.duration || track.duration,
              subtitles: []
            };
          }
          if (best.detailPageUrl) {
            const detailRes = await resolveMuzmoDetailPage(best.detailPageUrl, best.portalHost || 'https://muzmo.org');
            if (detailRes && detailRes.url) return { ...detailRes, duration: detailRes.duration || best.duration || track.duration };
          }
        }
        return null;
      }

      async function resolveFromMuzofond(track) {
        const queries = buildHitmosQueries(track);
        for (const q of queries) {
          const items = await searchMuzofondPortal(q, 10);
          if (!items.length) continue;
          items.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          const best = items[0];
          if (scoreCandidateMatch(best.artist, best.title, best.duration, track) < 2) continue;
          if (best.directMp3Url) {
            return {
              url: best.directMp3Url,
              rawUrl: best.directMp3Url,
              backupUrls: items.slice(1, 3).map(x => x.directMp3Url).filter(Boolean),
              provider: 'muzofond',
              label: 'Muzofond · MP3',
              duration: best.duration || track.duration,
              subtitles: []
            };
          }
        }
        return null;
      }

      async function resolveFromSefonOrLightAudio(track) {
        const q = buildHitmosQueries(track)[0];
        if (!q) return null;
        return await firstNonNull([
          (async () => {
            const items = await searchLightAudioPortal(q, 8);
            if (!items.length) return null;
            items.sort((a, b) => scoreCandidateMatch(b.artist, b.title, b.duration, track) - scoreCandidateMatch(a.artist, a.title, a.duration, track));
            const best = items[0];
            if (!best.directMp3Url || scoreCandidateMatch(best.artist, best.title, best.duration, track) < 2) return null;
            return { url: best.directMp3Url, rawUrl: best.directMp3Url, backupUrls: [], provider: 'lightaudio', label: 'LightAudio · MP3', duration: best.duration || track.duration, subtitles: [] };
          })(),
          (async () => {
            const items = await searchSefonPortal(q, 8);
            if (!items.length) return null;
            items.sort((a, b) => scoreCandidateMatch(b.artist, b.title, b.duration, track) - scoreCandidateMatch(a.artist, a.title, a.duration, track));
            const best = items[0];
            if (scoreCandidateMatch(best.artist, best.title, best.duration, track) < 2) return null;
            if (best.directMp3Url) return { url: best.directMp3Url, rawUrl: best.directMp3Url, backupUrls: [], provider: 'sefon', label: 'Sefon · MP3', duration: best.duration || track.duration, subtitles: [] };
            if (best.detailPageUrl) return await resolvePortalDetailPage(best);
            return null;
          })()
        ]);
      }

      // Parallel race across ALL Russian MP3 portals: Hitmo + Muzmo + Muzofond + Mp3Party + Sefon + LightAudio
      async function resolveFromAllMp3Portals(track, skipPortal = '') {
        const racers = [];
        if (skipPortal !== 'hitmo') racers.push(resolveFromHitmos(track));
        if (skipPortal !== 'muzofond') racers.push(resolveFromMuzofond(track));
        if (skipPortal !== 'mp3party') racers.push(resolveFromMp3Party(track));
        if (skipPortal !== 'muzmo') racers.push(resolveFromMuzmo(track));
        if (skipPortal !== 'sefon' && skipPortal !== 'lightaudio') racers.push(resolveFromSefonOrLightAudio(track));
        return await firstNonNull(racers);
      }

      // Non-blocking HD cover hydration for MP3 portal tracks without artwork
      async function hydrateTrackCover(track) {
        if (!track || track.artwork || track._coverHydrated) return;
        track._coverHydrated = true;
        try {
          const found = await searchItunesRuDirect(`${track.artist} ${track.title}`, 3);
          if (found.length && found[0].artwork) {
            track.artwork = found[0].artwork;
            if (state.currentTrack && state.currentTrack.id === track.id) {
              updatePlayerUI();
              updateMediaSession(track);
            }
            renderSearchResultsList();
          }
        } catch (e) {}
      }

      // =========================================================================
      // AUDIO ENGINE B: FIXED PIPED API + INVIDIOUS + DIRECT YT + YT IFRAME AUDIO
      // =========================================================================
      // Active community Piped API instances (dead official kavin.rocks & broken mirrors removed)
      const DEFAULT_PIPED_NODES = [
        'https://api.piped.private.coffee',
        'https://pipedapi.r4fo.com',
        'https://pipedapi.adminforge.de',
        'https://pipedapi.darkness.services',
        'https://pipedapi.leptons.xyz',
        'https://piped-api.lunar.icu',
        'https://pipedapi.ngn.tf',
        'https://pipedapi.ducks.party',
        'https://pipedapi.drgns.space',
        'https://pipedapi.smnz.de',
        'https://api.piped.yt',
        'https://pipedapi.astartes.nl',
        'https://pipedapi.frontendfriendly.xyz',
        'https://piapi.ggtyler.dev'
      ];

      const DEFAULT_INVIDIOUS_NODES = [
        'https://inv.nadeko.net',
        'https://invidious.nerdvpn.de',
        'https://inv.thepixora.com',
        'https://invidious.f5.si',
        'https://invidious.privacyredirect.com',
        'https://invidious.tiekoetter.com',
        'https://invidious.perennialte.ch',
        'https://yewtu.be'
      ];

      const DEAD_HOST_BLOCKLIST = new Set([
        'https://pipedapi.kavin.rocks',
        'https://pipedapi-libre.kavin.rocks',
        'https://piped-api.privacy.com.de',
        'https://pipedapi.nosebs.ru',
        'https://pipedapi.syncpundit.io',
        'https://pipedapi.tokhmi.xyz',
        'https://pipedapi.moomoo.me'
      ]);

      let pipedPool = [...DEFAULT_PIPED_NODES];
      let invidiousPool = [...DEFAULT_INVIDIOUS_NODES];
      let ytPoolsDiscovered = false;
      let activeYtNode = null;
      const ytDeadNodes = new Map(); // host -> timestamp until which it's skipped (10 min)

      function cleanNodeUrl(u) {
        return String(u || '').trim().replace(/\/+$/, '');
      }

      function markYtNodeDead(host) {
        const h = cleanNodeUrl(host);
        if (h) ytDeadNodes.set(h, Date.now() + 10 * 60 * 1000);
        if (activeYtNode && activeYtNode.url === h) activeYtNode = null;
      }

      function isYtNodeAlive(host) {
        const h = cleanNodeUrl(host);
        if (!h || DEAD_HOST_BLOCKLIST.has(h)) return false;
        const until = ytDeadNodes.get(h);
        if (until && Date.now() < until) return false;
        if (until && Date.now() >= until) ytDeadNodes.delete(h);
        return true;
      }

      function parsePipedMarkdownInstances(mdText) {
        const found = [];
        if (!mdText) return found;
        const re = /https:\/\/[a-z0-9.-]*(?:piped|watchapi|piapi|pa\.)[a-z0-9.-]*/gi;
        let m;
        while ((m = re.exec(mdText)) !== null) {
          const u = cleanNodeUrl(m[0]);
          if (u && !DEAD_HOST_BLOCKLIST.has(u) && /api|pa\.|watchapi/i.test(u) && !found.includes(u)) {
            found.push(u);
          }
        }
        return found;
      }

      // Non-blocking background pool discovery (never stalls track playback!)
      function discoverYtPoolsBackground() {
        if (ytPoolsDiscovered) return;
        ytPoolsDiscovered = true;

        // 1) Official Piped GitHub Docs markdown list (fast, never 502)
        fetchTextTimeout('https://raw.githubusercontent.com/TeamPiped/Piped-Documentation/main/content/docs/public-instances/index.md', 3200)
          .then(md => {
            if (!md) return fetchTextTimeout('https://raw.githubusercontent.com/wiki/TeamPiped/Piped/Instances.md', 3200);
            return md;
          })
          .then(md => {
            const dyn = parsePipedMarkdownInstances(md);
            if (dyn.length) {
              pipedPool = Array.from(new Set([...DEFAULT_PIPED_NODES, ...dyn])).filter(u => !DEAD_HOST_BLOCKLIST.has(u)).slice(0, 20);
            }
          }).catch(() => {});

        // 2) Official Invidious healthy API instances
        fetchJsonTimeout('https://api.invidious.io/instances.json?sort_by=health', 3200)
          .then(iList => {
            if (!Array.isArray(iList)) return;
            const dynI = iList
              .filter(entry => Array.isArray(entry) && entry[1] && entry[1].api === true && entry[1].type === 'https' && entry[1].uri)
              .map(entry => cleanNodeUrl(entry[1].uri));
            if (dynI.length) {
              invidiousPool = Array.from(new Set([...dynI, ...DEFAULT_INVIDIOUS_NODES])).slice(0, 14);
            }
          }).catch(() => {});
      }

      function getOrderedPipedNodes(skipHosts = []) {
        const list = [];
        if (activeYtNode && activeYtNode.type === 'piped' && isYtNodeAlive(activeYtNode.url)) list.push(activeYtNode.url);
        const alive = Array.from(new Set([...list, ...pipedPool])).filter(h => isYtNodeAlive(h) && !skipHosts.includes(h));
        // If all nodes were temporarily blacklisted, allow a clean retry cycle
        if (!alive.length) {
          ytDeadNodes.clear();
          return pipedPool.filter(h => !DEAD_HOST_BLOCKLIST.has(h) && !skipHosts.includes(h));
        }
        return alive;
      }

      function getOrderedInvidiousNodes(skipHosts = []) {
        const list = [];
        if (activeYtNode && activeYtNode.type === 'invidious' && isYtNodeAlive(activeYtNode.url)) list.push(activeYtNode.url);
        return Array.from(new Set([...list, ...invidiousPool])).filter(h => isYtNodeAlive(h) && !skipHosts.includes(h));
      }

      function extractVideoId(urlOrId) {
        if (!urlOrId) return '';
        if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
        const m = String(urlOrId).match(/[?&]v=([A-Za-z0-9_-]{11})/) || String(urlOrId).match(/\/([A-Za-z0-9_-]{11})(?:$|\?)/);
        return m ? m[1] : '';
      }

      function isIosOrSafari() {
        const ua = navigator.userAgent || '';
        return /iP(hone|ad|od)|Safari/i.test(ua) && !/Chrome|Chromium|Android/i.test(ua);
      }

      async function resolveYtStreamFromPiped(videoId, host) {
        const data = await fetchJsonTimeout(`${host}/streams/${videoId}`, 3600);
        if (!data || data.error || !Array.isArray(data.audioStreams) || !data.audioStreams.length) {
          markYtNodeDead(host);
          return null;
        }
        const audios = data.audioStreams.filter(s => s && typeof s.url === 'string' && /^https:\/\//i.test(s.url));
        const mp4s = audios.filter(s => /mp4|m4a|aac/i.test(s.mimeType || s.format || '')).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const webms = audios.filter(s => /webm|opus/i.test(s.mimeType || s.format || '')).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        const orderedUrls = [];
        if (mp4s.length) orderedUrls.push(mp4s[0].url);
        if (isIosOrSafari() && data.hls && /^https:\/\//i.test(data.hls)) orderedUrls.push(data.hls);
        if (webms.length && !isIosOrSafari()) orderedUrls.push(webms[0].url);
        if (data.hls && /^https:\/\//i.test(data.hls) && !orderedUrls.includes(data.hls)) orderedUrls.push(data.hls);
        if (audios.length && !orderedUrls.includes(audios[0].url)) orderedUrls.push(audios[0].url);

        if (!orderedUrls.length) {
          markYtNodeDead(host);
          return null;
        }
        const subtitles = Array.isArray(data.subtitles) ? data.subtitles.filter(s => s && s.url) : [];
        return {
          url: orderedUrls[0],
          backupUrls: orderedUrls.slice(1),
          duration: data.duration || 0,
          subtitles,
          host,
          backend: 'piped'
        };
      }

      async function resolveYtStreamFromInvidious(videoId, host) {
        const data = await fetchJsonTimeout(`${host}/api/v1/videos/${videoId}`, 3800);
        if (!data || data.error || !Array.isArray(data.adaptiveFormats) || !data.adaptiveFormats.length) {
          markYtNodeDead(host);
          return null;
        }
        const formats = data.adaptiveFormats.filter(f => f && f.url && /^audio\//i.test(f.type || ''));
        if (!formats.length && !data.hlsUrl) {
          markYtNodeDead(host);
          return null;
        }
        const mp4s = formats.filter(f => /audio\/mp4/i.test(f.type || '')).sort((a, b) => (parseInt(b.bitrate, 10) || 0) - (parseInt(a.bitrate, 10) || 0));
        const webms = formats.filter(f => /audio\/webm/i.test(f.type || '')).sort((a, b) => (parseInt(b.bitrate, 10) || 0) - (parseInt(a.bitrate, 10) || 0));

        const orderedUrls = [];
        if (mp4s.length) {
          if (/^https:\/\//i.test(mp4s[0].url)) orderedUrls.push(mp4s[0].url);
          orderedUrls.push(`${host}/latest_version?id=${encodeURIComponent(videoId)}&itag=${mp4s[0].itag || 140}&local=true`);
        }
        if (isIosOrSafari() && data.hlsUrl && /^https:\/\//i.test(data.hlsUrl)) {
          orderedUrls.push(data.hlsUrl);
        }
        if (webms.length && !isIosOrSafari()) {
          if (/^https:\/\//i.test(webms[0].url)) orderedUrls.push(webms[0].url);
          orderedUrls.push(`${host}/latest_version?id=${encodeURIComponent(videoId)}&itag=${webms[0].itag || 251}&local=true`);
        }

        if (!orderedUrls.length) {
          markYtNodeDead(host);
          return null;
        }

        const captions = Array.isArray(data.captions)
          ? data.captions.filter(c => c && c.url).map(c => ({
              code: c.language_code || '',
              url: /^https?:\/\//i.test(c.url) ? c.url : (host + c.url)
            }))
          : [];

        return {
          url: orderedUrls[0],
          backupUrls: orderedUrls.slice(1),
          duration: data.lengthSeconds || 0,
          subtitles: captions,
          host,
          backend: 'invidious'
        };
      }

      async function resolveYtStreamFromEdge(videoId) {
        if (!cfProxyUsable || !videoId) return null;
        const data = await fetchJsonTimeout(`/api/ytstream?v=${encodeURIComponent(videoId)}`, 3400);
        if (!data || !data.ok || !data.url) return null;
        return {
          url: data.url,
          backupUrls: Array.isArray(data.backupUrls) ? data.backupUrls : [],
          duration: data.duration || 0,
          subtitles: [],
          host: 'edge',
          backend: 'edge_yt'
        };
      }

      async function resolveVideoIdAudio(videoId, preferredHost = '', preferredBackend = '', skipHosts = []) {
        const tasks = [];

        // 1) Cloudflare Edge YouTube InnerTube / Piped stream extractor (plays in native <audio>!)
        if (cfProxyUsable) {
          tasks.push(resolveYtStreamFromEdge(videoId));
        }

        const candidates = [];
        if (preferredHost && isYtNodeAlive(preferredHost) && !skipHosts.includes(preferredHost)) {
          candidates.push({ type: preferredBackend || 'piped', host: preferredHost });
        }
        getOrderedPipedNodes(skipHosts).slice(0, 4).forEach(h => {
          if (!candidates.some(c => c.host === h)) candidates.push({ type: 'piped', host: h });
        });
        getOrderedInvidiousNodes(skipHosts).slice(0, 2).forEach(h => {
          if (!candidates.some(c => c.host === h)) candidates.push({ type: 'invidious', host: h });
        });

        candidates.forEach(c => {
          tasks.push(
            (c.type === 'piped'
              ? resolveYtStreamFromPiped(videoId, c.host)
              : resolveYtStreamFromInvidious(videoId, c.host)
            ).then(res => {
              if (res && res.url) {
                activeYtNode = { type: c.type, url: c.host };
                return res;
              }
              return null;
            })
          );
        });

        if (!tasks.length) return null;
        // Tight 2.8s cap so if public Piped /streams/ are blocked by YouTube, we immediately start YT IFrame Audio!
        return await withHardTimeout(firstNonNull(tasks), 2800, null);
      }

            // Direct YouTube HTML search fallback (extracts videoIds from ytInitialData when Piped/Invidious search is down)
      async function searchYouTubeDirectHtml(query, track) {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const htmlTxt = await fetchTextViaRelay(url, 4200, 1000, txt => txt.includes('"videoId"'));
        if (!htmlTxt) return [];

        const found = [];
        const seen = new Set();
        const re = /"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"([\s\S]{0,1800}?)(?="videoRenderer":|\}\]\},"trackingParams")/g;
        let m;
        while ((m = re.exec(htmlTxt)) !== null && found.length < 10) {
          const vid = m[1];
          if (seen.has(vid)) continue;
          const chunk = m[2] || '';
          const titleM = chunk.match(/"title":\{"runs":\[\{"text":"((?:\\.|[^"\\]){1,180})"/);
          const authorM = chunk.match(/"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"((?:\\.|[^"\\]){1,120})"/);
          const durM = chunk.match(/"lengthText":\{[^}]*"simpleText":"(\d{1,2}:\d{2}(?::\d{2})?)"/);
          if (!titleM) continue;
          let title = titleM[1], artist = authorM ? authorM[1] : '';
          try { title = JSON.parse('"' + title + '"'); } catch (e) {}
          try { if (artist) artist = JSON.parse('"' + artist + '"'); } catch (e) {}
          artist = artist.replace(/\s*-\s*Topic$/i, '');
          const dur = durM ? parseDurText(durM[1]) : 0;
          if (dur > 0 && (dur < 25 || dur > 900)) continue;
          seen.add(vid);
          found.push({ videoId: vid, artist, title, duration: dur, host: '', backend: 'ytdirect' });
        }

        if (!found.length) {
          // Ultra-compact regex fallback
          const ids = htmlTxt.match(/"videoId":"([A-Za-z0-9_-]{11})"/g) || [];
          for (const raw of ids) {
            const vid = raw.slice(11, 22);
            if (!seen.has(vid)) {
              seen.add(vid);
              found.push({ videoId: vid, artist: '', title: '', duration: 0, host: '', backend: 'ytdirect' });
              if (found.length >= 3) break;
            }
          }
        }

        found.sort((a, b) =>
          scoreCandidateMatch(b.artist, b.title, b.duration, track) -
          scoreCandidateMatch(a.artist, a.title, a.duration, track)
        );
        return found.slice(0, 4);
      }

      // Unified YouTube search: races Piped (music_songs + videos) + Invidious, then direct YouTube HTML fallback
      async function findYouTubeCandidates(track, preferMusic = true, skipHosts = [], forceMore = false) {
        if (!forceMore && Array.isArray(track.ytCandidates) && track.ytCandidates.length) {
          return track.ytCandidates;
        }
        if (!forceMore && track.ytVideoId) {
          return [{ videoId: track.ytVideoId, artist: track.artist || '', title: track.title || '', duration: track.duration || 180, host: '', backend: 'ytdirect' }];
        }
        const qBase = `${track.artist} ${track.title}`.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s+/g, ' ').trim();
        const pipedFilter = preferMusic ? 'music_songs' : 'videos';
        const invQuery = preferMusic ? `${qBase} topic` : `${qBase} audio`;

        const pipedTasks = getOrderedPipedNodes(skipHosts).slice(0, 5).map(async (host) => {
          const data = await fetchJsonTimeout(`${host}/search?q=${encodeURIComponent(qBase)}&filter=${pipedFilter}`, 3400);
          if (!data || data.error || !Array.isArray(data.items) || !data.items.length) {
            if (!data || data.error) markYtNodeDead(host);
            return null;
          }
          const valid = data.items
            .filter(it => it && !it.isShort && (it.duration > 20 || it.duration === undefined))
            .map(it => ({
              videoId: extractVideoId(it.url),
              artist: String(it.uploaderName || '').replace(/\s*-\s*Topic$/i, ''),
              title: String(it.title || ''),
              duration: it.duration || 0,
              host,
              backend: 'piped'
            }))
            .filter(x => x.videoId);
          if (!valid.length) return null;
          valid.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          activeYtNode = { type: 'piped', url: host };
          return valid.slice(0, 4);
        });

        const invTasks = getOrderedInvidiousNodes(skipHosts).slice(0, 4).map(async (host) => {
          const data = await fetchJsonTimeout(`${host}/api/v1/search?q=${encodeURIComponent(invQuery)}&type=video&sort_by=relevance`, 3600);
          if (!Array.isArray(data) || !data.length) {
            markYtNodeDead(host);
            return null;
          }
          const valid = data
            .filter(it => it && it.videoId && it.lengthSeconds > 20 && !it.liveNow)
            .map(it => ({
              videoId: it.videoId,
              artist: String(it.author || '').replace(/\s*-\s*Topic$/i, ''),
              title: String(it.title || ''),
              duration: it.lengthSeconds || 0,
              host,
              backend: 'invidious'
            }));
          if (!valid.length) return null;
          valid.sort((a, b) =>
            scoreCandidateMatch(b.artist, b.title, b.duration, track) -
            scoreCandidateMatch(a.artist, a.title, a.duration, track)
          );
          activeYtNode = { type: 'invidious', url: host };
          return valid.slice(0, 4);
        });

        let list = await firstNonNull([...pipedTasks, ...invTasks]);

        // Fallback: Direct YouTube HTML search if all Piped/Invidious search nodes failed!
        if (!list || !list.length) {
          list = await searchYouTubeDirectHtml(`${qBase} audio`, track);
        }

        if (list && list.length) {
          track.ytCandidates = list;
          return list;
        }
        return [];
      }

      // =========================================================================
      // OFFICIAL YOUTUBE IFRAME AUDIO ENGINE (UNSTOPPABLE FALLBACK WHEN PIPED STREAMS BLOCKED)
      // =========================================================================
      let ytApiLoading = false;
      let ytApiReadyPromise = null;
      let ytPlayer = null;
      let ytPlayerReady = false;
      let ytCurrentVideoId = '';

      function ensureYtIframeApi() {
        if (window.YT && window.YT.Player) return Promise.resolve(true);
        if (ytApiReadyPromise) return ytApiReadyPromise;
        ytApiReadyPromise = new Promise((resolve) => {
          let done = false;
          const finish = (ok) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            clearInterval(poll);
            if (!ok) ytApiReadyPromise = null;
            resolve(ok);
          };
          const timer = setTimeout(() => finish(Boolean(window.YT && window.YT.Player)), 6500);
          const poll = setInterval(() => {
            if (window.YT && window.YT.Player) finish(true);
          }, 150);

          const prevCb = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (typeof prevCb === 'function') try { prevCb(); } catch (e) {}
            finish(true);
          };

          if (!ytApiLoading) {
            ytApiLoading = true;
            const s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            s.async = true;
            s.onerror = () => { ytApiLoading = false; finish(false); };
            document.head.appendChild(s);
          }
        });
        return ytApiReadyPromise;
      }

      function stopYtIframe() {
        ytCurrentVideoId = '';
        if (ytPlayer && ytPlayerReady) {
          try { ytPlayer.stopVideo(); } catch (e) {}
        }
      }

      async function startYtIframePlayback(videoId, track) {
        const loaded = await ensureYtIframeApi();
        if (!loaded || !window.YT || !window.YT.Player) return false;

        ytCurrentVideoId = videoId;
        if (ytPlayer && ytPlayerReady) {
          try {
            ytPlayer.unMute();
            ytPlayer.setVolume(100);
            ytPlayer.loadVideoById({ videoId, startSeconds: 0 });
            ytPlayer.playVideo();
            return true;
          } catch (e) {
            return false;
          }
        }

        return await new Promise((resolve) => {
          let settled = false;
          const finish = (ok) => { if (!settled) { settled = true; resolve(ok); } };
          setTimeout(() => finish(false), 6000);

          try {
            ytPlayer = new YT.Player('ytPlayerFrame', {
              height: '240',
              width: '240',
              videoId,
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                origin: location.origin && location.origin !== 'null' ? location.origin : undefined
              },
              events: {
                onReady: (ev) => {
                  ytPlayerReady = true;
                  try {
                    ev.target.unMute();
                    ev.target.setVolume(100);
                    ev.target.playVideo();
                  } catch (e) {}
                  finish(true);
                },
                onStateChange: (ev) => {
                  if (currentAudioMode !== 'ytiframe') return;
                  if (ev.data === 1) { // PLAYING
                    clearStreamWatchdog();
                    const d = ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
                    if (d > 1 && state.currentTrack) {
                      state.currentTrack.duration = d;
                      $('totTime').textContent = fmtTime(d);
                      $('playerScrubber').max = d;
                    }
                  } else if (ev.data === 0) { // ENDED
                    if (state.repeat) {
                      try { ytPlayer.seekTo(0, true); ytPlayer.playVideo(); } catch (e) {}
                    } else {
                      nextTrack();
                    }
                  }
                },
                onError: () => {
                  if (currentAudioMode !== 'ytiframe') return;
                  handleStreamFailure('ytiframe_error');
                }
              }
            });
          } catch (e) {
            finish(false);
          }
        });
      }

      // Unified Piped + Invidious + YouTube IFrame resolver (zero endless search!)
      async function resolveFromYouTubeUnified(track, onStatus, preferMusic = true, skipHosts = []) {
        if (onStatus) onStatus(preferMusic ? 'Piped API: поиск YT Music...' : 'Piped API: поиск YouTube...');
        const candidates = await findYouTubeCandidates(track, preferMusic, skipHosts);
        if (!candidates.length) return null;

        const best = candidates[0];
        const altVideoIds = candidates.slice(1).map(c => c.videoId);

        if (onStatus) onStatus('Piped API: загрузка аудиопотока...');
        const stream = await resolveVideoIdAudio(best.videoId, best.host, best.backend, skipHosts);
        if (stream && stream.url) {
          return {
            url: stream.url,
            backupUrls: stream.backupUrls || [],
            videoId: best.videoId,
            altVideoIds,
            host: stream.host,
            backend: stream.backend,
            provider: stream.backend === 'invidious' ? 'invidious' : 'piped',
            label: stream.backend === 'invidious' ? 'Invidious · YT' : (preferMusic ? 'Piped · YT Music' : 'Piped · YouTube'),
            duration: stream.duration || best.duration || track.duration,
            subtitles: stream.subtitles || []
          };
        }

        // All public Piped/Invidious /streams/ nodes blocked by YouTube bot-check -> switch straight to official YT IFrame Audio!
        return {
          url: 'ytiframe://' + best.videoId,
          isYtIframe: true,
          videoId: best.videoId,
          altVideoIds,
          provider: 'ytiframe',
          label: preferMusic ? 'YouTube Music' : 'YouTube · Аудио',
          duration: best.duration || track.duration,
          subtitles: []
        };
      }

      // =========================================================================
      // MASTER UNIFIED FULL-TRACK RESOLVER (v21: YOUTUBE AUDIO FIRST + DIRECT MP3 PORTALS)
      // =========================================================================
      async function resolveAudioCascade(track, onStatus, startFromStep = 0, skipYtHosts = []) {
        let steps;
        if (track.tgStreamUrl) {
          steps = ['tg_bot_stream', 'youtube_full'];
        } else if (tgBotVerified) {
          steps = ['tg_bot_resolve', 'portal_direct', 'youtube_full'];
        } else if (track.directMp3Url || track.detailPageUrl || track.mp3PartyId) {
          // Track already has a direct MP3 link -> play immediately, fall back to YouTube if MP3 fails!
          steps = ['portal_direct', 'youtube_full', 'edge_resolve'];
        } else if (track.ytVideoId) {
          // Track came from YouTube / YT Music -> play YouTube audio immediately!
          steps = ['youtube_full', 'edge_resolve', 'mp3_portals_fallback'];
        } else if (track.fromSoundCloud && track.scTrackId) {
          steps = cfProxyUsable
            ? ['edge_resolve', 'youtube_full', 'sc_direct']
            : ['sc_direct', 'youtube_full'];
        } else {
          // Catalog track (iTunes / Deezer) -> race Edge + YouTube Audio (Direct Stream -> YT IFrame) + MP3 portals!
          steps = cfProxyUsable
            ? ['edge_resolve', 'youtube_full', 'mp3_portals_fallback']
            : ['youtube_full', 'mp3_portals_fallback'];
        }

        for (let i = startFromStep; i < steps.length; i++) {
          const step = steps[i];

          if (step === 'tg_bot_stream' || step === 'tg_bot_resolve') {
            if (onStatus) onStatus('Загрузка аудио из Telegram-бота...');
            const res = await resolveViaTgBot(track);
            if (res && res.url) return { ...res, stepIndex: i, isRu: true };
          } else if (step === 'portal_direct') {
            if (track.directMp3Url) {
              const pKey = track.portalKey || 'hitmo';
              const pLabel = (PORTAL_META[pKey] && PORTAL_META[pKey].label) || track.portalLabel || 'MP3';
              const backups = [];
              if (Array.isArray(track.backupMp3Urls)) backups.push(...track.backupMp3Urls);
              if (Array.isArray(track.mp3PartyUrls)) {
                track.mp3PartyUrls.forEach(u => { if (u && u !== track.directMp3Url && !backups.includes(u)) backups.push(u); });
              }
              return {
                url: track.directMp3Url,
                rawUrl: track.directMp3Url,
                backupUrls: backups,
                requiresProxy: !!track.requiresProxy,
                provider: pKey,
                label: `${pLabel} · Полный`,
                duration: track.duration || 180,
                subtitles: [],
                stepIndex: i,
                isRu: true
              };
            }
            if (track.mp3PartyId) {
              if (onStatus) onStatus('Загрузка MP3...');
              const res = await resolveFromMp3Party(track);
              if (res && res.url) return { ...res, label: 'Mp3Party · Полный', stepIndex: i, isRu: true };
            }
            if (track.detailPageUrl) {
              if (onStatus) onStatus('Загрузка MP3...');
              if (cfProxyUsable) {
                const edgeDet = await resolveViaCfWorkerEdge(track);
                if (edgeDet && edgeDet.url) return { ...edgeDet, stepIndex: i, isRu: true };
              }
              const res = await withHardTimeout(resolvePortalDetailPage(track), 3800, null);
              if (res && res.url) return { ...res, stepIndex: i, isRu: true };
            }
          } else if (step === 'edge_resolve') {
            if (cfProxyUsable) {
              if (onStatus) onStatus('Загрузка аудио с YouTube / MP3...');
              const res = await resolveViaCfWorkerEdge(track);
              if (res && res.url) return { ...res, stepIndex: i, isRu: true };
            }
          } else if (step === 'youtube_full') {
            if (onStatus) onStatus('Загрузка аудио с YouTube...');
            // Step A: Find videoId (0ms if track.ytVideoId already known!)
            const candidates = await findYouTubeCandidates(track, true, skipYtHosts);
            if (candidates && candidates.length) {
              const best = candidates[0];
              track.ytVideoId = best.videoId;
              const altVideoIds = candidates.slice(1).map(c => c.videoId);

              // Step B: Try direct audio stream (Edge InnerTube / Piped / Invidious) with fast 2.8s cap
              const stream = await resolveVideoIdAudio(best.videoId, best.host, best.backend, skipYtHosts);
              if (stream && stream.url) {
                return {
                  url: stream.url,
                  backupUrls: stream.backupUrls || [],
                  videoId: best.videoId,
                  altVideoIds,
                  host: stream.host,
                  backend: stream.backend,
                  provider: stream.backend === 'edge_yt' ? 'edge_yt' : (stream.backend === 'invidious' ? 'invidious' : 'piped'),
                  label: 'YouTube · Аудио',
                  duration: stream.duration || best.duration || track.duration,
                  subtitles: stream.subtitles || [],
                  stepIndex: i,
                  isRu: false
                };
              }

              // Step C: Direct stream blocked by YouTube bot-check -> IMMEDIATELY use Official YouTube IFrame Audio!
              return {
                url: 'ytiframe://' + best.videoId,
                isYtIframe: true,
                videoId: best.videoId,
                altVideoIds,
                provider: 'ytiframe',
                label: 'YouTube · Аудио',
                duration: best.duration || track.duration || 180,
                subtitles: [],
                stepIndex: i,
                isRu: false
              };
            }
          } else if (step === 'sc_direct') {
            if (onStatus) onStatus('Загрузка SoundCloud...');
            const res = await withHardTimeout(resolveSoundCloudStream(track), 4000, null);
            if (res && res.url && !String(res.label || '').includes('Превью')) {
              return { ...res, label: 'SoundCloud · Полный', stepIndex: i, isRu: false };
            }
          } else if (step === 'mp3_portals_fallback') {
            if (onStatus) onStatus('Запасной поиск аудио...');
            const skip = (startFromStep > 0 && track.portalKey) ? track.portalKey : '';
            const res = await withHardTimeout(
              firstNonNull([
                resolveFromAllMp3Portals(track, skip),
                resolveFromAudius(track)
              ]),
              4500,
              null
            );
            if (res && res.url) return { ...res, stepIndex: i, isRu: true };
          }
        }
        return null;
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

        const subs = ytSubtitles.length ? ytSubtitles : (track.ytSubtitles || []);
        if (subs.length) {
          const pref = subs.find(s => /^ru/i.test(s.code || '')) || subs.find(s => /^en/i.test(s.code || '')) || subs[0];
          if (pref && pref.url) {
            try {
              const ctrl = new AbortController();
              const t = setTimeout(() => ctrl.abort(), 4200);
              const r = await fetch(pref.url, { signal: ctrl.signal });
              clearTimeout(t);
              if (r.ok) {
                const vtt = await r.text();
                const parsedVtt = parseVttCaptions(vtt);
                if (parsedVtt.length >= 3) {
                  track.lyrics = parsedVtt;
                  track.lyricsIsPlaceholder = false;
                  if (state.currentTrack && state.currentTrack.id === track.id) {
                    $('lyricsSourceTag').textContent = 'YT SYNC';
                    renderLyrics(track);
                    syncTimeAndLyrics(true);
                  }
                  return;
                }
              }
            } catch (e) {}
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

      // ================= LIVE SEARCH CONTROLLER =================
      let searchSeq = 0;
      let searchDebounce = null;

      function renderSourcesLiveBar(sources, stillLoading) {
        const bar = $('searchSourcesBar');
        if (!bar) return;
        if (!sources || !sources.length) {
          bar.classList.remove('show');
          bar.innerHTML = '';
          return;
        }
        bar.classList.add('show');
        bar.innerHTML = sources.map(s => `<span class="src-pill ready"><span class="src-pill-dot"></span>${escapeHtml(s)}</span>`).join('')
          + (stillLoading ? `<span class="src-pill">поиск ещё...</span>` : '');
      }

      async function performSearch() {
        const q = searchInput.value.trim();
        searchClear.classList.toggle('show', q.length > 0);
        viewSearch.classList.toggle('has-results', q.length > 0);

        const seq = ++searchSeq;
        searchLoader.classList.add('show');
        $('searchLoaderText').textContent = q ? `Единый поиск: «${q}»...` : 'Загрузка популярных треков...';
        $('searchResultTitle').textContent = q ? `Поиск: «${q}»` : 'Популярное сейчас';
        renderSourcesLiveBar([], false);

        const failsafeTimer = setTimeout(() => {
          if (seq === searchSeq) searchLoader.classList.remove('show');
        }, 5800);

        const applyBatch = (batch, isFinal) => {
          if (seq !== searchSeq) return;
          if (isFinal) clearTimeout(failsafeTimer);
          searchLoader.classList.remove('show');
          renderSourcesLiveBar(batch.sources || [], !isFinal && batch.stillLoading);
          const titlePrefix = q
            ? (batch.correctedHint ? `Поиск: «${q}» + ${batch.correctedHint}` : `Поиск: «${q}»`)
            : 'Популярное сейчас';
          $('searchResultTitle').textContent = titlePrefix;
          state.searchResults = Array.isArray(batch.tracks) ? batch.tracks : [];
          renderSearchResultsList();
        };

        try {
          const finalRes = await searchUnifiedAllPlatforms(q, (batch) => {
            applyBatch(batch, false);
          });
          applyBatch(finalRes, true);
        } catch (e) {
          clearTimeout(failsafeTimer);
          if (seq !== searchSeq) return;
          searchLoader.classList.remove('show');
          state.searchResults = [];
          renderSearchResultsList();
        }
      }

                  function renderSearchResultsList() {
        $('searchCount').textContent = String(state.searchResults.length);
        searchTrackList.innerHTML = '';
        if (!state.searchResults.length) {
          searchTrackList.innerHTML = `<div style="text-align:center;padding:28px 12px;color:var(--text-dim);font-size:13px;">Ничего не найдено — проверьте запрос или интернет-соединение</div>`;
          return;
        }
        state.searchResults.forEach(t => searchTrackList.appendChild(buildTrackRow(t, 'search')));
      }

      // ================= AUDIO ENGINE (iOS SAFARI UNLOCKED) =================
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
      let currentStepIndex = 0;
      let failedYtHosts = [];

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

      let errorHandlingTrackId = '';
      let mp3ProxyRetryIdx = 0;
      let streamWatchdogTimer = null;

      function clearStreamWatchdog() {
        if (streamWatchdogTimer) {
          clearTimeout(streamWatchdogTimer);
          streamWatchdogTimer = null;
        }
      }

      function armStreamWatchdog(trackId, ms = 5200) {
        clearStreamWatchdog();
        streamWatchdogTimer = setTimeout(() => {
          if (!state.isPlaying) return;
          if (!state.currentTrack || state.currentTrack.id !== trackId) return;
          if (currentAudioMode === 'stream') {
            if (htmlAudio.src === SILENT_WAV_URI) return;
            if (htmlAudio.readyState < 2 && (htmlAudio.currentTime || 0) < 0.1) {
              handleStreamFailure('stall');
            }
          } else if (currentAudioMode === 'ytiframe') {
            const st = (ytPlayer && ytPlayer.getPlayerState) ? ytPlayer.getPlayerState() : -1;
            const ct = (ytPlayer && ytPlayer.getCurrentTime) ? ytPlayer.getCurrentTime() : 0;
            if (st !== 1 && st !== 3 && ct < 0.1) {
              // Autoplay was blocked by browser after async lookup: flip Play button to ▶ so 1 tap starts YouTube sound!
              state.isPlaying = false;
              updatePlayerUI();
              showToast('Нажмите кнопку Play для запуска звука YouTube');
            }
          }
        }, ms);
      }

      ['playing', 'canplay', 'pause', 'ended'].forEach(ev => {
        htmlAudio.addEventListener(ev, clearStreamWatchdog);
      });

      async function applyResolvedAudio(track, resolved) {
        if (!track || !resolved || !resolved.url) return false;
        currentStepIndex = typeof resolved.stepIndex === 'number' ? resolved.stepIndex : currentStepIndex;
        track.resolvedAudio = resolved;
        if (resolved.duration > 0) track.duration = resolved.duration;
        if (resolved.subtitles && resolved.subtitles.length) {
          track.ytSubtitles = resolved.subtitles;
          if (track.lyricsIsPlaceholder) fetchSyncedLyricsForTrack(track, resolved.subtitles);
        }

        if (resolved.isYtIframe && resolved.videoId) {
          htmlAudio.pause();
          try { htmlAudio.removeAttribute('src'); } catch (e) {}
          currentAudioMode = 'ytiframe';
          updatePlayerUI();
          renderSearchResultsList();
          renderLibrary();
          armStreamWatchdog(track.id, 6500);
          const ok = await startYtIframePlayback(resolved.videoId, track);
          if (!ok) {
            handleStreamFailure('ytiframe_init_fail');
            return false;
          }
          return true;
        }

        stopYtIframe();
        currentAudioMode = 'stream';
        htmlAudio.muted = false;
        htmlAudio.volume = 1.0;

        let playUrl = resolved.url;
        // DIRECT-FIRST IN RUSSIA WITHOUT VPN:
        // Play RU MP3 CDNs (mp3party, hitmo, muzofond, lightaudio, itunes) DIRECTLY for minimum latency (<0.3s)!
        // Proxy ONLY http:// (mixed-content blocked on HTTPS) or strict hotlink portals (muzmo / sefon).
        const forceProxyNow = cfProxyUsable
          && typeof playUrl === 'string'
          && /^https?:\/\//i.test(playUrl)
          && !playUrl.includes('/api/proxy?') && !playUrl.includes('/api/tg/stream/')
          && (
            !!resolved.requiresProxy
            || (location.protocol === 'https:' && playUrl.startsWith('http://'))
            || /muzmo|sefon\.pro|sndcdn\.com|soundcloud/i.test(playUrl)
          );

        if (forceProxyNow) {
          resolved.rawUrl = resolved.rawUrl || playUrl;
          playUrl = toCfProxyUrl(resolved.rawUrl, 'media');
          resolved.url = playUrl;
          mp3ProxyRetryIdx = 1;
        }
        htmlAudio.src = playUrl;
        try { htmlAudio.currentTime = 0; } catch (e) {}
        // Fast 2.6s watchdog: if direct CDN stalls, immediately rotate to backup MP3 / Edge media proxy!
        armStreamWatchdog(track.id, 3400);
        // Pre-warm next track in queue for zero-delay transitions!
        prefetchNextInQueue();
        const p = htmlAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => showToast('Нажмите кнопку Play ещё раз для старта звука'));
        }
        updatePlayerUI();
        renderSearchResultsList();
        renderLibrary();
        return true;
      }

      async function handleStreamFailure(reason = 'error') {
        clearStreamWatchdog();
        const track = state.currentTrack;
        if (!state.isPlaying || !track) return;
        if (!track.fromCatalog && !track.fromSoundCloud) return;
        if (currentAudioMode === 'stream' && htmlAudio.src === SILENT_WAV_URI) return;

        const curRes = track.resolvedAudio;

        // 1) If direct MP3 (Mp3Party / Hitmos) failed or stalled, rotate backup URLs, then media proxies
        const MP3_DIRECT_PROVIDERS = new Set(['mp3party', 'hitmo', 'hitmos', 'muzmo', 'muzofond', 'sefon', 'lightaudio', 'drivemusic', 'audius']);
        if (curRes && MP3_DIRECT_PROVIDERS.has(curRes.provider)) {
          const origUrl = curRes.rawUrl || curRes.url;
          curRes.rawUrl = origUrl;

          // First retry current track URL via media proxy before switching to backups
          if (mp3ProxyRetryIdx < MEDIA_PROXIES.length) {
            const proxied = MEDIA_PROXIES[mp3ProxyRetryIdx++](origUrl);
            if (proxied && proxied !== htmlAudio.src && state.currentTrack && state.currentTrack.id === track.id) {
              curRes.url = proxied;
              htmlAudio.src = proxied;
              armStreamWatchdog(track.id, 3400);
              htmlAudio.play().catch(() => {});
              return;
            }
          }

          if (Array.isArray(curRes.backupUrls) && curRes.backupUrls.length) {
            const nextMp3 = curRes.backupUrls.shift();
            mp3ProxyRetryIdx = 0;
            if (nextMp3 && state.currentTrack && state.currentTrack.id === track.id) {
              curRes.rawUrl = nextMp3;
              const mustProxy = cfProxyUsable && ((location.protocol === 'https:' && nextMp3.startsWith('http://')) || /muzmo|sefon\.pro/i.test(nextMp3));
              const useUrl = mustProxy ? toCfProxyUrl(nextMp3, 'media') : nextMp3;
              if (useUrl !== nextMp3) mp3ProxyRetryIdx = 1;
              curRes.url = useUrl;
              htmlAudio.src = useUrl;
              armStreamWatchdog(track.id, 3400);
              htmlAudio.play().catch(() => {});
              return;
            }
          }
        }

        // 2) If Piped/Invidious direct audio stream failed -> blacklist dead node, try backup stream or switch straight to YouTube IFrame Audio!
        if (curRes && (curRes.provider === 'piped' || curRes.provider === 'invidious' || curRes.provider === 'edge_yt')) {
          if (curRes.host) {
            markYtNodeDead(curRes.host);
            failedYtHosts.push(curRes.host);
          }
          if (Array.isArray(curRes.backupUrls) && curRes.backupUrls.length) {
            const nextStreamUrl = curRes.backupUrls.shift();
            if (nextStreamUrl && state.currentTrack && state.currentTrack.id === track.id) {
              curRes.url = nextStreamUrl;
              htmlAudio.src = nextStreamUrl;
              armStreamWatchdog(track.id, 4500);
              htmlAudio.play().catch(() => {});
              return;
            }
          }
          if (curRes.videoId && state.currentTrack && state.currentTrack.id === track.id) {
            const ytFallback = {
              url: 'ytiframe://' + curRes.videoId,
              isYtIframe: true,
              videoId: curRes.videoId,
              altVideoIds: curRes.altVideoIds || [],
              provider: 'ytiframe',
              label: 'YouTube · Аудио',
              duration: curRes.duration || track.duration,
              subtitles: curRes.subtitles || [],
              stepIndex: currentStepIndex
            };
            await applyResolvedAudio(track, ytFallback);
            showToast('Переключено на YouTube · Аудио');
            return;
          }
        }

        // 3) If YouTube IFrame failed (e.g. embed disabled on 1st videoId), rotate altVideoIds or fetch more YouTube videos!
        if (curRes && curRes.provider === 'ytiframe') {
          if ((!Array.isArray(curRes.altVideoIds) || !curRes.altVideoIds.length) && !curRes._fetchedAltYt) {
            curRes._fetchedAltYt = true;
            const more = await findYouTubeCandidates(track, false, failedYtHosts, true);
            const extras = (more || []).map(c => c.videoId).filter(v => v && v !== curRes.videoId);
            if (extras.length) curRes.altVideoIds = extras;
          }
          if (Array.isArray(curRes.altVideoIds) && curRes.altVideoIds.length) {
            const nextVid = curRes.altVideoIds.shift();
            if (nextVid && state.currentTrack && state.currentTrack.id === track.id) {
              curRes.videoId = nextVid;
              curRes.url = 'ytiframe://' + nextVid;
              await applyResolvedAudio(track, curRes);
              return;
            }
          }
        }

        const guard = track.id + ':' + currentStepIndex;
        if (errorHandlingTrackId === guard) return;
        errorHandlingTrackId = guard;

        // 4) Advance to next audio source in cascade (e.g. SoundCloud -> Preview)
        const nextStep = currentStepIndex + 1;
        if (nextStep <= 4) {
          mp3ProxyRetryIdx = 0;
          const fallback = await resolveAudioCascade(
            track,
            (msg) => {
              if (state.currentTrack && state.currentTrack.id === track.id) {
                $('playerArtist').innerHTML = `<span class="stream-loading-dot"></span>${escapeHtml(msg)}`;
              }
            },
            nextStep,
            failedYtHosts
          );
          if (fallback && fallback.url && state.currentTrack && state.currentTrack.id === track.id) {
            await applyResolvedAudio(track, fallback);
            showToast('Источник аудио: ' + fallback.label);
            return;
          }
        }
        state.isPlaying = false;
        updatePlayerUI();
        showToast('Не удалось загрузить аудиопоток для этого трека');
      }

      htmlAudio.addEventListener('error', () => handleStreamFailure('error'));

      function updateMediaSession(track) {
        if ('mediaSession' in navigator && track) {
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: track.title,
              artist: track.artist,
              album: track.album || 'APATHY',
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
        playUnlockChime();
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

        let badgeLabel = track.source || '';
        let badgeClass = '';
        if (track.resolvedAudio) {
          badgeLabel = track.resolvedAudio.label;
          const p = track.resolvedAudio.provider;
          badgeClass = (PORTAL_META[p] && PORTAL_META[p].tag)
            || (p === 'hitmos' ? 'hitmos-tag'
              : p === 'soundcloud' ? 'sc-tag'
              : p === 'deezer' ? 'dz-tag'
              : p === 'itunes' ? 'itu-tag'
              : 'ytm-tag');
        } else if (track.portalKey && PORTAL_META[track.portalKey]) {
          badgeLabel = track.directMp3Url ? `${PORTAL_META[track.portalKey].label} · MP3` : PORTAL_META[track.portalKey].label;
          badgeClass = PORTAL_META[track.portalKey].tag;
        } else if (track.mp3PartyId) {
          badgeLabel = 'Mp3Party · MP3';
          badgeClass = 'mp3p-tag';
        } else if (track.fromSoundCloud) {
          badgeLabel = 'SoundCloud';
          badgeClass = 'sc-tag';
        } else if (track.ytVideoId) {
          badgeLabel = 'YouTube';
          badgeClass = 'ytm-tag';
        } else if (track.fromCatalog) {
          badgeLabel = track.catalogOrigin === 'deezer' ? 'Deezer' : (track.catalogOrigin === 'itunes' ? 'iTunes' : 'MP3');
          badgeClass = track.catalogOrigin === 'deezer' ? 'dz-tag' : (track.catalogOrigin === 'itunes' ? 'itu-tag' : 'hitmos-tag');
        }

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
          if (state.libFilter === 'soundcloud') return !!t.fromSoundCloud;
          if (state.libFilter === 'catalog') return !!t.fromCatalog;
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

      // ================= PLAYER & SYNCED LYRICS =================
      let playSeq = 0;

      async function playTrack(track, openFullscreen = false) {
        if (!track) return;
        unlockAudioForIos();

        const hasPlayableNow = Boolean(
          track.audioUrl ||
          (track.synth && !track.fromCatalog && !track.fromSoundCloud) ||
          (track.resolvedAudio && track.resolvedAudio.url)
        );
        const isSame = state.currentTrack && state.currentTrack.id === track.id && hasPlayableNow;
        state.currentTrack = track;
        const mySeq = ++playSeq;

        if (!isSame) {
          failedYtHosts = [];
          errorHandlingTrackId = '';
          mp3ProxyRetryIdx = 0;
          clearStreamWatchdog();
          currentStepIndex = 0;
          state.currentTime = 0;
          state.lyricsOffset = 0;
          stopSynthLoop();
          stopYtIframe();
          htmlAudio.pause();

          if (!track.artwork && track.fromCatalog) hydrateTrackCover(track);

          // If track already has a direct MP3 URL from Hitmo / Muzofond / Mp3Party / LightAudio / Sefon,
          // attach it synchronously inside the user tap so iOS Safari plays audio immediately!
          if (!track.resolvedAudio && track.directMp3Url) {
            const pKey = track.portalKey || 'hitmo';
            const pLabel = (PORTAL_META[pKey] && PORTAL_META[pKey].label) || track.portalLabel || 'MP3';
            const backups = [];
            if (Array.isArray(track.backupMp3Urls)) backups.push(...track.backupMp3Urls);
            if (Array.isArray(track.mp3PartyUrls)) {
              track.mp3PartyUrls.forEach(u => { if (u && u !== track.directMp3Url && !backups.includes(u)) backups.push(u); });
            }
            track.resolvedAudio = {
              url: track.directMp3Url,
              rawUrl: track.directMp3Url,
              backupUrls: backups,
              provider: pKey,
              label: `${pLabel} · MP3`,
              duration: track.duration || 180,
              subtitles: [],
              stepIndex: 0,
              isRu: true
            };
          }

          const needsResolve = (track.fromCatalog || track.fromSoundCloud) && !(track.resolvedAudio && track.resolvedAudio.url);

          if (track.audioUrl) {
            currentAudioMode = 'stream';
            htmlAudio.muted = false;
            htmlAudio.volume = 1.0;
            htmlAudio.src = track.audioUrl;
            try { htmlAudio.currentTime = 0; } catch (e) {}
            htmlAudio.play().catch(() => showToast('Нажмите Play для запуска звука'));
          } else if (track.synth && !track.fromCatalog && !track.fromSoundCloud) {
            currentAudioMode = 'synth';
            state.isPlaying = true;
            startSynthLoop(track);
          } else if (track.resolvedAudio && track.resolvedAudio.url) {
            state.isPlaying = true;
            await applyResolvedAudio(track, track.resolvedAudio);
          } else {
            // Prime htmlAudio synchronously inside the tap gesture so iOS Safari allows play() after async lookup
            try {
              htmlAudio.src = SILENT_WAV_URI;
              htmlAudio.play().catch(() => {});
            } catch (e) {}
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

          if (needsResolve) {
            // Hard 15-second ceiling so resolution can NEVER hang infinitely!
            let resolved = null;
            try {
              resolved = await Promise.race([
                resolveAudioCascade(
                  track,
                  (statusMsg) => {
                    if (mySeq === playSeq && state.currentTrack && state.currentTrack.id === track.id) {
                      $('playerArtist').innerHTML = `<span class="stream-loading-dot"></span>${escapeHtml(statusMsg)}`;
                    }
                  },
                  0,
                  []
                ),
                new Promise(res => setTimeout(() => res(null), 10500))
              ]);
            } catch (e) {
              resolved = null;
            }

            if (mySeq !== playSeq) return;

            if (resolved && resolved.url) {
              await applyResolvedAudio(track, resolved);
            } else {
              state.isPlaying = false;
              htmlAudio.pause();
              stopYtIframe();
              updatePlayerUI();
              showToast('Не удалось загрузить полный трек — попробуйте другой вариант из списка');
              return;
            }
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
        // If track wasn't resolved yet (e.g. previous attempt failed), trigger full playTrack
        if ((track.fromCatalog || track.fromSoundCloud) && !(track.resolvedAudio && track.resolvedAudio.url)) {
          playTrack(track, false);
          return;
        }
        unlockAudioForIos();
        state.isPlaying = true;
        lastTickTime = performance.now();
        if (currentAudioMode === 'ytiframe') {
          if (ytPlayer && ytPlayerReady) {
            try { ytPlayer.unMute(); ytPlayer.playVideo(); } catch (e) {}
          } else if (track.resolvedAudio && track.resolvedAudio.videoId) {
            startYtIframePlayback(track.resolvedAudio.videoId, track);
          }
        } else if (currentAudioMode === 'stream') {
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
        if (currentAudioMode === 'ytiframe') {
          if (ytPlayer && ytPlayerReady) try { ytPlayer.pauseVideo(); } catch (e) {}
        } else if (currentAudioMode === 'stream') {
          htmlAudio.pause();
        }
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
        // If YouTube IFrame was cued/unstarted due to mobile autoplay policy, tapping Play starts it immediately!
        if (state.isPlaying && currentAudioMode === 'ytiframe' && ytPlayer && ytPlayerReady) {
          const st = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
          if (st !== 1 && st !== 3) {
            try { ytPlayer.unMute(); ytPlayer.setVolume(100); ytPlayer.playVideo(); } catch (e) {}
            updatePlayerUI();
            return;
          }
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
        if (currentAudioMode === 'ytiframe') {
          if (ytPlayer && ytPlayerReady) {
            try { ytPlayer.seekTo(state.currentTime, true); } catch (e) {}
          }
        } else if (currentAudioMode === 'stream') {
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

        const activeSource = track.resolvedAudio
          ? track.resolvedAudio.label
          : (track.fromSoundCloud ? 'SoundCloud' : (track.source || 'Каталог'));
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
            if (currentAudioMode === 'ytiframe') {
              if (ytPlayer && ytPlayerReady && typeof ytPlayer.getCurrentTime === 'function') {
                const ct = ytPlayer.getCurrentTime();
                if (isFinite(ct) && ct >= 0) state.currentTime = ct;
                const yd = ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
                if (isFinite(yd) && yd > 1 && Math.abs(track.duration - yd) > 1) {
                  track.duration = yd;
                  $('totTime').textContent = fmtTime(track.duration);
                  $('playerScrubber').max = track.duration;
                }
              }
            } else if (currentAudioMode === 'stream') {
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
        searchDebounce = setTimeout(() => performSearch(), 220);
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
        unifiedSearchCache.clear();
        performSearch();
        showToast('Список треков из Telegram обновлён');
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
          showToast('Загрузите архив на Cloudflare Pages и откройте сайт по ссылке *.pages.dev');
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
      probeTgBotSilently(false);
      probeEdgeWorkerSilently();
      setTimeout(() => { ensureYtIframeApi(); }, 900);
      performSearch();
    })();
  