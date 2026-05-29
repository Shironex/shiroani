import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownWideNarrow } from 'lucide-react';
import { DISCOVER_SORTS, type DiscoverSort } from '@shiroani/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiscoverSortSelectProps {
  value: DiscoverSort;
  onChange: (sort: DiscoverSort) => void;
  disabled?: boolean;
}

/** i18n key suffix per sort mode (controls.sort*). */
const SORT_LABEL_KEY: Record<DiscoverSort, string> = {
  score: 'controls.sortScore',
  popularity: 'controls.sortPopularity',
  releaseDate: 'controls.sortReleaseDate',
  title: 'controls.sortTitle',
};

/**
 * User-selectable sort for the browse tabs + search (item 2). Wraps the shared
 * Select primitive so it matches the rest of the app's dropdowns.
 */
export const DiscoverSortSelect = memo(function DiscoverSortSelect({
  value,
  onChange,
  disabled,
}: DiscoverSortSelectProps) {
  const { t } = useTranslation('discover');

  return (
    <Select
      value={value}
      onValueChange={v => onChange(v as DiscoverSort)}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={t('controls.sortLabel')}
        className="h-8 w-auto gap-1.5 px-2.5 text-xs"
      >
        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-primary shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DISCOVER_SORTS.map(sort => (
          <SelectItem key={sort} value={sort} className="text-xs">
            {t(SORT_LABEL_KEY[sort])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
