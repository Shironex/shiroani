import type { KeyboardEvent, RefObject } from 'react';
import type { AddressSuggestion } from '../useAddressSuggestions';

export interface IBrowserToolbarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  hasActiveTab: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onNavigate: (url: string) => void;
  onGoHome: () => void;
  onAddToLibrary: () => void;
  onOpenHistory: () => void;
  urlInputRef?: RefObject<HTMLInputElement | null>;
}

export interface IBrowserToolbarView {
  readonly urlInputRef: RefObject<HTMLInputElement | null>;
  readonly suggestions: AddressSuggestion[];
  readonly showSuggestions: boolean;
  readonly activeIndex: number;
  readonly setActiveIndex: (index: number) => void;
  readonly activeOptionId: string | undefined;
  readonly isSecure: boolean;
  readonly handleUrlSubmit: (e: KeyboardEvent<HTMLInputElement>) => void;
  readonly handleUrlChange: (value: string) => void;
  readonly handleUrlFocus: () => void;
  readonly handleUrlBlur: () => void;
  readonly handleSuggestionSelect: (url: string) => void;
}
