import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getChangelogReleases } from '@/lib/changelog-entries';
import type { FilterValue, IChangelogFilterChip, IChangelogView } from './ChangelogView.types';

export function useChangelogView(): IChangelogView {
  const { t, i18n } = useTranslation('changelog');
  const [filter, setFilter] = useState<FilterValue>('all');

  // Release copy is bilingual — follow the active UI language.
  const releases = useMemo(() => getChangelogReleases(i18n.language), [i18n.language]);

  const filters: IChangelogFilterChip[] = useMemo(() => {
    const majorCount = releases.filter(r => r.type === 'major').length;
    const minorCount = releases.filter(r => r.type === 'minor').length;
    return [
      { value: 'all', label: t('filter.all'), count: releases.length },
      { value: 'major', label: t('filter.major'), count: majorCount },
      { value: 'minor', label: t('filter.minor'), count: minorCount },
    ];
  }, [t, releases]);

  const visible = useMemo(
    () => (filter === 'all' ? releases : releases.filter(r => r.type === filter)),
    [filter, releases]
  );

  // Jump-nav anchors: major releases only to keep the strip short.
  const jumpTargets = useMemo(
    () => releases.filter(r => r.type === 'major').slice(0, 6),
    [releases]
  );

  const latest = useMemo(() => releases.find(r => r.latest) ?? releases[0], [releases]);

  return {
    filter,
    onFilterChange: setFilter,
    filters,
    jumpTargets,
    latest,
    visible,
    showOrigin: filter === 'all',
  };
}
