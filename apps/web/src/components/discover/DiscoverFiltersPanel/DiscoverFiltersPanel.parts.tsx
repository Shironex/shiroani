import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { DiscoverFilters } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Eyebrow } from '@/components/shared/Eyebrow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IFacetSelectProps } from './DiscoverFiltersPanel.types';

/** Sentinel for "no value" — Radix Select forbids empty-string item values. */
export const ANY = '__any__';

/** A single labelled facet dropdown with an "Any" reset option. */
export function FacetSelect({
  label,
  any,
  value,
  options,
  labelOf,
  disabled,
  onChange,
}: IFacetSelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <Eyebrow>{label}</Eyebrow>
      <Select
        value={value ?? ANY}
        onValueChange={v => onChange(v === ANY ? undefined : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY} className="text-xs">
            {any}
          </SelectItem>
          {options.map(opt => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {labelOf(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

interface ITagChipsProps {
  tags: DiscoverFilters['tags'];
  disabled: boolean;
  onRemove: (tag: string) => void;
}

/** The removable free-form tag chips below the tag input. */
export function TagChips({ tags, disabled, onRemove }: ITagChipsProps) {
  const { t } = useTranslation('discover');

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => onRemove(tag)}
          disabled={disabled}
          aria-label={t('controls.tagRemove', { tag })}
          className={cn(
            'group inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full',
            'font-mono text-[10px] uppercase tracking-[0.08em] font-semibold',
            'border border-primary/40 bg-primary/15 text-primary',
            'transition-colors hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]',
            'disabled:opacity-50'
          )}
        >
          <span>{tag}</span>
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}
