import { CONFIG_KEY, BOOKMARK_KEY, clone, validateConfig, startupChannel, configured, readStorage, writeStorage } from './config.js';
import { broadcastAt, orderedPrograms } from './schedule.js';
import { TelevisionPlayer } from './player.js';
import { GamepadInput, keyboardInput, moveFocus } from './input.js';
import { StationPresentation } from './presentation.js';

const $ = id => document.getElementById(id);
const number = id => String(id).padStart(3, '0');
let config, tuned = null, selected = null, panel = null;
let loadVersion = 0, scheduledKey = '', degraded = false, demo = false;
let lastPresentationMode = 'launch';
let padInfo = { supported: typeof navigator.getGamepads === 'function', pads: [] };
let bookmarks = readStorage(BOOKMARK_KEY, {});
if (!bookmarks || typeof bookmarks !== 'object' || Array.isArray(bookmarks)) bookmarks = {};
const events = [];
function log(message) {
  events.unshift(new Date().toLocaleTimeString() + ' ' + message);
  events.splice(30); $('event-log').textContent = events.join('\n');
}
function status(message) { $('status').textContent = message; }
function notice(message) { $('settings-notice').textContent = message; log(message); }
function textElement(tag, text, className) { const e = document.createElement(tag); e.textContent = text; if (className) e.className = className; return e; }
function channel() { return config && config.channels.find(c => c.id === tuned); }
function scheduleNow(c = channel()) { return c && !degraded && !demo ? broadcastAt(c, config.seed) : null; }
function scheduleKey(now) { return now.cycle + ':' + now.index; }
const presentation = new StationPresentation(renderPresentation);
function renderPresentation(s = presentation.state) {
  const c = config && config.channels.find(item => item.id === s.requested);
  const waiting = s.mode === 'tuning' || s.mode === 'buffering';
  const failed = s.mode === 'unavailable';
  const needsInput = s.mode === 'blocked' || s.mode === 'paused';
  $('app').dataset.mode = s.mode;
  $('video-cover').hidden = ['playing', 'buffering', 'paused'].includes(s.mode);
  $('launch').hidden = s.mode !== 'launch' || !!panel;
  $('channel-overlay').toggleAttribute('hidden', !!panel || s.mode === 'launch' || !(s.osdVisible || s.mode === 'directory'));
  $('overlay-box').setAttribute('height', waiting ? '184' : '126');
  $('overlay-number').textContent = c ? number(c.id) : '';
  fitText($('overlay-title'), c ? c.title : '', 250, 28, 700);
  $('overlay-status').textContent = waiting ? s.mode.toUpperCase() : '';
  $('playback-message').toggleAttribute('hidden', !!panel || !(failed || needsInput));
  $('playback-text').textContent = failed ? 'CHANNEL UNAVAILABLE' : '';
  $('start-playback').textContent = failed ? 'A RETRY' : 'PRESS A TO START';
  $('start-playback').setAttribute('y', failed ? '326' : '278');
  $('start-playback').setAttribute('aria-label', failed ? 'Retry channel' : 'Start playback');
  $('failure-guide').toggleAttribute('hidden', !failed);
  $('playback-bug').hidden = !!panel || s.mode !== 'playing' || s.osdVisible;
  $('directory').hidden = s.mode !== 'directory' || !!panel;
  if (failed && lastPresentationMode !== 'unavailable') {
    // A timeout must also prevent a late-ready iframe from starting sound behind the error.
    player.beginRequest(loadVersion);
  }
  lastPresentationMode = s.mode;
  refreshGuide();
  if (!panel) status((c ? number(c.id) + ' ' + c.title + '. ' : '') + (failed ? 'Channel unavailable. A retry. B guide. S settings.' : needsInput ? 'Press A to start.' : s.mode));
}
const player = new TelevisionPlayer({
  blocked: requestId => { if (requestId !== loadVersion) return; presentation.blocked(requestId); log('YouTube reported autoplay blocked.'); },
  state: (state, requestId) => {
    if (requestId !== loadVersion) return;
    if (!channel() || (tuned === 0 && !demo)) return;
    if (state === 1) {
      const now = scheduleNow();
      const snapshot = player.snapshot();
      if (now && snapshot.videoId === now.program.videoId && snapshot.duration > 0 && Math.abs(snapshot.duration - now.program.duration) > 3) {
        degraded = true;
        log('Duration mismatch: scheduled ' + now.program.duration + 's, player reports ' + Math.round(snapshot.duration) + 's. Synchronization suspended for this tune.');
      }
      presentation.playing(requestId);
    }
    if (state === 3) presentation.buffering(requestId);
    if (state === 2) presentation.blocked(requestId, true);
    if (state === 0 && scheduleNow()) loadScheduled(true);
  },
  error: (code, requestId) => {
    if (requestId !== loadVersion) return;
    if (tuned === 0 && !demo) return;
    const labels = { 2: 'Invalid video parameters', 5: 'HTML5 playback failed', 100: 'Video removed or private', 101: 'Owner blocks embedding', 150: 'Owner blocks embedding', 153: 'YouTube could not verify the playback origin/referrer' };
    const reason = labels[code] || 'YouTube error ' + code;
    log(reason);
    presentation.unavailable(requestId);
  }
});

