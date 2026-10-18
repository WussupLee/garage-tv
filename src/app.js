import { CONFIG_KEY, BOOKMARK_KEY, clone, validateConfig, startupChannel, configured, readStorage, writeStorage } from './config.js';
import { broadcastAt, orderedPrograms } from './schedule.js';
import { TelevisionPlayer } from './player.js';
import { GamepadInput, keyboardInput, moveFocus } from './input.js';

const $ = id => document.getElementById(id);
const number = id => String(id).padStart(3, '0');
let config, tuned = null, selected = null, panel = null, panelReturn = null;
let overlayTimer, watchdog, loadVersion = 0, scheduledKey = '', degraded = false, demo = false, failureCount = 0;
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
function playbackMessage(message, focus = false) {
  $('playback-text').textContent = message; $('playback-message').hidden = false;
  if (focus && !panel) $('start-playback').focus();
}
function armWatchdog() {
  clearTimeout(watchdog);
  const version = loadVersion;
  watchdog = setTimeout(() => {
    if (version === loadVersion && (demo || configured(channel())) && player.snapshot().state !== 1) playbackMessage('Playback has not started. Press Start / retry. If needed, select Play inside the YouTube player.', true);
  }, 11000);
}
const player = new TelevisionPlayer({
  blocked: () => { clearTimeout(watchdog); playbackMessage('Edge requires your interaction to start sound and video. Press A / Enter on Start.', true); log('YouTube reported autoplay blocked.'); },
  state: state => {
    if (!channel() || (tuned === 0 && !demo)) return;
    if (state === 1) {
      clearTimeout(watchdog); failureCount = 0; $('playback-message').hidden = true;
      const now = scheduleNow();
      const snapshot = player.snapshot();
      if (now && snapshot.videoId === now.program.videoId && snapshot.duration > 0 && Math.abs(snapshot.duration - now.program.duration) > 3) {
        degraded = true;
        log('Duration mismatch: scheduled ' + now.program.duration + 's, player reports ' + Math.round(snapshot.duration) + 's. Synchronization suspended for this tune.');
      }
      status(modeLabel());
      refreshGuide();
    }
    if (state === 0 && scheduleNow()) loadScheduled(true);
  },
  error: code => {
    if (tuned === 0 && !demo) return;
    clearTimeout(watchdog);
    const labels = { 2: 'Invalid video parameters', 5: 'HTML5 playback failed', 100: 'Video removed or private', 101: 'Owner blocks embedding', 150: 'Owner blocks embedding', 153: 'YouTube could not verify the playback origin/referrer' };
    const reason = labels[code] || 'YouTube error ' + code;
    log(reason);
    if ([100, 101, 150].includes(code) && !demo && ++failureCount <= 4) {
      status(reason + ' · skipping unavailable video (' + failureCount + '/4)');
      // Bounded recovery: never spin indefinitely through a blocked playlist.
      const version = loadVersion;
      setTimeout(() => { if (version === loadVersion) skip(false); }, 900);
    } else playbackMessage(reason + '. Try another video, check playlist visibility, or retry.', true);
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

function showOverlay(c) {
  clearTimeout(overlayTimer);
  $('overlay-number').textContent = number(c.id); $('overlay-title').textContent = c.title; $('overlay-description').textContent = c.description;
  $('channel-overlay').hidden = false;
  overlayTimer = setTimeout(() => { $('channel-overlay').hidden = true; }, 3500);
}

async function tune(id) {
  const c = config.channels.find(item => item.id === id && item.enabled);
  if (!c) return;
  remember(); clearTimeout(watchdog);
  const version = ++loadVersion;
  tuned = id; selected = id; scheduledKey = ''; degraded = false; demo = false; failureCount = 0;
  player.stop();
  $('tuned-label').textContent = number(id) + ' · ' + c.title;
  $('playback-message').hidden = true; $('directory').hidden = id !== 0;
  $('stage').hidden = id === 0;
  $('empty-state').hidden = configured(c) || id === 0;
  $('empty-message').textContent = 'This channel needs a public YouTube playlist or a verified-duration schedule. Open Settings to add a source.';
  showOverlay(c); renderDirectory(); refreshGuide(); status(modeLabel()); log('Tuned ' + number(id) + ' ' + c.title);
  if (id === 0 || !configured(c)) return;
  status('Loading ' + number(id) + '…'); armWatchdog();
  try {
    await player.ensure();
    if (version !== loadVersion) return;
    if (c.schedule) loadScheduled(true);
    else {
      const mark = bookmarks[id];
      player.playlist(c.playlist, mark && mark.playlist === c.playlist ? mark : {});
    }
    armWatchdog();
  } catch (error) {
    if (version !== loadVersion) return;
    clearTimeout(watchdog); log(error.message); playbackMessage(error.message, true);
  }
}

function loadScheduled(force = false) {
  const now = scheduleNow();
  if (!now || !player.ready) return;
  const key = scheduleKey(now);
  if (force || scheduledKey !== key) { scheduledKey = key; player.video(now.program.videoId, now.offset); armWatchdog(); log('Schedule: ' + now.program.title + ' @ ' + Math.floor(now.offset) + 's'); }
}

function skip(reset = true) {
  if (!player.ready || tuned === 0 && !demo) return;
  if (reset) failureCount = 0;
  const c = channel();
  if (c.schedule && !demo) {
    const programs = orderedPrograms(c, config.seed);
    const current = player.snapshot().videoId;
    const index = programs.findIndex(p => p.videoId === current);
    degraded = true; player.video(programs[(index + 1) % programs.length].videoId);
    log('Skipped scheduled video; sync suspended until retune.');
  } else if (demo) { player.start(); }
  else player.next();
  $('playback-message').hidden = true; armWatchdog(); status(modeLabel());
}

function changeChannel(delta) {
  const list = config.channels.filter(c => c.enabled);
  const index = list.findIndex(c => c.id === tuned);
  const c = list[(index + delta + list.length) % list.length];
  closePanel(); tune(c.id);
}

function programInfo(c) {
  if (!c.enabled) return { now: 'Disabled', next: '—' };
  if (c.id === 0) return { now: config.services.length + ' streaming service link(s)', next: 'Choose a service' };
  const point = broadcastAt(c, config.seed);
  if (point && !(c.id === tuned && degraded)) return { now: point.program.title + ' · ' + Math.floor(point.offset / 60) + ' min in', next: point.next.title + ' · in ' + Math.ceil(point.remaining / 60) + ' min' };
  if (!configured(c)) return { now: 'Source not configured', next: 'Add playlist in Settings' };
  const snap = c.id === tuned && !demo ? player.snapshot() : null;
  return { now: snap && snap.title ? snap.title : 'Continuous playlist · duration unavailable', next: 'Next available playlist video · timing unknown' };
}

function refreshGuide() {
  if (!config) return;
  const rows = $('guide-rows');
  // Update existing buttons so periodic Now/Next refreshes preserve focus.
  config.channels.forEach(c => {
    let row = rows.querySelector('[data-channel="' + c.id + '"]');
    if (!row) {
      row = document.createElement('button'); row.type = 'button'; row.className = 'guide-row'; row.dataset.channel = c.id;
      row.append(textElement('strong', ''), textElement('span', ''), textElement('span', ''));
      row.addEventListener('focus', () => { selected = c.id; refreshGuide(); });
      row.addEventListener('click', () => { closePanel(); tune(c.id); }); rows.append(row);
    }
    const info = programInfo(c);
    row.disabled = !c.enabled; row.classList.toggle('is-tuned', c.id === tuned); row.classList.toggle('is-selected', c.id === selected);
    row.setAttribute('aria-pressed', String(c.id === tuned));
    row.children[0].textContent = number(c.id) + ' · ' + c.title + (c.id === tuned ? ' · TUNED' : '');
    row.children[1].textContent = 'NOW  ' + info.now;
    row.children[2].textContent = 'NEXT  ' + info.next;
  });
  Array.from(rows.children).forEach(row => { if (!config.channels.some(c => c.id === Number(row.dataset.channel))) row.remove(); });
}

function closePanel() {
  if (!panel) return;
  $(panel).hidden = true; panel = null; document.body.classList.remove('panel-open');
  if (panelReturn && panelReturn.getClientRects().length) panelReturn.focus();
}
function openPanel(name) {
  if (panel === name) { closePanel(); return; }
  const previous = document.activeElement;
  closePanel(); panelReturn = previous; panel = name;
  $(name).hidden = false; document.body.classList.add('panel-open');
  if (name === 'guide') {
    selected = tuned; refreshGuide();
    const row = $('guide-rows').querySelector('[data-channel="' + tuned + '"]');
    (row || $(name).querySelector('button')).focus();
    if (row) row.scrollIntoView({ block: 'nearest' });
  } else $(name).querySelector('button').focus();
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
  if (command === 'back') { panel ? closePanel() : openPanel('guide'); return; }
  if (command === 'guide' || command === 'settings' || command === 'diagnostics') { openPanel(command); return; }
  if (command === 'previous' || command === 'next') { changeChannel(command === 'next' ? 1 : -1); return; }
  if (command === 'mute') { toggleMute(); return; }
  if (command === 'play') { togglePlay(); return; }
  if (command === 'confirm') {
    const active = document.activeElement;
    if (active && active.matches('button,a,input,select,textarea') && active.getClientRects().length) active.click();
    else if (!$('playback-message').hidden) $('start-playback').click();
    else if (tuned === 0) { const first = $('service-links').querySelector('a'); if (first) first.focus(); }
    else $('start-playback').click();
    return;
  }
  if (['up', 'down', 'left', 'right'].includes(command)) {
    if (panel) {
      if (panel === 'guide' && (command === 'up' || command === 'down')) moveFocus($('guide-rows'), command === 'down' ? 1 : -1);
      else if (document.activeElement.tagName === 'SELECT') {
        const select = document.activeElement; select.selectedIndex = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + (command === 'down' || command === 'right' ? 1 : -1))); select.dispatchEvent(new Event('change'));
      } else moveFocus($(panel), command === 'down' || command === 'right' ? 1 : -1);
    } else if (tuned === 0 || !$('playback-message').hidden || command === 'left' || command === 'right') moveFocus(tuned === 0 ? $('directory') : !$('playback-message').hidden ? $('playback-message') : document.querySelector('footer'), command === 'down' || command === 'right' ? 1 : -1);
    else changeChannel(command === 'up' ? 1 : -1);
  }
}

function toggleMute() { const muted = player.mute(); $('toggle-mute').textContent = muted ? 'Unmute' : 'Mute'; $('toggle-mute').setAttribute('aria-pressed', String(muted)); }
function togglePlay() {
  if (!player.ready) { $('start-playback').click(); return; }
  if (player.snapshot().state !== 1 && scheduleNow()) loadScheduled(true);
  else player.toggle();
}

$('channel-down').onclick = () => changeChannel(-1); $('channel-up').onclick = () => changeChannel(1);
$('toggle-guide').onclick = () => openPanel('guide');
$('open-settings').onclick = $('empty-settings').onclick = $('edit-services').onclick = () => { renderChannelSelect(tuned); openPanel('settings'); };
$('open-diagnostics').onclick = () => openPanel('diagnostics');
document.querySelectorAll('[data-close]').forEach(button => { button.onclick = closePanel; });
$('toggle-play').onclick = togglePlay; $('toggle-mute').onclick = toggleMute;
$('skip-video').onclick = () => skip();
$('start-playback').onclick = () => {
  if (!channel() || !configured(channel()) && !demo) { openPanel('settings'); return; }
  if (player.ready && player.snapshot().videoId) {
    failureCount = 0;
    if (scheduleNow()) loadScheduled(true); else player.start();
    armWatchdog();
  } else if (demo) $('test-youtube').click();
  else tune(tuned);
};
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
  remember(); clearTimeout(watchdog); const version = ++loadVersion;
  demo = true; degraded = false; failureCount = 0; scheduledKey = '';
  $('stage').hidden = false; $('empty-state').hidden = true; $('directory').hidden = true; $('playback-message').hidden = true;
  $('tuned-label').textContent = 'YouTube diagnostic · official demo';
  status(modeLabel());
  try { await player.ensure(); if (version !== loadVersion) return; player.video('M7lc1UVf-VE'); armWatchdog(); }
  catch (error) { if (version === loadVersion) playbackMessage(error.message); }
};

