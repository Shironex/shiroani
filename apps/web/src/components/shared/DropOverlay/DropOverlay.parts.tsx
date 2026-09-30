import { useTranslation } from 'react-i18next';
import { Ban, FileJson, FileQuestion, ImageIcon, Link2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DragPreview } from './classify-drop';
import type { IDropOverlayPanelProps } from './DropOverlay.types';

const PREVIEW_ICONS: Record<DragPreview, LucideIcon> = {
  link: Link2,
  json: FileJson,
  image: ImageIcon,
  unknown: FileQuestion,
  unsupported: Ban,
};

/** Full-window card announcing what dropping the current drag will do. */
export function DropOverlayPanel({ preview }: IDropOverlayPanelProps) {
  const { t } = useTranslation('common');
  const Icon = PREVIEW_ICONS[preview];
  const unsupported = preview === 'unsupported';

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="drop-overlay"
      data-preview={preview}
      className="no-drag fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-6"
    >
      <div
        className={cn(
          'flex max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-10 text-center shadow-lg',
          unsupported ? 'border-muted-foreground/40 bg-card' : 'border-primary/70 bg-card'
        )}
      >
        <Icon
          className={cn('size-10', unsupported ? 'text-muted-foreground' : 'text-primary')}
          aria-hidden
        />
        <p className="text-lg font-semibold text-foreground">
          {t(`drop.overlay.${preview}.title`)}
        </p>
        <p className="text-sm text-muted-foreground">{t(`drop.overlay.${preview}.hint`)}</p>
      </div>
    </div>
  );
}
