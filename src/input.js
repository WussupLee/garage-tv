// Standard mapping: directions repeat; A/B/Y/Menu remain edge-triggered.
export class GamepadInput {
  constructor(action, diagnostic) {
    this.action = action; this.diagnostic = diagnostic; this.previous = {}; this.repeats = {}; this.lastReport = 0;
    this.available = typeof navigator.getGamepads === 'function';
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  frame(time) {
    let pads = [];
    let error = '';
    try { if (this.available) pads = Array.from(navigator.getGamepads() || []).filter(Boolean); }
    catch (e) { error = e.message; }
    const current = {};
    let pending = null;
    for (const pad of pads) {
      const bindings = { 0: 'confirm', 1: 'back', 3: 'guide', 4: 'previous', 5: 'next', 9: 'controls', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
      pad.buttons.forEach((button, index) => {
        const key = pad.index + ':' + index;
        current[key] = button.pressed || button.value > 0.6;
        if (pad.mapping !== 'standard' || !bindings[index]) return;
        if (!current[key]) { delete this.repeats[key]; return; }
        const direction = [12, 13, 14, 15].includes(index);
        if (!this.previous[key]) { pending = pending || bindings[index]; if (direction) this.repeats[key] = time + 350; }
        else if (direction && time >= this.repeats[key]) { pending = pending || bindings[index]; this.repeats[key] = time + 160; }
      });
    }
    if (pending && document.visibilityState === 'visible') this.action(pending);
    this.previous = current;
    for (const key of Object.keys(this.repeats)) if (!current[key]) delete this.repeats[key];
    if (time - this.lastReport > 250) {
      this.lastReport = time;
      this.diagnostic({ supported: this.available, error, pads: pads.map(p => ({ index: p.index, id: p.id, mapping: p.mapping || 'unknown — use keyboard or cursor controls', buttons: p.buttons.map((b, i) => ({ index: i, pressed: b.pressed, value: Math.round(b.value * 100) / 100 })).filter(b => b.pressed || b.value > 0.1), axes: p.axes.map(a => Math.round(a * 100) / 100) })) });
    }
    requestAnimationFrame(this.frame);
  }
}

export function keyboardInput(action) {
  const held = new Map();
  const release = key => { clearTimeout(held.get(key)); held.delete(key); };
  const clear = () => { for (const key of held.keys()) release(key); };
  document.addEventListener('keyup', event => release(event.key));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  document.addEventListener('keydown', event => {
    const editing = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable;
    if (event.key === 'Escape') { event.preventDefault(); if (!event.repeat) action('back'); return; }
    if (editing || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'confirm', g: 'guide', b: 'back', c: 'controls', s: 'settings', d: 'diagnostics', m: 'mute', '[': 'previous', ']': 'next', ' ': 'play' };
    const command = map[event.key] || map[event.key.toLowerCase()];
    if (event.key === 'Enter' && event.target.matches('button,a')) return;
    if (command) {
      event.preventDefault(); action(command);
      if (event.key.startsWith('Arrow')) {
        const repeat = () => { action(command); held.set(event.key, setTimeout(repeat, 160)); };
        held.set(event.key, setTimeout(repeat, 350));
      }
    }
  });
}

export function moveFocus(container, delta) {
  const elements = Array.from(container.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href]')).filter(e => !e.disabled && e.getClientRects().length);
  if (!elements.length) return;
  const index = elements.indexOf(document.activeElement);
  const next = elements[(index + delta + elements.length) % elements.length];
  next.focus(); next.scrollIntoView({ block: 'nearest' });
}
