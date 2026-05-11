import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Book,
  Download,
  Info,
  Pencil,
  Settings as SettingsIcon,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useDiaryStore } from '@/stores/useDiaryStore';

export function DataSection() {
  const { t } = useTranslation('settings');
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const libraryCount = useLibraryStore(s => s.entries.length);
  const diaryCount = useDiaryStore(s => s.entries.length);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Download}
        title={t('data.export.card.title')}
        subtitle={t('data.export.card.subtitle')}
        tone="green"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <ExportScopeTile
            icon={Book}
            label={t('data.export.scope.library')}
            value={t('data.export.scope.titles', { count: libraryCount })}
          />
          <ExportScopeTile
            icon={Pencil}
            label={t('data.export.scope.diary')}
            value={t('data.export.scope.entries', { count: diaryCount })}
          />
          <ExportScopeTile
            icon={SettingsIcon}
            label={t('data.export.scope.settings')}
            value={t('data.export.scope.settingsValue')}
          />
        </div>
        <Button variant="default" size="sm" onClick={() => setExportOpen(true)} className="gap-2">
          <Download className="h-4 w-4" />
          {t('data.export.action')}
        </Button>
      </SettingsCard>

      <SettingsCard
        icon={Upload}
        title={t('data.import.card.title')}
        subtitle={t('data.import.card.subtitle')}
        tone="orange"
      >
        <div className="flex items-start gap-3 rounded-lg border border-border-glass bg-background/30 px-3 py-2.5 text-[11.5px] text-muted-foreground leading-relaxed">
          <Info className="w-4 h-4 text-muted-foreground/80 mt-0.5 shrink-0" />
          <p>
            <Trans
              i18nKey="data.import.warning"
              t={t}
              components={{ 1: <b className="font-semibold text-foreground" /> }}
            />
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border-glass gap-2"
          onClick={() => setImportOpen(true)}
        >
          <Upload className="w-4 h-4" />
          {t('data.import.action')}
        </Button>
      </SettingsCard>

      {/* Danger zone — destructive tone tints the whole card surface */}
      <SettingsCard
        icon={AlertTriangle}
        tone="destructive"
        title={t('data.danger.title')}
        subtitle={t('data.danger.subtitle')}
      >
        <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
          {t('data.danger.description')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled
        >
          {t('data.danger.action')}
        </Button>
      </SettingsCard>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="all" />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="all" />
    </div>
  );
}

interface ExportScopeTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function ExportScopeTile({ icon: Icon, label, value }: ExportScopeTileProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-glass bg-background/30 px-3 py-2.5">
      <span className="grid size-9 flex-shrink-0 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-foreground">{label}</div>
        <div className="truncate text-[11px] text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}
