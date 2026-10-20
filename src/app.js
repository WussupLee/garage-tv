import { CONFIG_KEY, LEGACY_CONFIG_KEY, BOOKMARK_KEY, LAST_START_KEY, SOURCE_TYPES, activeSource, upgradeChannelDefaults, clone, validateConfig, startupChannel, surfChannels, configured, readStorage, writeStorage, shuffledQueue } from './config.js';
import { broadcastAt, orderedPrograms } from './schedule.js';
import { TelevisionPlayer } from './player.js';
import { GamepadInput, keyboardInput, moveFocus } from './input.js';
import { StationPresentation } from './presentation.js';
import { NativeMediaAdapter } from './native-media.js';
import { externalDestination } from './external-site.js';
import { LocalMediaLibrary } from './local-media.js';

const $ = id => document.getElementById(id);
const number = id => String(id).padStart(3, '0');
let config, tuned = null, selected = null, panel = null;
let loadVersion = 0, scheduledKey = '', degraded = false, demo = false;
let playlistSnapshots = {};
let lastPresentationMode = 'launch';
let nativeQueueIndex = 0;
let calibrationOpen = false;
let padInfo = { supported: typeof navigator.getGamepads === 'function', pads: [] };
const localMedia = new LocalMediaLibrary();
const compatibility = new Map();
let tuneStartedAt = 0;
let queueErrors = 0;
let bookmarks = readStorage(BOOKMARK_KEY, {});
if (!bookmarks || typeof bookmarks !== 'object' || Array.isArray(bookmarks)) bookmarks = {};
let lastStarts = readStorage(LAST_START_KEY, {});
if (!lastStarts || typeof lastStarts !== 'object' || Array.isArray(lastStarts)) lastStarts = {};
const sessionQueues = new Map();
const sessionMarks = new Map();
const events = [];
function log(message) {
  events.unshift(new Date().toLocaleTimeString() + ' ' + message);
  events.splice(30); $('event-log').textContent = events.join('\n');
}
function status(message) { $('status').textContent = message; }
function notice(message) { $('settings-notice').textContent = message; log(message); }
function textElement(tag, text, className) { const e = document.createElement(tag); e.textContent = text; if (className) e.className = className; return e; }
function channel() { return config && config.channels.find(c => c.id === tuned); }
function source() { return activeSource(channel()); }
function youtubeSource() { return ['youtube_playlist', 'youtube_queue'].includes(source()?.type); }
function nativeQueueSource() { return source()?.type === 'video_queue'; }
function queueItemId(item) { return item?.videoId || item?.url || ''; }
function surfableChannels() {
  const override = new URLSearchParams(location.search).get('surf');
  return surfChannels(config.channels, override === 'all' ? 'all' : config.settings?.surfPolicy);
}
function queueKey(c) {
  const item = activeSource(c);
  return item.type === 'youtube_queue' ? 'queue:' + c.id + ':' + item.items.map(video => video.videoId).join(',') :
    item.type === 'video_queue' ? 'video-queue:' + c.id + ':' + item.items.map(video => video.url).join(',') : 'playlist:' + item.url;
}
function sourceItems(c) {
  const item = activeSource(c);
  if (['youtube_queue', 'video_queue'].includes(item.type)) return item.items;
  return playlistSnapshots[item.url]?.videos || [];
}
function playbackKey(c) { return sourceItems(c).length ? queueKey(c) : activeSource(c).url; }
function prepareQueue(c, { renew = false, recordStart = false } = {}) {
  const item = activeSource(c);
  const key = playbackKey(c);
  if (!renew && sessionQueues.has(key)) return sessionQueues.get(key);
  const base = sourceItems(c);
  const avoid = renew ? (youtubeSource() ? player.snapshot().videoId : queueItemId(sessionQueues.get(key)?.[nativeQueueIndex])) : lastStarts[key];
  const queue = item.shuffleEachLaunch ? shuffledQueue(base, Math.random, avoid) : base.map(entry => ({ ...entry }));
  sessionQueues.set(key, queue);
  if (recordStart && item.shuffleEachLaunch && queue[0]) {
    lastStarts[key] = queueItemId(queue[0]);
    try { writeStorage(LAST_START_KEY, lastStarts); } catch (error) { log(error.message); }
  }
  return queue;
}
function setPlayerInteraction(enabled) {
  const active = !!enabled && youtubeSource();
  $('app').dataset.playerInput = active ? 'player' : 'tv';
  $('quick-player').textContent = active ? 'TV CONTROLS' : 'PLAYER';
  $('quick-player').setAttribute('aria-pressed', String(active));
  player.setInteractive(active);
  if (!active) $('app').focus({ preventScroll: true });
}
function zliveService() { return config?.services.find(service => { try { return new URL(service.url).hostname === 'zlive.st'; } catch (_) { return false; } }); }
function scheduleNow(c = channel()) { return c && c.sourceType === 'youtube_playlist' && !degraded && !demo ? broadcastAt(c, config.seed) : null; }
function scheduleKey(now) { return now.cycle + ':' + now.index; }
const presentation = new StationPresentation(renderPresentation);
function renderPresentation(s = presentation.state) {
  const c = config && config.channels.find(item => item.id === s.requested);
  const waiting = s.mode === 'tuning' || s.mode === 'buffering';
  const failed = s.mode === 'unavailable';
  const needsInput = s.mode === 'blocked' || s.mode === 'paused';
  const youtube = !!c && ['youtube_playlist', 'youtube_queue'].includes(activeSource(c)?.type);
  $('app').dataset.mode = s.mode;
  $('app').dataset.youtube = youtube ? 'active' : 'inactive';
  $('app').dataset.youtubeLayout = youtube && (waiting || needsInput || failed) ? 'split' : youtube ? 'watching' : 'none';
  $('video-cover').hidden = youtube || ['playing', 'buffering', 'paused'].includes(s.mode);
  $('launch').hidden = s.mode !== 'launch' || !!panel;
  $('channel-overlay').toggleAttribute('hidden', youtube || !!panel || s.mode === 'launch' || !(s.osdVisible || s.mode === 'directory' || c?.sourceType === 'audio_stream' && s.mode === 'playing'));
  $('overlay-box').setAttribute('height', waiting ? '184' : '126');
  $('overlay-number').textContent = c ? number(c.id) : '';
  const titleSize = c && c.title.length > 13 ? 24 : 28;
  $('overlay-title').setAttribute('font-size', String(titleSize));
  fitText($('overlay-title'), c ? c.title : '', 250, titleSize, 700);
  $('overlay-status').textContent = waiting ? s.mode.toUpperCase() : '';
  $('playback-message').toggleAttribute('hidden', youtube || !!panel || !(failed || needsInput));
  $('playback-text').textContent = failed ? 'CHANNEL UNAVAILABLE' : '';
  $('start-playback').textContent = failed ? 'A RETRY' : 'PRESS A TO START';
  $('start-playback').setAttribute('y', failed ? '326' : '278');
  $('start-playback').setAttribute('aria-label', failed ? 'Retry channel' : 'Start playback');
  $('failure-guide').toggleAttribute('hidden', !failed);
  $('playback-bug').hidden = youtube || !!panel || s.mode !== 'playing' || s.osdVisible || c?.sourceType === 'audio_stream';
  $('quick-controls').hidden = !!panel || ['launch', 'directory'].includes(s.mode);
  $('station-card').hidden = !youtube || !!panel || s.mode === 'launch' || s.mode === 'playing';
  if (youtube && c) {
    $('station-card-number').textContent = number(c.id);
    $('station-card-title').textContent = c.title;
    $('station-card-status').textContent = failed ? 'CHANNEL UNAVAILABLE' : needsInput ? 'PRESS A TO START' : s.mode.toUpperCase();
    $('station-card-art').textContent = activeSource(c).loadingArtwork || c.title;
    $('station-start').hidden = !needsInput && !failed;
  }
  $('directory').hidden = s.mode !== 'directory' || !!panel;
  syncDirectoryFrame(s.mode === 'directory');
  if (failed && lastPresentationMode !== 'unavailable') {
    // A timeout must also prevent a late-ready iframe from starting sound behind the error.
    player.beginRequest(loadVersion);
    native.beginRequest();
    recordCompatibility('unsupported', 'Playback failed or timed out.');
  }
  lastPresentationMode = s.mode;
  refreshGuide();
  if (!panel) status((c ? number(c.id) + ' ' + c.title + '. ' : '') + (failed ? 'Channel unavailable. A retry. B guide. S settings.' : needsInput ? 'Press A to start.' : s.mode));
}
const player = new TelevisionPlayer({
  blocked: requestId => { if (requestId !== loadVersion) return; presentation.blocked(requestId); recordCompatibility('requires_interaction', 'Autoplay was blocked.'); log('YouTube reported autoplay blocked.'); },
  state: (state, requestId) => {
    if (requestId !== loadVersion) return;
    if (!channel() || (!youtubeSource() && !demo)) return;
    if (state === 1) {
      const now = scheduleNow();
      const snapshot = player.snapshot();
      if (now && snapshot.videoId === now.program.videoId && snapshot.duration > 0 && Math.abs(snapshot.duration - now.program.duration) > 3) {
        degraded = true;
        log('Duration mismatch: scheduled ' + now.program.duration + 's, player reports ' + Math.round(snapshot.duration) + 's. Synchronization suspended for this tune.');
      }
      presentation.playing(requestId); recordCompatibility('desktop_playing', 'YouTube PLAYING event.');
    }
    if (state === 3) presentation.buffering(requestId);
    if (state === 2) presentation.blocked(requestId, true);
    if (state === 0) { if (player.queue) advanceQueue(); else if (scheduleNow()) loadScheduled(true); }
  },
  error: (code, requestId) => {
    if (requestId !== loadVersion) return;
    if (!youtubeSource() && !demo) return;
    const labels = { 2: 'Invalid video parameters', 5: 'HTML5 playback failed', 100: 'Video removed or private', 101: 'Owner blocks embedding', 150: 'Owner blocks embedding', 153: 'YouTube could not verify the playback origin/referrer' };
    const reason = labels[code] || 'YouTube error ' + code;
    log(reason);
    const queueLength = sourceItems(channel()).length;
    if (youtubeSource() && queueLength && ++queueErrors < queueLength) {
      log('Skipping unavailable queue item.'); advanceQueue(); refreshGuide(); return;
    }
    presentation.unavailable(requestId);
  }
});
const native = new NativeMediaAdapter({
  playing: requestId => { if (requestId !== loadVersion) return; presentation.playing(requestId); recordCompatibility('desktop_playing', 'Native playback started.'); },
  buffering: requestId => { if (requestId === loadVersion) presentation.buffering(requestId); },
  blocked: requestId => { if (requestId === loadVersion) { presentation.blocked(requestId); recordCompatibility('requires_interaction', 'Press A to start playback.'); } },
  error: (message, requestId) => { if (requestId === loadVersion) { log(message); presentation.unavailable(requestId); } },
  ended: requestId => {
    if (requestId !== loadVersion) return;
    if (source()?.type === 'local_media') {
      const next = localMedia.next(tuned);
      if (next) native.tune({ type: next.type.startsWith('audio/') ? 'audio_stream' : 'local_media', url: next.url }, requestId);
    } else if (nativeQueueSource()) advanceNativeQueue();
  }
});

