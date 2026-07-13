import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Pin, Trash2 } from 'lucide-react';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { useDiaryEntryCard } from './DiaryEntryCard.hooks';
import { CardTags } from './DiaryEntryCard.parts';
import type { IDiaryEntryCardProps } from './DiaryEntryCard.types';

function DiaryEntryCard({ entry, onSelect, onRemove, onTogglePin }: IDiaryEntryCardProps) {
  const { gradient, preview, title, date, pinLabel, removeLabel, MoodIcon, moodColor, tags } =
    useDiaryEntryCard(entry);

  return (
    <div
      className={cn(
        'group/card relative bg-card/80 border border-border-glass rounded-lg overflow-hidden',
        'focus-within:shadow-primary-glow hover:shadow-primary-glow transition-shadow duration-200'
      )}
    >
      {/* Primary "open" affordance — a stretched, transparent button giving the
          whole card one accessible name + native keyboard/click without nesting
          the action buttons inside an interactive container (which would trip
          axe's nested-interactive rule). The hover-action cluster sits above it
          via a higher z-index. */}
      <button
        type="button"
        onClick={() => onSelect(entry)}
        aria-label={title}
        className={cn(
          'absolute inset-0 z-[1] cursor-pointer rounded-lg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
        )}
      />
      {/* Gradient header — non-interactive parts let clicks fall through to the
          overlay button; the action cluster re-enables its own pointer events. */}
      <div
        className="pointer-events-none relative h-12 paper-grain"
        style={{ background: gradient }}
      >
        {/* Anime thumbnail */}
        {entry.animeCoverImage && (
          <FadeInImage
            src={entry.animeCoverImage}
            alt=""
            className="absolute bottom-1 right-2 w-5 h-7 rounded object-cover border-2 border-card shadow-sm"
            draggable={false}
          />
        )}

        {/* Pin indicator */}
        {entry.isPinned && (
          <div className="absolute top-1.5 left-1.5">
            <Pin className="w-3 h-3 text-white/80 fill-white/80 rotate-45" />
          </div>
        )}

        {/* Action buttons (visible on hover) */}
        <div className="pointer-events-auto absolute top-1 right-1 z-[2] flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onTogglePin(entry);
            }}
            aria-label={pinLabel}
            className={cn(
              'p-1.5 rounded-md transition-colors active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              entry.isPinned
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-black/20 text-white/70 hover:bg-black/30 hover:text-white'
            )}
          >
            <Pin className={cn('w-3 h-3', entry.isPinned && 'fill-current rotate-45')} />
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onRemove(entry);
            }}
            aria-label={removeLabel}
            className={cn(
              'p-1.5 rounded-md bg-black/20 text-white/70 transition-colors active:scale-95',
              'hover:bg-destructive/40 hover:text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Card body — pointer-events pass through to the overlay button so a
          click anywhere on the body activates the card. */}
      <div className="pointer-events-none p-3.5">
        {/* Anime reference */}
        {entry.animeTitle && (
          <p className="text-2xs text-muted-foreground truncate mb-0.5">{entry.animeTitle}</p>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground truncate group-hover/card:text-primary transition-colors">
          {title}
        </h3>

        {/* Content preview */}
        {preview && (
          <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed truncate-3">
            {preview}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
          <span className="text-2xs text-muted-foreground">{date}</span>
          <div className="flex items-center gap-1.5">
            {MoodIcon && <MoodIcon className={cn('w-3 h-3', moodColor)} />}
            <CardTags tags={tags} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DiaryEntryCard);
