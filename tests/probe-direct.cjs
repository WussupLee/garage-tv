// Optional desktop media probe. Tests bundled direct video URLs in real Edge.
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');

const config = JSON.parse(readFileSync('data/default-config.json', 'utf8'));
const items = config.channels.flatMap(channel => channel.sources.flatMap(source =>
  source.type === 'video_queue' ? source.items.map(item => ({ channel: channel.id, title: item.title, url: item.url })) : []
));

async function main() {
  if (!items.length) throw new Error('No direct video items are configured.');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent('<video muted playsinline style="width:640px;height:360px"></video>');
    const observations = [];
    for (const item of items) {
      const started = Date.now();
      const result = await page.evaluate(({ url }) => new Promise(resolve => {
        const video = document.querySelector('video');
        let settled = false;
        const finish = value => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          video.onplaying = video.onerror = video.onstalled = null;
          resolve(value);
        };
        const timer = setTimeout(() => finish('timeout'), 15000);
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.onplaying = () => finish('playing');
        video.onerror = () => finish('error ' + (video.error?.code || 'unknown'));
        video.onstalled = () => {};
        video.src = url;
        video.play().catch(error => finish('play rejected: ' + error.name));
      }), item);
      const startupMs = Date.now() - started;
      observations.push({ ...item, result, startupMs });
      console.log(String(item.channel).padStart(3, '0') + ' ' + item.title + ' ' + result + ' ' + startupMs + 'ms');
    }
    const failures = observations.filter(item => item.result !== 'playing');
    const times = observations.filter(item => item.result === 'playing').map(item => item.startupMs).sort((a, b) => a - b);
    if (times.length) console.log('SUMMARY ' + times.length + '/' + items.length + ' playing; startup min/median/max ' + times[0] + '/' + times[Math.floor(times.length / 2)] + '/' + times.at(-1) + 'ms');
    if (failures.length) throw new Error('Direct video probe failures:\n' + failures.map(item => item.channel + ' ' + item.title + ' ' + item.result).join('\n'));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
