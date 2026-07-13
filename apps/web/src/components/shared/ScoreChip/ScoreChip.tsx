import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScoreChip } from './ScoreChip.hooks';
import type { IScoreChipProps } from './ScoreChip.types';

/**
 * A gold star + tabular score value, used for average/user scores across
 * Discover, Library, and Schedule. Uses the shared `--gold` accent token so it
 * tracks the theme. Pass `scrim` for the over-image variant (adds a dark scrim
 * so the chip stays legible on covers).
 */
export default function ScoreChip({ value, scrim, className, ...props }: IScoreChipProps) {
  useScoreChip();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[3px] rounded-[3px] px-[6px] py-[3px] font-mono text-[10px] font-bold leading-none text-(--gold)',
        scrim && 'bg-black/70',
        className
      )}
      {...props}
    >
      <Star className="w-3 h-3 fill-current" strokeWidth={0} />
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