function modeLabel() {
  if (demo) return 'YouTube diagnostic video · not channel programming';
  if (!channel()) return '';
  if (tuned === 0) return 'Direct service links · use Edge Back to return';
  if (!configured(channel())) return 'Source missing · paste a playlist in Settings';
  if (degraded) return 'Continuous playback · virtual sync suspended for this tune';
  return scheduleNow() ? 'Virtual schedule · experimental · verified durations required' : 'Continuous playlist · resumes saved position · does not advance while away';
}

function remember() {
  const c = channel();
  if (!c || c.sourceType !== 'youtube' || c.schedule || demo || !player.ready || player.activePlaylist !== c.playlist) return;
  const snapshot = player.snapshot();
  if (!snapshot.videoId) return;
  bookmarks[c.id] = { playlist: c.playlist, index: snapshot.index, seconds: snapshot.seconds };
  try { writeStorage(BOOKMARK_KEY, bookmarks); } catch (error) { log(error.message); }
}

async function tune(id) {
  const c = config.channels.find(item => item.id === id && item.enabled);
  if (!c) return;
  remember();
  const version = ++loadVersion;
  tuned = id; selected = id; scheduledKey = ''; degraded = false; demo = false;
  player.beginRequest(version);
  presentation.request(version, id);
  renderDirectory(); log('Requested ' + number(id) + ' ' + c.title);
  if (id === 0) { presentation.directory(version); return; }
  if (!configured(c)) { presentation.unavailable(version); return; }
  try {
    await player.ensure();
    if (version !== loadVersion || presentation.state.mode === 'unavailable') return;
    if (c.schedule) loadScheduled(true);
    else {
      const mark = bookmarks[id];
      player.playlist(c.playlist, mark && mark.playlist === c.playlist ? mark : {});
    }
  } catch (error) {
    if (version !== loadVersion) return;
    log(error.message); presentation.unavailable(version);
  }
}

function loadScheduled(force = false) {
  const now = scheduleNow();
  if (!now || !player.ready) return;
  const key = scheduleKey(now);
  if (force || scheduledKey !== key) { scheduledKey = key; player.video(now.program.videoId, now.offset); log('Schedule: ' + now.program.title + ' @ ' + Math.floor(now.offset) + 's'); }
}

function skip() {
  if (!player.ready || tuned === 0 && !demo) return;
  const c = channel();
  if (c.schedule && !demo) {
    const programs = orderedPrograms(c, config.seed);
    const current = player.snapshot().videoId;
    const index = programs.findIndex(p => p.videoId === current);
    degraded = true; player.video(programs[(index + 1) % programs.length].videoId);
    log('Skipped scheduled video; sync suspended until retune.');
  } else if (demo) { player.start(); }
  else player.next();
  status(modeLabel());
}

