export class LocalMediaLibrary {
  constructor() { this.channels = new Map(); }
  setFiles(channelId, files) {
    this.clear(channelId);
    const items = Array.from(files).filter(file => file.type.startsWith('video/') || file.type.startsWith('audio/'))
      .map(file => ({ name: file.name, type: file.type, url: URL.createObjectURL(file) }));
    this.channels.set(channelId, { items, index: 0 });
    return items.length;
  }
  current(channelId) { const list = this.channels.get(channelId); return list?.items[list.index] || null; }
  next(channelId) {
    const list = this.channels.get(channelId);
    if (!list?.items.length) return null;
    list.index = (list.index + 1) % list.items.length;
    return list.items[list.index];
  }
  clear(channelId) {
    for (const item of this.channels.get(channelId)?.items || []) URL.revokeObjectURL(item.url);
    this.channels.delete(channelId);
  }
  dispose() { for (const id of this.channels.keys()) this.clear(id); }
}