function recordCompatibility(state, detail) {
  if (tuned === null || !channel() || demo) return;
  const current = compatibility.get(tuned) || {};
  compatibility.set(tuned, { ...current, status: state, detail,
    startupMs: state === 'desktop_playing' && tuneStartedAt && current.startupMs === undefined ? Math.round(performance.now() - tuneStartedAt) : current.startupMs,
    playerInitialized: ['desktop_playing', 'requires_interaction'].includes(state) || current.playerInitialized || false });
  if (panel === 'diagnostics') renderCompatibility();
}
function renderCompatibility() {
  if (!config) return;
  const host = $('compatibility-list'); host.replaceChildren();
  const hlsNative = !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl');
  const hlsFallback = !!(window.MediaSource || window.ManagedMediaSource);
  for (const c of config.channels) {
    const item = activeSource(c);
    const result = compatibility.get(c.id) || {};
    const row = document.createElement('div'); row.className = 'compatibility-row';
    const typeSupport = item.type === 'hls_stream' ? hlsNative ? 'native HLS' : hlsFallback ? 'HLS.js possible; codec/CORS unverified' : 'HLS unsupported' :
      item.type === 'video_queue' ? 'HTML video; HTTPS MP4 candidates' :
      item.type === 'audio_stream' ? 'HTML audio; codec unverified' :
      item.type === 'local_media' ? 'local file picker; session only' :
      item.type === 'external_site' ? 'opens provider in this tab' : 'YouTube IFrame API';
    const lines = [
      number(c.id) + ' ' + c.title + ' · ' + (result.status || item.verification || 'untested').replaceAll('_', ' ').toUpperCase(),
      'Source: ' + (item.type === 'youtube_queue' ? item.items.map(video => 'https://www.youtube.com/watch?v=' + video.videoId).join(', ') : item.url || (item.type === 'local_media' ? localMedia.current(c.id)?.name : '') || 'not configured'),
      'Type: ' + item.type + ' · Browser: ' + typeSupport,
      'Player initialized: ' + (result.playerInitialized ? 'yes' : 'unconfirmed') +
        ' · Autoplay: ' + (result.status === 'requires_interaction' ? 'interaction required' : result.status === 'desktop_playing' ? 'started in this browser' : 'untested'),
      'Startup: ' + (result.startupMs === undefined ? 'unmeasured' : result.startupMs + ' ms') +
        ' · Iframe: ' + (['youtube_playlist', 'youtube_queue'].includes(item.type) ? 'YouTube controlled' : item.type === 'external_site' ? 'not used' : 'not applicable'),
      'Queue: ' + (['youtube_playlist', 'youtube_queue', 'video_queue'].includes(item.type) ? sourceItems(c).length + ' items · shuffle each launch ' + (item.shuffleEachLaunch ? 'on' : 'off') : 'not applicable'),
      'Surf: ' + (item.surfEligible ? 'included' : 'guide only') + ' · Ads: ' + item.adClass.replaceAll('_', ' ') +
        (item.contentLicense ? ' · Rights: ' + item.contentLicense : ''),
      'Player instances: ' + player.createCount + ' · reused switches: ' + player.reuseCount,
      'Channel switch: ' + (item.type === 'external_site' ? 'leaves Garage TV' : 'inside Garage TV') +
        (result.detail ? ' · ' + result.detail : '')
    ];
    for (const line of lines) row.append(textElement('div', line));
    const button = textElement('button', 'Test ' + number(c.id)); button.type = 'button';
    button.onclick = () => {
      if (item.type === 'external_site') {
        compatibility.set(c.id, { status: 'opens_externally', detail: 'Open the provider link from the channel; provider playback cannot be measured here.', sourceType: item.type, url: item.url, playerInitialized: false });
        renderCompatibility(); return;
      }
      closePanel(); tune(c.id);
    };
    row.append(button); host.append(row);
  }
}

