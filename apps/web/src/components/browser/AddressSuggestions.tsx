import { memo, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Globe, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AddressSuggestion, AddressSuggestionSource } from './useAddressSuggestions';

interface AddressSuggestionsProps {
  listboxId: string;
  suggestions: AddressSuggestion[];
  /** Index of the keyboard-active option, or -1 when none. */
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: (url: string) => void;
}

const SOURCE_ICON: Record<AddressSuggestionSource, typeof Clock> = {
  history: Clock,
  bookmark: Star,
  frequent: Globe,
};

interface RowProps {
  suggestion: AddressSuggestion;
  index: number;
  isActive: boolean;
  onHoverIndex: (index: number) => void;
  onSelect: (url: string) => void;
}

const SuggestionRow = memo(function SuggestionRow({
  suggestion,
  index,
  isActive,
  onHoverIndex,
  onSelect,
}: RowProps) {
  const Icon = SOURCE_ICON[suggestion.source];
  // mousedown (not click) + preventDefault so selecting a row doesn't blur the
  // input first, which would unmount the listbox before the click lands.
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    onSelect(suggestion.url);
  };
  return (
    <li
      id={suggestion.id}
      role="option"
      aria-selected={isActive}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onHoverIndex(index)}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-[8px]',
        isActive ? 'bg-foreground/[0.08]' : 'hover:bg-foreground/[0.04]'
      )}
    >
      {suggestion.favicon ? (
        <img src={suggestion.favicon} alt="" className="w-4 h-4 shrink-0 rounded-[3px]" />
      ) : (
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground/70" />
      )}
      <span className="truncate text-[12.5px] text-foreground">
        {suggestion.title || suggestion.url}
      </span>
      <span className="truncate text-[11px] text-muted-foreground/60 font-mono ml-auto max-w-[45%]">
        {suggestion.url}
      </span>
    </li>
  );
});

/**
 * Listbox dropdown for the smart address bar. Implements the combobox popup
 * half of the WAI-ARIA pattern — the input owns `role="combobox"` and
 * `aria-activedescendant`; this renders the `role="listbox"` with `option`
 * children whose ids the input points at.
 */
export const AddressSuggestions = memo(function AddressSuggestions({
  listboxId,
  suggestions,
  activeIndex,
  onHoverIndex,
  onSelect,
}: AddressSuggestionsProps) {
  const { t } = useTranslation('browser');
  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label={t('urlBar.suggestions')}
      className={cn(
        'absolute left-0 right-0 top-[calc(100%+4px)] z-50 p-1',
        'rounded-[12px] border border-border-glass bg-card shadow-lg',
        'max-h-[320px] overflow-y-auto'
      )}
    >
      {suggestions.map((s, i) => (
        <SuggestionRow
          key={s.id}
          suggestion={s}
          index={i}
          isActive={i === activeIndex}
          onHoverIndex={onHoverIndex}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
});
