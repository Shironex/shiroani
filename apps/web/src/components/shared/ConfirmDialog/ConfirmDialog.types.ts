export interface IConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: 'destructive' | 'default';
}

export interface IConfirmDialogView {
  readonly finalConfirm: string;
  readonly finalCancel: string;
}
