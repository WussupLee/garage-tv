const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdir, readFile } = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');

// Controlled fake for API wiring, not a claim of actual YouTube playback or Xbox testing.
const fakeAPI = `
window.__calls = []; window.__state = -1; window.__video = ''; window.__seconds = 0;
window.YT = { Player: class {
  constructor(id, options) {
    window.__options = options; window.__instances = (window.__instances || 0) + 1;
    const old = document.getElementById(id); const frame = document.createElement('iframe'); frame.id = id; old.replaceWith(frame); this.frame = frame;
    window.__emit = (name, data) => options.events[name]({data});
    setTimeout(() => options.events.onReady({ target: this }), 0);
  }
  getIframe() {return this.frame;} destroy(){ this.frame.remove(); }
  setVolume(){} mute(){} unMute(){} setLoop(){} setShuffle(){}
  loadPlaylist(p) {window.__calls.push({type:'playlist', ...p}); window.__state=1; window.__video='M7lc1UVf-VE'; window.__seconds=p.startSeconds; setTimeout(()=>window.__emit('onStateChange',1),0);}
  loadVideoById(p) {window.__calls.push({type:'video', ...p}); window.__video=p.videoId; window.__seconds=p.startSeconds; window.__state=1; setTimeout(()=>window.__emit('onStateChange',1),0);}
  playVideo(){window.__state=1; window.__emit('onStateChange',1);}
  pauseVideo(){window.__state=2; window.__emit('onStateChange',2);}
  stopVideo(){window.__state=0;}
  nextVideo(){window.__calls.push({type:'next'});}
  seekTo(t){window.__seconds=t;}
  getPlayerState(){return window.__state;} getVideoData(){return {title:'Controlled video fixture',video_id:window.__video};}
  getCurrentTime(){return window.__seconds;} getDuration(){return 0;} getPlaylistIndex(){return 0;} getPlaylist(){return ['M7lc1UVf-VE'];}
}};
window.__padButtons=Array.from({length:17},()=>({pressed:false,value:0}));
window.__padConnected=false;
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__padConnected?[{index:0,id:'Controlled standard gamepad fixture',mapping:'standard',buttons:window.__padButtons,axes:[0,0]}]:[]});
`;
async function poll(fn, message) { for (let i=0;i<60;i++) { if(await fn()) return; await delay(100); } throw new Error(message); }
async function main() {
  await mkdir('test-results', {recursive:true});
  const server = spawn(process.execPath,['scripts/serve.mjs'],{stdio:'ignore'});
  let browser;
  try {
    await poll(async()=>{try{return (await fetch('http://127.0.0.1:4173/garage-tv/')).ok;}catch{return false;}},'Server did not start');
    const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(fakeAPI);
    const emptyDefaults = JSON.parse(await readFile('data/default-config.json', 'utf8'));
    for (const channel of emptyDefaults.channels) if (channel.sourceType === 'youtube') channel.playlist = '';
    await page.route('**/data/default-config.json', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(emptyDefaults)}));
    await page.goto('http://127.0.0.1:4173/garage-tv/');
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Setup needed'));
    assert.equal(await page.locator('.guide-row').count(),5);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:'test-results/720p-setup.png'});
    await page.keyboard.press('g'); assert.equal(await page.locator('#guide').isVisible(),true);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#guide').isVisible(),false);
    await page.locator('#open-settings').click();
    await page.locator('#channel-playlist').fill('https://example.com/not-youtube');
    await page.locator('#channel-form button[type=submit]').click();
    assert.match(await page.locator('#settings-notice').textContent(),/not saved/);
    assert.equal(await page.evaluate(()=>localStorage.getItem('garage-tv.config.v1')),null);
    const fixtureId='PLbrowser_fixture_1234567890';
    await page.locator('#channel-playlist').fill('https://www.youtube.com/playlist?list='+fixtureId);
    await page.locator('#channel-form button[type=submit]').click();
    await page.waitForFunction(()=>window.__calls.some(c=>c.type==='playlist'));
    assert.equal(await page.evaluate(()=>window.__calls.find(c=>c.type==='playlist').list),fixtureId);
    assert.match(await page.locator('#settings-notice').textContent(),/saved/);
    // Add a second distinct playlist via UI, then switch sources.
    await page.locator('#channel-select').selectOption('2');
    await page.locator('#channel-playlist').fill('PLsecond_fixture_1234567890');
    await page.locator('#channel-form button[type=submit]').click();
    await page.locator('#settings [data-close]').click();
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(()=>window.__calls.some(c=>c.list==='PLsecond_fixture_1234567890'));
    assert.equal(await page.locator('#channel-overlay').isVisible(),true);
    await page.waitForFunction(()=>document.querySelector('#channel-overlay').hidden,{},{timeout:5000});
    assert.equal(await page.evaluate(()=>window.__instances),1);
    await page.keyboard.press('g');
    assert.equal(await page.locator('.guide-row.is-tuned').getAttribute('data-channel'),'2');
    await page.screenshot({path:'test-results/720p-guide.png'});
    await page.keyboard.press('Escape');
    await page.evaluate(()=>window.__emit('onAutoplayBlocked'));
    assert.equal(await page.locator('#playback-message').isVisible(),true);
    await page.locator('#start-playback').click();
    assert.equal(await page.locator('#playback-message').isVisible(),false);
    await page.evaluate(()=>window.__emit('onError',153));
    assert.match(await page.locator('#playback-text').textContent(),/origin\/referrer/);
    await page.locator('#start-playback').click();
    // Held bumper triggers once; release and press triggers again.
    await page.evaluate(()=>{window.__padConnected=true;window.__padButtons[5]={pressed:true,value:1};});
    await delay(650); assert.match(await page.locator('#tuned-label').textContent(),/^003/);
    await page.evaluate(()=>window.__padButtons[5]={pressed:false,value:0}); await delay(300);
    await page.evaluate(()=>window.__padButtons[5]={pressed:true,value:1}); await delay(400);
    assert.match(await page.locator('#tuned-label').textContent(),/^004/);
    await page.evaluate(()=>window.__padButtons[5]={pressed:false,value:0});
    await page.keyboard.press('d'); await delay(1100);
    assert.match(await page.locator('#diagnostic-output').textContent(),/Controlled standard gamepad/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('g'); await page.locator('[data-channel="0"]').click();
    assert.equal(await page.locator('#directory').isVisible(),true);
    const link=page.locator('.service-link').first();
    assert.equal(await link.getAttribute('href'),'https://ntv.st/matches/kobra');
    assert.equal(await link.getAttribute('target'),null);
    await page.locator('#edit-services').click();
    await page.locator('#service-name').fill('Authorized service fixture'); await page.locator('#service-url').fill('https://example.com/sports');
    await page.locator('#service-form button[type=submit]').click();
    assert.match(await page.locator('#service-edit-list').textContent(),/Authorized service fixture/);
    await page.getByRole('button',{name:'Edit Authorized service fixture',exact:true}).click();
    await page.locator('#service-name').fill('Updated fixture'); await page.locator('#service-form button[type=submit]').click();
    assert.match(await page.locator('#service-edit-list').textContent(),/Updated fixture/);
    await page.getByRole('button',{name:'Remove Updated fixture',exact:true}).click();
    assert.doesNotMatch(await page.locator('#service-edit-list').textContent(),/Updated fixture/);
    await page.locator('#export-config').click();
    const exported=JSON.parse(await page.locator('#config-json').inputValue()); assert.equal(exported.channels[1].playlist,fixtureId);
    await page.locator('#config-json').fill('{bad json'); await page.locator('#import-config').click();
    assert.match(await page.locator('#settings-notice').textContent(),/Import failed/);
    // Test virtual seek integration at exact controlled times; not real video synchronization.
    const scheduled=JSON.parse(JSON.stringify(exported));
    scheduled.channels[1].schedule={epoch:'2026-01-01T00:00:00Z',durationsVerified:true,shuffle:false,programs:[{videoId:'M7lc1UVf-VE',title:'Measured fixture',duration:1800},{videoId:'bHQqvYy5KYo',title:'Next fixture',duration:600}]};
    await page.evaluate(()=>{window.__realNow=Date.now;Date.now=()=>Date.parse('2026-01-01T00:20:00Z');});
    await page.locator('#config-json').fill(JSON.stringify(scheduled)); await page.locator('#import-config').click();
    await page.locator('#settings [data-close]').click();
    await page.keyboard.press('g'); await page.locator('[data-channel="1"]').click();
    await page.waitForFunction(()=>window.__calls.some(c=>c.type==='video' && c.startSeconds===1200));
    await page.keyboard.press('ArrowUp');
    await page.evaluate(()=>Date.now=()=>Date.parse('2026-01-01T00:25:00Z'));
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(()=>window.__calls.some(c=>c.type==='video' && c.startSeconds===1500));
    await page.evaluate(()=>Date.now=window.__realNow);
    await page.reload(); await page.waitForFunction(()=>document.querySelector('#tuned-label').textContent.match(/^00[12]/));
    const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('garage-tv.config.v1')));
    assert.equal(persisted.channels[2].playlist,'PLsecond_fixture_1234567890');
    await page.setViewportSize({width:1920,height:1080});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'test-results/1080p.png'});
    await page.setViewportSize({width:640,height:360});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: 720p/1080p layout, five channels, guide, overlay expiry, source switching, single player, storage, invalid input/import, live-service CRUD, autoplay/error wiring, simulated gamepad debounce, and virtual return seeks. YouTube API is mocked; Xbox hardware is untested.');
    // Separate no-Gamepad-API degradation check.
    const unavailable=await browser.newPage({viewport:{width:1280,height:720}});
    await unavailable.addInitScript(()=>Object.defineProperty(navigator,'getGamepads',{value:undefined}));
    await unavailable.route('**/data/default-config.json', route => route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(emptyDefaults)}));
    await unavailable.goto('http://127.0.0.1:4173/garage-tv/');
    await unavailable.waitForFunction(()=>document.querySelector('#status').textContent.includes('Setup needed'));
    await unavailable.keyboard.press('d'); await delay(1100);
    assert.match(await unavailable.locator('#diagnostic-output').textContent(),/"supported": false/);
    console.log('PASS: missing Gamepad API leaves keyboard and onscreen controls usable.');
    // Exercise the real API-loader failure path without fetching third-party content.
    await unavailable.route('https://www.youtube.com/iframe_api', route => route.abort());
    await unavailable.locator('#test-youtube').click();
    await unavailable.waitForFunction(()=>document.querySelector('#playback-text').textContent.includes('could not load'));
    assert.equal(await unavailable.locator('#playback-message').isVisible(),true);
    console.log('PASS: blocked YouTube API script produces a readable retry state.');
  } finally { if(browser) await browser.close(); server.kill(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
