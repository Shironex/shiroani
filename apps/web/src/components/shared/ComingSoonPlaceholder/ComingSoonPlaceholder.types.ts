import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Reusable placeholder rendered in the new design language for sections of
 * the app that haven't been ported yet. Each redesign phase can drop this in
 * when a sub-surface (e.g. Electron webview chrome, Tiptap editor, activity
 * heatmap) needs more work than the current phase covers.
 */
export interface IComingSoonPlaceholderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional short tag shown above the title ("SOON", "BETA", etc.) */
  tag?: string;
}

export interface IComingSoonPlaceholderView {
  readonly finalTag: string;
}
