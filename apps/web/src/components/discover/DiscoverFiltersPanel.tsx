import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  DISCOVER_FORMATS,
  DISCOVER_STATUSES,
  DISCOVER_SEASONS,
  DISCOVER_MIN_YEAR,
  DISCOVER_SCORE_MIN,
  DISCOVER_SCORE_MAX,
  hasActiveDiscoverFilters,
  type DiscoverFilters,
  type DiscoverFormat,
  type DiscoverAiringStatus,
  type DiscoverSeason,
} from '@shiroani/shared';
import {
  getAnilistFormatLabel,
  getAnilistStatusLabel,
  getAnilistSeasonLabel,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { GenrePicker } from '@/components/discover/GenrePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiscoverFiltersPanelProps {
  filters: DiscoverFilters;
  disabled: boolean;
  onChange: (filters: DiscoverFilters) => void;
}

/** Sentinel for "no value" — Radix Select forbids empty-string item values. */
const ANY = '__any__';

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
  return n;
}

/**
 * Advanced browse/search filters (item 6) — status, format, year, season,
 * genres+tags and a score range. Applies across every browse mode and to
 * search results. Reuses the Random tab's GenrePicker for the genre tri-state.
 */
export const DiscoverFiltersPanel = memo(function DiscoverFiltersPanel({
  filters,
  disabled,
  onChange,
}: DiscoverFiltersPanelProps) {
  const { t } = useTranslation('discover');
  const [open, setOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

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
    setLocalScore([
      filters.scoreMin ?? DISCOVER_SCORE_MIN,
      filters.scoreMax ?? DISCOVER_SCORE_MAX,
    ]);
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

  return (
    <div className="rounded-[12px] border border-border-glass bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-left"
          aria-expanded={open}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-semibold text-foreground/90">
            {t('controls.filtersTitle')}
          </span>
          {activeCount > 0 && (
            <span className="text-2xs text-primary">
              {t('controls.filtersActive', { count: activeCount })}
            </span>
          )}
        </button>
        <div className="flex items-center gap-3">
          {hasActive && (
            <button
              type="button"
              onClick={() => onChange({})}
              disabled={disabled}
              className="text-2xs text-muted-foreground hover:text-foreground/80 transition-colors disabled:opacity-50"
            >
              {t('controls.reset')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/70"
          >
            {open ? t('controls.filtersCollapse') : t('controls.filtersExpand')}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border-glass/60">
          {/* Select-driven facets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <FacetSelect
              label={t('controls.statusLabel')}
              any={t('controls.any')}
              value={filters.status}
              options={DISCOVER_STATUSES}
              labelOf={getAnilistStatusLabel}
              disabled={disabled}
              onChange={v => patch({ status: v as DiscoverAiringStatus | undefined })}
            />
            <FacetSelect
              label={t('controls.formatLabel')}
              any={t('controls.any')}
              value={filters.format}
              options={DISCOVER_FORMATS}
              labelOf={getAnilistFormatLabel}
              disabled={disabled}
              onChange={v => patch({ format: v as DiscoverFormat | undefined })}
            />
            <FacetSelect
              label={t('controls.seasonLabel')}
              any={t('controls.any')}
              value={filters.season}
              options={DISCOVER_SEASONS}
              labelOf={getAnilistSeasonLabel}
              disabled={disabled}
              onChange={v => patch({ season: v as DiscoverSeason | undefined })}
            />
            <FacetSelect
              label={t('controls.yearLabel')}
              any={t('controls.any')}
              value={filters.year != null ? String(filters.year) : undefined}
              options={YEARS}
              labelOf={y => y}
              disabled={disabled}
              onChange={v => patch({ year: v ? Number(v) : undefined })}
            />
          </div>

          {/* Score range */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t('controls.scoreLabel')}
              </span>
              <span className="text-2xs text-foreground/80 tabular-nums">
                {t('controls.scoreRange', { min: localScore[0], max: localScore[1] })}
              </span>
            </div>
            <SliderPrimitive.Root
              className="relative flex w-full touch-none select-none items-center"
              min={DISCOVER_SCORE_MIN}
              max={DISCOVER_SCORE_MAX}
              step={5}
              value={localScore}
              onValueChange={handleScoreChange}
              onValueCommit={handleScoreCommit}
              disabled={disabled}
              aria-label={t('controls.scoreLabel')}
            >
              <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
                <SliderPrimitive.Range className="absolute h-full bg-primary" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
              <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
            </SliderPrimitive.Root>
          </div>

          {/* Genres (reused tri-state picker) */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('genres.title')}
            </span>
            <GenrePicker
              included={filters.includedGenres ?? []}
              excluded={filters.excludedGenres ?? []}
              onChange={handleGenres}
              disabled={disabled}
            />
          </div>

          {/* Free-form tags */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t('controls.tagsLabel')}
            </span>
            <input
              type="text"
              value={tagDraft}
              onChange={e => setTagDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              disabled={disabled}
              placeholder={t('controls.tagsPlaceholder')}
              className="w-full rounded-md border border-border-glass bg-foreground/[0.04] px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            {(filters.tags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {filters.tags!.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={disabled}
                    aria-label={t('controls.tagRemove', { tag })}
                    className={cn(
                      'group inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full',
                      'font-mono text-[10px] uppercase tracking-[0.08em] font-semibold',
                      'border border-primary/40 bg-primary/15 text-primary',
                      'transition-colors hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive',
                      'disabled:opacity-50'
                    )}
                  >
                    <span>{tag}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

interface FacetSelectProps {
  label: string;
  any: string;
  value: string | undefined;
  options: readonly string[];
  labelOf: (value: string) => string;
  disabled: boolean;
  onChange: (value: string | undefined) => void;
}

/** A single labelled facet dropdown with an "Any" reset option. */
function FacetSelect({ label, any, value, options, labelOf, disabled, onChange }: FacetSelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
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
