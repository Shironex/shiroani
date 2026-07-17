import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pin, Trash2, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PillTag } from '@/components/ui/pill-tag';
import { FadeInImage } from '@/components/shared/FadeInImage';
import {
  DIARY_GRADIENTS,
  MOOD_EMOJI,
  MOOD_ICONS,
  DEFAULT_DIARY_GRADIENT,
} from '@/lib/diary-constants';
import type { DiaryEntry } from '@shiroani/shared';
import type { IDayGroup } from './DiaryTimeline.types';

function formatTime(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

interface TipTapNode {
  text?: string;
  content?: TipTapNode[];
}

function extractPreview(contentJson: string, maxLen = 220): string {
  try {
    const doc = JSON.parse(contentJson);
    const parts: string[] = [];
    const walk = (node: TipTapNode) => {
      if (node.text) parts.push(node.text);
      if (node.content) node.content.forEach(walk);
    };
    walk(doc);
    const joined = parts.join(' ').trim();
    if (joined.length <= maxLen) return joined;
    return joined.slice(0, maxLen).trimEnd() + '…';
  } catch {
    return '';
  }
}

interface ITimelineGroupsProps {
  groups: IDayGroup[];
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

/** The day-grouped sections with their timeline dots and entry rows. */
export function TimelineGroups({ groups, onSelect, onRemove, onTogglePin }: ITimelineGroupsProps) {
  return (
    <>
      {groups.map(group => (
        <section key={group.key} className="flex flex-col gap-3">
          <h2
            className={cn(
              'flex items-center gap-2 pl-7 font-mono text-[10px]',
              'uppercase tracking-[0.22em] text-muted-foreground/80'
            )}
          >
            <span className="h-px w-4 bg-border-glass" aria-hidden="true" />
            {group.header}
          </h2>

          <ul className="flex flex-col gap-3">
            {group.entries.map(entry => (
              <li key={entry.id} className="relative pl-7">
                {/* Small timeline dot — purely decorative */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-1.5 top-[22px] block size-2.5 rounded-full border-2',
                    'border-primary bg-background'
                  )}
                />
                <DiaryListCard
                  entry={entry}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onTogglePin={onTogglePin}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

interface IDiaryListCardProps {
  entry: DiaryEntry;
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

const DiaryListCard = memo(function DiaryListCard({
  entry,
  onSelect,
  onRemove,
  onTogglePin,
}: IDiaryListCardProps) {
  const { t, i18n } = useTranslation('diary');
  const preview = extractPreview(entry.contentJson);
  const moodEmoji = entry.mood ? MOOD_EMOJI[entry.mood] : undefined;
  const MoodIcon = entry.mood ? MOOD_ICONS[entry.mood] : null;
  const time = formatTime(entry.createdAt, i18n.language);

  const gradient = entry.coverGradient
    ? (DIARY_GRADIENTS[entry.coverGradient]?.css ?? DEFAULT_DIARY_GRADIENT)
    : DEFAULT_DIARY_GRADIENT;

  return (
    <div
      className={cn(
        'group/dl-card relative flex gap-4 rounded-lg',
        'border border-border-glass bg-card/40 p-4',
        'transition-[border-color,background-color,box-shadow] duration-200',
        'hover:border-primary/35 hover:bg-card/60 hover:shadow-[0_10px_28px_oklch(0_0_0/0.3)]',
        'focus-within:border-primary/35 focus-within:bg-card/60'
      )}
    >
      {/* Primary "open" affordance — a stretched, transparent button so the
          whole row has one accessible name + native keyboard/click without
          nesting the pin/remove buttons inside an interactive container (which
          would trip axe's nested-interactive rule). The action cluster sits
          above it via a higher z-index. */}
      <button
        type="button"
        onClick={() => onSelect(entry)}
        aria-label={entry.title || t('untitled')}
        className={cn(
          'absolute inset-0 z-[1] cursor-pointer rounded-lg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
      />
      {/* Cover thumb — 48x68 aspect 2:3 */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none relative h-[68px] w-12 shrink-0 overflow-hidden rounded-sm border border-white/10',
          'shadow-[0_4px_10px_oklch(0_0_0/0.35)]'
        )}
        style={{ background: gradient }}
      >
        {entry.animeCoverImage ? (
          <FadeInImage
            src={entry.animeCoverImage}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 30% 20%, oklch(1 0 0 / 0.22), transparent 55%)',
            }}
          />
        )}
      </div>

      {/* Main body — pointer-events pass through to the overlay button; the
          action cluster re-enables its own pointer events above it. */}
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {entry.isPinned && (
                <Pin
                  aria-label={t('card.pinned')}
                  className="size-3 shrink-0 rotate-45 fill-primary text-primary"
                />
              )}
              <h3
                title={entry.title || t('untitled')}
                className="truncate text-sm font-bold leading-snug text-foreground"
              >
                {entry.title || t('untitled')}
              </h3>
              {moodEmoji && (
                <span className="text-[15px] leading-none" aria-hidden="true">
                  {moodEmoji}
                </span>
              )}
            </div>

            {/* Meta row: anime link + time (mock's "EP 04 · RENKA · 23:07") */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/80">
              {entry.animeTitle && (
                <span className="inline-flex max-w-full items-center gap-1.5 truncate">
                  <LinkIcon className="size-[10px] shrink-0" aria-hidden="true" />
                  <span className="truncate" title={entry.animeTitle}>
                    {entry.animeTitle}
                  </span>
                </span>
              )}
              {entry.animeTitle && <span aria-hidden="true">·</span>}
              <span>{time}</span>
            </div>
          </div>

          {/* Right cluster: mood icon + hover actions */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div
              className={cn(
                'pointer-events-auto relative z-[2] flex items-center gap-1 opacity-0 transition-opacity',
                'group-hover/dl-card:opacity-100 group-focus-within/dl-card:opacity-100'
              )}
            >
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onTogglePin(entry);
                }}
                aria-label={entry.isPinned ? t('card.unpin') : t('card.pin')}
                className={cn(
                  'rounded-md p-1.5 text-muted-foreground transition-colors active:scale-95',
                  'hover:bg-accent/60 hover:text-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  entry.isPinned && 'text-primary'
                )}
              >
                <Pin className={cn('size-3.5', entry.isPinned && 'fill-current rotate-45')} />
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onRemove(entry);
                }}
                aria-label={t('card.remove')}
                className={cn(
                  'rounded-md p-1.5 text-muted-foreground transition-colors active:scale-95',
                  'hover:bg-destructive/15 hover:text-destructive',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            {MoodIcon && (
              <MoodIcon.Icon
                className={cn('size-4 opacity-80', MoodIcon.color)}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {preview && (
          <p className="text-xs leading-[1.55] text-foreground/80 line-clamp-3">{preview}</p>
        )}

        {(entry.tags?.length ?? 0) > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {entry.tags!.slice(0, 6).map(tag => (
              <PillTag key={tag} variant="muted">
                #{tag}
              </PillTag>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
