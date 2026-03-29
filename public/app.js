const STREAM     = 'https://hls.somafm.com/hls/groovesalad/128k/program.m3u8';
const META_URL   = 'https://api.somafm.com/channels.json';
const SONGS_URL  = 'https://api.somafm.com/songs/groovesalad.json';
const CHANNEL_ID = 'groovesalad';

let userToken = localStorage.getItem('rc_token');
if (!userToken) { userToken = crypto.randomUUID(); localStorage.setItem('rc_token', userToken); }

const audio      = document.getElementById('audio');
const btn        = document.getElementById('playBtn');
const playIcon   = document.getElementById('playIcon');
const pauseIcon  = document.getElementById('pauseIcon');
const statusEl   = document.getElementById('status');
const streamUrl  = document.getElementById('streamUrl');

function setPlayIcon(isPaused) {
  playIcon.style.display  = isPaused ? '' : 'none';
  pauseIcon.style.display = isPaused ? 'none' : '';
}

let hls, playing = false, metaInterval = null;
let nowSongKey = null;
let channelImage = '';

async function fetchAlbumArt(artist, title, album) {
  const term = encodeURIComponent(`${artist} ${album || title}`);
  try {
    const res  = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&limit=1&entity=song`);
    const data = await res.json();
    const art  = data.results?.[0]?.artworkUrl100;
    if (art) {
      console.log('[art] found:', art);
      return art.replace('100x100bb', '400x400bb');
    }
    console.log('[art] not found for:', artist, album || title);
  } catch (e) { console.log('[art] error:', e); }
  return channelImage;
}

function setStatus(text, live) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (live ? ' live' : '');
}

function timeAgo(unixSec) {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function songKey(s) { return `${s.artist}::${s.title}`; }

// ── Rate now-playing ──
async function rateNow(rating) {
  if (!nowSongKey) return;
  const upBtn   = document.getElementById('npRateUp');
  const downBtn = document.getElementById('npRateDown');
  upBtn.disabled = downBtn.disabled = true;
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_key: nowSongKey, token: userToken, rating })
    });
    const data = await res.json();
    applyNowRating(data);
  } finally {
    upBtn.disabled = downBtn.disabled = false;
  }
}

function applyNowRating(data) {
  const upBtn   = document.getElementById('npRateUp');
  const downBtn = document.getElementById('npRateDown');
  upBtn.className   = 'rate-btn' + (data.userRating === 1  ? ' active-up'   : '');
  downBtn.className = 'rate-btn' + (data.userRating === -1 ? ' active-down' : '');
}

// ── Rate previous track ──
async function ratePrev(key, rating, btn) {
  btn.disabled = true;
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_key: key, token: userToken, rating })
    });
    const data = await res.json();
    const upBtn   = document.querySelector(`.pt-rate-btn[data-key="${CSS.escape(key)}"][data-r="1"]`);
    const downBtn = document.querySelector(`.pt-rate-btn[data-key="${CSS.escape(key)}"][data-r="-1"]`);
    if (upBtn)   { upBtn.className   = 'pt-rate-btn' + (data.userRating === 1  ? ' active-up'   : ''); upBtn.textContent   = `👍 ${data.up}`; }
    if (downBtn) { downBtn.className = 'pt-rate-btn' + (data.userRating === -1 ? ' active-down' : ''); downBtn.textContent = `👎 ${data.down}`; }
  } finally { btn.disabled = false; }
}

// ── Fetch channel meta + now-playing rating ──
async function fetchMeta() {
  try {
    const res  = await fetch(META_URL);
    const data = await res.json();
    const ch   = data.channels.find(c => c.id === CHANNEL_ID);
    if (!ch) return;

    document.getElementById('npListeners').textContent = ch.listeners ? `${ch.listeners} listeners` : '';
    document.getElementById('npGenre').textContent     = ch.genre ? ch.genre.replace(/\|/g, ' · ') : '';
    channelImage = ch.xlimage || ch.largeimage || ch.image || '';
    // set channel logo as default if no album art yet
    const artEl = document.getElementById('npArt');
    if (!artEl.src || artEl.src === window.location.href) artEl.src = channelImage;
  } catch (e) {}
}

// ── Fetch songs (now + previous) ──
async function fetchSongs() {
  try {
    const res  = await fetch(SONGS_URL);
    const data = await res.json();
    const songs = data.songs || [];
    if (!songs.length) return;

    // Now playing = first song
    const now = songs[0];
    const newKey = songKey(now);
    document.getElementById('npArtist').textContent = now.artist || '—';
    document.getElementById('npTrack').textContent  = now.title  || '—';
    document.getElementById('npAlbum').textContent  = now.album  || '';

    // Fetch album art only when song changes
    if (newKey !== nowSongKey) {
      nowSongKey = newKey;
      fetchAlbumArt(now.artist, now.title, now.album).then(url => {
        document.getElementById('npArt').src = url;
      });
    } else if (!nowSongKey) {
      nowSongKey = newKey;
    }

    // Load now-playing rating
    const nowRatingRes = await fetch(`/api/ratings?songs=${encodeURIComponent(nowSongKey)}&token=${userToken}`);
    const nowRatings   = await nowRatingRes.json();
    applyNowRating(nowRatings[nowSongKey] || { userRating: null });

    // Previous tracks = rest
    const prev = songs.slice(1, 7);
    const keys = prev.map(songKey);
    const ratingsRes = await fetch(`/api/ratings?songs=${encodeURIComponent(keys.join('|'))}&token=${userToken}`);
    const ratings    = await ratingsRes.json();

    const el = document.getElementById('previousTracks');
    el.innerHTML = prev.map(s => {
      const k  = songKey(s);
      const r  = ratings[k] || { up: 0, down: 0, userRating: null };
      const ek = k.replace(/"/g, '&quot;');
      return `
        <div class="pt-item">
          <span class="pt-time">${timeAgo(Number(s.date))}</span>
          <span class="pt-name">${s.artist} — ${s.title}</span>
          <span class="pt-ratings">
            <button class="pt-rate-btn${r.userRating === 1  ? ' active-up'   : ''}" data-key="${ek}" data-r="1">👍 ${r.up}</button>
            <button class="pt-rate-btn${r.userRating === -1 ? ' active-down' : ''}" data-key="${ek}" data-r="-1">👎 ${r.down}</button>
          </span>
        </div>`;
    }).join('');

    el.querySelectorAll('.pt-rate-btn').forEach(b => {
      b.addEventListener('click', () => ratePrev(b.dataset.key, Number(b.dataset.r), b));
    });
  } catch (e) {}
}

async function fetchAll() {
  await fetchMeta();
  await fetchSongs();
}

function startMeta() {
  if (metaInterval) return;
  fetchAll();
  metaInterval = setInterval(fetchAll, 30000);
}

// ── Playback ──
function startPlayback() {
  setStatus('Connecting…', false);
  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(STREAM);
    hls.attachMedia(audio);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      audio.play().then(() => {
        playing = true; setPlayIcon(false);
        setStatus('LIVE', true); streamUrl.textContent = STREAM;
        startMeta();
      }).catch(() => setStatus('Playback blocked — try again', false));
    });
    hls.on(Hls.Events.ERROR, (e, d) => { if (d.fatal) setStatus('Stream unavailable', false); });
  } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    audio.src = STREAM;
    audio.play().then(() => {
      playing = true; setPlayIcon(false);
      setStatus('LIVE', true); streamUrl.textContent = STREAM;
      startMeta();
    }).catch(() => setStatus('Playback blocked — try again', false));
  } else {
    setStatus('HLS not supported in this browser', false);
  }
}

function togglePlay() {
  if (playing) {
    audio.pause(); playing = false;
    setPlayIcon(true); setStatus('Paused', false);
  } else if (hls || audio.src) {
    audio.play().then(() => { playing = true; setPlayIcon(false); setStatus('LIVE', true); });
  } else {
    startPlayback();
  }
}

audio.addEventListener('waiting', () => setStatus('Buffering…', false));
audio.addEventListener('playing', () => setStatus('LIVE', true));
audio.addEventListener('error',   () => setStatus('Stream unavailable', false));

document.getElementById('volume').addEventListener('input', e => { audio.volume = e.target.value; });
audio.volume = document.getElementById('volume').value;

// Load on page open
fetchAll();
metaInterval = setInterval(fetchAll, 30000);
