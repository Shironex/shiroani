import { cn } from '@/lib/utils';
import { useDiaryTimeline } from './DiaryTimeline.hooks';
import { TimelineGroups } from './DiaryTimeline.parts';
import type { IDiaryTimelineProps } from './DiaryTimeline.types';

/**
 * List view for diary entries — the redesign's default Diary surface.
 *
 * Layout matches `Diary.html`'s "Lista" mode: entries grouped under day
 * headers ("Dziś · 19.04 · piątek"), each entry rendered as a wide row card
 * with a small timeline dot on the left, a cover thumbnail inside the card,
 * meta row (episode + time + mood), excerpt, and a tag cloud.
 */
export default function DiaryTimeline({
  entries,
  onSelect,
  onRemove,
  onTogglePin,
  className,
}: IDiaryTimelineProps) {
  const { groups } = useDiaryTimeline(entries);

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <TimelineGroups
        groups={groups}
        onSelect={onSelect}
        onRemove={onRemove}
        onTogglePin={onTogglePin}
      />
    </div>
  );
}
