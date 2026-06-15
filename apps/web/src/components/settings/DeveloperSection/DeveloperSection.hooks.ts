import { useState } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { copyDiagnosticsToClipboard } from '@/lib/diagnostics';
import type { IDeveloperSectionProps, IDeveloperSectionView } from './DeveloperSection.types';

export function useDeveloperSection(_props?: IDeveloperSectionProps): IDeveloperSectionView {
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

  return {
    devModeEnabled,
    setDevModeEnabled,
    logsDialogOpen,
    setLogsDialogOpen,
    diagnosticsCopied,
    handleCopyDiagnostics,
  };
}
