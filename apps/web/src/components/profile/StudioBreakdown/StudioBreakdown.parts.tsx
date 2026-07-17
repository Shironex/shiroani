import { PillTag } from '@/components/ui/pill-tag';
import { formatCount } from '../profile-constants';
import type { IStudioBreakdownView } from './StudioBreakdown.types';

/** Ranked studio rows — each pairs a studio name with a count pill. */
export function StudioRows({ top, locale }: IStudioBreakdownView & { locale: string }) {
  return (
    <div className="flex flex-col gap-1">
      {top.map((s, i) => (
        <div
          key={s.name}
          className="flex justify-between items-center text-xs py-1.5 border-b border-border-glass/60 last:border-b-0"
        >
          <span className="text-foreground/90 truncate pr-2" title={s.name}>
            {s.name}
          </span>
          <PillTag
            variant={i === 0 ? 'accent' : 'muted'}
            className="text-2xs px-1.5 py-0.5 shrink-0 tabular-nums"
          >
            {formatCount(s.count, locale)}
          </PillTag>
        </div>
      ))}
    </div>
  );
}
