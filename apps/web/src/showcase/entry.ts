/**
 * Showcase build entry (`vite build --mode showcase`, see vite.config.ts).
 *
 * `lib/platform.ts` reads `window.electronAPI` once at module evaluation, so the
 * fake has to exist before any app module runs. This file therefore imports
 * nothing from the app itself: it installs the fake, then loads the real entry
 * through a dynamic import that evaluates after the install.
 */
import { installFakeElectronApi } from './fake-electron-api';

installFakeElectronApi();

void import('../main');
