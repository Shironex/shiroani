import { useTranslation } from 'react-i18next';
import { Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/stats-conversions';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ActivityHeatmap } from '../ActivityHeatmap';
import { useInAppStatsPanel } from './InAppStatsPanel.hooks';
import { CounterCard, SectionHead, Stat } from './InAppStatsPanel.parts';

/**
 * "W aplikacji" tab body — local time-spent stats. Fed by the main-process
 * tracker via the `app-stats:*` IPC channels and refreshed on a 60s poll.
 */
export default function InAppStatsPanel() {
  const { t } = useTranslation('profile');
  const { snapshot, hero, totals, daysLabel, sessionsLabel, resetOpen, setResetOpen, handleReset } =
    useInAppStatsPanel();

  return (
    <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-6">
      {/* ── Hero block ─────────────────────────────────────── */}
      <section
        className={cn(
          'relative px-6 py-6 rounded-xl border border-border-glass overflow-hidden',
          'bg-gradient-to-br from-primary/[0.08] via-foreground/[0.02] to-foreground/[0.04]'
        )}
      >
        <div className="font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>{t('appPanel.heroTag')}</span>
        </div>
        <h2 className="font-sans font-extrabold text-[22px] leading-[1.25] tracking-[-0.02em] text-foreground">
          {hero.primary}
        </h2>
        <p className="mt-2 text-[13px] text-foreground/75">{hero.secondary}</p>
        <div className="mt-4 pt-3 border-t border-border-glass/40 font-mono text-[10.5px] uppercase tracking-[0.18em] text-foreground/60">
          {t('appPanel.footer', { days: daysLabel, sessions: sessionsLabel })}
        </div>
      </section>

      {/* ── Counter cards ──────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CounterCard
          label={t('appPanel.counters.open')}
          value={formatDuration(totals.appOpenSeconds)}
          sub={t('appPanel.counters.openSub')}
        />
        <CounterCard
          label={t('appPanel.counters.active')}
          value={formatDuration(totals.appActiveSeconds)}
          sub={t('appPanel.counters.activeSub')}
          tone="accent"
        />
        <CounterCard
          label={t('appPanel.counters.anime')}
          value={formatDuration(totals.animeWatchSeconds)}
          sub={t('appPanel.counters.animeSub')}
          tone="gold"
        />
      </section>

      {/* ── Activity heatmap ───────────────────────────────── */}
      <section>
        <SectionHead>{t('appPanel.heatmap.title')}</SectionHead>
        <div className="px-4 py-4 rounded-xl border border-border-glass bg-foreground/[0.025]">
          <ActivityHeatmap snapshot={snapshot} weeks={12} metric="active" />
          <p className="mt-3 text-[11.5px] text-muted-foreground/80">
            {t('appPanel.heatmap.caption')}
          </p>
        </div>
      </section>

      {/* ── Streak strip ───────────────────────────────────── */}
      {snapshot.currentStreak.days > 0 && (
        <section className="px-5 py-4 rounded-xl border border-border-glass bg-foreground/[0.025] flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <Stat
            label={t('appPanel.streak.current')}
            value={t('appPanel.days', { count: snapshot.currentStreak.days })}
            tone="accent"
          />
          <Stat
            label={t('appPanel.streak.longest')}
            value={t('appPanel.days', { count: snapshot.longestStreak.days })}
          />
        </section>
      )}

      {/* ── Reset action ───────────────────────────────────── */}
      <section className="pt-2 border-t border-border-glass/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setResetOpen(true)}
          className={cn(
            'h-9 gap-2 px-3 text-xs font-medium',
            'text-muted-foreground hover:bg-destructive/15 hover:text-destructive'
          )}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t('appPanel.reset.action')}
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
          {t('appPanel.reset.hint')}
        </p>
      </section>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('appPanel.reset.dialog.title')}
        description={t('appPanel.reset.dialog.description')}
        confirmLabel={t('appPanel.reset.dialog.confirm')}
        onConfirm={handleReset}
      />
    </div>
  );
}
