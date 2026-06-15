import type { Decorator } from '@storybook/react-vite';

/**
 * Full-viewport-height flex host for `*View` stories. In the app these views
 * render inside a height-constrained `flex-1` <main>; their own root is
 * `flex-1 … overflow-hidden` with an inner `overflow-y-auto`, which only forms a
 * scroll viewport when an ancestor bounds the height. Storybook's canvas does
 * not, so the content clips and can't scroll — pair this decorator with
 * `parameters.layout: 'fullscreen'` to restore the app's height context.
 */
export const withFullHeight: Decorator = Story => (
  <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Story />
  </div>
);

/**
 * Opaque app-shell surface host (full-height, like `withFullHeight`, plus the
 * shell's themed surface). In the app, views render inside the shell's
 * `bg-background text-foreground` <main>; isolated in Storybook a story has no
 * such ancestor, so the app's translucent surfaces (`bg-card/40`, accent-tinted
 * pills at `oklch .../0.10`, the Tiptap editor layer) and any color-inheriting
 * text resolve against the bare canvas. axe's color-contrast resolver then walks
 * past the translucent stack to the page root, assumes `#ffffff`, and reports
 * false low-contrast failures. Restoring the opaque themed surface makes axe stop
 * at the first opaque ancestor and measure contrast as it is in-app. Theme-aware
 * via the `--background` / `--foreground` tokens (correct for dark and light).
 *
 * Inline styles, not Tailwind classes: this file lives in `.storybook/`, outside
 * the `@source '../src/**'` scan, so `bg-background`/`text-foreground` utilities
 * would never be generated for it (same reason `withFullHeight` is inline).
 */
export const withAppSurface: Decorator = Story => (
  <div
    style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--background)',
      color: 'var(--foreground)',
    }}
  >
    <Story />
  </div>
);
