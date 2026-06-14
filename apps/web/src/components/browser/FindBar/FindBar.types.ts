import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { FoundInPageResult } from '../webviewRefs';

export interface IFindBarProps {
  /** Pane id of the active webview to search within. */
  activePaneId: string | null;
  /** Close the bar (clears highlights). */
  onClose: () => void;
}

export interface IFoundInPageEvent extends Event {
  result: FoundInPageResult;
}

export interface IFindBarView {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly query: string;
  readonly matches: number;
  readonly activeMatch: number;
  readonly hasQuery: boolean;
  readonly onQueryChange: (value: string) => void;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly onCloseBar: () => void;
  readonly onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
}
