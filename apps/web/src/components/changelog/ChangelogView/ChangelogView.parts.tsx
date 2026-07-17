import { Trans, useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { CHANGELOG_CATEGORY_VARIANT, type ChangelogRelease } from '@/lib/changelog-entries';
import type { FilterValue, IChangelogFilterChip } from './ChangelogView.types';

interface IHeaderProps {
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  filters: IChangelogFilterChip[];
  jumpTargets: ChangelogRelease[];
  latest: ChangelogRelease;
  compact: boolean;
}

/** Sticky eyebrow + serif headline + filter chips + jump-nav. */
export function Header({
  filter,
  onFilterChange,
  filters,
  jumpTargets,
  latest,
  compact,
}: IHeaderProps) {
  const { t } = useTranslation('changelog');
  const emPrimary = <em className="font-serif italic font-extrabold text-primary" />;

  return (
    <header className={cn('relative', compact ? 'pt-6 pb-6' : 'pt-14 pb-10')}>
      <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        <span
          className="size-1.5 rounded-full bg-primary"
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
        <b className="mr-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t('filter.label')}
        </b>
        {filters.map(chip => {
          const active = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(chip.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs tracking-[0.06em]',
                'transition-[color,background-color,border-color,transform] active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border-glass bg-card/40 text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              {chip.label}
              <span className={cn('tabular-nums opacity-60', active && 'opacity-80')}>
                {chip.count}
              </span>
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
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {t('jump.label')}
          </span>
          {jumpTargets.map(r => (
            <a
              key={r.version}
              href={`#v${r.version}`}
              className="rounded font-mono text-muted-foreground tabular-nums transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              v{r.version}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

/** One release card: version pill, latest badge, title/description, category lists. */
export function ReleaseCard({ release }: { release: ChangelogRelease }) {
  const { t } = useTranslation('changelog');
  return (
    <article>
      {/* Top row: version pill + optional "latest" badge + human date */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1',
            'font-mono text-[10.5px] font-semibold uppercase tracking-[0.15em] text-primary'
          )}
        >
          <span className="size-[5px] rounded-full bg-primary" />v{release.version}
        </span>
        {release.latest && (
          <span className="rounded-[4px] bg-primary px-2 py-[3px] font-mono text-2xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
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

/** Closing dashed timeline marker shown at the bottom of the full list. */
export function OriginMarker() {
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
