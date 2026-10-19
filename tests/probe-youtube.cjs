// Optional desktop embed probe. Run with video IDs as arguments; never part of CI.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { writeFile, unlink } = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
let ids = process.argv.slice(2);
if (ids.includes('--all')) {
  const config = JSON.parse(readFileSync('data/default-config.json', 'utf8'));
  const snapshots = JSON.parse(readFileSync('data/playlist-snapshots.json', 'utf8')).playlists;
  ids = config.channels.flatMap(channel => channel.sources.flatMap(source => source.type === 'youtube_queue' ? source.items.map(item => item.videoId) : source.type === 'youtube_playlist' ? (snapshots[source.url]?.videos || []).map(item => item.videoId) : []));
  ids = [...new Set(ids)];
}
if (!ids.length) throw new Error('Supply at least one YouTube video ID.');
async function main() {
  const path = 'dist/embed-probe.html';
  await writeFile(path, '<!doctype html><div id="probe"></div><script src="https://www.youtube.com/iframe_api"></script>');
  const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch('http://127.0.0.1:4173/garage-tv/embed-probe.html')).ok) break; } catch (_) {} await delay(100); }
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto('http://127.0.0.1:4173/garage-tv/embed-probe.html');
    await page.waitForFunction(() => window.YT?.Player, null, { timeout: 20000 });
    await page.evaluate(() => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('probe player ready timeout')), 15000);
      window.__probe = { pending: null };
      window.__probe.player = new YT.Player('probe', { width: '640', height: '360', videoId: 'M7lc1UVf-VE',
        playerVars: { autoplay: 0, origin: location.origin, playsinline: 1 },
        events: {
          onReady: () => { clearTimeout(timer); resolve(); },
          onStateChange: e => { if (e.data === 1) window.__probe.pending?.('playing'); },
          onError: e => window.__probe.pending?.('error ' + e.data),
          onAutoplayBlocked: () => window.__probe.pending?.('blocked')
        }
      });
    }));
    const failures = [], observations = [];
    for (const id of ids) {
      const started = Date.now();
      const result = await page.evaluate(videoId => new Promise(resolve => {
        let settled = false;
        const finish = value => { if (settled) return; settled = true; clearTimeout(timer); window.__probe.pending = null; resolve(value); };
        const timer = setTimeout(() => finish('timeout'), 8000);
        window.__probe.pending = finish;
        window.__probe.player.loadVideoById(videoId);
        window.__probe.player.playVideo();
      }), id);
      const startupMs = Date.now() - started;
      observations.push({ id, result, startupMs });
      console.log(id + ' ' + result + ' ' + startupMs + 'ms');
      if (result !== 'playing') failures.push(id + ' ' + result + ' ' + startupMs + 'ms');
    }
    const playing = observations.filter(item => item.result === 'playing').map(item => item.startupMs).sort((a, b) => a - b);
    if (playing.length) console.log('SUMMARY ' + playing.length + '/' + ids.length + ' playing; startup min/median/max ' + playing[0] + '/' + playing[Math.floor(playing.length / 2)] + '/' + playing.at(-1) + 'ms');
    if (failures.length) throw new Error('Embed probe failures:\n' + failures.join('\n'));
  } finally { if (browser) await browser.close(); server.kill(); await unlink(path).catch(() => {}); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
