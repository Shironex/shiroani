import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { Timeline, type TimelineEntry } from '@/components/shared/Timeline';
import {
  CHANGELOG_CATEGORY_VARIANT,
  CHANGELOG_RELEASES,
  type ChangelogRelease,
  type ChangelogReleaseType,
} from '@/lib/changelog-entries';

type FilterValue = 'all' | ChangelogReleaseType;

interface FilterChip {
  value: FilterValue;
  label: string;
  count: number;
}

interface ChangelogViewProps {
  /** When true, skip outer chrome (kanji watermark, tall header padding) — used when the view is embedded inside a narrower container. */
  compact?: boolean;
  /** Optional className for the root. */
  className?: string;
}

/**
 * ChangelogView — vertical release timeline.
 *
 * Mirrors the mock at `shiroani-design/Changelog.html`:
 *   - Sticky eyebrow + serif headline with a kanji watermark.
 *   - Filter chips (all / major / minor).
 *   - Vertical timeline with version tag, "Najnowsza" badge on the latest entry,
 *     and color-coded `PillTag` category lists inside each release card.
 *
 * The entry data lives in `@/lib/changelog-entries` — a thin adapter over the
 * shared `@shiroani/changelog` package. Edit the package when shipping a new
 * release; both the landing page and this view pick up the change.
 *
 * Routing: rendered as a full dockable view via `App.tsx` (`activeView ===
 * 'changelog'`) and reachable from the dock or from Settings → About.
 */
export function ChangelogView({ compact = false, className }: ChangelogViewProps) {
  const { t } = useTranslation('changelog');
  const [filter, setFilter] = useState<FilterValue>('all');

  const filters: FilterChip[] = useMemo(() => {
    const majorCount = CHANGELOG_RELEASES.filter(r => r.type === 'major').length;
    const minorCount = CHANGELOG_RELEASES.filter(r => r.type === 'minor').length;
    return [
      { value: 'all', label: t('filter.all'), count: CHANGELOG_RELEASES.length },
      { value: 'major', label: t('filter.major'), count: majorCount },
      { value: 'minor', label: t('filter.minor'), count: minorCount },
    ];
  }, [t]);

  const visible = useMemo(
    () =>
      filter === 'all' ? CHANGELOG_RELEASES : CHANGELOG_RELEASES.filter(r => r.type === filter),
    [filter]
  );

  // Jump-nav anchors: major releases only to keep the strip short.
  const jumpTargets = useMemo(
    () => CHANGELOG_RELEASES.filter(r => r.type === 'major').slice(0, 6),
    []
  );

  const entries: TimelineEntry[] = visible.map(release => ({
    id: `v${release.version}`,
    title: <>v{release.version}</>,
    timestamp: release.shortDate,
    markerVariant: release.latest ? 'solid' : 'outline',
    children: <ReleaseCard release={release} />,
  }));

  // Closing dashed marker — only shown when viewing the full list
  if (filter === 'all') {
    entries.push({
      id: 'origin',
      markerVariant: 'dashed',
      children: <OriginMarker />,
    });
  }

  return (
    <div
      className={cn(
        'flex-1 flex flex-col overflow-hidden animate-fade-in',
        !compact && 'relative',
        className
      )}
    >
      {!compact && <KanjiWatermark kanji="記録" position="tr" size={280} opacity={0.035} />}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1100px] px-8 pb-20">
          <Header
            filter={filter}
            onFilterChange={setFilter}
            filters={filters}
            jumpTargets={jumpTargets}
            compact={compact}
          />

          <Timeline entries={entries} className="mt-6" sideWidth={76} gap={48} />
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  filters: FilterChip[];
  jumpTargets: ChangelogRelease[];
  compact: boolean;
}

