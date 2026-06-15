import { useState } from 'react';
import type { FullSyncPushMode } from '@shiroani/shared';
import type { IPushLibraryButtonView } from './SyncDirectionControls.types';

/**
 * Owns the push dialog's open/close and the chosen push semantics. The default
 * (non-destructive) option is re-asserted by the shell every time the dialog is
 * opened. `SyncModeSelector` has no React state — it only needs `useTranslation`
 * (kept in the shell), so it has no factory here.
 */
export function usePushLibraryButton(): IPushLibraryButtonView {
  const [open, setOpen] = useState(false);
  // Default to the non-destructive option every time the dialog opens.
  const [pushMode, setPushMode] = useState<FullSyncPushMode>('create-missing');

  return { open, setOpen, pushMode, setPushMode };
}