function changeChannel(delta) {
  const list = config.channels.filter(c => c.enabled && c.id <= 4);
  const index = list.findIndex(c => c.id === tuned);
  const c = list[(index + delta + list.length) % list.length];
  closePanel(); tune(c.id);
}

function programInfo(c) {
  if (!c.enabled) return { now: 'UNAVAILABLE', next: '-' };
  if (c.id === 0) return { now: config.services[0]?.name || 'UNAVAILABLE', next: '-' };
  const point = broadcastAt(c, config.seed);
  if (point && !(c.id === tuned && degraded)) return { now: point.program.title, next: point.next.title };
  const snap = c.id === presentation.state.current && !demo ? player.snapshot() : null;
  return { now: snap && snap.title ? snap.title : 'UNAVAILABLE', next: '-' };
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
  // One listbox owns focus; only existing text nodes change during metadata refresh.
  config.channels.filter(c => c.id <= 4).forEach(c => {
    let row = rows.querySelector('[data-channel="' + c.id + '"]');
    if (!row) {
      row = document.createElement('div'); row.className = 'guide-row'; row.dataset.channel = c.id; row.id = 'guide-channel-' + c.id; row.setAttribute('role', 'option');
      row.innerHTML = '<svg viewBox="0 0 1152 70" aria-hidden="true"><text class="on-marker bold" x="18" y="43" font-size="18">ON</text><text data-part="number" class="bold" x="62" y="45" font-size="28"></text><text data-part="station" class="bold" x="154" y="43" font-size="24"></text><text data-part="now" x="476" y="43" font-size="22"></text><text data-part="next" x="832" y="43" font-size="22"></text></svg>';
      row.addEventListener('click', () => { selected = c.id; confirmGuide(); }); rows.append(row);
    }
    const info = programInfo(c);
    const current = !demo && c.id === presentation.state.current;
    row.classList.toggle('is-tuned', current); row.classList.toggle('is-selected', c.id === selected);
    row.setAttribute('aria-selected', String(c.id === selected)); row.setAttribute('aria-disabled', String(!c.enabled));
    row.setAttribute('aria-label', number(c.id) + ' ' + c.title + (current ? ', on' : '') + '. Now ' + info.now + '. Next ' + info.next);
    row.querySelector('[data-part=number]').textContent = number(c.id);
    fitText(row.querySelector('[data-part=station]'), c.title, 290, 24, 700);
    fitText(row.querySelector('[data-part=now]'), info.now, 320, 22);
    fitText(row.querySelector('[data-part=next]'), info.next, 302, 22);
  });
  Array.from(rows.children).forEach(row => { if (!config.channels.some(c => c.id === Number(row.dataset.channel))) row.remove(); });
  if (selected !== null) rows.setAttribute('aria-activedescendant', 'guide-channel-' + selected);
}

function confirmGuide() {
  if (!config.channels.find(c => c.id === selected)?.enabled) return;
  const id = selected;
  const alreadyPlaying = presentation.state.current === id && ['playing', 'buffering'].includes(presentation.state.mode);
  closePanel(); if (!alreadyPlaying) tune(id);
}
function moveGuide(delta) {
  const list = config.channels.filter(c => c.id <= 4);
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
  closePanel(); panel = name;
  $(name).hidden = false;
  if (name === 'guide') {
    selected = presentation.state.current ?? tuned; refreshGuide(); $('guide-rows').focus({ preventScroll: true });
    status('Guide. ' + number(selected) + ' ' + config.channels.find(c => c.id === selected)?.title);
  } else { if (name === 'settings') renderChannelSelect(tuned); $(name).querySelector('button').focus(); }
  renderPresentation();
}

function renderDirectory() {
  $('service-links').replaceChildren();
  config.services.forEach(service => {
    const link = textElement('a', service.name, 'service-link');
    link.href = service.url; // Same-tab navigation: never window.open or embedded service frames.
    $('service-links').append(link);
  });
  if (!config.services.length) $('service-links').append(textElement('p', 'No service links yet. Add one in Settings.'));
}

