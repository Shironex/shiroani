import React, { memo, useRef } from 'react';
import type { WebviewElement } from '@/components/browser/webviewRefs';
import { useWebviewEvents } from '@/hooks/useWebviewEvents';
import { usePlayerSkipController } from '@/features/player-skip';

const ACTIVE_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  width: '100%',
  height: '100%',
  border: 'none',
};
const HIDDEN_STYLE: React.CSSProperties = {
  display: 'none',
  width: '100%',
  height: '100%',
  border: 'none',
};

interface BrowserWebviewProps {
  paneId: string;
  initialUrl: string;
  isActive: boolean;
}

const BrowserWebviewInner = function BrowserWebview({
  paneId,
  initialUrl,
  isActive,
}: BrowserWebviewProps) {
  const webviewRef = useRef<WebviewElement | null>(null);

  useWebviewEvents(webviewRef, paneId);
  // Wire OP/ED skip controller for this pane. Hook self-gates on the master
  // toggle and the `detectAnimeFromUrl` allowlist — opening any non-anime URL
  // is a no-op (no IPC, no main-process listeners).
  usePlayerSkipController(paneId);

  return (
    <webview
      ref={webviewRef as any}
      src={initialUrl}
      partition="persist:browser"
      allowpopups=""
      style={isActive ? ACTIVE_STYLE : HIDDEN_STYLE}
    />
  );
};

export const BrowserWebview = memo(BrowserWebviewInner);
