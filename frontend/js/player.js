/**
 * STREAMFLIX - Video & Trailer Player Controller
 * Seamlessly plays official high-definition trailers via YouTube Embed for every title,
 * or direct MP4 streams with full custom HTML5 scrubbing and keyboard navigation.
 */

class StreamflixPlayer {
  constructor() {
    this.video = document.getElementById('mainVideo');
    this.trailerIframe = document.getElementById('trailerIframe');
    this.overlay = document.getElementById('playerOverlay');
    this.bottomBar = document.getElementById('playerBottomBar');
    this.wrapper = document.getElementById('playerWrapper');

    this.playBtn = document.getElementById('playBtn');
    this.centerAction = document.getElementById('centerAction');
    this.backBtn = document.getElementById('backBtn');

    this.progressContainer = document.getElementById('progressContainer');
    this.progressBar = document.getElementById('progressBar');
    this.bufferedBar = document.getElementById('bufferedBar');
    this.timeDisplay = document.getElementById('timeDisplay');

    this.volumeBtn = document.getElementById('volumeBtn');
    this.volumeSlider = document.getElementById('volumeSlider');

    this.speedBtn = document.getElementById('speedBtn');
    this.speedMenu = document.getElementById('speedMenu');

    this.pipBtn = document.getElementById('pipBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');

    this.unavailableBanner = document.getElementById('unavailableBanner');

    this.imdbId = new URLSearchParams(window.location.search).get('id');
    this.currentMovie = null;
    this.hideOverlayTimer = null;

    this.init();
  }

  async init() {
    if (!this.imdbId) {
      this.showUnavailable("No video specified. Please return to browse and select a title.");
      return;
    }

    // 1. Fetch metadata for the title
    try {
      this.currentMovie = await Api.getMovieDetails(this.imdbId);
      if (this.currentMovie && this.currentMovie.Title) {
        document.title = `${this.currentMovie.Title} - Watch on STREAMFLIX`;
        const titleEl = document.getElementById('playerTitle');
        if (titleEl) {
          titleEl.textContent = `${this.currentMovie.Title} (${this.currentMovie.Year || ''}) - Official Preview`;
        }
      }
    } catch (e) {
      console.warn('Could not fetch title metadata for player:', e);
    }

    // 2. Determine playback mode (direct MP4 or official Trailer embed)
    const playbackType = VideoSourceManager.getPlaybackType(this.imdbId);
    const sourceInfo = VideoSourceManager.getSource(this.imdbId);

    if (playbackType === 'mp4' && sourceInfo && sourceInfo.videoUrl) {
      this.playDirectMp4(sourceInfo.videoUrl);
    } else {
      // Play official high-definition trailer embed
      const title = this.currentMovie ? this.currentMovie.Title : 'Movie';
      const year = this.currentMovie ? this.currentMovie.Year : '';
      const trailerUrl = await VideoSourceManager.resolveTrailerUrl(this.imdbId, title, year);
      this.playTrailerEmbed(trailerUrl);
    }

    // 3. Attach common event listeners
    this.attachEventListeners();
    this.restoreVolumeSettings();
  }

  playTrailerEmbed(embedUrl) {
    if (this.wrapper) this.wrapper.classList.add('trailer-mode');
    if (this.unavailableBanner) this.unavailableBanner.style.display = 'none';
    if (this.video) this.video.style.display = 'none';
    if (this.bottomBar) this.bottomBar.style.display = 'none';

    if (this.trailerIframe) {
      this.trailerIframe.style.display = 'block';
      this.trailerIframe.src = embedUrl;
    }

    // Record initial watch in history
    if (this.currentMovie) {
      HistoryService.updateProgress(this.currentMovie, 1, 120);
    }
  }