function save(next) {
  const validated = validateConfig(next);
  writeStorage(CONFIG_KEY, validated);
  config = validated;
  renderDirectory(); refreshGuide(); renderServiceEditor();
}

function renderChannelSelect(id) {
  $('channel-select').replaceChildren();
  config.channels.forEach(c => { const option = textElement('option', number(c.id) + ' · ' + c.title); option.value = c.id; $('channel-select').append(option); });
  $('channel-select').value = id === undefined ? (tuned === null ? 1 : tuned) : id;
  loadChannelForm();
}
function loadChannelForm() {
  const c = config.channels.find(item => item.id === Number($('channel-select').value));
  $('channel-title').value = c.title; $('channel-description').value = c.description;
  $('channel-enabled').checked = c.enabled; $('channel-playlist').value = c.playlist ? 'https://www.youtube.com/playlist?list=' + c.playlist : '';
  $('channel-schedule').value = c.schedule ? JSON.stringify(c.schedule, null, 2) : '';
  $('youtube-settings').hidden = c.id === 0;
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
    const first = startupChannel(config.channels) || config.channels.find(c => c.enabled);
    tune(first.id);
  } catch (error) { notice('Import failed: ' + error.message); }
}

function action(command) {
  if (!config) return;
  if (command === 'back') { if (panel) closePanel(); else if (presentation.state.mode === 'unavailable') openPanel('guide'); return; }
  if (['guide', 'settings', 'diagnostics', 'controls'].includes(command)) { openPanel(command); return; }
  if (command === 'previous' || command === 'next') { panel === 'guide' ? moveGuide(command === 'next' ? 1 : -1) : changeChannel(command === 'next' ? 1 : -1); return; }
  if (command === 'mute') { toggleMute(); return; }
  if (command === 'play') { togglePlay(); return; }
  if (command === 'confirm') {
    if (panel === 'guide') { confirmGuide(); return; }
    const active = document.activeElement;
    if (active && active.matches('button,a,input,select,textarea') && active.getClientRects().length) active.click();
    else if (['unavailable', 'blocked', 'paused'].includes(presentation.state.mode)) startPlayback();
    else if (tuned === 0) { const first = $('service-links').querySelector('a'); if (first) first.focus(); }
    return;
  }
  if (['up', 'down', 'left', 'right'].includes(command)) {
    if (panel) {
      if (panel === 'guide') { if (command === 'up' || command === 'down') moveGuide(command === 'down' ? 1 : -1); }
      else if (document.activeElement.tagName === 'SELECT') {
        const select = document.activeElement; select.selectedIndex = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + (command === 'down' || command === 'right' ? 1 : -1))); select.dispatchEvent(new Event('change'));
      } else moveFocus($(panel), command === 'down' || command === 'right' ? 1 : -1);
    } else if (command === 'up' || command === 'down') changeChannel(command === 'down' ? 1 : -1);
    else if (tuned === 0) moveFocus($('directory'), command === 'right' ? 1 : -1);
  }
}

function toggleMute() { const muted = player.mute(); $('toggle-mute').textContent = muted ? 'Unmute' : 'Mute'; $('toggle-mute').setAttribute('aria-pressed', String(muted)); }
function togglePlay() {
  if (!player.ready) { startPlayback(); return; }
  if (player.snapshot().state !== 1 && scheduleNow()) loadScheduled(true);
  else player.toggle();
}

