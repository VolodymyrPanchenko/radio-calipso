const STREAM_URL = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';

const audio = document.getElementById('radio-player');
const status = document.getElementById('player-status');
const playBtn = document.getElementById('play-btn');
const timeDisplay = document.getElementById('time-display');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');

const PLAY_ICON = '▶';
const PAUSE_ICON = '⏸';
const VOLUME_ICON = '\u{1F50A}';
const MUTED_ICON = '\u{1F507}';

playBtn.addEventListener('click', () => {
  if (audio.paused) audio.play();
  else audio.pause();
});

audio.addEventListener('play', () => {
  playBtn.textContent = PAUSE_ICON;
});
audio.addEventListener('pause', () => {
  playBtn.textContent = PLAY_ICON;
});
audio.addEventListener('timeupdate', () => {
  timeDisplay.textContent = `${formatTime(audio.currentTime)} / Live`;
});

volumeSlider.addEventListener('input', () => {
  audio.volume = Number(volumeSlider.value);
  audio.muted = false;
  volumeBtn.textContent = VOLUME_ICON;
});

volumeBtn.addEventListener('click', () => {
  audio.muted = !audio.muted;
  volumeBtn.textContent = audio.muted ? MUTED_ICON : VOLUME_ICON;
});

if (window.Hls && window.Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(STREAM_URL);
  hls.attachMedia(audio);
  hls.on(Hls.Events.ERROR, (event, data) => {
    if (data.fatal) {
      status.textContent = `Player error: ${data.details}`;
    }
  });
} else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
  audio.src = STREAM_URL;
} else {
  status.textContent = 'HLS playback is not supported in this browser.';
}
