import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Pin } from 'lucide-react';
import type { DiaryEntry } from '@shiroani/shared';
import { DiaryEntryCard } from './DiaryEntryCard';
import { DIARY_GRADIENTS, MOOD_ICONS, formatDate } from '@/lib/diary-constants';

interface DiaryEntryGridProps {
  entries: DiaryEntry[];
  viewMode: 'grid' | 'list';
  onSelect: (entry: DiaryEntry) => void;
  onRemove: (entry: DiaryEntry) => void;
  onTogglePin: (entry: DiaryEntry) => void;
}

export function DiaryEntryGrid({
  entries,
  viewMode,
  onSelect,
  onRemove,
  onTogglePin,
}: DiaryEntryGridProps) {
  const { t } = useTranslation('diary');
  if (viewMode === 'grid') {
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

  // List view
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
              'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer',
              'hover:bg-accent/40 transition-all duration-150',
              'border border-transparent hover:border-border-glass',
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
                <h3 className="text-sm font-medium truncate group-hover/list-item:text-primary transition-colors">
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
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full text-2xs bg-primary/10 text-primary/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
