import type { UserProfile } from '@shiroani/shared';

type CopyState = 'idle' | 'copying' | 'done';
type SaveState = 'idle' | 'saving' | 'done';

export interface IProfileShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
}

export interface IProfileShareDialogView {
  readonly previewUrl: string | null;
  readonly isRendering: boolean;
  readonly copyState: CopyState;
  readonly saveState: SaveState;
  readonly error: string | null;
  readonly handleCopyToClipboard: () => Promise<void>;
  readonly handleSaveAsPng: () => Promise<void>;
}
