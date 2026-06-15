// MUST run before any other import — `@/lib/i18n` reads
// `window.localStorage.getItem` at module load, and Node 25 leaks a
// broken stub through vitest's jsdom env unless this polyfill restores
// jsdom's working Storage first. See file header for details.
import './setup-storage-polyfill';

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Boot the real i18next instance so components that call `useTranslation`
// resolve real strings instead of raw keys. Tests that rely on a specific
// language should assert the EN value (matches `DEFAULT_LANGUAGE` in
// `@shiroani/shared`); jsdom's empty localStorage causes the boot read to
// fall back to that default.
import '@/lib/i18n';

// Polyfill ResizeObserver for jsdom (used by Radix UI dialogs, popovers, etc.)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
}

// jsdom doesn't implement the Pointer Capture API or scrollIntoView, which Radix
// UI's Select/Popover/Slider call when opening or focusing. Without these, tests
// that open a Radix listbox throw. Assign non-destructively so a future jsdom that
// ships real implementations keeps them.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// Mock sonner toast globally
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  }),
}));

// Silence the logger from @shiroani/shared to keep test output clean
vi.mock('@shiroani/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@shiroani/shared')>();
  const silentLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  };
  return {
    ...actual,
    createLogger: () => silentLogger,
  };
});
