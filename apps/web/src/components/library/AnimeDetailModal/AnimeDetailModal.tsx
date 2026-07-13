import { useTranslation } from 'react-i18next';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ExternalLink, Save, Trash2, Link2, X, Film } from 'lucide-react';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PillTag } from '@/components/ui/pill-tag';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { Eyebrow } from '@/components/shared/Eyebrow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { AnimeStatus } from '@shiroani/shared';
import { STATUS_LABEL_KEY, MAX_EPISODES } from '@/lib/constants';
import { tDynamic } from '@/lib/i18n';
import { SliderInputField } from '@/components/library/SliderInputField';
import { RelationsSection } from '@/components/library/RelationsSection';
import { AnimeDetailExtras } from '@/components/library/AnimeDetailExtras';
import { useAnimeDetailModal } from './AnimeDetailModal.hooks';
import { EntrySyncSection, SheetStat, SheetDivider } from './AnimeDetailModal.parts';
import type { IAnimeDetailModalProps } from './AnimeDetailModal.types';

const STATUS_PILL_VARIANT: Record<AnimeStatus, 'accent' | 'green' | 'gold' | 'blue' | 'muted'> = {
  watching: 'accent',
  completed: 'green',
  plan_to_watch: 'blue',
  on_hold: 'gold',
  dropped: 'muted',
};

