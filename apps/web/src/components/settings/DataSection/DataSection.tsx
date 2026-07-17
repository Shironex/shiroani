import { useTranslation, Trans } from 'react-i18next';
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
import { SettingsCard, SettingsInfoCallout } from '@/components/settings/SettingsCard';
import { DeleteAllDataDialog } from '@/components/settings/DeleteAllDataDialog';
import { ExportDialog } from '@/components/shared/ExportDialog';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { useDataSection } from './DataSection.hooks';
import { ExportScopeTile } from './DataSection.parts';

export default function DataSection() {
  const { t } = useTranslation('settings');
  const {
    exportOpen,
    setExportOpen,
    importOpen,
    setImportOpen,
    deleteOpen,
    setDeleteOpen,
    libraryCount,
    diaryCount,
  } = useDataSection();

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
        <SettingsInfoCallout
          icon={Info}
          iconClassName="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80"
        >
          <Trans
            i18nKey="data.import.warning"
            t={t}
            components={{ 1: <b className="font-semibold text-foreground" /> }}
          />
        </SettingsInfoCallout>
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
          onClick={() => setDeleteOpen(true)}
        >
          {t('data.danger.action')}
        </Button>
      </SettingsCard>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="all" />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="all" />
      <DeleteAllDataDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onExportFirst={() => {
          setDeleteOpen(false);
          setExportOpen(true);
        }}
      />
    </div>
  );
}