  playDirectMp4(url) {
    if (this.wrapper) this.wrapper.classList.remove('trailer-mode');
    if (this.unavailableBanner) this.unavailableBanner.style.display = 'none';
    if (this.trailerIframe) this.trailerIframe.style.display = 'none';
    if (this.bottomBar) this.bottomBar.style.display = 'flex';

    if (this.video) {
      this.video.style.display = 'block';
      this.video.src = url;

      // Check saved progress
      const saved = HistoryService.getProgress(this.imdbId);
      if (saved && saved.currentTime > 5 && saved.currentTime < (saved.duration - 15)) {
        this.video.addEventListener('loadedmetadata', () => {
          this.promptResume(saved.currentTime);
        }, { once: true });
      } else {
        this.video.play().catch(() => {});
      }
    }
  }

  showUnavailable(message) {
    if (this.unavailableBanner) {
      this.unavailableBanner.style.display = 'flex';
      const desc = document.getElementById('unavailableDesc');
      if (desc) desc.textContent = message;
    }
  }

  promptResume(savedTime) {
    const formatted = Utils.formatTime(savedTime);
    if (confirm(`Resume playback from ${formatted}?`)) {
      this.video.currentTime = savedTime;
    }
    this.video.play().catch(() => {});
  }

  attachEventListeners() {
    // Back button
    if (this.backBtn) {
      this.backBtn.onclick = () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
      };
    }

    // HTML5 Video Play / Pause
    if (this.playBtn) {
      this.playBtn.onclick = () => this.togglePlay();
    }
    if (this.video) {
      this.video.onclick = () => this.togglePlay();
      this.video.ontimeupdate = () => this.onTimeUpdate();
      this.video.onprogress = () => this.onBufferProgress();
      this.video.onended = () => this.onEnded();
    }

    // Skip controls
    const skipBackBtn = document.getElementById('skipBackBtn');
    const skipForwardBtn = document.getElementById('skipForwardBtn');
    if (skipBackBtn) skipBackBtn.onclick = () => this.seek(-10);
    if (skipForwardBtn) skipForwardBtn.onclick = () => this.seek(10);

    // Scrubber scrubbing
    if (this.progressContainer) {
      this.progressContainer.onclick = (e) => this.scrub(e);
    }

    // Volume
    if (this.volumeSlider) {
      this.volumeSlider.oninput = (e) => this.onVolumeChange(e.target.value);
    }
    if (this.volumeBtn) {
      this.volumeBtn.onclick = () => this.toggleMute();
    }

    // Fullscreen
    if (this.fullscreenBtn) {
      this.fullscreenBtn.onclick = () => this.toggleFullscreen();
    }

    // Picture-in-picture
    if (this.pipBtn && document.pictureInPictureEnabled) {
      this.pipBtn.onclick = () => this.togglePip();
    } else if (this.pipBtn) {
      this.pipBtn.style.display = 'none';
    }