function modeLabel() {
  if (demo) return 'YouTube diagnostic video · not channel programming';
  if (!channel()) return '';
  if (source()?.type === 'external_site') return 'External destination · selecting a link leaves Garage TV';
  if (source()?.type === 'local_media') return 'Local files · choose files again after reloading';
  if (source()?.type === 'video_queue') return 'Direct ad-free rotation · ' + (source().attribution || 'licensed source');
  if (!configured(channel())) return 'Source missing · configure in Settings';
  if (source()?.type === 'hls_stream' || source()?.type === 'audio_stream') return 'Continuous stream · provider controls its programming';
  if (source()?.type === 'youtube_queue') return source().shuffleEachLaunch ? 'Shuffled rotation · session position · official YouTube footage' : 'Continuous rotation · saved position · official YouTube footage';
  if (degraded) return 'Continuous playback · virtual sync suspended for this tune';
  return scheduleNow() ? 'Virtual schedule · experimental · verified durations required' : 'Continuous playlist · resumes saved position · does not advance while away';
}

function remember() {
  const c = channel();
  if (c?.sourceType === 'video_queue' && !demo) {
    const snapshot = native.snapshot();
    sessionMarks.set(playbackKey(c), { index: nativeQueueIndex, seconds: snapshot.seconds });
    return;
  }
  if (!c || !['youtube_playlist', 'youtube_queue'].includes(c.sourceType) || c.schedule || demo || !player.ready) return;
  const key = playbackKey(c);
  if (player.activePlaylist !== key) return;
  const snapshot = player.snapshot();
  if (!snapshot.videoId) return;
  if (activeSource(c).shuffleEachLaunch) {
    sessionMarks.set(key, { playlist: key, videoId: snapshot.videoId, seconds: snapshot.seconds });
    return;
  }
  bookmarks[c.id] = { playlist: key, index: snapshot.index, seconds: snapshot.seconds };
  try { writeStorage(BOOKMARK_KEY, bookmarks); } catch (error) { log(error.message); }
}

async function tune(id) {
  const c = config.channels.find(item => item.id === id && item.enabled);
  if (!c) return;
  remember();
  const version = ++loadVersion;
  tuneStartedAt = performance.now();
  tuned = id; selected = id; scheduledKey = ''; degraded = false; demo = false; queueErrors = 0;
  nativeQueueIndex = 0;
  const selectedSource = activeSource(c);
  setPlayerInteraction(false);
  player.beginRequest(version, ['youtube_playlist', 'youtube_queue'].includes(selectedSource.type));
  native.beginRequest();
  presentation.request(version, id);
  renderDirectory(); log('Requested ' + number(id) + ' ' + c.title);
  compatibility.set(id, { status: 'untested', detail: 'Tuning', sourceType: selectedSource.type, url: selectedSource.url, playerInitialized: false });
  if (!selectedSource.enabled) { presentation.unavailable(version); return; }
  if (selectedSource.type === 'external_site') {
    recordCompatibility('opens_externally', 'Garage TV presents a same-tab link. Provider playback is outside this app.');
    presentation.directory(version); return;
  }
  if (selectedSource.type === 'local_media') {
    const file = localMedia.current(id);
    if (!file) { presentation.unavailable(version); log('Select local files in Settings first.'); return; }
    native.tune({ type: file.type.startsWith('audio/') ? 'audio_stream' : 'local_media', url: file.url }, version);
    return;
  }
  if (selectedSource.type === 'video_queue') {
    const queue = prepareQueue(c, { recordStart: true });
    if (!queue.length) { presentation.unavailable(version); return; }
    const mark = sessionMarks.get(playbackKey(c));
    nativeQueueIndex = Math.max(0, Math.min(queue.length - 1, Number.isInteger(mark?.index) ? mark.index : 0));
    native.tune({ type: 'local_media', url: queue[nativeQueueIndex].url, startSeconds: mark?.seconds || 0 }, version);
    return;
  }
  if (!configured(c)) { presentation.unavailable(version); return; }
  if (['hls_stream', 'audio_stream'].includes(selectedSource.type)) {
    native.tune(selectedSource, version);
    return;
  }
  try {
    const queue = prepareQueue(c, { recordStart: true });
    const videos = queue.map(item => item.videoId);
    await player.ensure(c.schedule ? { videoId: scheduleNow(c).program.videoId } : videos?.length ? { videoId: videos[0] } : { playlist: c.playlist });
    if (version !== loadVersion || presentation.state.mode === 'unavailable') return;
    if (c.schedule) loadScheduled(true);
    else {
      const key = playbackKey(c);
      const saved = selectedSource.shuffleEachLaunch ? sessionMarks.get(key) : bookmarks[id];
      const mark = saved && saved.playlist === key ? { ...saved } : {};
      if (selectedSource.shuffleEachLaunch && mark.videoId) mark.index = videos.indexOf(mark.videoId);
      player.playlist(key, mark.index >= 0 ? mark : {}, videos);
    }
    // Some embeds cue the video without emitting PLAYING or onAutoplayBlocked.
    // Make the existing A start action available instead of waiting on black.
    setTimeout(() => {
      if (version !== loadVersion || presentation.state.mode !== 'tuning' || !player.ready) return;
      if (player.snapshot().state === 1) presentation.playing(version);
      else presentation.blocked(version);
    }, 3000);
  } catch (error) {
    if (version !== loadVersion) return;
    log(error.message); presentation.unavailable(version);
  }
}

