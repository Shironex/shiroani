import { useRef } from 'react';
import type { WebviewElement } from '@/components/browser/webviewRefs';
import { useWebviewEvents } from '@/hooks/useWebviewEvents';
import type { IBrowserWebviewView } from './BrowserWebview.types';

export function useBrowserWebview(paneId: string): IBrowserWebviewView {
  const webviewRef = useRef<WebviewElement | null>(null);
  useWebviewEvents(webviewRef, paneId);
  return { webviewRef };
}