export default function AnimeDetailModal({ entry, open, onOpenChange }: IAnimeDetailModalProps) {
  const { t, i18n } = useTranslation(['library', 'status']);
  const {
    statusOptions,
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    score,
    setScore,
    notes,
    setNotes,
    resumeUrl,
    setResumeUrl,
    anilistId,
    setAnilistId,
    showConfirm,
    setShowConfirm,
    handleSave,
    handleRemove,
    handleOpenInBrowser,
    handleNavigate,
    handleUpdateUrl,
  } = useAnimeDetailModal({ entry, open, onOpenChange });

  if (!entry) return null;

  const isCompleted = status === 'completed' && !!entry.episodes && entry.episodes > 0;
  const maxEpisodes = entry.episodes ?? MAX_EPISODES;
  const progressPercent = entry.episodes
    ? Math.min(100, Math.round((currentEpisode / entry.episodes) * 100))
    : 0;
  const altTitle = [entry.titleNative, entry.titleRomaji].filter(Boolean).join(' · ');

  const statusItems = statusOptions.map(opt => (
    <SelectItem key={opt.value} value={opt.value} className="text-xs">
      {opt.label}
    </SelectItem>
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[min(92vw,860px)] h-[min(92vh,560px)]',
            'rounded-2xl overflow-hidden',
            'bg-popover border border-border-glass',
            'shadow-[0_40px_100px_oklch(0_0_0/0.5)]',
            'flex flex-row',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-200'
          )}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{entry.title}</DialogPrimitive.Title>

          {/* LEFT — poster + stats column */}
          <div
            className={cn(
              'w-[220px] flex-shrink-0 relative overflow-hidden',
              'flex flex-col items-center px-5 pt-7 pb-5',
              'bg-background/60 border-r border-border-glass'
            )}
          >
            {/* Soft glow backdrop */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 50% -10%, oklch(from var(--primary) l c h / 0.25), transparent 60%)',
              }}
            />

            {/* Poster */}
            <div
              className={cn(
                'relative z-[1] w-[150px] aspect-[2/3] rounded-lg overflow-hidden',
                'border border-border-glass shadow-[0_8px_28px_oklch(0_0_0/0.5)]',
                'flex-shrink-0'
              )}
            >
              {entry.coverImage ? (
                <FadeInImage
                  src={entry.coverImage}
                  alt={entry.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
                  <Film className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.18), transparent 55%)',
                }}
              />
            </div>

            {/* Stats */}
            <div className="relative z-[1] mt-5 w-full flex flex-col gap-3 text-left">
              <SheetStat
                label={t('library:detail.score')}
                value={
                  score > 0 ? (
                    <>
                      <span className="text-gold">{score.toFixed(1)}</span>
                      <span className="text-muted-foreground/60 font-normal"> / 10</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60">–</span>
                  )
                }
              />
              <SheetDivider />
              <SheetStat
                label={t('library:detail.progress')}
                value={
                  entry.episodes
                    ? `${currentEpisode} / ${entry.episodes} ${t('library:detail.episodesShort')}`
                    : `${currentEpisode} ${t('library:detail.episodesShort')}`
                }
              />
              {entry.episodes ? <ProgressBar value={progressPercent} thickness={3} glow /> : null}
              <SheetStat
                label={t('library:detail.status')}
                value={tDynamic(i18n, `status:${STATUS_LABEL_KEY[status]}`)}
              />
              <SheetDivider />
              <SheetStat
                label={t('library:detail.addedAt')}
                value={new Date(entry.addedAt).toLocaleDateString(i18n.language, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              />
              <SheetStat
                label={t('library:detail.updatedAt')}
                value={new Date(entry.updatedAt).toLocaleDateString(i18n.language, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              />
            </div>
          </div>

          {/* RIGHT — scrollable form + action bar */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-popover">
            {/* Top header with tags + title + close */}
            <div className="relative flex-shrink-0 px-6 pt-5 pb-4 border-b border-border-glass">
              <DialogPrimitive.Close
                className={cn(
                  'absolute top-4 right-4 w-7 h-7 rounded-full grid place-items-center',
                  'bg-foreground/5 border border-border-glass text-muted-foreground',
                  'hover:bg-foreground/10 hover:text-foreground transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                aria-label={t('library:detail.close')}
              >
                <X className="w-3.5 h-3.5" />
              </DialogPrimitive.Close>

              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <PillTag variant={STATUS_PILL_VARIANT[status]}>
                  {tDynamic(i18n, `status:${STATUS_LABEL_KEY[status]}`)}
                </PillTag>
                {entry.episodes && (
                  <PillTag variant="muted">
                    {entry.episodes} {t('library:detail.episodesShort')}
                  </PillTag>
                )}
                {entry.anilistId && <PillTag variant="blue">{t('library:detail.anilist')}</PillTag>}
                {entry.malId && <PillTag variant="blue">{t('library:detail.mal')}</PillTag>}
              </div>

              <h2
                title={entry.title}
                className="font-sans text-[22px] font-extrabold leading-[1.15] tracking-[-0.025em] text-foreground pr-10 line-clamp-2"
              >
                {entry.title}
              </h2>
              {altTitle && (
                <p className="mt-1 font-serif text-[12.5px] text-muted-foreground tracking-[0.02em]">
                  {altTitle}
                </p>
              )}
            </div>

            {/* Scrolling content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {entry.notes && (
                <p className="text-[13px] leading-[1.65] text-foreground/80">{entry.notes}</p>
              )}

              {/* Status select */}
              <div className="space-y-1.5">
                <Eyebrow htmlFor="detail-status">{t('library:detail.statusField')}</Eyebrow>
                <Select value={status} onValueChange={v => setStatus(v as AnimeStatus)}>
                  <SelectTrigger
                    id="detail-status"
                    aria-label={t('library:detail.statusField')}
                    className="h-8 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{statusItems}</SelectContent>
                </Select>
              </div>

              {/* Progress */}
              <SliderInputField
                label={
                  entry.episodes
                    ? t('library:detail.progressField', {
                        current: currentEpisode,
                        total: entry.episodes,
                      })
                    : t('library:detail.progressFieldUnknown', { current: currentEpisode })
                }
                value={currentEpisode}
                onChange={setCurrentEpisode}
                min={0}
                max={maxEpisodes}
                showSlider={!!entry.episodes && entry.episodes > 0}
                disabled={isCompleted}
              />

              {/* Score */}
              <SliderInputField
                label={
                  score > 0
                    ? t('library:detail.scoreField', { score })
                    : t('library:detail.scoreFieldNone')
                }
                value={score}
                onChange={setScore}
                min={0}
                max={10}
              />

              {/* Notes */}
              <div className="space-y-1.5">
                <Eyebrow htmlFor="detail-notes">{t('library:detail.notes')}</Eyebrow>
                <Textarea
                  id="detail-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('library:detail.notesPlaceholder')}
                  rows={3}
                />
              </div>

              {/* Resume URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Eyebrow htmlFor="detail-resume-url">{t('library:detail.resumeUrl')}</Eyebrow>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-2xs px-2 text-muted-foreground"
                    onClick={handleUpdateUrl}
                  >
                    <Link2 className="w-3 h-3" />
                    {t('library:detail.fetchUrlFromBrowser')}
                  </Button>
                </div>
                <Input
                  id="detail-resume-url"
                  value={resumeUrl}
                  onChange={e => setResumeUrl(e.target.value)}
                  placeholder={t('library:detail.resumeUrlPlaceholder')}
                  className="h-8 text-xs"
                />
              </div>

              {/* AniList ID */}
              <div className="space-y-1.5">
                <Eyebrow htmlFor="detail-anilist-id">{t('library:detail.anilistId')}</Eyebrow>
                <p className="text-2xs text-muted-foreground">
                  {t('library:detail.anilistIdHint')}
                </p>
                <Input
                  id="detail-anilist-id"
                  type="number"
                  min={1}
                  value={anilistId}
                  onChange={e => setAnilistId(e.target.value)}
                  placeholder={t('library:detail.anilistIdPlaceholder')}
                  className="h-8 text-xs w-32"
                />
              </div>

              {/* Manual single-entry sync (push / pull / auto), per provider. Each
                  needs that provider's id to resolve a remote media, so gate on it.
                  Self-gates on a connected account too. AniList + MAL are kept
                  distinct and separately labelled; their single-flight guards are
                  independent main-side, so neither disables the other. */}
              {entry.anilistId ? <EntrySyncSection entryId={entry.id} provider="anilist" /> : null}
              {entry.malId ? <EntrySyncSection entryId={entry.id} provider="mal" /> : null}

              {/* Related entries (AniList relations) */}
              {entry.anilistId ? <RelationsSection anilistId={entry.anilistId} /> : null}

              {/* Recommendations + streaming episodes + AniList/MAL reference links */}
              {entry.anilistId ? (
                <AnimeDetailExtras anilistId={entry.anilistId} onNavigate={handleNavigate} />
              ) : null}
            </div>

            {/* Bottom action bar */}
            <div className="flex-shrink-0 px-6 py-3.5 border-t border-border-glass bg-background/40 flex items-center gap-2">
              <Button onClick={handleSave} size="sm" className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {t('library:detail.save')}
              </Button>
              <Button onClick={handleOpenInBrowser} variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                {t('library:detail.openInBrowser')}
              </Button>
              <Button
                onClick={() => setShowConfirm(true)}
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('library:detail.delete')}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={t('library:remove.title')}
        description={t('library:remove.description')}
        onConfirm={() => {
          handleRemove();
          setShowConfirm(false);
        }}
      />
    </Dialog>
  );
}