window.addEventListener('error', event => { log('Browser error: ' + event.message); status('A browser error occurred. See Diagnostics and reload if controls stop responding.'); });
window.addEventListener('unhandledrejection', event => { log('Unhandled error: ' + (event.reason && event.reason.message || event.reason)); status('An operation failed. See Diagnostics.'); });
window.addEventListener('pagehide', remember);
window.addEventListener('pageshow', event => { if (event.persisted && tuned !== null) tune(tuned); });
document.addEventListener('visibilitychange', () => { if (document.hidden) remember(); else if (scheduleNow() && player.snapshot().state === 1) loadScheduled(true); });
keyboardInput(action);
new GamepadInput(action, info => { padInfo = info; });
setInterval(() => {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (scheduleNow() && player.ready && player.snapshot().state === 1) loadScheduled();
  if (panel === 'diagnostics') {
    $('diagnostic-output').textContent = JSON.stringify({ userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], focused: document.hasFocus(), storage: 'Configuration stored in this browser; export to transfer', tuned, mode: modeLabel(), player: player.snapshot(), gamepad: padInfo }, null, 2);
  }
}, 1000);
setInterval(() => { refreshGuide(); remember(); }, 15000);

async function boot() {
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
    if (!initial) {
      $('empty-message').textContent = 'No configured YouTube channels yet. Paste your public playlists in Settings. LIVE SPORTS is available in the guide. Diagnostics includes a YouTube playback test.';
      status('Setup needed · no playable channel source configured · G: guide · S: settings');
      $('empty-settings').focus();
    }
  } catch (error) { $('empty-message').textContent = error.message + ' Reload the page to retry.'; $('empty-settings').hidden = true; log(error.message); }
}
boot();
