import type { RefObject } from 'react';
import type { WebviewElement } from '@/components/browser/webviewRefs';

export interface IBrowserWebviewProps {
  paneId: string;
  initialUrl: string;
  isActive: boolean;
}

export interface IBrowserWebviewView {
  readonly webviewRef: RefObject<WebviewElement | null>;
}
