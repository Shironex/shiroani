import { useTranslation } from 'react-i18next';
import { Flame, CalendarDays, Tag as TagIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCell } from '@/components/shared/StatCell';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { PillTag } from '@/components/ui/pill-tag';
import { ComingSoonPlaceholder } from '@/components/shared/ComingSoonPlaceholder';
import type { IStreakMilestone } from './DiarySidebar.types';

export function SidebarLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {children}
    </div>
  );
}

export function SidebarSection({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

interface IStreakCardProps {
  current: number;
  longest: number;
  milestone: IStreakMilestone;
  /** Highest celebration milestone (7/14/30) the current streak has reached. */
  achievedMilestone?: number;
}

export function StreakCard({ current, longest, milestone, achievedMilestone }: IStreakCardProps) {
  const { t } = useTranslation('diary');
  const dotsCount = Math.min(current, 23);
  const dots = Array.from({ length: 23 }, (_, i) => i < dotsCount);
  const remaining = Math.max(0, milestone.target - current);
  const note =
    current === 0
      ? t('sidebar.streakNoteEmpty')
      : current >= longest
        ? t('sidebar.streakNoteRecord', { target: milestone.target })
        : t('sidebar.streakNoteProgress', {
            longest,
            longestUnit: t('sidebar.dayUnit', { count: longest }),
            target: milestone.target,
            remaining,
            remainingUnit: t('sidebar.dayUnit', { count: remaining }),
          });

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-[oklch(from_var(--gold)_l_c_h/0.3)] p-4',
        'bg-[linear-gradient(145deg,oklch(from_var(--primary)_l_c_h/0.18),oklch(from_var(--gold)_l_c_h/0.12))]'
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
        <Flame className="w-3.5 h-3.5" aria-hidden="true" />
        {t('sidebar.currentStreak')}
        {achievedMilestone != null && (
          <span
            className={cn(
              'ml-auto rounded-full border border-[oklch(from_var(--gold)_l_c_h/0.45)] bg-gold-bg',
              'px-2 py-[2px] text-[9px] tracking-[0.12em] text-gold'
            )}
          >
            {t('sidebar.celebration.badge', { count: achievedMilestone })}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2 font-serif text-[38px] font-extrabold leading-none text-gold">
        {current}
        <small className="font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
          {t('sidebar.dayInRow', { count: current })}
        </small>
      </div>
      <p className="mt-2 text-[11.5px] leading-[1.4] text-foreground/80">{note}</p>
      <div className="mt-3 flex gap-[2px]" aria-hidden="true">
        {dots.map((on, i) => (
          <span
            key={i}
            className={cn(
              'h-[14px] flex-1 rounded-[2px]',
              on ? 'bg-gold shadow-[0_0_4px_oklch(from_var(--gold)_l_c_h/0.5)]' : 'bg-foreground/10'
            )}
          />
        ))}
      </div>
      <div className="mt-3">
        <ProgressBar value={milestone.progress} thickness={3} glow tone="primary" />
        <div className="mt-1 flex justify-between font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>{t('sidebar.goalLabel', { target: milestone.target })}</span>
          <span>{Math.round(milestone.progress)}%</span>
        </div>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border-glass bg-foreground/[0.03] px-3 py-2.5')}>
      <StatCell label={label} value={value} sub={sub} />
    </div>
  );
}

interface IActivityHeatmapProps {
  weeks: number[];
  maxCount: number;
  total: number;
}

export function ActivityHeatmap({ weeks, maxCount, total }: IActivityHeatmapProps) {
  const { t } = useTranslation('diary');
  if (total === 0) {
    return (
      <SidebarSection>
        <SidebarLabel icon={CalendarDays}>{t('sidebar.activity.label')}</SidebarLabel>
        <ComingSoonPlaceholder
          icon={Sparkles}
          tag={t('sidebar.activity.emptyTag')}
          title={t('sidebar.activity.emptyTitle')}
          description={t('sidebar.activity.emptyDescription')}
          className="min-h-[160px] p-5"
        />
      </SidebarSection>
    );
  }

  return (
    <SidebarSection>
      <SidebarLabel icon={CalendarDays}>{t('sidebar.activity.label52w')}</SidebarLabel>
      {/* Screen-reader summary — the 91-cell grid itself is decorative
          (aria-hidden), so expose the totals as a plain sentence. */}
      <span className="sr-only">{t('sidebar.activity.summary', { count: total })}</span>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}
        aria-hidden="true"
      >
        {/* Aggregate 53 weeks into 13 columns × 7 rows (Fibonacci-ish bucket to match mock) */}
        {weeks.slice(-91).map((count, i) => {
          const level = bucketLevel(count, maxCount);
          return (
            <span
              key={i}
              className="aspect-square rounded-[2px]"
              style={{ background: HEATMAP_LEVELS[level] }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">
        <span>{t('sidebar.activity.less')}</span>
        <div className="flex gap-[2px]">
          {HEATMAP_LEVELS.map((bg, i) => (
            <span key={i} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: bg }} />
          ))}
        </div>
        <span>{t('sidebar.activity.more')}</span>
      </div>
    </SidebarSection>
  );
}

const HEATMAP_LEVELS = [
  'oklch(from var(--foreground) l c h / 0.06)',
  'oklch(from var(--primary) l c h / 0.25)',
  'oklch(from var(--primary) l c h / 0.5)',
  'oklch(from var(--primary) l c h / 0.8)',
  'oklch(from var(--primary) l c h)',
] as const;

function bucketLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export function TopTagsBlock({ tags }: { tags: { tag: string; count: number }[] }) {
  const { t } = useTranslation('diary');
  if (tags.length === 0) {
    return (
      <SidebarSection>
        <SidebarLabel icon={TagIcon}>{t('sidebar.topTags')}</SidebarLabel>
        <p className="text-[11.5px] text-muted-foreground/70">{t('sidebar.topTagsHint')}</p>
      </SidebarSection>
    );
  }
  return (
    <SidebarSection>
      <SidebarLabel icon={TagIcon}>{t('sidebar.topTags')}</SidebarLabel>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t, i) => (
          <PillTag key={t.tag} variant={i === 0 ? 'accent' : 'muted'}>
            #{t.tag} · {t.count}
          </PillTag>
        ))}
      </div>
    </SidebarSection>
  );
}
