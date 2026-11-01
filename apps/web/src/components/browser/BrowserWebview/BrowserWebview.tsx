import React, { memo } from 'react';
import { useBrowserWebview } from './BrowserWebview.hooks';
import type { IBrowserWebviewProps } from './BrowserWebview.types';

const ACTIVE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  width: '100%',
  height: '100%',
  border: 'none',
  // Guest pages render transparent. Pages without their own background expect the
  // browser's default white canvas, not the app's dark window showing through.
  background: '#fff',
};
const HIDDEN_STYLE: React.CSSProperties = {
  display: 'none',
  width: '100%',
  height: '100%',
  border: 'none',
};

function BrowserWebview({ paneId, initialUrl, isActive }: IBrowserWebviewProps) {
  const { webviewRef } = useBrowserWebview(paneId);

  return (
    <webview
      ref={webviewRef as React.Ref<HTMLElement>}
      src={initialUrl}
      partition="persist:browser"
      allowpopups="true"
      style={isActive ? ACTIVE_STYLE : HIDDEN_STYLE}
    />
  );
}

export default memo(BrowserWebview);
