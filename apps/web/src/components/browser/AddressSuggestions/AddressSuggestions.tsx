import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SuggestionRow } from './AddressSuggestions.parts';
import type { IAddressSuggestionsProps } from './AddressSuggestions.types';

/**
 * Listbox dropdown for the smart address bar. Implements the combobox popup
 * half of the WAI-ARIA pattern — the input owns `role="combobox"` and
 * `aria-activedescendant`; this renders the `role="listbox"` with `option`
 * children whose ids the input points at.
 */
function AddressSuggestions({
  listboxId,
  suggestions,
  activeIndex,
  onHoverIndex,
  onSelect,
}: IAddressSuggestionsProps) {
  const { t } = useTranslation('browser');

  const rows = suggestions.map((s, i) => (
    <SuggestionRow
      key={s.id}
      suggestion={s}
      index={i}
      isActive={i === activeIndex}
      onHoverIndex={onHoverIndex}
      onSelect={onSelect}
    />
  ));

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
      {rows}
    </ul>
  );
}

export default memo(AddressSuggestions);
