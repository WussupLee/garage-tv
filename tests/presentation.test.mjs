import test from 'node:test';
import assert from 'node:assert/strict';
import { StationPresentation } from '../src/presentation.js';
import { GamepadInput } from '../src/input.js';

function clock() {
  let time = 0, next = 0; const tasks = new Map();
  return {
    setTimeout(fn, ms) { const id = ++next; tasks.set(id, { at: time + ms, fn }); return id; },
    clearTimeout(id) { tasks.delete(id); },
    advance(ms) {
      const end = time + ms;
      while (true) {
        const task = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
        if (!task || task[1].at > end) break;
        time = task[1].at; tasks.delete(task[0]); task[1].fn();
      }
      time = end;
    }
  };
}
test('identification begins at PLAYING, lasts 3000ms, and repeated PLAYING does not extend it', () => {
  const time = clock(), p = new StationPresentation(() => {}, time);
  p.request(1, 3); assert.equal(p.state.mode, 'tuning');
  time.advance(8000); assert.equal(p.state.mode, 'tuning');
  p.playing(1); time.advance(2500); p.playing(1); time.advance(499);
  assert.equal(p.state.osdVisible, true); time.advance(1); assert.equal(p.state.osdVisible, false);
});
test('buffering waits 500ms, short stalls do not restart identification, resume gets a fresh hold', () => {
  const time = clock(), p = new StationPresentation(() => {}, time);
  p.request(1, 3); p.playing(1); time.advance(2700); p.buffering(1); time.advance(299);
  assert.equal(p.state.mode, 'playing'); p.playing(1); time.advance(1); assert.equal(p.state.osdVisible, false);
  p.buffering(1); time.advance(499); assert.equal(p.state.mode, 'playing');
  time.advance(1); assert.equal(p.state.mode, 'buffering'); assert.equal(p.state.current, 3);
  p.playing(1); time.advance(2999); assert.equal(p.state.osdVisible, true);
  time.advance(1); assert.equal(p.state.osdVisible, false);
});
test('superseded events and timers cannot change the requested channel', () => {
  const time = clock(), p = new StationPresentation(() => {}, time);
  p.request(1, 1); p.playing(1); p.buffering(1); time.advance(100);
  p.request(2, 2); p.playing(1); p.unavailable(1); time.advance(4000);
  assert.equal(p.state.mode, 'tuning'); assert.equal(p.state.requested, 2); assert.equal(p.state.current, null);
  p.playing(2); time.advance(3000); assert.equal(p.state.current, 2); assert.equal(p.state.osdVisible, false);
});
test('tuning fails after 20 seconds, does not resurrect, and explicit retry gets a new request', () => {
  const time = clock(), p = new StationPresentation(() => {}, time);
  p.request(1, 4); p.buffering(1); time.advance(19999); assert.equal(p.state.mode, 'tuning');
  time.advance(1); assert.equal(p.state.mode, 'unavailable'); p.playing(1); assert.equal(p.state.mode, 'unavailable');
  p.request(2, 4); p.playing(2); assert.equal(p.state.mode, 'playing');
});
test('autoplay block waits for explicit input, with no endless timeout or retry loop', () => {
  const time = clock(), p = new StationPresentation(() => {}, time);
  p.request(1, 1); p.blocked(1); time.advance(60000); assert.equal(p.state.mode, 'blocked');
  p.playing(1); assert.equal(p.state.mode, 'playing');
});
test('standard D-pad repeats after 350ms then 160ms; Y/A/B are edge-triggered', () => {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldDocument = globalThis.document, oldRAF = globalThis.requestAnimationFrame;
  const buttons = Array.from({length:17}, () => ({ pressed: false, value: 0 }));
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [{ index:0, mapping:'standard', buttons, axes:[] }] } });
  globalThis.document = { visibilityState:'visible' }; globalThis.requestAnimationFrame = () => {};
  try {
    const calls = [], input = new GamepadInput(a => calls.push(a), () => {});
    buttons[13].pressed = true; input.frame(0); input.frame(349); assert.deepEqual(calls, ['down']);
    input.frame(350); input.frame(509); input.frame(510); assert.deepEqual(calls, ['down','down','down']);
    buttons[13].pressed = false; input.frame(511);
    for (const [index, command] of [[3,'guide'],[0,'confirm'],[1,'back']]) {
      buttons[index].pressed = true; input.frame(600); input.frame(2000);
      assert.equal(calls.at(-1), command); buttons[index].pressed = false; input.frame(2100);
    }
    assert.equal(calls.length, 6);
  } finally {
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator;
    globalThis.document = oldDocument; globalThis.requestAnimationFrame = oldRAF;
  }
});
