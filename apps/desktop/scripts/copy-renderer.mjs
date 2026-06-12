/**
 * Copy the web app build output to desktop/dist/renderer.
 * This makes the built frontend available to the Electron main process
 * when running in production mode.
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const webDist = resolve(__dirname, '../../../apps/web/dist');
const rendererDist = resolve(__dirname, '../dist/renderer');

if (!existsSync(webDist)) {
  console.error('Web build output not found at:', webDist);
  console.error('Run "pnpm --filter @shiroani/web build" first.');
  process.exit(1);
}

// Clean previous renderer output
if (existsSync(rendererDist)) {
  rmSync(rendererDist, { recursive: true });
}

// Ensure parent directory exists
mkdirSync(dirname(rendererDist), { recursive: true });

// Copy web build output to renderer directory
cpSync(webDist, rendererDist, { recursive: true });

console.log('Renderer files copied to:', rendererDist);

// Copy standalone renderer files (context menu, etc.)
const standaloneFiles = ['context-menu.html', 'shimeji-overlay.html'];
const srcRenderer = resolve(__dirname, '../src/renderer');

for (const file of standaloneFiles) {
  const src = resolve(srcRenderer, file);
  if (existsSync(src)) {
    cpSync(src, resolve(rendererDist, file));
    console.log(`Copied ${file} to renderer output`);
  }
}
