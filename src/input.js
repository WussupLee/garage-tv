// Edge-triggered standard Gamepad mapping. Unknown mappings are reported, never guessed.
export class GamepadInput {
  constructor(action, diagnostic) {
    this.action = action; this.diagnostic = diagnostic; this.previous = {}; this.lastAction = 0; this.lastReport = 0;
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
      const bindings = { 0: 'confirm', 1: 'back', 4: 'previous', 5: 'next', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
      pad.buttons.forEach((button, index) => {
        const key = pad.index + ':' + index;
        current[key] = button.pressed || button.value > 0.6;
        if (pad.mapping === 'standard' && current[key] && !this.previous[key] && bindings[index]) pending = pending || bindings[index];
      });
    }
    if (pending && time - this.lastAction > 220 && document.visibilityState === 'visible') { this.lastAction = time; this.action(pending); }
    this.previous = current;
    if (time - this.lastReport > 250) {
      this.lastReport = time;
      this.diagnostic({ supported: this.available, error, pads: pads.map(p => ({ index: p.index, id: p.id, mapping: p.mapping || 'unknown — use keyboard or cursor controls', buttons: p.buttons.map((b, i) => ({ index: i, pressed: b.pressed, value: Math.round(b.value * 100) / 100 })).filter(b => b.pressed || b.value > 0.1), axes: p.axes.map(a => Math.round(a * 100) / 100) })) });
    }
    requestAnimationFrame(this.frame);
  }
}

export function keyboardInput(action) {
  document.addEventListener('keydown', event => {
    const editing = /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.target.isContentEditable;
    if (event.key === 'Escape') { event.preventDefault(); action('back'); return; }
    if (editing || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', g: 'guide', b: 'back', s: 'settings', d: 'diagnostics', m: 'mute', '[': 'previous', ']': 'next', ' ': 'play' };
    const command = map[event.key] || map[event.key.toLowerCase()];
    if (command) { event.preventDefault(); action(command); }
    // Native Enter works for focused controls and links, preserving trusted user activation.
  });
}

export function moveFocus(container, delta) {
  const elements = Array.from(container.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href]')).filter(e => !e.disabled && e.getClientRects().length);
  if (!elements.length) return;
  const index = elements.indexOf(document.activeElement);
  const next = elements[(index + delta + elements.length) % elements.length];
  next.focus(); next.scrollIntoView({ block: 'nearest' });
}
