import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal, SquareCode, ClipboardCopy, ScrollText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsCard, SettingsToggleRow } from '@/components/settings/SettingsCard';
import { DevLogsDialog } from '@/components/settings/DevLogsDialog';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { copyDiagnosticsToClipboard } from '@/lib/diagnostics';

export function DeveloperSection() {
  const { t } = useTranslation('settings');
  const devModeEnabled = useSettingsStore(s => s.devModeEnabled);
  const setDevModeEnabled = useSettingsStore(s => s.setDevModeEnabled);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);

  const handleCopyDiagnostics = async () => {
    const ok = await copyDiagnosticsToClipboard();
    if (!ok) return;
    setDiagnosticsCopied(true);
    setTimeout(() => setDiagnosticsCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Terminal}
        title={t('developer.card.title')}
        subtitle={t('developer.card.subtitle')}
        tone="muted"
      >
        <SettingsToggleRow
          id="dev-mode-label"
          title={t('developer.toggleTitle')}
          description={t('developer.toggleDescription')}
          checked={devModeEnabled}
          onCheckedChange={setDevModeEnabled}
        />

        {devModeEnabled && (
          <div className="grid gap-2 sm:grid-cols-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void window.electronAPI?.window?.openDevTools?.()}
              className="justify-start gap-2 text-[12px]"
            >
              <SquareCode className="w-3.5 h-3.5" />
              {t('developer.devtools')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDiagnostics}
              className="justify-start gap-2 text-[12px]"
            >
              {diagnosticsCopied ? (
                <Check className="w-3.5 h-3.5 text-primary" />
              ) : (
                <ClipboardCopy className="w-3.5 h-3.5" />
              )}
              {diagnosticsCopied
                ? t('developer.diagnosticsCopied')
                : t('developer.copyDiagnostics')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsDialogOpen(true)}
              className="justify-start gap-2 text-[12px]"
            >
              <ScrollText className="w-3.5 h-3.5" />
              {t('developer.showLogs')}
            </Button>
          </div>
        )}
      </SettingsCard>

      <DevLogsDialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen} />
    </div>
  );
}
