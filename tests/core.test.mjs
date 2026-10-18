import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateConfig, playlistId, serviceUrl, startupChannel, clone, upgradeChannelDefaults } from '../src/config.js';
import { broadcastAt, orderedPrograms } from '../src/schedule.js';
const defaults = JSON.parse(await readFile(new URL('../data/default-config.json', import.meta.url)));
// These video IDs come from Google's IFrame API examples; playlists below are syntax fixtures, never deployed sources.
const programs = [{ videoId: 'M7lc1UVf-VE', title: 'A', duration: 1800 }, { videoId: 'bHQqvYy5KYo', title: 'B', duration: 600 }];
const c = { ...defaults.channels[1], schedule: { epoch: '2026-01-01T00:00:00Z', durationsVerified: true, shuffle: false, programs } };
const epoch = Date.parse(c.schedule.epoch);
test('deployable defaults contain six channels and the requested same-tab service URL', () => {
  const config = validateConfig(defaults);
  assert.deepEqual(config.channels.map(c => c.id), [0, 1, 2, 3, 4, 5]);
  assert.equal(config.services[0].url, 'https://ntv.st/matches/kobra');
  assert.equal(config.channels[1].playlist, 'PLqlmRlit66auWzsLO8agSNSQqsitEvR4-');
  assert.equal(config.channels[2].playlist, 'PLqlmRlit66atCuXs45FwMHbId06vci8Th');
  assert.equal(config.channels[3].playlist, 'PLqlmRlit66au-YSAWGa6Qzyb8A4_7uQpF');
  assert.ok([1, 2, 3, 4, 5].includes(startupChannel(config.channels).id));
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
  bad = clone(defaults); bad.channels.splice(4, 1); assert.throws(() => validateConfig(bad));
  bad = clone(defaults); bad.channels[1].schedule = { ...c.schedule, durationsVerified: false }; assert.throws(() => validateConfig(bad));
  bad = clone(defaults); bad.channels[1].schedule = { ...c.schedule, programs: [{ ...programs[0], duration: 0 }] }; assert.throws(() => validateConfig(bad));
  assert.throws(() => serviceUrl('javascript:alert(1)'));
  assert.throws(() => serviceUrl('http://example.com'));
  assert.throws(() => serviceUrl('https://user:pass@example.com'));
});
test('random startup only selects configured enabled channels 001–005', () => {
  const channels = clone(defaults.channels); channels[1] = c; channels[2].schedule = c.schedule; channels[2].enabled = false;
  channels[3].playlist = ''; channels[4].playlist = ''; channels[5].playlist = '';
  assert.equal(startupChannel([{ ...c, id: 5 }]).id, 5);
  for (const random of [0, 0.4, 0.999]) assert.equal(startupChannel(channels, () => random).id, 1);
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

test('five-channel saved settings gain supplied sources while custom choices are preserved', () => {
  const old = validateConfig(defaults); old.channels.pop();
  old.channels[3].playlist = ''; old.channels[4].playlist = 'PLcustom_fixture_1234567890';
  const upgraded = upgradeChannelDefaults(old, validateConfig(defaults));
  assert.equal(upgraded.channels[3].playlist, 'PLqlmRlit66au-YSAWGa6Qzyb8A4_7uQpF');
  assert.equal(upgraded.channels[4].playlist, 'PLcustom_fixture_1234567890');
  assert.equal(upgraded.channels[5].playlist, 'PLQl8zBB7bPvLWfGCVicg_kVmSVTGml2y4');
  upgraded.channels[3].playlist = '';
  assert.equal(upgradeChannelDefaults(upgraded, validateConfig(defaults)).channels[3].playlist, '');
});
