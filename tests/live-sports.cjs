// Optional real-network desktop smoke test. Requires Playwright and YouTube access.
// This is not an Xbox or permanent embedding-permission certification.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

async function main() {
  const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch('http://127.0.0.1:4173/garage-tv/')).ok) break; } catch (_) {}
      await delay(100);
    }
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => { Math.random = () => 0; });
    await page.goto('http://127.0.0.1:4173/garage-tv/');
    await page.waitForFunction(() => document.querySelectorAll('.guide-row').length === 15);
    for (const id of [12, 13, 14]) {
      await page.evaluate(() => document.getElementById('toggle-guide').click());
      await page.locator(`.guide-row[data-channel="${id}"]`).click();
      const start = Date.now();
      await page.waitForFunction(() => ['playing', 'blocked', 'unavailable'].includes(document.querySelector('#app').dataset.mode), null, { timeout: 25000 }).catch(() => {});
      const state = await page.evaluate(() => ({ mode: document.querySelector('#app').dataset.mode, diagnostics: document.querySelector('#event-log').textContent.slice(0, 400) }));
      await page.evaluate(() => document.getElementById('open-diagnostics').click());
      await delay(1100);
      const player = await page.evaluate(() => { try { return JSON.parse(document.getElementById('diagnostic-output').textContent).player; } catch (_) { return {}; } });
      await page.locator('#diagnostics [data-close]').click();
      console.log(`${String(id).padStart(3, '0')}: ${state.mode} after ${Date.now() - start} ms; video ${player.videoId || '-'}; ${state.diagnostics.replaceAll('\n', ' | ')}`);
    }
  } finally { if (browser) await browser.close(); server.kill(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
