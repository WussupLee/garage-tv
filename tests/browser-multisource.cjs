const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { readFile, mkdir } = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const fakeAPI = require('./fake-player.cjs');
function wavFixture() {
  const samples = 22050, bytes = 44 + samples * 2, body = Buffer.alloc(bytes);
  body.write('RIFF', 0); body.writeUInt32LE(bytes - 8, 4); body.write('WAVEfmt ', 8);
  body.writeUInt32LE(16, 16); body.writeUInt16LE(1, 20); body.writeUInt16LE(1, 22);
  body.writeUInt32LE(22050, 24); body.writeUInt32LE(44100, 28); body.writeUInt16LE(2, 32); body.writeUInt16LE(16, 34);
  body.write('data', 36); body.writeUInt32LE(samples * 2, 40);
  return body;
}

async function main() {
  await mkdir('test-results', { recursive: true });
  const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch('http://127.0.0.1:4173/garage-tv/')).ok) break; } catch (_) {}
      await delay(100);
    }
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(fakeAPI);
    await page.addInitScript(() => { Math.random = () => 0; });
    await page.route('https://example.com/radio.mp3', route => route.fulfill({ contentType: 'audio/wav', body: wavFixture() }));
    await page.goto('http://127.0.0.1:4173/garage-tv/');
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'playing');
    assert.equal(await page.locator('.guide-row').count(), 15);
    assert.equal(await page.locator('.is-tuned').getAttribute('data-channel'), '1');
    await page.screenshot({ path: 'test-results/multi-source-channel-switch.png' });
    await page.keyboard.press('g');
    const before = await page.evaluate(() => window.__calls.length);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('.is-selected').getAttribute('data-channel'), '2');
    assert.equal(await page.locator('.is-tuned').getAttribute('data-channel'), '1');
    assert.equal(await page.evaluate(() => window.__calls.length), before);
    await page.screenshot({ path: 'test-results/multi-source-guide.png' });
    await page.keyboard.press('Escape');
    await page.keyboard.press('g');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'directory');
    assert.equal(await page.locator('.service-link').first().getAttribute('href'), 'https://00s.theretrotvs.com/');
    assert.equal(await page.locator('#live-sports-frame').isVisible(), false);
    await page.keyboard.press('g');
    assert.equal(await page.locator('.is-tuned').getAttribute('data-channel'), '4');
    await page.keyboard.press('Escape');
    await page.keyboard.press('s');
    await page.locator('#channel-select').selectOption('11');
    await page.locator('#source-type').selectOption('audio_stream');
    await page.locator('#channel-playlist').fill('https://example.com/radio.mp3');
    await page.locator('#channel-form button[type=submit]').click();
    assert.match(await page.locator('#settings-notice').textContent(), /saved/);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('garage-tv.config.v2')));
    assert.equal(stored.channels.find(c => c.id === 11).sources[0].type, 'audio_stream');
    await page.locator('#export-config').click();
    assert.equal(JSON.parse(await page.locator('#config-json').inputValue()).channels.length, 15);
    await page.locator('#config-json').fill('{bad json');
    await page.locator('#import-config').click();
    assert.match(await page.locator('#settings-notice').textContent(), /Import failed/);
    await page.locator('#settings [data-close]').click();
    await page.keyboard.press('g');
    await page.locator('.guide-row[data-channel="11"]').click();
    await page.waitForFunction(() => ['playing', 'blocked'].includes(document.querySelector('#app').dataset.mode));
    if (await page.locator('#app').getAttribute('data-mode') === 'blocked') await page.locator('#start-playback').click();
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'playing');
    assert.equal(await page.locator('#native-audio').evaluate(node => node.paused), false);
    await page.keyboard.press('d');
    assert.equal(await page.locator('.compatibility-row').count(), 15);
    assert.match(await page.locator('.compatibility-row').nth(10).textContent(), /opens provider/i);
    const audioDiagnostic = await page.locator('.compatibility-row').nth(11).textContent();
    assert.match(audioDiagnostic, /startup: \d+ ms/i);
    const fixtureLatency = Number(audioDiagnostic.match(/startup: (\d+) ms/i)[1]);
    await page.locator('#diagnostics [data-close]').click();
    await page.keyboard.press('g');
    await page.locator('.guide-row[data-channel="12"]').click();
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'playing');
    assert.equal(await page.evaluate(() => window.__active.video), 'WitAjwWY6EQ');
    assert.match(await page.locator('.guide-row[data-channel="12"]').getAttribute('aria-label'), /Texas vs USC/);
    await page.screenshot({ path: 'test-results/classic-football-switch.png' });
    await page.evaluate(() => { window.__active.seconds = 42; });
    await page.keyboard.press('g');
    await page.screenshot({ path: 'test-results/classic-sports-guide.png' });
    await page.locator('.guide-row[data-channel="13"]').click();
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'playing');
    assert.equal(await page.evaluate(() => window.__active.video), 'EoVTttvKfRs');
    assert.equal(await page.evaluate(() => window.__maxActive), 1);
    await page.keyboard.press('g');
    await page.locator('.guide-row[data-channel="14"]').click();
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'playing');
    assert.equal(await page.evaluate(() => window.__active.video), '3ojXHf293M8');
    assert.equal(await page.evaluate(() => window.__maxActive), 1);
    await page.keyboard.press('g');
    await page.locator('.guide-row[data-channel="12"]').click();
    await page.waitForFunction(() => document.querySelector('#app').dataset.mode === 'playing');
    assert.equal(await page.evaluate(() => window.__calls.at(-1).startSeconds), 42);
    assert.deepEqual(errors, []);
    console.log('PASS: 15-channel guide, classic football/basketball/Futbol queues, one YouTube player, focus without retune, external directory, native audio fixture (' + fixtureLatency + ' ms), settings, storage and diagnostics.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
