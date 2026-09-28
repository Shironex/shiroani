import type { DragPreview } from './classify-drop';

export interface IDropOverlayPanelProps {
  /** What the overlay announces for the drag in progress. */
  preview: DragPreview;
}

export interface IDropOverlayView {
  /** Non-null while an external drag is over the window. */
  readonly preview: DragPreview | null;
  /** Raw text of a dropped `.json` file waiting in the Import dialog. */
  readonly importContent: string | null;
  /** Dropped image waiting for the user to choose what it becomes. */
  readonly imageFile: File | null;
  /** Whether the image choice offers the mascot (same platform gate as Settings). */
  readonly showMascotOption: boolean;
  readonly handleImportOpenChange: (open: boolean) => void;
  readonly closeImageDialog: () => void;
}
