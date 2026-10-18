import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import { validateConfig } from '../src/config.js';
validateConfig(JSON.parse(await readFile(new URL('../data/default-config.json', import.meta.url))));
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const path of ['index.html', 'styles.css', 'src', 'data', 'assets', 'fonts', '.nojekyll']) await cp(path, 'dist/' + path, { recursive: true });
console.log('Built static GitHub Pages site in dist/ (no runtime dependencies).');
