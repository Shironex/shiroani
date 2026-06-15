import { useTranslation } from 'react-i18next';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { ThemeSwatch } from '@/components/shared/theme/ThemeSwatch';
import type { Theme } from '@shiroani/shared';

export function CustomThemeSwatchWrapper({
  option,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
  onEdit,
  onDelete,
  onExport,
}: {
  option: { value: Theme; label: string; color: string };
  isActive: boolean;
  onSelect: (theme: Theme) => void;
  onPreview: (theme: Theme) => void;
  onPreviewEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <div className="group relative">
      <ThemeSwatch
        option={{
          value: option.value,
          label: option.label,
          color: option.color,
          testId: `${option.value}-mode-button`,
          isDark: true,
          isCustom: true,
        }}
        isActive={isActive}
        onSelect={onSelect}
        onPreview={onPreview}
        onPreviewEnd={onPreviewEnd}
      />
      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border-glass bg-background/85 backdrop-blur-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.editAria')}
        >
          <Pencil className="h-3 w-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onExport();
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border-glass bg-background/85 backdrop-blur-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.exportAria')}
        >
          <Download className="h-3 w-3 text-foreground" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded border border-border-glass bg-background/85 backdrop-blur-sm transition-colors hover:bg-destructive/20 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('themes.custom.deleteAria')}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      </div>
    </div>
  );
}
