import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateConfig, playlistId, serviceUrl, startupChannel, surfChannels, clone, upgradeChannelDefaults, shuffledQueue } from '../src/config.js';
import { broadcastAt, orderedPrograms } from '../src/schedule.js';
const defaults = JSON.parse(await readFile(new URL('../data/default-config.json', import.meta.url)));
// These video IDs come from Google's IFrame API examples; playlists below are syntax fixtures, never deployed sources.
const programs = [{ videoId: 'M7lc1UVf-VE', title: 'A', duration: 1800 }, { videoId: 'bHQqvYy5KYo', title: 'B', duration: 600 }];
const normalized = validateConfig(defaults);
const c = { ...normalized.channels[1], schedule: { epoch: '2026-01-01T00:00:00Z', durationsVerified: true, shuffle: false, programs } };
const epoch = Date.parse(c.schedule.epoch);
test('deployable defaults contain one external exception, YouTube guide channels, and four direct surf channels', () => {
  const config = validateConfig(defaults);
  assert.deepEqual(config.channels.map(c => c.id), Array.from({length: 18}, (_, i) => i));
  assert.equal(config.services.length, 0);
  assert.equal(config.channels[1].playlist, 'PLqlmRlit66auWzsLO8agSNSQqsitEvR4-');
  assert.equal(config.channels[2].playlist, 'PLqlmRlit66atCuXs45FwMHbId06vci8Th');
  assert.equal(config.channels[3].playlist, 'PLqlmRlit66au-YSAWGa6Qzyb8A4_7uQpF');
  assert.equal(config.lineupRevision, 4);
  assert.deepEqual(config.channels.filter(c => c.sourceType === 'external_site').map(c => c.id), [0]);
  assert.deepEqual(config.channels.slice(4, 12).map(c => c.title), ['NOSTALGIA', '90s MUSIC', 'Y2K HITS', 'ROCK / PUNK', 'OFF THE AIR', 'ELECTRONIC', 'SOUL / FUNK', 'SPACE TV']);
  assert.deepEqual(config.channels.filter(c => c.sourceType === 'youtube_queue' && c.id >= 5 && c.id <= 10).map(c => c.sources[0].items.length), [20, 20, 20, 20, 20]);
  assert.ok(config.channels.slice(1).every(c => c.sources.length === 1 && c.sources[0].shuffleEachLaunch));
  assert.deepEqual(config.channels.slice(12, 15).map(c => c.title), ['FOOTBALL', 'BASKETBALL', 'FUTBOL']);
  assert.deepEqual(surfChannels(config.channels).map(c => c.id), [11, 15, 16, 17]);
  assert.ok(surfChannels(config.channels).every(c => c.sourceType === 'video_queue'));
  const startup = startupChannel(config.channels);
  assert.ok(config.channels.slice(1).some(c => c.id === startup.id));
});
test('playlist parsing accepts public URL forms and rejects unsafe or invalid sources', () => {
  const id = 'PLsyntax_fixture_1234567890';
  assert.equal(playlistId('https://www.youtube.com/playlist?list=' + id), id);
  assert.equal(playlistId('https://www.youtube.com/watch?v=M7lc1UVf-VE&list=' + id), id);
  assert.equal(playlistId(''), '');
  for (const input of ['junk', 'https://evil.example/playlist?list=' + id, 'javascript:alert(1)', 'https://www.youtube.com/@NostalgiaTV-f4p', 'https://youtube.com/playlist?list=RDMix']) assert.throws(() => playlistId(input));
});
test('config validation is atomic and rejects duplicate IDs, missing channels, and unverified durations', () => {
  let bad = clone(defaults); bad.channels[4].id = 1; assert.throws(() => validateConfig(bad));
  bad = clone(defaults); bad.channels = []; assert.throws(() => validateConfig(bad));
  bad = clone(defaults); bad.channels[1].sources[0].schedule = { ...c.schedule, durationsVerified: false }; assert.throws(() => validateConfig(bad));
  bad = clone(defaults); bad.channels[1].sources[0].schedule = { ...c.schedule, programs: [{ ...programs[0], duration: 0 }] }; assert.throws(() => validateConfig(bad));
  bad = clone(defaults); bad.channels[11].sources[0] = { type: 'hls_stream', name: 'bad', url: 'https://example.com/live.mp4' }; assert.throws(() => validateConfig(bad));
  assert.throws(() => serviceUrl('javascript:alert(1)'));
  assert.throws(() => serviceUrl('http://example.com'));
  assert.throws(() => serviceUrl('https://user:pass@example.com'));
});
test('shuffle setting survives validation and non-boolean imports are disabled', () => {
  const enabled = clone(defaults); enabled.channels[1].sources[0].shuffleEachLaunch = true;
  assert.equal(validateConfig(enabled).channels[1].sources[0].shuffleEachLaunch, true);
  const invalid = clone(defaults); invalid.channels[1].sources[0].shuffleEachLaunch = 'true';
  assert.equal(validateConfig(invalid).channels[1].sources[0].shuffleEachLaunch, false);
});
test('direct queues require unique HTTPS media with rights metadata', () => {
  const valid = validateConfig(defaults).channels.find(channel => channel.id === 11).sources[0];
  assert.equal(valid.type, 'video_queue');
  assert.equal(valid.items.length, 4);
  assert.ok(valid.items.every(item => item.url.startsWith('https://') && item.license && item.attribution));
  let bad = clone(defaults);
  bad.channels.find(channel => channel.id === 11).sources[0].items[1].url = bad.channels.find(channel => channel.id === 11).sources[0].items[0].url;
  assert.throws(() => validateConfig(bad), /unique/);
  bad = clone(defaults);
  delete bad.channels.find(channel => channel.id === 11).sources[0].items[0].license;
  assert.throws(() => validateConfig(bad), /license/);
});
test('viewing policy and screen fit imports are normalized to safe bounds', () => {
  const input = clone(defaults);
  input.settings = { surfPolicy: 'all', screenScale: 0.2, screenOffsetX: 999, screenOffsetY: -999 };
  assert.deepEqual(validateConfig(input).settings, { surfPolicy: 'all', screenScale: 0.85, screenOffsetX: 80, screenOffsetY: -80 });
  input.settings = { surfPolicy: 'invalid', screenScale: null };
  assert.deepEqual(validateConfig(input).settings, { surfPolicy: 'ad_free', screenScale: null, screenOffsetX: 0, screenOffsetY: 0 });
});
test('random startup only selects configured enabled embedded channels', () => {
  const channels = clone(normalized.channels); channels.forEach(channel => { channel.enabled = channel.id === 1; });
  assert.equal(startupChannel([{ ...c, id: 5 }]).id, 5);
  for (const random of [0, 0.4, 0.999]) assert.equal(startupChannel(channels, () => random).id, 1);
});
test('session shuffle preserves every item and avoids the previous launch item', () => {
  const items = ['A1234567890', 'B1234567890', 'C1234567890'].map(videoId => ({ videoId }));
  const shuffled = shuffledQueue(items, () => 0, 'B1234567890');
  assert.deepEqual(new Set(shuffled.map(item => item.videoId)), new Set(items.map(item => item.videoId)));
  assert.notEqual(shuffled[0].videoId, 'B1234567890');
  assert.deepEqual(items.map(item => item.videoId), ['A1234567890', 'B1234567890', 'C1234567890']);
});
test('virtual schedule advances while away and is stable across reconstruction', () => {
  assert.equal(broadcastAt(c, 'seed', epoch + 1200000).offset, 1200);
  const returned = broadcastAt(clone(c), 'seed', epoch + 1500000);
  assert.equal(returned.program.title, 'A'); assert.equal(returned.offset, 1500);
  assert.equal(broadcastAt(c, 'seed', epoch + 1800000).program.title, 'B');
  assert.equal(broadcastAt(c, 'seed', epoch + 2400000).offset, 0);
  assert.equal(broadcastAt(c, 'seed', epoch - 1000).program.title, 'B');
  assert.equal(broadcastAt(defaults.channels[1], 'seed', epoch), null);
});
test('seeded order survives refresh and the complete schedule cycle contains every program', () => {
  const channel = clone(c); channel.schedule.shuffle = true;
  channel.schedule.programs = Array.from({ length: 12 }, (_, i) => ({ ...programs[0], title: String(i), duration: 30 + i }));
  assert.deepEqual(orderedPrograms(channel, 'stable'), orderedPrograms(clone(channel), 'stable'));
  assert.notDeepEqual(orderedPrograms(channel, 'stable'), orderedPrograms(channel, 'different'));
  const total = channel.schedule.programs.reduce((sum, p) => sum + p.duration, 0);
  const a = broadcastAt(channel, 'stable', epoch + 73000);
  const b = broadcastAt(channel, 'stable', epoch + (73 + total * 100) * 1000);
  assert.equal(a.program.title, b.program.title); assert.equal(a.offset, b.offset);
});