function Header({ filter, onFilterChange, filters, jumpTargets, compact }: HeaderProps) {
  const { t } = useTranslation('changelog');
  const latest = CHANGELOG_RELEASES.find(r => r.latest) ?? CHANGELOG_RELEASES[0];
  const emPrimary = <em className="font-serif italic font-extrabold text-primary" />;

  return (
    <header className={cn('relative', compact ? 'pt-6 pb-6' : 'pt-14 pb-10')}>
      <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <span
          className="size-1.5 rounded-full bg-primary animate-pulse"
          style={{
            boxShadow: '0 0 8px oklch(from var(--primary) l c h / 0.6)',
          }}
        />
        {t('latestBadge', { version: latest.version })}
      </div>

      <h1
        className={cn(
          'mt-5 font-sans font-extrabold leading-[0.95] tracking-[-0.035em]',
          compact ? 'text-4xl' : 'text-5xl sm:text-6xl'
        )}
      >
        <Trans ns="changelog" i18nKey="headline" components={{ 1: emPrimary }} />
      </h1>
      <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-muted-foreground">
        {t('subtitle')}
      </p>

      {/* Filter chips */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border-glass pt-5">
        <b className="mr-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t('filter.label')}
        </b>
        {filters.map(chip => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onFilterChange(chip.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs tracking-[0.06em] transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border-glass bg-card/40 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {chip.label}
              <span className={cn('opacity-60', active && 'opacity-80')}>{chip.count}</span>
            </button>
          );
        })}
      </div>

      {/* Jump nav — major releases only */}
      {jumpTargets.length > 0 && (
        <nav
          aria-label={t('jump.ariaLabel')}
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {t('jump.label')}
          </span>
          {jumpTargets.map(r => (
            <a
              key={r.version}
              href={`#v${r.version}`}
              className="font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              v{r.version}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

interface ReleaseCardProps {
  release: ChangelogRelease;
}

function ReleaseCard({ release }: ReleaseCardProps) {
  const { t } = useTranslation('changelog');
  return (
    <article>
      {/* Top row: version pill + optional "Najnowsza" badge + human date */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1',
            'font-mono text-[10.5px] font-semibold uppercase tracking-[0.15em] text-primary'
          )}
        >
          <span
            className={cn('size-[5px] rounded-full bg-primary', release.latest && 'animate-pulse')}
          />
          v{release.version}
        </span>
        {release.latest && (
          <span className="rounded-[4px] bg-primary px-2 py-[3px] font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
            {t('release.latest')}
          </span>
        )}
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {release.date}
        </span>
      </div>

      <h2 className="max-w-[28ch] font-sans text-[clamp(22px,2.6vw,32px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-foreground">
        {release.title}
      </h2>

      <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-muted-foreground">
        {release.description}
      </p>

      <div className="mt-6 space-y-4">
        {release.categories.map(cat => (
          <div
            key={cat.kind + cat.label}
            className="overflow-hidden rounded-xl border border-border-glass bg-card/40"
          >
            <div className="flex items-center gap-2 border-b border-border-glass px-5 py-3">
              <PillTag variant={CHANGELOG_CATEGORY_VARIANT[cat.kind]}>{cat.label}</PillTag>
            </div>
            <ul className="divide-y divide-border-glass">
              {cat.entries.map((entry, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 px-5 py-3 text-[14.5px] leading-relaxed text-foreground"
                >
                  <span
                    aria-hidden
                    className="mt-[8px] size-[6px] shrink-0 rounded-full bg-primary/70"
                  />
                  <span className="text-foreground/90">{entry}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}

function OriginMarker() {
  const { t } = useTranslation('changelog');
  return (
    <div className="flex flex-col items-start">
      <span className="inline-flex items-center gap-2 rounded-full border border-border-glass bg-card/40 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.15em] text-muted-foreground">
        <Sparkles className="size-3" />
        {t('origin.label')}
      </span>
      <p className="mt-3 max-w-[40ch] font-serif text-[20px] italic leading-snug text-muted-foreground">
        {t('origin.tagline')}
      </p>
    </div>
  );
}
