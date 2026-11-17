/**
 * @file src/music-player.js
 * @description Lightweight background music player for Rocket Arena.
 * Add new songs by appending an entry to DEFAULT_MUSIC_TRACKS.
 */

const DEFAULT_MUSIC_TRACKS = [
  {
    id: 'midnight-dream',
    title: 'Midnight Dream',
    artist: 'Saavane',
    src: './music/Midnight Dream (Saavane).wav',
    artwork: './music/Saavane-Midnight Dream-Icon.png',
    licenseNote: 'Pixabay source reported by project owner; edited file, verify applicable terms before redistribution.'
  },
  {
    id: 'driftway',
    title: 'Driftway',
    artist: '-Xaf-',
    src: './music/driftway.mp3',
    artwork: './music/driftway-icon.png',
    licenseNote: 'Creative Commons Attribution (CC BY); retain appropriate attribution and source details.'
  }
];

export class MusicPlayer {
  constructor(options = {}) {
    this.tracks = (Array.isArray(options.tracks) ? options.tracks : DEFAULT_MUSIC_TRACKS)
      .filter((track) => track && track.id && track.title && track.artist && track.src)
      .map((track) => ({ ...track }));

    this.volume = Math.max(0, Math.min(1, Number(options.volume ?? 0.28)));
    this.muted = Boolean(options.muted);
    this.currentTrackIndex = -1;
    this.currentTrack = null;
    this.isPlaying = false;
    this.waitingForGesture = false;
    this.failedTrackIndexes = new Set();
    this.hideTimer = null;
    this._playRequestId = 0;
    this._startedOnce = false;

    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.volume = this.volume;
    this.audio.muted = this.muted;

    this._mount();
    this._bindAudioEvents();

    this._gestureHandler = () => {
      if (!this.waitingForGesture) return;
      this._removeGestureFallbacks();
      this._attemptPlay();
    };

    // Browsers may block audible autoplay until the first user gesture.
    this._installGestureFallbacks();
  }

  start() {
    if (!this.tracks.length || this.currentTrackIndex !== -1) return false;
    const firstIndex = Math.floor(Math.random() * this.tracks.length);
    this._loadTrack(firstIndex, true);
    return true;
  }

