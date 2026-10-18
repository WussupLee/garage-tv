// Presentation only. The real player supplies request-scoped events.
export class StationPresentation {
  constructor(onChange = () => {}, timers = globalThis) {
    this.onChange = onChange; this.timers = timers; this.pending = new Map();
    this.state = { mode: 'launch', requestId: 0, requested: null, current: null, osdVisible: false };
  }
  emit() { this.onChange({ ...this.state }); }
  cancel(name) { this.timers.clearTimeout(this.pending.get(name)); this.pending.delete(name); }
  cancelAll() { for (const name of this.pending.keys()) this.cancel(name); }
  schedule(name, delay, callback) {
    this.cancel(name);
    this.pending.set(name, this.timers.setTimeout(() => { this.pending.delete(name); callback(); }, delay));
  }
  request(requestId, channelId) {
    this.cancelAll();
    this.state = { mode: 'tuning', requestId, requested: channelId, current: null, osdVisible: true };
    this.emit(); this.schedule('tune', 20000, () => this.unavailable(requestId));
  }
  playing(requestId) {
    if (requestId !== this.state.requestId || !['tuning', 'playing', 'buffering', 'blocked', 'paused'].includes(this.state.mode)) return;
    this.cancel('buffer');
    if (this.state.mode === 'playing') return; // Repeated PLAYING must not extend identification.
    this.cancel('tune'); this.state.mode = 'playing'; this.state.current = this.state.requested; this.state.osdVisible = true;
    this.emit();
    this.schedule('osd', 3000, () => { this.state.osdVisible = false; this.emit(); });
  }
  buffering(requestId) {
    if (requestId !== this.state.requestId || this.state.mode !== 'playing' || this.pending.has('buffer')) return;
    this.schedule('buffer', 500, () => {
      this.cancel('osd'); this.state.mode = 'buffering'; this.state.osdVisible = true; this.emit();
    });
  }
  unavailable(requestId) {
    if (requestId !== this.state.requestId) return;
    this.cancelAll(); this.state.mode = 'unavailable'; this.state.current = null; this.state.osdVisible = true; this.emit();
  }
  blocked(requestId, paused = false) {
    if (requestId !== this.state.requestId || this.state.mode === 'unavailable') return;
    this.cancelAll(); this.state.mode = paused ? 'paused' : 'blocked'; this.state.current = null; this.state.osdVisible = true; this.emit();
  }
  directory(requestId) {
    if (requestId !== this.state.requestId) return;
    this.cancelAll(); this.state.mode = 'directory'; this.state.current = null; this.emit();
  }
  destroy() { this.cancelAll(); this.onChange = () => {}; }
}
