import { useTranslation } from 'react-i18next';
import { DISCOVER_SORTS, type DiscoverSort } from '@shiroani/shared';
import { SelectItem } from '@/components/ui/select';

/** i18n key suffix per sort mode (controls.sort*). */
const SORT_LABEL_KEY = {
  score: 'controls.sortScore',
  popularity: 'controls.sortPopularity',
  releaseDate: 'controls.sortReleaseDate',
  title: 'controls.sortTitle',
} as const satisfies Record<DiscoverSort, string>;

/** The list of selectable sort modes, mapped over the shared `DISCOVER_SORTS`. */
export function SortOptions() {
  const { t } = useTranslation('discover');

  return (
    <>
      {DISCOVER_SORTS.map(sort => (
        <SelectItem key={sort} value={sort} className="text-xs">
          {t(SORT_LABEL_KEY[sort])}
        </SelectItem>
      ))}
    </>
  );
}
