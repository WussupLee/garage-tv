export const CONFIG_KEY = 'garage-tv.config.v1';
export const BOOKMARK_KEY = 'garage-tv.bookmarks.v1';
export const clone = value => JSON.parse(JSON.stringify(value));

export function playlistId(value) {
  if (typeof value !== 'string') throw new Error('Paste a YouTube playlist URL or ID.');
  const trimmed = value.trim();
  if (!trimmed) return '';
  let id = trimmed;
  if (/^https?:/i.test(trimmed)) {
    let url;
    try { url = new URL(trimmed); } catch (_) { throw new Error('Invalid playlist URL.'); }
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(url.hostname)) throw new Error('Use a youtube.com playlist link.');
    id = url.searchParams.get('list') || '';
  }
  if (!/^(PL|UU|OLAK5uy_|FL)[A-Za-z0-9_-]{10,100}$/.test(id)) throw new Error('Invalid public playlist ID. Use a YouTube URL containing ?list=…; private and Mix playlists are unsupported.');
  return id;
}

export function serviceUrl(value) {
  let url;
  try { url = new URL(value); } catch (_) { throw new Error('Service URL must be an absolute HTTPS link.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Service URL must use HTTPS and contain no credentials.');
  return url.href;
}

function text(value, label, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(label + ' is required (maximum ' + max + ' characters).');
  return value.trim();
}

function validateSchedule(value) {
  if (!value) return null;
  if (value.durationsVerified !== true) throw new Error('A schedule requires durationsVerified: true and measured program durations.');
  const epoch = Date.parse(value.epoch);
  if (!Number.isFinite(epoch)) throw new Error('Schedule epoch must be a valid ISO date.');
  if (!Array.isArray(value.programs) || !value.programs.length || value.programs.length > 1000) throw new Error('Schedule needs 1–1000 programs.');
  return {
    epoch: new Date(epoch).toISOString(), durationsVerified: true, shuffle: value.shuffle === true,
    programs: value.programs.map(program => {
      if (!/^[A-Za-z0-9_-]{11}$/.test(program.videoId)) throw new Error('Every scheduled program needs a valid YouTube videoId.');
      if (!Number.isFinite(program.duration) || program.duration < 1 || program.duration > 86400) throw new Error('Program durations must be seconds between 1 and 86400.');
      return { videoId: program.videoId, title: text(program.title, 'Program title'), duration: program.duration };
    })
  };
}

export function validateConfig(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.channels)) throw new Error('Expected a Garage TV version 1 configuration.');
  if (value.channels.length < 5 || value.channels.length > 100) throw new Error('Include channels 000–004; at most 100 channels.');
  const ids = new Set();
  const channels = value.channels.map(c => {
    if (!Number.isInteger(c.id) || c.id < 0 || c.id > 999 || ids.has(c.id)) throw new Error('Channel IDs must be unique numbers from 0 to 999.');
    ids.add(c.id);
    if (c.sourceType !== (c.id === 0 ? 'directory' : 'youtube')) throw new Error('Channel 000 is a directory; other channels must use youtube.');
    return { id: c.id, title: text(c.title, 'Channel title', 80), description: typeof c.description === 'string' ? c.description.slice(0, 240) : '', sourceType: c.sourceType, playlist: playlistId(c.playlist || ''), enabled: c.enabled !== false, schedule: c.id === 0 ? null : validateSchedule(c.schedule) };
  }).sort((a, b) => a.id - b.id);
  for (let i = 0; i < 5; i++) if (!ids.has(i)) throw new Error('Required channel ' + i + ' is missing.');
  if (!channels.some(c => c.enabled)) throw new Error('Enable at least one channel.');
  if (!Array.isArray(value.services) || value.services.length > 100) throw new Error('Services must be a list of at most 100 links.');
  const services = value.services.map((s, index) => ({ id: 'service-' + index, name: text(s.name, 'Service name', 80), url: serviceUrl(s.url) }));
  return { version: 1, seed: text(value.seed, 'Schedule seed', 80), channels, services };
}

export function configured(channel) {
  return channel.enabled && channel.sourceType === 'youtube' && (!!channel.playlist || !!channel.schedule);
}

export function startupChannel(channels, random = Math.random) {
  const candidates = channels.filter(c => c.id >= 1 && configured(c));
  return candidates.length ? candidates[Math.floor(random() * candidates.length) % candidates.length] : null;
}

export function readStorage(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { throw new Error('Browser storage is unavailable or full. Export your configuration before leaving.'); }
}

// Upgrade the original five-channel saved configuration without replacing custom sources.
export function upgradeChannelDefaults(saved, defaults) {
  const next = clone(saved);
  if (next.channels.some(c => c.id === 5)) return next;
  for (const incoming of defaults.channels) {
    const existing = next.channels.find(c => c.id === incoming.id);
    if (!existing) next.channels.push(clone(incoming));
    else if ([3, 4].includes(existing.id) && !existing.playlist && !existing.schedule) {
      existing.playlist = incoming.playlist;
      existing.description = incoming.description;
    }
  }
  return validateConfig(next);
}
