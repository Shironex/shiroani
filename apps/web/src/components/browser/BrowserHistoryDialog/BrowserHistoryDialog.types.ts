import type { BrowserHistoryEntry } from '@shiroani/shared';

export interface IBrowserHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigate the active pane to a chosen history entry. */
  onNavigate: (url: string) => void;
}

export interface IHistoryRowProps {
  entry: BrowserHistoryEntry;
  onOpen: (url: string) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
}

export interface IBrowserHistoryDialogView {
  readonly history: BrowserHistoryEntry[];
  readonly filtered: BrowserHistoryEntry[];
  readonly query: string;
  readonly setQuery: (value: string) => void;
  readonly handleOpen: (url: string) => void;
  readonly removeHistoryEntry: (id: string) => void;
  readonly clearHistory: () => void;
  readonly removeLabel: string;
}