  _mount() {
    if (typeof document === 'undefined' || document.getElementById('ra-music-player')) return;

    const style = document.createElement('style');
    style.id = 'ra-music-player-styles';
    style.textContent = `
      #ra-music-player {
        position: fixed;
        right: max(22px, env(safe-area-inset-right));
        bottom: max(22px, env(safe-area-inset-bottom));
        z-index: 10050;
        width: min(370px, calc(100vw - 28px));
        padding: 13px;
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        color: #edf5ff;
        background: linear-gradient(135deg, rgba(10, 20, 36, .96), rgba(15, 30, 50, .94));
        border: 1px solid rgba(109, 203, 255, .35);
        border-radius: 14px;
        box-shadow: 0 12px 38px rgba(0, 0, 0, .42), 0 0 24px rgba(0, 174, 255, .10);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        opacity: 0;
        visibility: hidden;
        transform: translateY(12px) scale(.985);
        transition: opacity .22s ease, transform .22s ease, visibility .22s;
        pointer-events: none;
        font-family: 'Chakra Petch', 'Rajdhani', system-ui, sans-serif;
        user-select: none;
      }
      #ra-music-player.is-visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      #ra-music-player .ra-music-art {
        width: 58px;
        height: 58px;
        display: block;
        object-fit: cover;
        border-radius: 9px;
        background: #14263a;
        border: 1px solid rgba(255,255,255,.12);
      }
      #ra-music-player .ra-music-content { min-width: 0; }
      #ra-music-player .ra-music-eyebrow {
        color: #69cfff;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .16em;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      #ra-music-player .ra-music-title {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 800;
      }
      #ra-music-player .ra-music-artist {
        color: #9eb4c9;
        font-size: 11px;
        margin-top: 2px;
      }
      #ra-music-player .ra-music-progress-row {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) 34px;
        gap: 7px;
        align-items: center;
        margin-top: 8px;
      }
      #ra-music-player .ra-music-time {
        color: #9eb4c9;
        font: 10px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
        text-align: center;
      }
      #ra-music-player .ra-music-seek {
        width: 100%;
        height: 4px;
        margin: 0;
        cursor: pointer;
        accent-color: #48caff;
      }
      #ra-music-player .ra-music-actions {
        grid-column: 1 / -1;
        display: flex;
        justify-content: flex-end;
        gap: 7px;
        margin-top: -1px;
      }
      #ra-music-player .ra-music-button {
        appearance: none;
        border: 1px solid rgba(115, 190, 235, .28);
        border-radius: 7px;
        padding: 6px 10px;
        color: #dff5ff;
        background: rgba(255,255,255,.055);
        font: 700 10px/1.2 'Chakra Petch', 'Rajdhani', system-ui, sans-serif;
        letter-spacing: .04em;
        cursor: pointer;
        transition: background .15s ease, border-color .15s ease;
      }
      #ra-music-player .ra-music-button:hover {
        background: rgba(48, 177, 238, .18);
        border-color: rgba(105, 207, 255, .7);
      }
      #ra-music-player .ra-music-button:focus-visible,
      #ra-music-player .ra-music-seek:focus-visible {
        outline: 2px solid #69cfff;
        outline-offset: 3px;
      }
      #ra-music-autoplay-prompt {
        position: fixed;
        right: max(22px, env(safe-area-inset-right));
        bottom: max(22px, env(safe-area-inset-bottom));
        z-index: 10049;
        padding: 9px 12px;
        border: 1px solid rgba(109,203,255,.3);
        border-radius: 9px;
        background: rgba(8,17,30,.92);
        color: #cceeff;
        font: 11px/1.35 'Chakra Petch', 'Rajdhani', system-ui, sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,.3);
        pointer-events: none;
      }
      #ra-music-autoplay-prompt[hidden] { display: none; }
      @media (max-width: 520px) {
        #ra-music-player, #ra-music-autoplay-prompt {
          right: 12px;
          bottom: max(12px, env(safe-area-inset-bottom));
        }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement('section');
    root.id = 'ra-music-player';
    root.setAttribute('aria-label', 'Background music player');
    root.innerHTML = `
      <img class="ra-music-art" alt="Track artwork" />
      <div class="ra-music-content">
        <div class="ra-music-eyebrow">Now Playing</div>
        <div class="ra-music-title">Loading track...</div>
        <div class="ra-music-artist"></div>
        <div class="ra-music-progress-row">
          <span class="ra-music-time ra-music-current">0:00</span>
          <input class="ra-music-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Track progress" />
          <span class="ra-music-time ra-music-duration">0:00</span>
        </div>
      </div>
      <div class="ra-music-actions">
        <button class="ra-music-button ra-music-pause" type="button" title="Pause or resume music (K)">[K] Pause</button>
        <button class="ra-music-button ra-music-skip" type="button" title="Skip track (N)">[N] Skip</button>
      </div>
    `;
    document.body.appendChild(root);

    const prompt = document.createElement('div');
    prompt.id = 'ra-music-autoplay-prompt';
    prompt.textContent = 'Click or press any key to enable background music';
    prompt.hidden = true;
    document.body.appendChild(prompt);

    this.root = root;
    this.prompt = prompt;
    this.elements = {
      artwork: root.querySelector('.ra-music-art'),
      title: root.querySelector('.ra-music-title'),
      artist: root.querySelector('.ra-music-artist'),
      current: root.querySelector('.ra-music-current'),
      duration: root.querySelector('.ra-music-duration'),
      seek: root.querySelector('.ra-music-seek'),
      pause: root.querySelector('.ra-music-pause'),
      skip: root.querySelector('.ra-music-skip')
    };

    this.elements.pause.addEventListener('click', () => this.togglePause());
    this.elements.skip.addEventListener('click', () => this.skip());
    this.elements.seek.addEventListener('input', () => {
      const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
      if (duration > 0) {
        this.audio.currentTime = (Number(this.elements.seek.value) / 1000) * duration;
        this._updateProgress();
      }
    });
  }

  _bindAudioEvents() {
    this.audio.addEventListener('timeupdate', () => this._updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this._updateProgress());
    this.audio.addEventListener('durationchange', () => this._updateProgress());
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this._renderState();
    });
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this._renderState();
    });
    this.audio.addEventListener('ended', () => this.skip());
    this.audio.addEventListener('error', () => this._handleTrackError());
  }

  _installGestureFallbacks() {
    if (typeof window === 'undefined' || this._gestureFallbacksInstalled) return;
    this._gestureFallbacksInstalled = true;
    window.addEventListener('pointerdown', this._gestureHandler, true);
    window.addEventListener('keydown', this._gestureHandler, true);
  }

  _removeGestureFallbacks() {
    if (typeof window === 'undefined' || !this._gestureFallbacksInstalled) return;
    this._gestureFallbacksInstalled = false;
    window.removeEventListener('pointerdown', this._gestureHandler, true);
    window.removeEventListener('keydown', this._gestureHandler, true);
  }

  _chooseNextIndex(excludeIndex = this.currentTrackIndex) {
    const candidates = this.tracks
      .map((_, index) => index)
      .filter((index) => index !== excludeIndex && !this.failedTrackIndexes.has(index));

    if (candidates.length) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Retry failed files only after every other available track has been tried.
    const playableIndexes = this.tracks
      .map((_, index) => index)
      .filter((index) => !this.failedTrackIndexes.has(index));

    // If only one track is playable, let it loop rather than retry broken files.
    if (playableIndexes.length === 1 && playableIndexes[0] === excludeIndex) {
      return excludeIndex;
    }

    return -1;
  }

  _loadTrack(index, autoplay = true) {
    if (index < 0 || index >= this.tracks.length) return;

    this._playRequestId++;
    this.currentTrackIndex = index;
    this.currentTrack = this.tracks[index];
    this.waitingForGesture = false;
    this.audio.pause();
    this.audio.src = this.currentTrack.src;
    this.audio.load();
    this._renderTrack();
    this._updateProgress();

    if (autoplay) this._attemptPlay();
  }

  async _attemptPlay() {
    if (!this.currentTrack) return false;
    const requestId = ++this._playRequestId;
    this.audio.muted = this.muted;
    this.audio.volume = this.volume;

    try {
      await this.audio.play();
      if (requestId !== this._playRequestId) return false;
      this.waitingForGesture = false;
      this._startedOnce = true;
      this._removeGestureFallbacks();
      this._renderState();
      this.show(5);
      return true;
    } catch (error) {
      if (requestId !== this._playRequestId) return false;
      if (error && error.name === 'NotAllowedError') {
        this.waitingForGesture = true;
        this._installGestureFallbacks();
        if (this.prompt) this.prompt.hidden = false;
        return false;
      }
      if (error && error.name === 'AbortError') return false;
      this._handleTrackError();
      return false;
    }
  }

  _handleTrackError() {
    if (this.currentTrackIndex < 0 || this.failedTrackIndexes.has(this.currentTrackIndex)) return;
    this.failedTrackIndexes.add(this.currentTrackIndex);

    const nextIndex = this._chooseNextIndex(this.currentTrackIndex);
    if (nextIndex >= 0 && nextIndex !== this.currentTrackIndex) {
      this._loadTrack(nextIndex, true);
      return;
    }

    if (this.prompt) {
      this.prompt.hidden = false;
      this.prompt.textContent = 'Music files could not be loaded. Check the /music folder.';
    }
  }

  skip() {
    if (this.tracks.length <= 1) {
      if (this.currentTrack) {
        this.audio.currentTime = 0;
        this._attemptPlay();
      }
      return;
    }

    const nextIndex = this._chooseNextIndex(this.currentTrackIndex);
    if (nextIndex >= 0) this._loadTrack(nextIndex, true);
  }

  togglePause() {
    if (!this.currentTrack) {
      this.start();
      return;
    }

    if (this.audio.paused) {
      this._attemptPlay();
    } else {
      this.audio.pause();
      this.show(5);
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.audio.muted = this.muted;
    return this.muted;
  }

  show(seconds = 5) {
    if (!this.root) return;
    if (this.hideTimer) window.clearTimeout(this.hideTimer);
    this.root.classList.add('is-visible');
    if (this.prompt) this.prompt.hidden = true;
    this.hideTimer = window.setTimeout(() => {
      this.root.classList.remove('is-visible');
      this.hideTimer = null;
    }, Math.max(1, Number(seconds) || 5) * 1000);
  }

  reopen() {
    this.show(10);
  }

  _renderTrack() {
    if (!this.elements || !this.currentTrack) return;
    const track = this.currentTrack;
    this.elements.title.textContent = track.title;
    this.elements.artist.textContent = track.artist;
    this.elements.artwork.src = track.artwork || '';
    this.elements.artwork.alt = `${track.title} artwork`;
    this.elements.artwork.style.visibility = track.artwork ? 'visible' : 'hidden';
    this.elements.artwork.onerror = () => {
      this.elements.artwork.style.visibility = 'hidden';
    };
  }

  _renderState() {
    if (!this.elements) return;
    this.elements.pause.textContent = this.audio.paused ? '[K] Play' : '[K] Pause';
    this.elements.pause.title = this.audio.paused ? 'Resume music (K)' : 'Pause music (K)';
  }

  _updateProgress() {
    if (!this.elements) return;
    const current = Number.isFinite(this.audio.currentTime) ? this.audio.currentTime : 0;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    this.elements.current.textContent = this._formatTime(current);
    this.elements.duration.textContent = this._formatTime(duration);
    this.elements.seek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : '0';
    this.elements.seek.disabled = duration <= 0;
  }

  _formatTime(seconds) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const remainder = String(safe % 60).padStart(2, '0');
    return `${minutes}:${remainder}`;
  }
}

if (typeof window !== 'undefined') {
  window.RLModules = window.RLModules || {};
  window.RLModules.Music = { MusicPlayer, DEFAULT_MUSIC_TRACKS };
}
