const titleEl = document.getElementById('np-title');
const artistEl = document.getElementById('np-artist');
const albumEl = document.getElementById('np-album');
const qualitySourceEl = document.getElementById('np-quality-source');
const coverEl = document.getElementById('np-cover');
const recentListEl = document.getElementById('recent-list');
const upBtn = document.getElementById('thumb-up');
const downBtn = document.getElementById('thumb-down');
const upCountEl = document.getElementById('up-count');
const downCountEl = document.getElementById('down-count');

const COVER_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg';
const THUMB_UP = '\u{1F44D}';
const THUMB_DOWN = '\u{1F44E}';

let lastTrackKey = null;
let currentTrackKey = null;

function formatSampleRate(hz) {
  if (!hz) return '';
  const khz = hz / 100;
  return khz % 1 === 0 ? `${khz}kHz` : `${khz.toFixed(1)}kHz`;
}

function applyRatingState(counts, userRating) {
  upCountEl.textContent = counts.up ?? 0;
  downCountEl.textContent = counts.down ?? 0;
  upBtn.classList.toggle('active', userRating === 'up');
  downBtn.classList.toggle('active', userRating === 'down');
  upBtn.disabled = userRating === 'up';
  downBtn.disabled = userRating === 'down';
}

async function fetchRatings(trackKey) {
  try {
    const res = await fetch(`/api/ratings?track=${encodeURIComponent(trackKey)}`);
    if (!res.ok) return { up: 0, down: 0, userRating: null };
    return await res.json();
  } catch {
    return { up: 0, down: 0, userRating: null };
  }
}

async function loadRatings(trackKey) {
  const data = await fetchRatings(trackKey);
  applyRatingState(data, data.userRating);
}

async function submitRating(rating) {
  if (!currentTrackKey) return;
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track: currentTrackKey, rating }),
    });
    if (!res.ok) return;
    const data = await res.json();
    applyRatingState(data, data.userRating);
  } catch {
    // ignore transient errors
  }
}

upBtn.addEventListener('click', () => submitRating('up'));
downBtn.addEventListener('click', () => submitRating('down'));

function makeThumbButton(rating, ratingState, trackKey) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'thumb-btn--sm';
  const isActive = ratingState.userRating === rating;
  if (isActive) btn.classList.add('active');
  btn.disabled = isActive;
  btn.dataset.track = trackKey;
  btn.dataset.rating = rating;
  btn.textContent = `${rating === 'up' ? THUMB_UP : THUMB_DOWN} ${ratingState[rating] ?? 0}`;
  return btn;
}

async function renderRecent(data) {
  const entries = [];
  for (let i = 1; i <= 5; i++) {
    const artist = data[`prev_artist_${i}`] || '';
    const title = data[`prev_title_${i}`] || '';
    if (!artist && !title) continue;
    entries.push({ artist, title, trackKey: `${artist}|${title}` });
  }

  const ratings = await Promise.all(entries.map((entry) => fetchRatings(entry.trackKey)));

  recentListEl.innerHTML = '';
  entries.forEach((entry, idx) => {
    const ratingState = ratings[idx];
    const li = document.createElement('li');

    const artistSpan = document.createElement('span');
    artistSpan.className = 'recent-artist';
    artistSpan.textContent = `${entry.artist}:`;

    const titleSpan = document.createElement('span');
    titleSpan.className = 'recent-title';
    titleSpan.textContent = entry.title;

    const row = document.createElement('span');
    row.className = 'rating-row--compact';
    row.append(
      makeThumbButton('up', ratingState, entry.trackKey),
      makeThumbButton('down', ratingState, entry.trackKey),
    );

    li.append(artistSpan, titleSpan, row);
    recentListEl.appendChild(li);
  });
}

recentListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-rating]');
  if (!btn || btn.disabled) return;
  const track = btn.dataset.track;
  const rating = btn.dataset.rating;
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, rating }),
    });
    if (!res.ok) return;
    const result = await res.json();
    const siblings = btn.parentElement.querySelectorAll('button[data-rating]');
    siblings.forEach((sibling) => {
      const r = sibling.dataset.rating;
      const isActive = result.userRating === r;
      sibling.disabled = isActive;
      sibling.classList.toggle('active', isActive);
      sibling.textContent = `${r === 'up' ? THUMB_UP : THUMB_DOWN} ${result[r] ?? 0}`;
    });
  } catch {
    // ignore transient errors
  }
});

async function updateNowPlaying() {
  try {
    const res = await fetch('/api/now-playing');
    if (!res.ok) return;
    const data = await res.json();
    titleEl.textContent = data.title || '';
    artistEl.textContent = data.artist || '';
    albumEl.textContent = data.album || '';
    qualitySourceEl.textContent = data.bit_depth && data.sample_rate
      ? `Source quality: ${data.bit_depth}-bit ${formatSampleRate(data.sample_rate)}`
      : '';
    renderRecent(data);

    const trackKey = `${data.artist}|${data.title}`;
    currentTrackKey = trackKey;
    if (trackKey !== lastTrackKey) {
      lastTrackKey = trackKey;
      coverEl.src = `${COVER_URL}?t=${encodeURIComponent(trackKey)}`;
    }
    loadRatings(trackKey);
  } catch {
    // transient network error: keep showing the last known track
  }
}

updateNowPlaying();
setInterval(updateNowPlaying, 15000);
