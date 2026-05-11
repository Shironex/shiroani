import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Pin, Trash2 } from 'lucide-react';
import type { DiaryEntry } from '@shiroani/shared';
import { DIARY_GRADIENTS, MOOD_ICONS, formatDate } from '@/lib/diary-constants';

const DEFAULT_GRADIENT = 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)';

interface TipTapNode {
  text?: string;
  content?: TipTapNode[];
}

function extractPreview(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson);
    const texts: string[] = [];
    const walk = (node: TipTapNode) => {
      if (node.text) texts.push(node.text);
      if (node.content) node.content.forEach(walk);
    };
    walk(doc);
    return texts.join(' ').slice(0, 200);
  } catch {
    return '';
  }
}

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

const DiaryEntryCard = memo(function DiaryEntryCard({
  entry,
  onSelect,
  onRemove,
  onTogglePin,
}: DiaryEntryCardProps) {
  const { t } = useTranslation('diary');
  const gradient = entry.coverGradient
    ? (DIARY_GRADIENTS[entry.coverGradient]?.css ?? DEFAULT_GRADIENT)
    : DEFAULT_GRADIENT;
  const preview = extractPreview(entry.contentJson);
  const MoodInfo = entry.mood ? MOOD_ICONS[entry.mood] : null;

  return (
    <div
      onClick={() => onSelect(entry)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.key === ' ') e.preventDefault();
          onSelect(entry);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        'group/card relative bg-card/80 border border-border-glass rounded-xl overflow-hidden cursor-pointer',
        'hover:shadow-primary-glow transition-all duration-200'
      )}
    >
      {/* Gradient header */}
      <div className="relative h-12 paper-grain" style={{ background: gradient }}>
        {/* Anime thumbnail */}
        {entry.animeCoverImage && (
          <img
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
        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onTogglePin(entry);
            }}
            aria-label={entry.isPinned ? t('card.unpin') : t('card.pin')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
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
            aria-label={t('card.remove')}
            className="p-1.5 rounded-md bg-black/20 text-white/70 hover:bg-red-500/40 hover:text-white transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3.5">
        {/* Anime reference */}
        {entry.animeTitle && (
          <p className="text-2xs text-muted-foreground/60 truncate mb-0.5">{entry.animeTitle}</p>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground truncate group-hover/card:text-primary transition-colors">
          {entry.title || t('untitled')}
        </h3>

        {/* Content preview */}
        {preview && (
          <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed truncate-3">
            {preview}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
          <span className="text-2xs text-muted-foreground/50">{formatDate(entry.createdAt)}</span>
          <div className="flex items-center gap-1.5">
            {MoodInfo && <MoodInfo.Icon className={cn('w-3 h-3', MoodInfo.color)} />}
            {entry.tags?.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-full text-2xs bg-primary/10 text-primary/70"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export { DiaryEntryCard };
