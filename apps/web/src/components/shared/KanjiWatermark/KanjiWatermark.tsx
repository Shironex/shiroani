import { cn } from '@/lib/utils';
import { useKanjiWatermark } from './KanjiWatermark.hooks';
import type { IKanjiWatermarkProps, KanjiWatermarkPosition } from './KanjiWatermark.types';

const POSITION_CLASSES: Record<KanjiWatermarkPosition, string> = {
  br: 'right-[-24px] bottom-[-36px]',
  tr: 'right-[-24px] top-[-36px]',
  bl: 'left-[-24px] bottom-[-36px]',
  tl: 'left-[-24px] top-[-36px]',
};

export default function KanjiWatermark({
  kanji,
  position = 'br',
  size = 220,
  opacity = 0.06,
  className,
  style,
  ...props
}: IKanjiWatermarkProps) {
  useKanjiWatermark();

  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute select-none font-serif font-extrabold leading-none tracking-[-0.05em] text-foreground',
        POSITION_CLASSES[position],
        className
      )}
      style={{ fontSize: `${size}px`, opacity, ...style }}
      {...props}
    >
      {kanji}
    </span>
  );
}