function advanceQueue() {
  const c = channel();
  if (!c || !player.queue) return;
  const item = activeSource(c);
  const wrapped = player.queueIndex + 1 >= player.queue.length;
  if (wrapped && item.shuffleEachLaunch) {
    const queue = prepareQueue(c, { renew: true });
    player.next(queue.map(entry => entry.videoId));
  } else player.next();
  refreshGuide();
}

function advanceNativeQueue() {
  const c = channel();
  if (!c || !nativeQueueSource()) return;
  let queue = prepareQueue(c);
  const wrapped = nativeQueueIndex + 1 >= queue.length;
  if (wrapped && activeSource(c).shuffleEachLaunch) queue = prepareQueue(c, { renew: true });
  nativeQueueIndex = wrapped ? 0 : nativeQueueIndex + 1;
  const item = queue[nativeQueueIndex];
  if (!item) { presentation.unavailable(loadVersion); return; }
  native.tune({ type: 'local_media', url: item.url }, loadVersion);
  refreshGuide();
}

function loadScheduled(force = false) {
  const now = scheduleNow();
  if (!now || !player.ready) return;
  const key = scheduleKey(now);
  if (force || scheduledKey !== key) { scheduledKey = key; player.video(now.program.videoId, now.offset); log('Schedule: ' + now.program.title + ' @ ' + Math.floor(now.offset) + 's'); }
}

function skip() {
  if (source()?.type === 'local_media') {
    const file = localMedia.next(tuned);
    if (file) tune(tuned);
    return;
  }
  if (nativeQueueSource()) { advanceNativeQueue(); return; }
  if (!youtubeSource() && !demo || !player.ready) return;
  const c = channel();
  if (c.schedule && !demo) {
    const programs = orderedPrograms(c, config.seed);
    const current = player.snapshot().videoId;
    const index = programs.findIndex(p => p.videoId === current);
    degraded = true; player.video(programs[(index + 1) % programs.length].videoId);
    log('Skipped scheduled video; sync suspended until retune.');
  } else if (demo) { player.start(); }
  else advanceQueue();
  status(modeLabel());
}

function changeChannel(delta) {
  const list = surfableChannels();
  const index = list.findIndex(c => c.id === tuned);
  const start = index < 0 ? (delta > 0 ? -1 : 0) : index;
  const c = list[(start + delta + list.length) % list.length];
  closePanel(); tune(c.id);
}

function programInfo(c) {
  if (!c.enabled) return { now: 'UNAVAILABLE', next: '-' };
  const selectedSource = activeSource(c);
  if (selectedSource.type === 'external_site') return { now: c.id === 0 ? 'SELECT SERVICE' : 'OPEN PROVIDER', next: '-' };
  if (selectedSource.type === 'audio_stream' || selectedSource.type === 'hls_stream') return { now: selectedSource.name || c.title, next: '-' };
  if (selectedSource.type === 'local_media') return { now: localMedia.current(c.id)?.name || 'SELECT FILES', next: '-' };
  if (selectedSource.type === 'video_queue' && sourceItems(c).length) {
    const queue = prepareQueue(c);
    const index = c.id === tuned ? nativeQueueIndex : 0;
    return { now: queue[index]?.title || 'DIRECT ROTATION', next: queue[(index + 1) % queue.length]?.title || '-' };
  }
  if (['youtube_playlist', 'youtube_queue'].includes(selectedSource.type) && !c.schedule && sourceItems(c).length) {
    if (c.id !== tuned || !player.ready || player.activePlaylist !== playbackKey(c)) return { now: 'SHUFFLED ROTATION', next: '-' };
    const index = player.snapshot().index;
    const queue = prepareQueue(c);
    return { now: queue[index]?.title || 'SHUFFLED ROTATION', next: queue[(index + 1) % queue.length]?.title || '-' };
  }
  const point = broadcastAt(c, config.seed);
  if (point && !(c.id === tuned && degraded)) return { now: point.program.title, next: point.next.title };
  const snap = c.id === presentation.state.current && !demo ? player.snapshot() : null;
  return { now: snap && snap.title ? snap.title : 'PROGRAM UNKNOWN', next: '-' };
}

const measure = document.createElement('canvas').getContext('2d');
function fitText(node, value, width, size, weight = 400) {
  measure.font = weight + ' ' + size + 'px "Garage Mono"';
  let text = value;
  if (measure.measureText(text).width > width) {
    while (text && measure.measureText(text + '…').width > width) text = text.slice(0, -1);
    text += '…';
  }
  node.textContent = text;
}
function refreshGuide() {
  if (!config) return;
  const rows = $('guide-rows');
  const rowHeight = config.channels.length > 5 ? 350 / 6 : 70;
  rows.style.setProperty('--row-height', rowHeight + 'px');
  // One listbox owns focus; only existing text nodes change during metadata refresh.
  config.channels.forEach(c => {
    let row = rows.querySelector('[data-channel="' + c.id + '"]');
    if (!row) {
      row = document.createElement('div'); row.className = 'guide-row'; row.dataset.channel = c.id; row.id = 'guide-channel-' + c.id; row.setAttribute('role', 'option');
      row.innerHTML = '<svg viewBox="0 0 1152 70" aria-hidden="true"><text class="on-marker bold" x="18" y="43" font-size="18">ON</text><text data-part="number" class="bold" x="62" y="45" font-size="28"></text><text data-part="station" class="bold" x="154" y="43" font-size="24"></text><text data-part="now" x="476" y="43" font-size="22"></text><text data-part="next" x="832" y="43" font-size="22"></text></svg>';
      row.addEventListener('click', () => { selected = c.id; confirmGuide(); }); rows.append(row);
    }
    const svg = row.querySelector('svg');
    svg.setAttribute('viewBox', '0 0 1152 ' + rowHeight);
    row.querySelectorAll('text').forEach(text => text.setAttribute('y', rowHeight / 2 + (text.dataset.part === 'number' ? 10 : 8)));
    const info = programInfo(c);
    const current = !demo && c.id === (presentation.state.mode === 'directory' ? tuned : presentation.state.current);
    row.classList.toggle('is-tuned', current); row.classList.toggle('is-selected', c.id === selected);
    row.setAttribute('aria-selected', String(c.id === selected)); row.setAttribute('aria-disabled', String(!c.enabled));
    row.setAttribute('aria-label', number(c.id) + ' ' + c.title + (current ? ', on' : '') + '. Now ' + info.now + '. Next ' + info.next);
    row.querySelector('[data-part=number]').textContent = number(c.id);
    fitText(row.querySelector('[data-part=station]'), c.title, 290, 24, 700);
    fitText(row.querySelector('[data-part=now]'), info.now, 320, 22);
    fitText(row.querySelector('[data-part=next]'), info.next, 302, 22);
    rows.append(row);
  });
  Array.from(rows.children).forEach(row => { if (!config.channels.some(c => c.id === Number(row.dataset.channel))) row.remove(); });
  if (selected !== null) rows.setAttribute('aria-activedescendant', 'guide-channel-' + selected);
  if (panel === 'guide') {
    rows.querySelector('.is-selected')?.scrollIntoView({ block: 'nearest' });
    // Keep the scroll window aligned to whole rows at 720p.
    rows.scrollTop = Math.round(rows.scrollTop / rowHeight) * rowHeight;
  }
}

