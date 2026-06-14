import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownWideNarrow } from 'lucide-react';
import { type DiscoverSort } from '@shiroani/shared';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDiscoverSortSelect } from './DiscoverSortSelect.hooks';
import { SortOptions } from './DiscoverSortSelect.parts';
import type { IDiscoverSortSelectProps } from './DiscoverSortSelect.types';

/**
 * User-selectable sort for the browse tabs + search (item 2). Wraps the shared
 * Select primitive so it matches the rest of the app's dropdowns.
 */
function DiscoverSortSelect({ value, onChange, disabled }: IDiscoverSortSelectProps) {
  const { t } = useTranslation('discover');
  useDiscoverSortSelect();

  return (
    <Select value={value} onValueChange={v => onChange(v as DiscoverSort)} disabled={disabled}>
      <SelectTrigger
        aria-label={t('controls.sortLabel')}
        className="h-8 w-auto gap-1.5 px-2.5 text-xs"
      >
        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-primary shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SortOptions />
      </SelectContent>
    </Select>
  );
}

export default memo(DiscoverSortSelect);
