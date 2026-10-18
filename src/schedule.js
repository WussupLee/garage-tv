// Pure schedule math: no network requests or fabricated durations.
export function hash(text) {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++) { n ^= text.charCodeAt(i); n = Math.imul(n, 16777619); }
  return n >>> 0;
}

export function orderedPrograms(channel, seed) {
  const list = channel.schedule.programs.slice();
  if (!channel.schedule.shuffle) return list;
  let state = hash(seed + ':' + channel.id) || 1;
  for (let i = list.length - 1; i > 0; i--) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function broadcastAt(channel, seed, time = Date.now()) {
  if (!channel.schedule || !channel.schedule.durationsVerified) return null;
  const programs = orderedPrograms(channel, seed);
  const total = programs.reduce((sum, p) => sum + p.duration, 0);
  const elapsed = (time - Date.parse(channel.schedule.epoch)) / 1000;
  let offset = ((elapsed % total) + total) % total;
  for (let i = 0; i < programs.length; i++) {
    if (offset < programs[i].duration) return { program: programs[i], next: programs[(i + 1) % programs.length], index: i, offset, remaining: programs[i].duration - offset, cycle: Math.floor(elapsed / total), total };
    offset -= programs[i].duration;
  }
  return null;
}