function confirmGuide() {
  if (!config.channels.find(c => c.id === selected)?.enabled) return;
  const id = selected;
  const alreadyPlaying = (presentation.state.current === id && ['playing', 'buffering'].includes(presentation.state.mode)) ||
    (presentation.state.mode === 'directory' && tuned === id);
  closePanel(); if (!alreadyPlaying) tune(id);
}
function moveGuide(delta) {
  const list = config.channels;
  const index = Math.max(0, list.findIndex(c => c.id === selected));
  selected = list[Math.max(0, Math.min(list.length - 1, index + delta))].id;
  refreshGuide(); status('Guide. ' + number(selected) + ' ' + list.find(c => c.id === selected).title);
}

function closePanel() {
  if (!panel) return;
  $(panel).hidden = true; panel = null;
  renderPresentation(); $('app').focus({ preventScroll: true });
}
function openPanel(name) {
  if (panel === name) { closePanel(); return; }
  closePanel(); setPlayerInteraction(false); panel = name;
  $(name).hidden = false;
  if (name === 'guide') {
    selected = presentation.state.current ?? tuned; refreshGuide(); $('guide-rows').focus({ preventScroll: true });
    status('Guide. ' + number(selected) + ' ' + config.channels.find(c => c.id === selected)?.title);
  } else { if (name === 'settings') { renderChannelSelect(tuned); renderViewingSettings(); } if (name === 'diagnostics') renderCompatibility(); $(name).querySelector('button').focus(); }
  renderPresentation();
}

function renderDirectory() {
  $('service-links').replaceChildren();
  const destinations = tuned === 0 ? config.services :
    (channel()?.sources || []).filter(item => item.enabled && item.type === 'external_site' && item.url).map(externalDestination).filter(Boolean);
  destinations.forEach(destination => {
    const link = textElement('a', 'OPEN ' + destination.name, 'service-link');
    link.href = destination.url;
    $('service-links').append(link);
  });
  if (!destinations.length) $('service-links').append(textElement('p', 'NO DESTINATION · ADD ONE IN SETTINGS'));
  syncDirectoryFrame(presentation.state.mode === 'directory');
}

function syncDirectoryFrame(active) {
  const frame = $('live-sports-frame');
  const service = activeSource(channel())?.type === 'external_site' && tuned === 0 && config && zliveService();
  if (active && service) {
    if (frame.dataset.url !== service.url) { frame.src = service.url; frame.dataset.url = service.url; }
    frame.hidden = false;
  } else {
    frame.hidden = true;
    if (frame.dataset.url) { frame.src = 'about:blank'; delete frame.dataset.url; }
  }
  $('external-note').hidden = !!(active && service);
}

function save(next) {
  const validated = validateConfig(next);
  writeStorage(CONFIG_KEY, validated);
  config = validated;
  renderDirectory(); refreshGuide(); renderServiceEditor(); renderViewingSettings(); fitStage();
}

function renderViewingSettings() {
  if (!config || !$('surf-policy')) return;
  $('surf-policy').value = config.settings.surfPolicy;
  const scale = effectiveScreenScale();
  $('fit-value').textContent = 'Screen fit ' + Math.round(scale * 100) + '% · offset ' + config.settings.screenOffsetX + ', ' + config.settings.screenOffsetY;
  $('calibration-value').textContent = $('fit-value').textContent;
}

function updateViewing(mutator) {
  const next = clone(config); mutator(next.settings); save(next);
}

function adjustScreen(scaleDelta = 0, xDelta = 0, yDelta = 0) {
  updateViewing(settings => {
    const current = settings.screenScale ?? effectiveScreenScale();
    settings.screenScale = Math.max(0.85, Math.min(1, Math.round((current + scaleDelta) * 100) / 100));
    settings.screenOffsetX = Math.max(-80, Math.min(80, settings.screenOffsetX + xDelta));
    settings.screenOffsetY = Math.max(-80, Math.min(80, settings.screenOffsetY + yDelta));
  });
}

function openCalibration() {
  closePanel(); calibrationOpen = true; $('screen-calibration').hidden = false; renderViewingSettings(); $('calibration-smaller').focus();
}
function closeCalibration() { calibrationOpen = false; $('screen-calibration').hidden = true; $('app').focus({ preventScroll: true }); }

