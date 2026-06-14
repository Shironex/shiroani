import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { SlidersHorizontal } from 'lucide-react';
import {
  DISCOVER_FORMATS,
  DISCOVER_STATUSES,
  DISCOVER_SEASONS,
  DISCOVER_SCORE_MIN,
  DISCOVER_SCORE_MAX,
} from '@shiroani/shared';
import {
  getAnilistFormatLabel,
  getAnilistStatusLabel,
  getAnilistSeasonLabel,
} from '@/lib/constants';
import { Switch } from '@/components/ui/switch';
import { GenrePicker } from '@/components/discover/GenrePicker';
import { useDiscoverFiltersPanel } from './DiscoverFiltersPanel.hooks';
import { FacetSelect, TagChips } from './DiscoverFiltersPanel.parts';
import type { IDiscoverFiltersPanelProps } from './DiscoverFiltersPanel.types';

/**
 * Advanced browse/search filters (item 6) — status, format, year, season,
 * genres+tags and a score range. Applies across every browse mode and to
 * search results. Reuses the Random tab's GenrePicker for the genre tri-state.
 */
function DiscoverFiltersPanel({
  filters,
  disabled,
  connected,
  onChange,
}: IDiscoverFiltersPanelProps) {
  const { t } = useTranslation('discover');
  const {
    open,
    toggleOpen,
    tagDraft,
    setTagDraft,
    activeCount,
    hasActive,
    localScore,
    years,
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
  } = useDiscoverFiltersPanel({ filters, onChange });

  const yearValue = filters.year != null ? String(filters.year) : undefined;

  return (
    <div className="rounded-[12px] border border-border-glass bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={toggleOpen}
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
            onClick={toggleOpen}
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
              onChange={handleStatusChange}
            />
            <FacetSelect
              label={t('controls.formatLabel')}
              any={t('controls.any')}
              value={filters.format}
              options={DISCOVER_FORMATS}
              labelOf={getAnilistFormatLabel}
              disabled={disabled}
              onChange={handleFormatChange}
            />
            <FacetSelect
              label={t('controls.seasonLabel')}
              any={t('controls.any')}
              value={filters.season}
              options={DISCOVER_SEASONS}
              labelOf={getAnilistSeasonLabel}
              disabled={disabled}
              onChange={handleSeasonChange}
            />
            <FacetSelect
              label={t('controls.yearLabel')}
              any={t('controls.any')}
              value={yearValue}
              options={years}
              labelOf={y => y}
              disabled={disabled}
              onChange={handleYearChange}
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
              maxLength={50}
              placeholder={t('controls.tagsPlaceholder')}
              className="w-full rounded-md border border-border-glass bg-foreground/[0.04] px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <TagChips tags={filters.tags} disabled={disabled} onRemove={removeTag} />
          </div>

          {/* "Haven't seen" — exclude media already on the AniList list (item
              C4). Gated on connected: an unconnected viewer has no list, so the
              backend onList arg is a no-op and the toggle would mislead. */}
          {connected && (
            <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
              <span className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t('controls.excludeOnList')}
                </span>
                <span className="text-2xs text-muted-foreground/70">
                  {t('controls.excludeOnListHint')}
                </span>
              </span>
              <Switch
                checked={Boolean(filters.excludeOnList)}
                onCheckedChange={checked => patch({ excludeOnList: checked || undefined })}
                disabled={disabled}
                aria-label={t('controls.excludeOnList')}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DiscoverFiltersPanel);
