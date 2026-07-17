import type { TFunction } from 'i18next';
import { cn } from '@/lib/utils';
import { Pin } from 'lucide-react';
import type { DiaryEntry } from '@shiroani/shared';
import { PillTag } from '@/components/ui/pill-tag';
import { DIARY_GRADIENTS, MOOD_ICONS, formatDate } from '@/lib/diary-constants';
import { DiaryEntryCard } from '../DiaryEntryCard';

interface IGridProps {
  entries: DiaryEntry[];
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

/** Card grid layout — auto-fill columns of `DiaryEntryCard`s. */
export function GridView({ entries, onSelect, onRemove, onTogglePin }: IGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      {entries.map(entry => (
        <DiaryEntryCard
          key={entry.id}
          entry={entry}
          onSelect={onSelect}
          onRemove={onRemove}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}

interface IListProps {
  entries: DiaryEntry[];
  onSelect: (entry: DiaryEntry) => void;
  t: TFunction<'diary'>;
}

/** Compact list layout — one slim row per entry with a gradient accent bar. */
export function ListView({ entries, onSelect, t }: IListProps) {
  return (
    <div className="space-y-0.5">
      {entries.map(entry => {
        const gradient = entry.coverGradient ? DIARY_GRADIENTS[entry.coverGradient]?.css : null;
        const MoodInfo = entry.mood ? MOOD_ICONS[entry.mood] : null;

        return (
          <div
            key={entry.id}
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
              'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer',
              'hover:bg-accent/40 transition-colors duration-150',
              'border border-transparent hover:border-border-glass',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-foreground/5',
              'group/list-item'
            )}
          >
            {/* Gradient accent bar */}
            <div
              className="w-1 h-10 rounded-full shrink-0"
              style={{ background: gradient ?? 'var(--muted)' }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {entry.isPinned && (
                  <Pin className="w-3 h-3 text-primary fill-primary rotate-45 shrink-0" />
                )}
                <h3
                  title={entry.title || t('untitled')}
                  className="text-sm font-medium truncate group-hover/list-item:text-primary transition-colors"
                >
                  {entry.title || t('untitled')}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                {formatDate(entry.createdAt)}
                {entry.animeTitle && <> · {entry.animeTitle}</>}
              </p>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {MoodInfo && <MoodInfo.Icon className={cn('w-3.5 h-3.5', MoodInfo.color)} />}
              {entry.tags?.slice(0, 1).map(tag => (
                <PillTag key={tag} variant="muted">
                  #{tag}
                </PillTag>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