function renderChannelSelect(id) {
  $('channel-select').replaceChildren();
  config.channels.forEach(c => { const option = textElement('option', number(c.id) + ' · ' + c.title); option.value = c.id; $('channel-select').append(option); });
  $('channel-select').value = id === undefined ? (tuned === null ? config.channels[0].id : tuned) : id;
  if (!$('channel-select').value) $('channel-select').value = config.channels[0].id;
  loadChannelForm();
}
function loadChannelForm() {
  const c = config.channels.find(item => item.id === Number($('channel-select').value));
  if (!c) return;
  $('channel-title').value = c.title; $('channel-description').value = c.description;
  $('channel-enabled').checked = c.enabled;
  $('source-select').replaceChildren();
  c.sources.forEach((item, index) => {
    const option = textElement('option', (index + 1) + ' · ' + (item.name || item.type));
    option.value = index; $('source-select').append(option);
  });
  $('source-select').value = c.activeSource;
  loadSourceForm();
}
function loadSourceForm() {
  const c = config.channels.find(item => item.id === Number($('channel-select').value));
  const item = c?.sources[Number($('source-select').value)];
  if (!item) return;
  $('source-type').value = item.type;
  $('source-name').value = item.name;
  $('channel-playlist').value = item.type === 'youtube_playlist' && item.url ? 'https://www.youtube.com/playlist?list=' + item.url : item.url;
  $('channel-schedule').value = item.schedule ? JSON.stringify(item.schedule, null, 2) : '';
  $('channel-queue').value = item.items ? JSON.stringify(item.items, null, 2) : '';
  $('source-enabled').checked = item.enabled;
  $('source-shuffle').checked = item.shuffleEachLaunch;
  $('source-surf').checked = item.surfEligible;
  $('source-ad-class').value = item.adClass;
  $('source-license').value = item.contentLicense;
  $('source-attribution').value = item.attribution;
  $('source-artwork').value = item.loadingArtwork;
  updateSourceFields();
}
function updateSourceFields() {
  const type = $('source-type').value;
  $('youtube-settings').hidden = type !== 'youtube_playlist';
  $('queue-settings').hidden = !['youtube_queue', 'video_queue'].includes(type);
  $('local-settings').hidden = type !== 'local_media';
  $('source-url-label').hidden = type === 'local_media' || ['youtube_queue', 'video_queue'].includes(type);
  $('shuffle-setting').hidden = !['youtube_playlist', 'youtube_queue', 'video_queue'].includes(type);
  $('queue-help').textContent = type === 'video_queue' ? 'Use HTTPS direct video URLs with title, provider, license, and attribution. Every item is validated before saving.' : 'Use official public YouTube videos. Queue order is playback order; kind is full, partial, or highlights. Garage TV does not control ads or embedding permission.';
  $('channel-playlist').placeholder = type === 'youtube_playlist' ? 'https://youtube.com/playlist?list=…' :
    type === 'hls_stream' ? 'https://example.com/live.m3u8' : 'https://example.com/';
}
function clearServiceForm() { $('service-index').value = ''; $('service-name').value = ''; $('service-url').value = ''; $('save-service').textContent = 'Add service'; }
function renderServiceEditor() {
  $('service-edit-list').replaceChildren();
  config.services.forEach((service, index) => {
    const row = textElement('div', '', 'service-edit-row'); row.append(textElement('div', service.name + ' · ' + service.url));
    const edit = textElement('button', 'Edit ' + service.name); edit.type = 'button';
    edit.onclick = () => { $('service-index').value = index; $('service-name').value = service.name; $('service-url').value = service.url; $('save-service').textContent = 'Save service'; $('service-name').focus(); };
    const remove = textElement('button', 'Remove ' + service.name); remove.type = 'button';
    remove.onclick = () => { try { const next = clone(config); next.services.splice(index, 1); save(next); clearServiceForm(); notice('Service removed and saved.'); $('service-name').focus(); } catch (error) { notice(error.message); } };
    row.append(edit, remove); $('service-edit-list').append(row);
  });
}

function importConfig(raw) {
  try {
    save(JSON.parse(raw)); bookmarks = {}; writeStorage(BOOKMARK_KEY, bookmarks);
    renderChannelSelect(); notice('Configuration imported and saved.');
    const first = startupChannel(surfableChannels()) || config.channels.find(c => c.enabled);
    tune(first.id);
  } catch (error) { notice('Import failed: ' + error.message); }
}

function changeSource(delta) {
  const c = channel();
  if (!c || c.sources.length < 2) return;
  const next = clone(config);
  const updated = next.channels.find(item => item.id === c.id);
  let index = updated.activeSource;
  do { index = (index + delta + updated.sources.length) % updated.sources.length; } while (!updated.sources[index].enabled && index !== updated.activeSource);
  updated.activeSource = index;
  save(next); tune(c.id);
}

function action(command) {
  if (!config) return;
  if (calibrationOpen) {
    if (command === 'back' || command === 'confirm') closeCalibration();
    else if (command === 'left') adjustScreen(0, -4, 0);
    else if (command === 'right') adjustScreen(0, 4, 0);
    else if (command === 'up') adjustScreen(0, 0, -4);
    else if (command === 'down') adjustScreen(0, 0, 4);
    return;
  }
  if (command === 'fullscreen') { toggleFullscreen(); return; }
  if (command === 'back') { if (panel) closePanel(); else openPanel('guide'); return; }
  if (['guide', 'settings', 'diagnostics', 'controls'].includes(command)) { openPanel(command); return; }
  if (command === 'previous' || command === 'next') { panel === 'guide' ? moveGuide(command === 'next' ? 1 : -1) : changeChannel(command === 'next' ? 1 : -1); return; }
  if (command === 'mute') { toggleMute(); return; }
  if (command === 'play') { togglePlay(); return; }
  if (command === 'confirm') {
    if (panel === 'guide') { confirmGuide(); return; }
    const active = document.activeElement;
    if (active && active.matches('button,a,input,select,textarea') && active.getClientRects().length) active.click();
    else if (['unavailable', 'blocked', 'paused'].includes(presentation.state.mode)) startPlayback();
    else if (source()?.type === 'external_site') { const first = $('service-links').querySelector('a'); if (first) first.focus(); }
    return;
  }
  if (['up', 'down', 'left', 'right'].includes(command)) {
    if (panel) {
      if (panel === 'guide') { if (command === 'up' || command === 'down') moveGuide(command === 'down' ? 1 : -1); }
      else if (document.activeElement.tagName === 'SELECT') {
        const select = document.activeElement; select.selectedIndex = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + (command === 'down' || command === 'right' ? 1 : -1))); select.dispatchEvent(new Event('change'));
      } else moveFocus($(panel), command === 'down' || command === 'right' ? 1 : -1);
    } else if (command === 'up' || command === 'down') changeChannel(command === 'down' ? 1 : -1);
    else if (source()?.type === 'external_site') moveFocus($('directory'), command === 'right' ? 1 : -1);
  }
}

function toggleMute() { const muted = youtubeSource() || demo ? player.mute() : native.mute(); $('toggle-mute').textContent = muted ? 'Unmute' : 'Mute'; $('toggle-mute').setAttribute('aria-pressed', String(muted)); }
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      if (!document.documentElement.requestFullscreen) throw new Error('Browser fullscreen is unavailable.');
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    log('Fullscreen: ' + error.message);
    status('Fullscreen could not start. Try the browser fullscreen control.');
  }
}
function syncFullscreen() {
  const label = document.fullscreenElement ? 'EXIT FULL SCREEN' : 'FULL SCREEN';
  $('toggle-fullscreen').textContent = label;
  $('directory-fullscreen').textContent = label;
  fitStage();
}
document.addEventListener('fullscreenchange', syncFullscreen);
function togglePlay() {
  if (['hls_stream', 'audio_stream', 'local_media', 'video_queue'].includes(source()?.type) && !demo) { native.toggle(loadVersion); return; }
  if (!player.ready) { startPlayback(); return; }
  if (player.snapshot().state !== 1 && scheduleNow()) loadScheduled(true);
  else player.toggle();
}