test('legacy saved settings retain custom playlists and sports destinations', () => {
  const old = { version: 1, seed: 'legacy', services: [{ name: 'My sports', url: 'https://example.com/sports' }],
    channels: Array.from({ length: 6 }, (_, id) => ({ id, title: ['LIVE SPORTS','SPORTS TV','INDIE / POP','RAP / R&B','RETRO TV','OFF THE AIR'][id],
      enabled: true, playlist: id === 4 ? 'PLcustom_fixture_1234567890' : id === 5 ? 'PLQl8zBB7bPvLWfGCVicg_kVmSVTGml2y4' : defaults.channels[id].sources[0].url, schedule: null })) };
  const upgraded = upgradeChannelDefaults(old, normalized);
  assert.equal(upgraded.channels.length, 18);
  assert.equal(upgraded.channels[4].sources.at(-1).url, 'PLcustom_fixture_1234567890');
  assert.equal(upgraded.channels[8].sources.at(-1).url, 'PLQl8zBB7bPvLWfGCVicg_kVmSVTGml2y4');
  assert.equal(upgraded.services[0].url, 'https://example.com/sports');
});
test('queue validation and one-time seamless lineup migration', () => {
  const bad = clone(defaults);
  bad.channels[12].sources[0].items[1].videoId = bad.channels[12].sources[0].items[0].videoId;
  assert.throws(() => validateConfig(bad), /unique/);
  const saved = clone(normalized);
  saved.lineupRevision = 1;
  saved.channels = saved.channels.filter(c => c.id < 12 && c.id !== 9);
  saved.channels[1].title = 'MY SPORTS';
  saved.channels[2].order = 99;
  saved.channels.find(c => c.id === 8).enabled = false;
  saved.channels.find(c => c.id === 8).order = 77;
  saved.services.push({ name: 'My link', url: 'https://example.com/sports' });
  const upgraded = upgradeChannelDefaults(saved, normalized);
  assert.equal(upgraded.lineupRevision, 4);
  assert.deepEqual(upgraded.channels.filter(c => c.id >= 12 && c.id <= 14).map(c => c.title), ['FOOTBALL', 'BASKETBALL', 'FUTBOL']);
  assert.equal(upgraded.channels.find(c => c.id === 1).title, 'MY SPORTS');
  assert.equal(upgraded.channels.find(c => c.id === 9).title, 'ELECTRONIC');
  assert.equal(upgraded.channels.find(c => c.id === 8).enabled, false);
  assert.equal(upgraded.channels.find(c => c.id === 8).order, 77);
  assert.equal(upgraded.services[0].name, 'My link');
  assert.equal(upgraded.channels.find(c => c.id === 12).sources.length, 1);
  assert.deepEqual(upgraded.channels.filter(c => c.sources[0].surfEligible).map(c => c.id), [11, 15, 16, 17]);
  const removed = clone(upgraded);
  removed.channels = removed.channels.filter(c => c.title !== 'FUTBOL');
  assert.equal(upgradeChannelDefaults(removed, normalized).channels.some(c => c.title === 'FUTBOL'), false);
  const custom = clone(saved.channels[1]); custom.id = 20; custom.order = 100; custom.title = 'MY CHANNEL'; saved.channels.push(custom);
  const preserved = upgradeChannelDefaults(saved, normalized);
  assert.equal(preserved.channels.find(c => c.id === 20).title, 'MY CHANNEL');
});
