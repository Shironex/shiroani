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