$('channel-down').onclick = () => changeChannel(-1); $('channel-up').onclick = () => changeChannel(1);
$('toggle-guide').onclick = () => openPanel('guide');
$('quick-channel-down').onclick = () => changeChannel(-1);
$('quick-channel-up').onclick = () => changeChannel(1);
$('quick-guide').onclick = () => openPanel('guide');
$('quick-player').onclick = () => setPlayerInteraction($('app').dataset.playerInput !== 'player');
$('station-start').onclick = () => startPlayback();
$('open-settings').onclick = $('edit-services').onclick = () => openPanel('settings');
$('open-diagnostics').onclick = () => openPanel('diagnostics');
$('playback-bug').onclick = () => openPanel('controls');
$('guide-tune').onclick = confirmGuide; $('guide-close').onclick = closePanel;
$('failure-guide').onclick = () => openPanel('guide');
$('app').addEventListener('contextmenu', event => { event.preventDefault(); openPanel('controls'); });
$('app').addEventListener('keydown', event => { if (event.key === 'Tab' && !panel && event.target === $('app')) { event.preventDefault(); openPanel('controls'); } });
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = closePanel; });
$('toggle-play').onclick = togglePlay; $('toggle-mute').onclick = toggleMute;
$('toggle-fullscreen').onclick = $('directory-fullscreen').onclick = toggleFullscreen;
$('skip-video').onclick = () => skip();
$('next-source').onclick = () => changeSource(1);
$('surf-policy').onchange = () => updateViewing(settings => { settings.surfPolicy = $('surf-policy').value; });
$('fit-smaller').onclick = $('calibration-smaller').onclick = () => adjustScreen(-0.01);
$('fit-larger').onclick = $('calibration-larger').onclick = () => adjustScreen(0.01);
$('fit-center').onclick = $('calibration-center').onclick = () => updateViewing(settings => { settings.screenOffsetX = 0; settings.screenOffsetY = 0; });
$('open-calibration').onclick = openCalibration;
$('calibration-left').onclick = () => adjustScreen(0, -4, 0);
$('calibration-right').onclick = () => adjustScreen(0, 4, 0);
$('calibration-up').onclick = () => adjustScreen(0, 0, -4);
$('calibration-down').onclick = () => adjustScreen(0, 0, 4);
$('calibration-done').onclick = closeCalibration;
function startPlayback() {
  if (!channel()) return;
  if (presentation.state.mode === 'unavailable') { if (demo) $('test-youtube').click(); else tune(tuned); return; }
  if (!configured(channel()) && !demo) { tune(tuned); return; }
  if (['hls_stream', 'audio_stream', 'local_media', 'video_queue'].includes(source()?.type) && !demo) { native.play(loadVersion); return; }
  if (player.ready) {
    if (scheduleNow()) loadScheduled(true); else player.start();
  } else if (demo) $('test-youtube').click();
  else tune(tuned);
}
$('start-playback').onclick = startPlayback;
$('channel-select').onchange = loadChannelForm;
$('source-select').onchange = loadSourceForm;
$('source-type').onchange = updateSourceFields;
$('channel-form').onsubmit = event => {
  event.preventDefault();
  try {
    const id = Number($('channel-select').value); const next = clone(config); const c = next.channels.find(item => item.id === id);
    c.title = $('channel-title').value; c.description = $('channel-description').value; c.enabled = $('channel-enabled').checked;
    const index = Number($('source-select').value);
    const item = c.sources[index];
    item.type = $('source-type').value; item.name = $('source-name').value;
    item.url = ['local_media', 'youtube_queue', 'video_queue'].includes(item.type) ? '' : $('channel-playlist').value;
    item.enabled = $('source-enabled').checked;
    item.shuffleEachLaunch = $('source-shuffle').checked;
    item.surfEligible = $('source-surf').checked;
    item.adClass = $('source-ad-class').value;
    item.contentLicense = $('source-license').value;
    item.attribution = $('source-attribution').value;
    item.loadingArtwork = $('source-artwork').value;
    item.schedule = item.type !== 'youtube_playlist' || !$('channel-schedule').value.trim() ? null : JSON.parse($('channel-schedule').value);
    item.items = ['youtube_queue', 'video_queue'].includes(item.type) ? JSON.parse($('channel-queue').value) : null;
    item.verification = 'untested';
    c.activeSource = index;
    save(next); renderChannelSelect(id); notice('Channel ' + number(id) + ' saved.');
    if (id === tuned) tune(c.enabled ? id : config.channels.find(item => item.enabled).id);
  } catch (error) { notice('Channel not saved: ' + error.message); }
};
$('add-channel').onclick = () => {
  try {
    const next = clone(config);
    const used = new Set(next.channels.map(c => c.id));
    const id = Array.from({ length: 1000 }, (_, i) => i).find(i => !used.has(i));
    if (id === undefined) throw new Error('No channel number is available.');
    next.channels.push({ id, order: next.channels.length, title: 'NEW CHANNEL', description: '', enabled: false,
      activeSource: 0, sources: [{ type: 'external_site', name: '', url: '', enabled: true, verification: 'untested' }] });
    save(next); renderChannelSelect(id); notice('Channel ' + number(id) + ' added. Configure and enable it.');
  } catch (error) { notice(error.message); }
};
$('remove-channel').onclick = () => {
  try {
    const id = Number($('channel-select').value);
    const next = clone(config); next.channels = next.channels.filter(c => c.id !== id);
    save(next); localMedia.clear(id); renderChannelSelect(next.channels[0].id);
    notice('Channel ' + number(id) + ' removed.');
    if (tuned === id) tune(config.channels.find(c => c.enabled).id);
  } catch (error) { notice('Channel not removed: ' + error.message); }
};
function moveChannel(delta) {
  const id = Number($('channel-select').value);
  const next = clone(config); const index = next.channels.findIndex(c => c.id === id);
  const target = index + delta;
  if (target < 0 || target >= next.channels.length) return;
  [next.channels[index], next.channels[target]] = [next.channels[target], next.channels[index]];
  next.channels.forEach((c, i) => { c.order = i; });
  save(next); renderChannelSelect(id); notice('Channel order saved.');
}
$('channel-earlier').onclick = () => moveChannel(-1);
$('channel-later').onclick = () => moveChannel(1);
$('add-source').onclick = () => {
  try {
    const id = Number($('channel-select').value); const next = clone(config);
    const c = next.channels.find(item => item.id === id);
    if (c.sources.length >= 20) throw new Error('Maximum 20 sources per channel.');
    c.sources.push({ type: 'external_site', name: '', url: '', enabled: true, verification: 'untested' });
    c.activeSource = c.sources.length - 1;
    save(next); renderChannelSelect(id); notice('Source added. Enter its type and URL.');
  } catch (error) { notice(error.message); }
};
$('remove-source').onclick = () => {
  try {
    const id = Number($('channel-select').value); const next = clone(config);
    const c = next.channels.find(item => item.id === id);
    if (c.sources.length === 1) throw new Error('A channel needs at least one source.');
    c.sources.splice(Number($('source-select').value), 1);
    c.activeSource = Math.min(c.activeSource, c.sources.length - 1);
    save(next); renderChannelSelect(id); notice('Source removed.');
    if (tuned === id) tune(id);
  } catch (error) { notice(error.message); }
};
$('local-files').onchange = event => {
  const id = Number($('channel-select').value);
  const count = localMedia.setFiles(id, event.target.files);
  notice(count + ' local media file(s) ready for channel ' + number(id) + '.');
  if (id === tuned && source()?.type === 'local_media') tune(id);
};
$('service-form').onsubmit = event => {
  event.preventDefault();
  try {
    const next = clone(config); const service = { name: $('service-name').value, url: $('service-url').value };
    const index = $('service-index').value;
    if (index === '') next.services.push(service); else next.services[Number(index)] = service;
    save(next); clearServiceForm(); notice('Service saved.');
  } catch (error) { notice('Service not saved: ' + error.message); }
};
$('cancel-service').onclick = clearServiceForm;
$('export-config').onclick = () => { $('config-json').value = JSON.stringify(config, null, 2); $('config-json').focus(); $('config-json').select(); notice('Configuration ready to copy or download.'); };
$('download-config').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'garage-tv-config.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('import-config').onclick = () => importConfig($('config-json').value);
$('import-file').onchange = () => {
  const file = $('import-file').files[0]; if (!file) return;
  if (file.size > 2000000) { notice('Configuration file exceeds 2 MB.'); return; }
  const reader = new FileReader(); reader.onload = () => importConfig(reader.result); reader.onerror = () => notice('Could not read the file.'); reader.readAsText(file);
};
$('test-youtube').onclick = async () => {
  remember(); const version = ++loadVersion;
  demo = true; degraded = false; scheduledKey = '';
  player.beginRequest(version); native.beginRequest(); presentation.request(version, tuned); closePanel();
  log('YouTube diagnostic video; not channel programming.');
  try { await player.ensure({ videoId: 'M7lc1UVf-VE' }); if (version !== loadVersion || presentation.state.mode === 'unavailable') return; player.video('M7lc1UVf-VE'); }
  catch (error) { if (version === loadVersion) { log(error.message); presentation.unavailable(version); } }
};

