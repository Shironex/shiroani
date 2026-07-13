import { cn } from '@/lib/utils';

interface ChibiPreviewItemProps {
  previewSize: number;
  realSize: number;
  label: string;
  spriteUrl: string;
  objectFit: 'contain' | 'cover' | 'fill';
  highlighted?: boolean;
}

export function ChibiPreviewItem({
  previewSize,
  realSize,
  label,
  spriteUrl,
  objectFit,
  highlighted = false,
}: ChibiPreviewItemProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* The box and image animate size on slider tick. Kept as an explicit
          width/height transition (not a transform scale) because each of the
          three anchors reserves its own layout footprint in the flex row and
          scaling from a shared fixed box would misalign the min/current/max
          silhouettes — the size change here is genuinely a layout change. */}
      <div
        className={cn(
          'grid place-items-center overflow-hidden rounded-lg transition-[width,height] duration-150 ease-out',
          highlighted ? 'border-2 border-dashed border-primary/50 p-1.5' : ''
        )}
        style={{
          width: previewSize + (highlighted ? 16 : 0),
          height: previewSize + (highlighted ? 16 : 0),
        }}
      >
        <img
          src={spriteUrl}
          alt=""
          draggable={false}
          className="transition-[width,height] duration-150 ease-out"
          style={{ width: previewSize, height: previewSize, objectFit }}
        />
      </div>
      <div
        className={cn(
          'font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] tabular-nums',
          highlighted ? 'text-primary' : 'text-muted-foreground/80'
        )}
      >
        {realSize}px · {label}
      </div>
    </div>
  );
}