$('channel-down').onclick = () => changeChannel(-1); $('channel-up').onclick = () => changeChannel(1);
$('toggle-guide').onclick = () => openPanel('guide');
$('open-settings').onclick = $('edit-services').onclick = () => openPanel('settings');
$('open-diagnostics').onclick = () => openPanel('diagnostics');
$('playback-bug').onclick = () => openPanel('controls');
$('guide-tune').onclick = confirmGuide; $('guide-close').onclick = closePanel;
$('failure-guide').onclick = () => openPanel('guide');
$('app').addEventListener('contextmenu', event => { event.preventDefault(); openPanel('controls'); });
$('app').addEventListener('keydown', event => { if (event.key === 'Tab' && !panel && event.target === $('app')) { event.preventDefault(); openPanel('controls'); } });
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = closePanel; });
$('toggle-play').onclick = togglePlay; $('toggle-mute').onclick = toggleMute;
$('skip-video').onclick = () => skip();
function startPlayback() {
  if (!channel()) return;
  if (presentation.state.mode === 'unavailable') { if (demo) $('test-youtube').click(); else tune(tuned); return; }
  if (!configured(channel()) && !demo) { tune(tuned); return; }
  if (player.ready && player.snapshot().videoId) {
    if (scheduleNow()) loadScheduled(true); else player.start();
  } else if (demo) $('test-youtube').click();
  else tune(tuned);
}
$('start-playback').onclick = startPlayback;
$('channel-select').onchange = loadChannelForm;
$('channel-form').onsubmit = event => {
  event.preventDefault();
  try {
    const id = Number($('channel-select').value); const next = clone(config); const c = next.channels.find(item => item.id === id);
    c.title = $('channel-title').value; c.description = $('channel-description').value; c.enabled = $('channel-enabled').checked;
    c.playlist = id === 0 ? '' : $('channel-playlist').value;
    c.schedule = id === 0 || !$('channel-schedule').value.trim() ? null : JSON.parse($('channel-schedule').value);
    save(next); renderChannelSelect(id); notice('Channel ' + number(id) + ' saved.');
    if (id === tuned) tune(c.enabled ? id : config.channels.find(item => item.enabled).id);
  } catch (error) { notice('Channel not saved: ' + error.message); }
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
  player.beginRequest(version); presentation.request(version, tuned); closePanel();
  log('YouTube diagnostic video; not channel programming.');
  try { await player.ensure(); if (version !== loadVersion || presentation.state.mode === 'unavailable') return; player.video('M7lc1UVf-VE'); }
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
    $('diagnostic-output').textContent = JSON.stringify({ userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], focused: document.hasFocus(), storage: 'Configuration stored in this browser; export to transfer', tuned, mode: modeLabel(), player: player.snapshot(), gamepad: padInfo }, null, 2);
  }
}, 1000);
setInterval(() => { refreshGuide(); remember(); }, 15000);

async function boot() {
  const launchTimer = setTimeout(() => { if (presentation.state.mode === 'launch') { presentation.state.mode = 'tuning'; presentation.state.osdVisible = true; presentation.emit(); } }, 600);
  try {
    const response = await fetch('./data/default-config.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Default configuration could not load (' + response.status + ').');
    const defaults = validateConfig(await response.json());
    const saved = readStorage(CONFIG_KEY, null);
    try { config = saved ? validateConfig(saved) : defaults; }
    catch (error) { config = defaults; log('Saved configuration invalid; using deployable defaults. ' + error.message); }
    renderChannelSelect(1); renderDirectory(); renderServiceEditor(); refreshGuide();
    const initial = startupChannel(config.channels);
    await tune(initial ? initial.id : (config.channels.find(c => c.id >= 1 && c.id <= 4 && c.enabled) || config.channels.find(c => c.enabled)).id);
    if (!initial) log('No configured YouTube channels. Use S / Settings to add a source.');
  } catch (error) { log(error.message); presentation.unavailable(loadVersion); }
  finally { clearTimeout(launchTimer); }
}
function fitStage() {
  const scale = Math.min(innerWidth / 1280, innerHeight / 720);
  $('app').style.transform = 'scale(' + scale + ')';
  $('app').style.left = (innerWidth - 1280 * scale) / 2 + 'px';
  $('app').style.top = (innerHeight - 720 * scale) / 2 + 'px';
}
addEventListener('resize', fitStage); fitStage(); $('app').focus({ preventScroll: true });
document.fonts.ready.then(() => { renderPresentation(); refreshGuide(); });
boot();
