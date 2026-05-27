/**
 * Electron <webview> tag JSX declarations.
 *
 * React 19's @types/react ships a built-in `webview` intrinsic element
 * (React.WebViewHTMLAttributes), so the element no longer needs to be
 * declared from scratch. This augmentation only adds the Electron-specific
 * attributes that React's built-in typing does not cover.
 *
 * The `import 'react'` makes this a module augmentation (additive) instead
 * of a module declaration that would shadow React's real exports.
 */
import 'react';

declare module 'react' {
  interface WebViewHTMLAttributes<_T> {
    nodeintegrationinsubframes?: boolean | undefined;
    enableblinkfeatures?: string | undefined;
  }
}
