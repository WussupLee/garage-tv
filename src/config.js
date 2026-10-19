export const CONFIG_KEY = 'garage-tv.config.v2';
export const LEGACY_CONFIG_KEY = 'garage-tv.config.v1';
export const BOOKMARK_KEY = 'garage-tv.bookmarks.v1';
export const SOURCE_TYPES = ['youtube_playlist', 'youtube_queue', 'hls_stream', 'audio_stream', 'external_site', 'local_media'];
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

function validateQueue(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('A video queue needs 1–100 items.');
  const ids = new Set();
  return value.map((item, index) => {
    if (!item || !/^[A-Za-z0-9_-]{11}$/.test(item.videoId) || ids.has(item.videoId)) throw new Error('Queue item ' + (index + 1) + ' needs a unique YouTube video ID.');
    ids.add(item.videoId);
    const kind = ['full', 'partial', 'highlights'].includes(item.kind) ? item.kind : 'highlights';
    const year = Number(item.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error('Queue item ' + (index + 1) + ' needs a year.');
    return { videoId: item.videoId, title: text(item.title, 'Queue title'), provider: text(item.provider, 'Queue provider', 80), year, kind };
  });
}

function normalizeSource(raw) {
  if (!raw || !SOURCE_TYPES.includes(raw.type)) throw new Error('Choose a supported source type.');
  const type = raw.type;
  const url = type === 'youtube_playlist' ? playlistId(raw.url || raw.playlist || '') :
    type === 'youtube_queue' ? '' :
    type === 'local_media' ? '' : raw.url ? serviceUrl(raw.url) : '';
  if (type === 'hls_stream' && url && !/\.m3u8(?:$|[?#])/i.test(url)) throw new Error('HLS sources need an HTTPS .m3u8 URL.');
  const schedule = type === 'youtube_playlist' ? validateSchedule(raw.schedule) : null;
  const items = type === 'youtube_queue' ? validateQueue(raw.items) : null;
  return {
    type, name: typeof raw.name === 'string' ? raw.name.slice(0, 80).trim() : '',
    url, schedule, items, enabled: raw.enabled !== false,
    verification: ['desktop_playing', 'requires_interaction', 'opens_externally', 'unsupported', 'untested'].includes(raw.verification) ? raw.verification : 'untested',
    capabilities: {
      embed: type !== 'external_site',
      autoplay: raw.capabilities?.autoplay === true,
      sync: type === 'youtube_playlist' && !!schedule
    }
  };
}

export function activeSource(channel) { return channel?.sources?.[channel.activeSource] || null; }

export function validateConfig(value) {
  if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.channels)) throw new Error('Expected a Garage TV configuration.');
  if (!value.channels.length || value.channels.length > 100) throw new Error('Include 1–100 channels.');
  const ids = new Set();
  const channels = value.channels.map((c, index) => {
    if (!Number.isInteger(c.id) || c.id < 0 || c.id > 999 || ids.has(c.id)) throw new Error('Channel numbers must be unique from 000 to 999.');
    ids.add(c.id);
    const rawSources = value.version === 1 ?
      [{ type: c.id === 0 ? 'external_site' : 'youtube_playlist', url: c.id === 0 ? '' : c.playlist, schedule: c.schedule }] : c.sources;
    if (!Array.isArray(rawSources) || !rawSources.length || rawSources.length > 20) throw new Error('Each channel needs 1–20 sources.');
    const sources = rawSources.map(normalizeSource);
    const active = value.version === 1 ? 0 : c.activeSource ?? 0;
    if (!Number.isInteger(active) || active < 0 || active >= sources.length) throw new Error('Select an existing active source.');
    const source = sources[active];
    return {
      id: c.id, order: Number.isInteger(c.order) ? c.order : index,
      title: text(c.title, 'Channel title', 80),
      description: typeof c.description === 'string' ? c.description.slice(0, 240) : '',
      enabled: c.enabled !== false, sources, activeSource: active,
      sourceType: source.type, playlist: source.type === 'youtube_playlist' ? source.url : '',
      url: source.type === 'youtube_playlist' ? '' : source.url, schedule: source.schedule
    };
  }).sort((a, b) => a.order - b.order || a.id - b.id);
  if (!channels.some(c => c.enabled)) throw new Error('Enable at least one channel.');
  if (!Array.isArray(value.services) || value.services.length > 100) throw new Error('Services must be a list of at most 100 links.');
  const services = value.services.map((s, index) => ({ id: 'service-' + index, name: text(s.name, 'Service name', 80), url: serviceUrl(s.url) }));
  return { version: 2, lineupRevision: Number.isInteger(value.lineupRevision) ? value.lineupRevision : 1, seed: text(value.seed, 'Schedule seed', 80), channels, services };
}

export function configured(channel) {
  const source = activeSource(channel);
  return !!channel?.enabled && !!source?.enabled && (source.type === 'local_media' || source.type === 'youtube_queue' && !!source.items?.length || !!source.url);
}

export function startupChannel(channels, random = Math.random) {
  const candidates = channels.filter(c => c.id !== 0 && configured(c) && ['youtube_playlist', 'youtube_queue', 'hls_stream', 'audio_stream'].includes(activeSource(c).type));
  return candidates.length ? candidates[Math.floor(random() * candidates.length) % candidates.length] : null;
}

export function readStorage(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch (_) { return fallback; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { throw new Error('Browser storage is unavailable or full. Export your configuration before leaving.'); }
}

export function upgradeChannelDefaults(saved, defaults) {
  if (saved.version === 2) {
    const next = validateConfig(saved);
    if (next.lineupRevision >= defaults.lineupRevision) return next;
    // Add only channels introduced by this lineup revision. Existing edits and deletions
    // remain untouched, including custom channels using our proposed numbers.
    const used = new Set(next.channels.map(c => c.id));
    let nextOrder = Math.max(...next.channels.map(c => c.order)) + 1;
    for (const candidate of defaults.channels.filter(c => c.id >= 12 && c.id <= 14)) {
      const channel = clone(candidate);
      if (used.has(channel.id)) {
        channel.id = Array.from({ length: 1000 }, (_, id) => id).find(id => id >= 15 && !used.has(id));
        if (channel.id === undefined) throw new Error('No channel number is available for the new sports lineup.');
      }
      channel.order = nextOrder++;
      next.channels.push(channel); used.add(channel.id);
    }
    next.lineupRevision = defaults.lineupRevision;
    return validateConfig(next);
  }
  const old = validateConfig(saved);
  const next = clone(defaults);
  for (const previous of old.channels) {
    const target = next.channels.find(c => c.id === previous.id);
    if (previous.id >= 1 && previous.id <= 3 && target) {
      target.title = previous.title; target.description = previous.description; target.enabled = previous.enabled;
      target.sources[0] = clone(previous.sources[0]);
    } else if (previous.id === 4 && target && previous.playlist) {
      target.sources.push(clone(previous.sources[0]));
    } else if (previous.id === 5 && previous.playlist) {
      next.channels.find(c => c.id === 8).sources.push(clone(previous.sources[0]));
    } else if (!target) next.channels.push({ ...clone(previous), order: next.channels.length });
  }
  next.services = clone(old.services);
  return validateConfig(next);
}
