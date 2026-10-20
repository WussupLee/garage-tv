let hlsPromise;
function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (hlsPromise) return hlsPromise;
  hlsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js';
    script.onload = () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS.js did not initialize.'));
    script.onerror = () => reject(new Error('HLS.js could not load.'));
    document.head.append(script);
  }).catch(error => { hlsPromise = null; throw error; });
  return hlsPromise;
}

// One reusable video and one reusable audio element; only the active one has a source.
export class NativeMediaAdapter {
  constructor(handlers) {
    this.handlers = handlers;
    this.video = document.getElementById('native-video');
    this.audio = document.getElementById('native-audio');
    this.generation = 0;
    this.active = null;
    this.hls = null;
    this.retryTimer = null;
    this.retries = 0;
    this.started = false;
  }
  beginRequest() {
    this.generation++;
    clearTimeout(this.retryTimer);
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    for (const media of [this.video, this.audio]) {
      media.pause();
      media.removeAttribute('src');
      media.load();
      media.hidden = true;
      media.onplaying = media.onwaiting = media.onerror = media.onended = media.onloadedmetadata = null;
    }
    this.active = null;
    this.started = false;
    this.retries = 0;
  }
  async tune(source, requestId) {
    this.beginRequest();
    const generation = this.generation;
    const media = source.type === 'audio_stream' ? this.audio : this.video;
    this.active = media;
    media.hidden = false;
    const current = () => generation === this.generation;
    media.onplaying = () => {
      if (!current()) return;
      const started = () => { if (current()) { this.started = true; this.handlers.playing(requestId); } };
      if (media === this.video && typeof media.requestVideoFrameCallback === 'function') {
        media.requestVideoFrameCallback(started);
      } else started();
    };
    media.onwaiting = () => { if (current() && this.started) this.handlers.buffering(requestId); };
    media.onerror = () => { if (current()) this.reconnect(source, requestId, generation, 'Media error ' + (media.error?.code || 'unknown')); };
    media.onended = () => { if (current()) this.handlers.ended(requestId); };
    media.onloadedmetadata = () => {
      if (!current() || !Number.isFinite(source.startSeconds) || source.startSeconds <= 0) return;
      media.currentTime = Math.min(source.startSeconds, Number.isFinite(media.duration) ? Math.max(0, media.duration - 0.25) : source.startSeconds);
    };
    try {
      if (source.type === 'hls_stream') {
        if (media.canPlayType('application/vnd.apple.mpegurl')) {
          media.src = source.url;
        } else {
          const Hls = await loadHls();
          if (!current()) return;
          if (!Hls.isSupported()) throw new Error('HLS is unsupported in this browser.');
          this.hls = new Hls({ maxBufferLength: 12, backBufferLength: 0 });
          this.hls.on(Hls.Events.ERROR, (_event, data) => {
            if (current() && data.fatal) this.reconnect(source, requestId, generation, 'HLS: ' + data.details);
          });
          this.hls.loadSource(source.url);
          this.hls.attachMedia(media);
        }
      } else media.src = source.url;
      if (!current()) return;
      await this.play(requestId);
    } catch (error) {
      if (current()) this.handlers.error(error.message, requestId);
    }
  }
  async play(requestId) {
    if (!this.active) return;
    try { await this.active.play(); }
    catch (error) {
      if (error.name === 'NotAllowedError') this.handlers.blocked(requestId);
      else this.handlers.error(error.message, requestId);
    }
  }
  reconnect(source, requestId, generation, reason) {
    if (generation !== this.generation) return;
    if (this.retries >= 2) { this.handlers.error(reason, requestId); return; }
    this.retries++;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (generation !== this.generation) return;
      if (this.hls) this.hls.startLoad();
      else { this.active.load(); this.play(requestId); }
    }, this.retries * 1000);
  }
  toggle(requestId) { if (this.active) this.active.paused ? this.play(requestId) : this.active.pause(); }
  mute() {
    const media = this.active || this.video;
    this.video.muted = this.audio.muted = !media.muted;
    return media.muted;
  }
  snapshot() {
    return { state: this.active ? this.active.paused ? 2 : this.started ? 1 : 3 : -1,
      seconds: this.active?.currentTime || 0, duration: this.active?.duration || 0,
      readyState: this.active?.readyState || 0, networkState: this.active?.networkState || 0 };
  }
}
