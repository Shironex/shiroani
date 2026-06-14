import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DISCOVER_MIN_YEAR,
  DISCOVER_SCORE_MIN,
  DISCOVER_SCORE_MAX,
  hasActiveDiscoverFilters,
  type DiscoverFilters,
} from '@shiroani/shared';
import type {
  DiscoverAiringStatus,
  DiscoverFormat,
  DiscoverSeason,
  IDiscoverFiltersPanelProps,
  IDiscoverFiltersPanelView,
} from './DiscoverFiltersPanel.types';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - DISCOVER_MIN_YEAR }, (_, i) =>
  String(CURRENT_YEAR - i)
);

/** Count of active filter facets, for the header badge. */
function countActive(f: DiscoverFilters): number {
  let n = 0;
  if (f.includedGenres?.length) n += f.includedGenres.length;
  if (f.excludedGenres?.length) n += f.excludedGenres.length;
  if (f.tags?.length) n += f.tags.length;
  if (f.format) n += 1;
  if (f.status) n += 1;
  if (f.year) n += 1;
  if (f.season) n += 1;
  if (f.scoreMin != null && f.scoreMin > DISCOVER_SCORE_MIN) n += 1;
  if (f.scoreMax != null && f.scoreMax < DISCOVER_SCORE_MAX) n += 1;
  if (f.excludeOnList) n += 1;
  return n;
}

export function useDiscoverFiltersPanel({
  filters,
  onChange,
}: Pick<IDiscoverFiltersPanelProps, 'filters' | 'onChange'>): IDiscoverFiltersPanelView {
  const [open, setOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const toggleOpen = useCallback(() => setOpen(o => !o), []);

  const activeCount = useMemo(() => countActive(filters), [filters]);
  const hasActive = hasActiveDiscoverFilters(filters);

  const patch = useCallback(
    (next: Partial<DiscoverFilters>) => onChange({ ...filters, ...next }),
    [filters, onChange]
  );

  const handleGenres = useCallback(
    (included: string[], excluded: string[]) =>
      patch({
        includedGenres: included.length ? included : undefined,
        excludedGenres: excluded.length ? excluded : undefined,
      }),
    [patch]
  );

  // Local slider state keeps dragging responsive without firing a network
  // request (and burning AniList rate limit) on every pixel of movement —
  // the store only updates on release (onValueCommit).
  const [localScore, setLocalScore] = useState<[number, number]>([
    filters.scoreMin ?? DISCOVER_SCORE_MIN,
    filters.scoreMax ?? DISCOVER_SCORE_MAX,
  ]);

  useEffect(() => {
    setLocalScore([filters.scoreMin ?? DISCOVER_SCORE_MIN, filters.scoreMax ?? DISCOVER_SCORE_MAX]);
  }, [filters.scoreMin, filters.scoreMax]);

  const handleScoreChange = useCallback((val: number[]) => {
    setLocalScore(val as [number, number]);
  }, []);

  const handleScoreCommit = useCallback(
    ([min, max]: number[]) =>
      patch({
        scoreMin: min > DISCOVER_SCORE_MIN ? min : undefined,
        scoreMax: max < DISCOVER_SCORE_MAX ? max : undefined,
      }),
    [patch]
  );

  const addTag = useCallback(() => {
    const tag = tagDraft.trim();
    if (!tag) return;
    const existing = filters.tags ?? [];
    if (existing.includes(tag) || existing.length >= 20) {
      setTagDraft('');
      return;
    }
    patch({ tags: [...existing, tag] });
    setTagDraft('');
  }, [tagDraft, filters.tags, patch]);

  const removeTag = useCallback(
    (tag: string) => {
      const next = (filters.tags ?? []).filter(x => x !== tag);
      patch({ tags: next.length ? next : undefined });
    },
    [filters.tags, patch]
  );

  const handleStatusChange = useCallback(
    (v: string | undefined) => patch({ status: v as DiscoverAiringStatus | undefined }),
    [patch]
  );
  const handleFormatChange = useCallback(
    (v: string | undefined) => patch({ format: v as DiscoverFormat | undefined }),
    [patch]
  );
  const handleSeasonChange = useCallback(
    (v: string | undefined) => patch({ season: v as DiscoverSeason | undefined }),
    [patch]
  );
  const handleYearChange = useCallback(
    (v: string | undefined) => patch({ year: v ? Number(v) : undefined }),
    [patch]
  );

  return {
    open,
    toggleOpen,
    tagDraft,
    setTagDraft,
    activeCount,
    hasActive,
    localScore,
    years: YEARS,
    patch,
    handleGenres,
    handleScoreChange,
    handleScoreCommit,
    addTag,
    removeTag,
    handleStatusChange,
    handleFormatChange,
    handleSeasonChange,
    handleYearChange,
  };
}
