export type ImageDropTarget = 'background' | 'mascot';

export interface IImageDropDialogProps {
  /** The dropped image; the dialog is open while this is non-null. */
  file: File | null;
  /** Called when the dialog should close (cancelled, or the image was applied). */
  onClose: () => void;
  /** Offer "Set as mascot sprite" (only where the mascot exists). */
  showMascotOption: boolean;
}

export interface IImageDropDialogView {
  /** Object URL for the preview thumbnail, revoked when the file changes. */
  readonly previewUrl: string | null;
  /** The target being applied right now, or null when idle. */
  readonly busy: ImageDropTarget | null;
  readonly chooseBackground: () => void;
  readonly chooseMascot: () => void;
  readonly handleOpenChange: (open: boolean) => void;
}