window.addEventListener('error', event => { log('Browser error: ' + event.message); status('A browser error occurred. See Diagnostics and reload if controls stop responding.'); });
window.addEventListener('unhandledrejection', event => { log('Unhandled error: ' + (event.reason && event.reason.message || event.reason)); status('An operation failed. See Diagnostics.'); });
window.addEventListener('pagehide', remember);
window.addEventListener('pageshow', event => { if (event.persisted && tuned !== null) tune(tuned); });
document.addEventListener('visibilitychange', () => { if (document.hidden) remember(); else if (scheduleNow() && player.snapshot().state === 1) loadScheduled(true); });
keyboardInput(action);
new GamepadInput(action, info => { padInfo = info; });
function updateClock() { $('clock').textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
updateClock();
setInterval(() => {
  updateClock();
  if (scheduleNow() && player.ready && player.snapshot().state === 1) loadScheduled();
  if (panel === 'diagnostics') {
    const vv = window.visualViewport;
    $('diagnostic-output').textContent = JSON.stringify({ userAgent: navigator.userAgent, layoutViewport: [innerWidth, innerHeight], visualViewport: vv ? { width: vv.width, height: vv.height, offsetLeft: vv.offsetLeft, offsetTop: vv.offsetTop, scale: vv.scale } : null, devicePixelRatio, fullscreen: !!document.fullscreenElement, screenFit: config.settings, focused: document.hasFocus(), storage: 'Configuration stored in this browser; export to transfer', tuned, mode: modeLabel(), player: youtubeSource() ? player.snapshot() : native.snapshot(), gamepad: padInfo }, null, 2);
  }
}, 1000);
setInterval(() => { refreshGuide(); remember(); }, 15000);

async function boot() {
  const launchTimer = setTimeout(() => { if (presentation.state.mode === 'launch') { presentation.state.mode = 'tuning'; presentation.state.osdVisible = true; presentation.emit(); } }, 600);
  try {
    const response = await fetch('./data/default-config.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Default configuration could not load (' + response.status + ').');
    const defaults = validateConfig(await response.json());
    try {
      const snapshots = await fetch('./data/playlist-snapshots.json');
      if (snapshots.ok) playlistSnapshots = (await snapshots.json()).playlists || {};
    } catch (error) { log('Playlist snapshots could not load; using playlist feeds. ' + error.message); }
    const saved = readStorage(CONFIG_KEY, null) || readStorage(LEGACY_CONFIG_KEY, null);
    try { config = saved ? upgradeChannelDefaults(saved, defaults) : defaults;
      if (saved) { try { writeStorage(CONFIG_KEY, config); } catch (error) { log(error.message); } } }
    catch (error) { config = defaults; log('Saved configuration invalid; using deployable defaults. ' + error.message); }
    renderChannelSelect(config.channels[0].id); renderDirectory(); renderServiceEditor(); refreshGuide(); renderCompatibility();
    const initial = startupChannel(surfableChannels());
    await tune(initial ? initial.id : (config.channels.find(c => c.id >= 1 && c.enabled) || config.channels.find(c => c.enabled)).id);
    if (!initial) log('No configured YouTube channels. Use S / Settings to add a source.');
  } catch (error) { log(error.message); presentation.unavailable(loadVersion); }
  finally { clearTimeout(launchTimer); }
}
function effectiveScreenScale() {
  if (config?.settings?.screenScale !== null && config?.settings?.screenScale !== undefined) return config.settings.screenScale;
  return /Xbox/i.test(navigator.userAgent) ? 0.96 : 1;
}
function fitStage() {
  const viewport = window.visualViewport;
  const width = viewport?.width || innerWidth;
  const height = viewport?.height || innerHeight;
  const left = viewport?.offsetLeft || 0;
  const top = viewport?.offsetTop || 0;
  const scale = Math.min(width / 1280, height / 720) * effectiveScreenScale();
  const x = left + (width - 1280 * scale) / 2 + (config?.settings?.screenOffsetX || 0);
  const y = top + (height - 720 * scale) / 2 + (config?.settings?.screenOffsetY || 0);
  $('app').style.transform = 'scale(' + scale + ')';
  $('app').style.left = x + 'px';
  $('app').style.top = y + 'px';
  renderViewingSettings();
}
addEventListener('resize', fitStage);
addEventListener('orientationchange', fitStage);
window.visualViewport?.addEventListener('resize', fitStage);
window.visualViewport?.addEventListener('scroll', fitStage);
fitStage(); $('app').focus({ preventScroll: true });
document.fonts.ready.then(() => { renderPresentation(); refreshGuide(); });
boot();
