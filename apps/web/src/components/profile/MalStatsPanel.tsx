import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ExternalLink, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { ProfileSkeleton } from './ProfileSkeleton';

const MAL_PROFILE_BASE = 'https://myanimelist.net/profile/';

/** Format MAL's fractional day counts to one decimal place, locale-aware. */
function formatDays(days: number, locale: string): string {
  return days.toLocaleString(locale, { maximumFractionDigits: 1 });
}

/**
 * "MyAnimeList" tab body — the connected viewer's THIN stat set. Fed by the
 * desktop main process via {@link MalEvents.GET_VIEWER_PROFILE} (token never
 * crosses the socket) and rendered to mirror {@link InAppStatsPanel}'s
 * card/grid styling.
 *
 * Deliberately lighter than the AniList tab: MAL's v2 API only exposes these
 * 15 scalars for `@me`, so there are no genre / voice-actor / score-distribution
 * breakdowns to render here.
 */
export function MalStatsPanel() {
  const { t, i18n } = useTranslation('profile');
  const profile = useMalProfileStore(s => s.profile);
  const isLoading = useMalProfileStore(s => s.isLoading);
  const error = useMalProfileStore(s => s.error);
  const fetchProfile = useMalProfileStore(s => s.fetchProfile);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading && !profile) return <ProfileSkeleton />;
  if (error && !profile) return <AniListErrorState error={error} onRetry={() => fetchProfile()} />;
  if (!profile) return <ProfileSkeleton />;

  const locale = i18n.language;
  const { viewer } = profile;
  const numberFmt = (n: number) => n.toLocaleString(locale);
  const profileUrl = `${MAL_PROFILE_BASE}${encodeURIComponent(viewer.name)}`;

  const breakdown: { key: string; label: string; value: number }[] = [
    { key: 'watching', label: t('malPanel.status.watching'), value: profile.num_items_watching },
    {
      key: 'completed',
      label: t('malPanel.status.completed'),
      value: profile.num_items_completed,
    },
    { key: 'onHold', label: t('malPanel.status.onHold'), value: profile.num_items_on_hold },
    { key: 'dropped', label: t('malPanel.status.dropped'), value: profile.num_items_dropped },
    {
      key: 'planToWatch',
      label: t('malPanel.status.planToWatch'),
      value: profile.num_items_plan_to_watch,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-6">
      {/* ── Hero block ─────────────────────────────────────── */}
      <section
        className={cn(
          'relative px-6 py-6 rounded-2xl border border-border-glass overflow-hidden',
          'bg-gradient-to-br from-primary/[0.08] via-foreground/[0.02] to-foreground/[0.04]'
        )}
      >
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>{t('malPanel.heroTag')}</span>
        </div>
        <div className="flex items-center gap-3.5">
          {viewer.avatar ? (
            <img
              src={viewer.avatar}
              alt=""
              className="size-12 flex-shrink-0 rounded-full border border-border-glass object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <h2 className="font-sans font-extrabold text-[22px] leading-[1.2] tracking-[-0.02em] text-foreground truncate">
              {viewer.name}
            </h2>
            <p className="mt-1 text-[13px] text-foreground/75">
              {t('malPanel.heroSubtitle', {
                items: numberFmt(profile.num_items),
                episodes: numberFmt(profile.num_episodes),
              })}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(profileUrl, '_blank', 'noopener,noreferrer')}
            className={cn(
              'h-8 px-3 text-[12px] font-medium gap-1.5',
              'bg-foreground/5 border border-foreground/10 hover:bg-foreground/10'
            )}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('malPanel.openProfile')}
          </Button>
        </div>
      </section>

      {/* ── Headline counters ──────────────────────────────── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CounterCard label={t('malPanel.counters.items')} value={numberFmt(profile.num_items)} />
        <CounterCard
          label={t('malPanel.counters.episodes')}
          value={numberFmt(profile.num_episodes)}
          tone="accent"
        />
        <CounterCard
          label={t('malPanel.counters.daysWatched')}
          value={formatDays(profile.num_days_watched, locale)}
          sub={t('malPanel.counters.daysWatchedSub')}
          tone="gold"
        />
        <CounterCard
          label={t('malPanel.counters.meanScore')}
          // mean_score is a 0–10 average rating (NOT a day count) — render it as a
          // localized number, not via formatDays.
          value={
            profile.mean_score > 0
              ? profile.mean_score.toLocaleString(locale, { maximumFractionDigits: 2 })
              : '—'
          }
          sub={t('malPanel.counters.meanScoreSub')}
        />
      </section>

      {/* ── Per-status breakdown ───────────────────────────── */}
      <section>
        <SectionHead>{t('malPanel.breakdown.title')}</SectionHead>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {breakdown.map(item => (
            <StatusCard key={item.key} label={item.label} value={numberFmt(item.value)} />
          ))}
          <StatusCard
            label={t('malPanel.breakdown.rewatched')}
            value={numberFmt(profile.num_times_rewatched)}
            tone="accent"
          />
        </div>
      </section>

      {/* ── "lighter stat set" note ────────────────────────── */}
      <section className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-border-glass bg-foreground/[0.025]">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-muted-foreground" />
        <p className="text-[11.5px] text-muted-foreground/80 leading-relaxed">
          {t('malPanel.lighterNote')}
        </p>
      </section>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2.5 mb-3">
      <span>{children}</span>
      <span aria-hidden="true" className="flex-1 h-px bg-border-glass" />
    </h3>
  );
}

function CounterCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'accent' | 'gold';
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'font-sans font-extrabold text-[22px] tracking-[-0.02em] leading-[1.15] tabular-nums',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-[oklch(0.8_0.14_70)]',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-foreground/[0.025] border border-border-glass flex items-baseline justify-between gap-3">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'font-sans font-extrabold text-[18px] tracking-[-0.02em] tabular-nums',
          tone === 'accent' ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}