    // Playback Speed
    if (this.speedBtn && this.speedMenu) {
      this.speedBtn.onclick = (e) => {
        e.stopPropagation();
        this.speedMenu.classList.toggle('open');
      };

      this.speedMenu.querySelectorAll('.player-menu-option').forEach(opt => {
        opt.onclick = () => {
          const speed = parseFloat(opt.dataset.speed);
          this.setPlaybackSpeed(speed);
          this.speedMenu.classList.remove('open');
        };
      });
    }

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Mouse movement to show/hide overlay (for MP4 mode)
    document.addEventListener('mousemove', () => this.resetOverlayTimer());
  }

  togglePlay() {
    if (!this.video || !this.video.src) return;
    if (this.video.paused) {
      this.video.play();
      this.showCenterIndicator('▶');
      if (this.playBtn) this.playBtn.innerHTML = '❚❚';
    } else {
      this.video.pause();
      this.showCenterIndicator('❚❚');
      if (this.playBtn) this.playBtn.innerHTML = '▶';
    }
  }

  seek(deltaSeconds) {
    if (!this.video || isNaN(this.video.duration)) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + deltaSeconds));
    this.showCenterIndicator(deltaSeconds > 0 ? '+10s' : '-10s');
  }

  scrub(e) {
    if (!this.video || !this.video.duration) return;
    const rect = this.progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    this.video.currentTime = pos * this.video.duration;
  }

  onTimeUpdate() {
    if (!this.video || !this.video.duration) return;
    const current = this.video.currentTime;
    const duration = this.video.duration;

    const pct = (current / duration) * 100;
    if (this.progressBar) this.progressBar.style.width = `${pct}%`;
    if (this.timeDisplay) this.timeDisplay.textContent = `${Utils.formatTime(current)} / ${Utils.formatTime(duration)}`;

    if (this.currentMovie) {
      HistoryService.updateProgress(this.currentMovie, current, duration);
    }
  }

  onBufferProgress() {
    if (!this.video || !this.video.duration || !this.video.buffered.length) return;
    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    const pct = (bufferedEnd / this.video.duration) * 100;
    if (this.bufferedBar) this.bufferedBar.style.width = `${pct}%`;
  }

  onEnded() {
    if (this.playBtn) this.playBtn.innerHTML = '▶';
    this.showOverlay();
  }

  onVolumeChange(value) {
    const val = parseFloat(value);
    if (this.video) {
      this.video.volume = val;
      this.video.muted = (val === 0);
    }
    this.updateVolumeIcon();

    const settings = StorageManager.getItem(StorageManager.KEYS.SETTINGS, {});
    settings.volume = val;
    StorageManager.setItem(StorageManager.KEYS.SETTINGS, settings);
  }

  toggleMute() {
    if (!this.video) return;
    this.video.muted = !this.video.muted;
    this.updateVolumeIcon();
    if (this.volumeSlider) this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
  }

  updateVolumeIcon() {
    if (!this.volumeBtn) return;
    if (!this.video || this.video.muted || this.video.volume === 0) {
      this.volumeBtn.textContent = '🔇';
    } else if (this.video.volume < 0.5) {
      this.volumeBtn.textContent = '🔉';
    } else {
      this.volumeBtn.textContent = '🔊';
    }
  }

  restoreVolumeSettings() {
    const settings = StorageManager.getItem(StorageManager.KEYS.SETTINGS, {});
    if (typeof settings.volume === 'number' && this.video) {
      this.video.volume = settings.volume;
      if (this.volumeSlider) this.volumeSlider.value = settings.volume;
      this.updateVolumeIcon();
    }
  }

  setPlaybackSpeed(speed) {
    if (!this.video) return;
    this.video.playbackRate = speed;
    if (this.speedBtn) this.speedBtn.textContent = `${speed}x`;
    if (this.speedMenu) {
      this.speedMenu.querySelectorAll('.player-menu-option').forEach(opt => {
        opt.classList.toggle('selected', parseFloat(opt.dataset.speed) === speed);
      });
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.wrapper.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  async togglePip() {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (this.video) {
      await this.video.requestPictureInPicture();
    }
  }

  showCenterIndicator(text) {
    if (!this.centerAction) return;
    this.centerAction.textContent = text;
    this.centerAction.classList.add('show');
    setTimeout(() => {
      this.centerAction.classList.remove('show');
    }, 450);
  }

  showOverlay() {
    if (this.overlay) this.overlay.classList.remove('hidden');
    clearTimeout(this.hideOverlayTimer);
  }

  resetOverlayTimer() {
    this.showOverlay();
    if (this.video && !this.video.paused) {
      this.hideOverlayTimer = setTimeout(() => {
        if (!this.video.paused && this.overlay) {
          this.overlay.classList.add('hidden');
        }
      }, 3000);
    }
  }

  handleKeyDown(e) {
    if (['input', 'textarea'].includes(e.target.tagName.toLowerCase())) return;

    // In trailer mode, allow YouTube native keyboard controls
    if (this.wrapper && this.wrapper.classList.contains('trailer-mode')) {
      if (e.code === 'Escape' && document.fullscreenElement) {
        document.exitFullscreen();
      }
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.seek(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.seek(10);
        break;
      case 'KeyM':
        this.toggleMute();
        break;
      case 'KeyF':
        this.toggleFullscreen();
        break;
      case 'Escape':
        if (document.fullscreenElement) document.exitFullscreen();
        break;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.playerInstance = new StreamflixPlayer();
});
