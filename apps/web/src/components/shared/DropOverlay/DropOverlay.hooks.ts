import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { createLogger } from '@shiroani/shared';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import { IS_WINDOWS } from '@/lib/platform';
import {
  classifyDrop,
  previewDrag,
  MAX_IMPORT_JSON_BYTES,
  type DragPreview,
  type DropClassification,
} from './classify-drop';
import type { IDropOverlayView } from './DropOverlay.types';

const logger = createLogger('DropOverlay');

/**
 * Class set on `document.body` while the overlay is up. The overlay's own
 * style rule uses it to stop `<webview>` guests from swallowing the drag.
 */
export const DROP_ACTIVE_BODY_CLASS = 'shiroani-drop-active';

/**
 * Hide the overlay when no drag event arrived for this long. Browsers repeat
 * `dragover` every few hundred ms while a drag hovers, so this only fires when
 * a drag ended without a `dragleave` or `drop` reaching the window.
 */
const DRAG_IDLE_TIMEOUT_MS = 1000;

type WithDataTransfer = DragEvent & { dataTransfer: DataTransfer };

export function useDropOverlay(): IDropOverlayView {
  const { t } = useTranslation('common');
  const navigateToBrowser = useNavigateToBrowser();
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [importContent, setImportContent] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const dialogOpen = importContent !== null || imageFile !== null;

  const handleDrop = useCallback(
    async (drop: DropClassification<File>) => {
      switch (drop.kind) {
        case 'link':
          navigateToBrowser(drop.url);
          return;
        case 'json': {
          // Checked before reading so an oversized file never lands in memory.
          if (drop.file.size > MAX_IMPORT_JSON_BYTES) {
            toast.error(t('drop.import.tooLarge', { maxMb: MAX_IMPORT_JSON_BYTES / 1024 / 1024 }));
            return;
          }
          try {
            setImportContent(await drop.file.text());
          } catch (err) {
            logger.warn('Failed to read dropped JSON file:', err);
            toast.error(t('drop.import.readFailed'));
          }
          return;
        }
        case 'image':
          setImageFile(drop.file);
          return;
        case 'unsupported':
          toast(t('drop.unsupported.title'), {
            description: t(
              drop.reason === 'multiple' ? 'drop.unsupported.multiple' : 'drop.unsupported.hint'
            ),
          });
      }
    },
    [navigateToBrowser, t]
  );

  // The window listeners are bound once; they read the latest values here.
  const latest = useRef({ dialogOpen, handleDrop });
  useEffect(() => {
    latest.current = { dialogOpen, handleDrop };
  });

  useEffect(() => {
    let depth = 0;
    let internalDrag = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const hide = () => {
      depth = 0;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
      setPreview(null);
    };
    const armIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(hide, DRAG_IDLE_TIMEOUT_MS);
    };

    // Drags that start inside the app (selected text, an <img>) keep their
    // default behaviour; only drags from outside the window are handled.
    const isExternal = (e: DragEvent): e is WithDataTransfer =>
      !internalDrag && e.dataTransfer !== null;

    const onDragStart = () => {
      internalDrag = true;
    };
    const onDragEnd = () => {
      internalDrag = false;
    };

    const onDragEnter = (e: DragEvent) => {
      if (!isExternal(e)) return;
      e.preventDefault();
      if (latest.current.dialogOpen) return;
      depth += 1;
      setPreview(previewDrag(e.dataTransfer));
      armIdleTimer();
    };

    const onDragOver = (e: DragEvent) => {
      if (!isExternal(e)) return;
      // Always cancel dragover: an uncancelled drop makes Chromium navigate the
      // app window to the dropped file or link.
      e.preventDefault();
      if (latest.current.dialogOpen) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      e.dataTransfer.dropEffect = 'copy';
      if (depth === 0) {
        depth = 1;
        setPreview(previewDrag(e.dataTransfer));
      }
      armIdleTimer();
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isExternal(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) hide();
    };

    const onDrop = (e: DragEvent) => {
      if (!isExternal(e)) return;
      e.preventDefault();
      hide();
      if (latest.current.dialogOpen) return;
      // Classify synchronously: the DataTransfer is emptied once the event ends.
      void latest.current.handleDrop(classifyDrop(e.dataTransfer));
    };

    window.addEventListener('dragstart', onDragStart);
    window.addEventListener('dragend', onDragEnd);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('dragend', onDragEnd);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // While the overlay is up, webviews must not take the drag (see the style
  // rule rendered by DropOverlay).
  const active = preview !== null;
  useEffect(() => {
    if (!active) return;
    document.body.classList.add(DROP_ACTIVE_BODY_CLASS);
    return () => document.body.classList.remove(DROP_ACTIVE_BODY_CLASS);
  }, [active]);

  const handleImportOpenChange = useCallback((open: boolean) => {
    if (!open) setImportContent(null);
  }, []);
  const closeImageDialog = useCallback(() => setImageFile(null), []);

  return {
    preview,
    importContent,
    imageFile,
    showMascotOption: IS_WINDOWS,
    handleImportOpenChange,
    closeImageDialog,
  };
}
