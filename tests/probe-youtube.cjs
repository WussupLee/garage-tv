// Optional desktop embed probe. Run with video IDs as arguments; never part of CI.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { writeFile, unlink } = require('node:fs/promises');
const { setTimeout: delay } = require('node:timers/promises');
const ids = process.argv.slice(2);
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
    for (const id of ids) {
      const result = await page.evaluate(videoId => new Promise(resolve => {
        let settled = false, player;
        const finish = value => { if (settled) return; settled = true; clearTimeout(timer); try { player?.destroy(); } catch (_) {} document.getElementById('probe')?.remove(); const host = document.createElement('div'); host.id = 'probe'; document.body.prepend(host); resolve(value); };
        const timer = setTimeout(() => finish('timeout'), 8000);
        player = new YT.Player('probe', { width: '640', height: '360', videoId,
          playerVars: { autoplay: 1, origin: location.origin, playsinline: 1 },
          events: { onReady: e => e.target.playVideo(), onStateChange: e => { if (e.data === 1) finish('playing'); }, onError: e => finish('error ' + e.data), onAutoplayBlocked: () => finish('blocked') }
        });
      }), id);
      console.log(id + ' ' + result);
    }
  } finally { if (browser) await browser.close(); server.kill(); await unlink(path).catch(() => {}); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
