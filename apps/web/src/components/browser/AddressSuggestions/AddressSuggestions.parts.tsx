import { memo, type MouseEvent } from 'react';
import { Clock, Globe, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AddressSuggestionSource } from '../useAddressSuggestions';
import type { ISuggestionRowProps } from './AddressSuggestions.types';

export const SOURCE_ICON: Record<AddressSuggestionSource, typeof Clock> = {
  history: Clock,
  bookmark: Star,
  frequent: Globe,
};

export const SuggestionRow = memo(function SuggestionRow({
  suggestion,
  index,
  isActive,
  onHoverIndex,
  onSelect,
}: ISuggestionRowProps) {
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
        'flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-md',
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
