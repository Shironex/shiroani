import type { AddressSuggestion } from '../useAddressSuggestions';

export interface IAddressSuggestionsProps {
  listboxId: string;
  suggestions: AddressSuggestion[];
  /** Index of the keyboard-active option, or -1 when none. */
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (url: string) => void;
}

export interface ISuggestionRowProps {
  suggestion: AddressSuggestion;
  index: number;
  isActive: boolean;
  onHoverIndex: (index: number) => void;
  onSelect: (url: string) => void;
}

export type IAddressSuggestionsView = Record<string, never>;
