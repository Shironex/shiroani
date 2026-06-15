import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from './ConfirmDialog.hooks';
import type { IConfirmDialogProps } from './ConfirmDialog.types';

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = 'destructive',
}: IConfirmDialogProps) {
  const { finalConfirm, finalCancel } = useConfirmDialog({ confirmLabel, cancelLabel });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{finalCancel}</AlertDialogCancel>
          <Button variant={variant} onClick={onConfirm}>
            {finalConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
