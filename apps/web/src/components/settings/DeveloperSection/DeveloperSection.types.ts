export type IDeveloperSectionProps = Record<string, never>;

export interface IDeveloperSectionView {
  readonly devModeEnabled: boolean;
  readonly setDevModeEnabled: (enabled: boolean) => void;
  readonly logsDialogOpen: boolean;
  readonly setLogsDialogOpen: (open: boolean) => void;
  readonly diagnosticsCopied: boolean;
  readonly handleCopyDiagnostics: () => Promise<void>;
}
