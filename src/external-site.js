export function externalDestination(source) {
  if (!source?.url) return null;
  const url = new URL(source.url);
  if (url.protocol !== 'https:') return null;
  return { url: url.href, name: source.name || url.hostname, opensExternally: true, embeds: false };
}
