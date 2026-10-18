let apiPromise;
function loadAPI() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('YouTube API timed out. Check the network and retry.')), 15000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(); };
    const old = document.getElementById('youtube-api');
    if (old) old.remove();
    const script = document.createElement('script');
    script.id = 'youtube-api'; script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => { clearTimeout(timer); reject(new Error('YouTube API could not load. Check the network and retry.')); };
    document.head.appendChild(script);
  }).catch(error => { apiPromise = null; throw error; });
  return apiPromise;
}

export class TelevisionPlayer {
  constructor(handlers) { this.handlers = handlers; this.player = null; this.initializing = null; this.muted = false; this.generation = 0; this.requestId = 0; }
  beginRequest(requestId) {
    // Invalidate first: destroying an iframe may itself dispatch a final event.
    this.generation++; this.requestId = requestId; this.ready = false;
    if (this.cancelCreate) this.cancelCreate();
    this.cancelCreate = null; this.initializing = null; this.expectedVideo = null; this.activePlaylist = null; this.queue = null; this.queueIndex = 0;
    if (this.player) { this.player.destroy(); this.player = null; }
  }
  ensure(source = {}) {
    if (this.player && this.ready) return Promise.resolve();
    if (this.initializing) return this.initializing;
    const generation = this.generation;
    this.initializing = this.create(generation, this.requestId, source).finally(() => { if (generation === this.generation) this.initializing = null; });
    return this.initializing;
  }
  async create(generation, requestId, source) {
    await loadAPI();
    if (generation !== this.generation) return;
    if (!document.getElementById('player')) {
      const host = document.createElement('div'); host.id = 'player'; document.getElementById('stage').prepend(host);
    }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('YouTube player did not become ready. Retry playback.')), 15000);
      this.cancelCreate = () => { clearTimeout(timer); resolve(); };
      const current = event => generation === this.generation && (!event.target || event.target === this.player);
      this.player = new window.YT.Player('player', {
        width: '100%', height: '100%',
        videoId: source.playlist ? 'videoseries' : source.videoId,
        playerVars: { ...(source.playlist ? { listType: 'playlist', list: source.playlist } : {}), autoplay: 0, controls: 1, playsinline: 1, origin: window.location.origin, fs: 1 },
        events: {
          onReady: event => {
            if (!current(event)) return;
            clearTimeout(timer); this.ready = true;
            const iframe = this.player.getIframe();
            iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
            iframe.setAttribute('title', 'YouTube television player');
            this.applyAudio(); resolve();
          },
          onStateChange: event => {
            if (!current(event) || !this.ready) return;
            const snapshot = this.snapshot();
            // Scheduled videos can change within one channel generation.
            if (event.data !== snapshot.state || this.expectedVideo && snapshot.videoId && snapshot.videoId !== this.expectedVideo) return;
            this.handlers.state(event.data, requestId);
          },
          onError: event => { if (current(event)) this.handlers.error(event.data, requestId); },
          onAutoplayBlocked: event => { if (current(event || {})) this.handlers.blocked(requestId); }
        }
      });
    });
  }
  applyAudio() { if (this.ready) { this.player.setVolume(100); this.muted ? this.player.mute() : this.player.unMute(); } }
  playlist(id, bookmark = {}, videos) {
    this.activePlaylist = id; this.expectedVideo = null;
    this.player.setLoop(true);
    this.player.setShuffle(false);
    const index = Number.isInteger(bookmark.index) && bookmark.index >= 0 && bookmark.index < 10000 ? bookmark.index : 0;
    const seconds = Number.isFinite(bookmark.seconds) && bookmark.seconds >= 0 && bookmark.seconds < 86400 ? bookmark.seconds : 0;
    if (videos?.length) {
      this.queue = videos; this.queueIndex = index < videos.length ? index : 0;
      this.expectedVideo = this.queue[this.queueIndex];
      this.player.loadVideoById({ videoId: this.expectedVideo, startSeconds: seconds });
    }
    else this.player.loadPlaylist({ list: id, listType: 'playlist', index, startSeconds: seconds });
    this.applyAudio();
  }
  video(videoId, offset = 0) { this.activePlaylist = null; this.queue = null; this.expectedVideo = videoId; this.player.loadVideoById({ videoId, startSeconds: offset }); this.applyAudio(); }
  start() { if (this.ready) { this.applyAudio(); this.player.playVideo(); } }
  toggle() { if (this.ready) this.player.getPlayerState() === 1 ? this.player.pauseVideo() : this.start(); }
  stop() { if (this.ready) this.player.stopVideo(); }
  mute() { this.muted = !this.muted; this.applyAudio(); return this.muted; }
  next() {
    if (!this.ready) return;
    if (!this.queue) { this.player.nextVideo(); return; }
    this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    this.expectedVideo = this.queue[this.queueIndex];
    this.player.loadVideoById({ videoId: this.expectedVideo, startSeconds: 0 }); this.applyAudio();
  }
  seek(time) { if (this.ready) this.player.seekTo(time, true); }
  snapshot() {
    if (!this.ready) return { state: -1, seconds: 0, duration: 0, index: 0, title: '', videoId: '', playlist: [] };
    const data = this.player.getVideoData() || {};
    return { state: this.player.getPlayerState(), seconds: this.player.getCurrentTime() || 0, duration: this.player.getDuration() || 0, index: this.queue ? this.queueIndex : Math.max(0, this.player.getPlaylistIndex()), title: data.title || '', videoId: data.video_id || '', playlist: this.queue || this.player.getPlaylist() || [] };
  }
}
