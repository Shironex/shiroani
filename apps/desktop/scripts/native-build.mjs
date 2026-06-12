/**
 * Build the native addons:
 *  - Windows: desktop_overlay (GDI+ static mascot) + window_sensor (climbing)
 *  - macOS:   window_sensor (climbing; the overlay itself is a BrowserWindow)
 *  - Linux:   nothing to compile
 */

import { execSync } from 'child_process';
import process from 'process';

if (process.platform !== 'win32' && process.platform !== 'darwin') {
  console.log('Skipping native addon build (no native targets on this platform)');
  process.exit(0);
}

try {
  execSync('node-gyp rebuild', { stdio: 'inherit', cwd: process.cwd() });
} catch (error) {
  console.error('Native addon build failed:', error.message);
  process.exit(1);
}
