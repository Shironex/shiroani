import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AnimeStatus } from '@shiroani/shared';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { getWebview } from '@/components/browser/webviewRefs';
import { getStatusOptions } from '@/lib/constants';
import { isAlreadyInLibrary } from '@/lib/anime-utils';
import { SCRAPE_METADATA_SCRIPT } from '@/lib/scrape-metadata';
import { useDialogStateMachine } from '@/hooks/useDialogStateMachine';
import type { AddToLibraryStep, IAddToLibraryDialogView } from './AddToLibraryDialog.types';

export function useAddToLibraryDialog(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  url: string,
  title: string
): IAddToLibraryDialogView {
  const { t, i18n } = useTranslation('browser');
  const statusOptions = useMemo(() => getStatusOptions(), [i18n.language]);
  const addToLibrary = useLibraryStore(s => s.addToLibrary);

  const [editableTitle, setEditableTitle] = useState('');
  const [status, setStatus] = useState<AnimeStatus>('plan_to_watch');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [coverImage, setCoverImage] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { state, transition } = useDialogStateMachine<AddToLibraryStep>({ step: 'ready' });

  const isFetchingCover = state.step === 'fetching';
  const isCompleted = status === 'completed' && totalEpisodes > 0;

  // Reset form and auto-fetch cover when dialog opens
  useEffect(() => {
    let cancelled = false;
    if (open) {
      setEditableTitle(title || '');
      setStatus('plan_to_watch');
      setCurrentEpisode(0);
      setTotalEpisodes(0);
      setCoverImage('');
      transition({ step: 'ready' });

      // Auto-fetch metadata (cover, title, episodes) from the focused pane
      const activePaneId = useBrowserStore.getState().activePaneId;
      if (activePaneId) {
        const webview = getWebview(activePaneId);
        if (webview) {
          transition({ step: 'fetching' });
          webview
            .executeJavaScript(SCRAPE_METADATA_SCRIPT)
            .then(result => {
              if (cancelled) return;
              const meta = result as {
                coverImage?: string;
                title?: string;
                episodes?: number;
              } | null;
              if (meta) {
                if (meta.coverImage) setCoverImage(meta.coverImage);
                if (meta.title) setEditableTitle(meta.title);
                if (meta.episodes && meta.episodes > 0) setTotalEpisodes(meta.episodes);
              }
            })
            .catch(() => {
              // Non-critical — user can fill in manually
            })
            .finally(() => {
              if (!cancelled) transition({ step: 'ready' });
            });
        }
      }
    }
    return () => {
      cancelled = true;
    };
  }, [open, title, transition]);

  // Auto-set current episode to total when status is completed
  useEffect(() => {
    if (status === 'completed' && totalEpisodes > 0) {
      setCurrentEpisode(totalEpisodes);
    }
  }, [status, totalEpisodes]);

  const handleAdd = useCallback(async () => {
    if (isAdding) return;
    if (!editableTitle.trim()) {
      toast.error(t('addDialog.toast.titleEmpty'));
      return;
    }

    const entries = useLibraryStore.getState().entries;
    if (isAlreadyInLibrary(entries, { title: editableTitle.trim(), url: url || undefined })) {
      toast.error(t('addDialog.toast.duplicate'));
      return;
    }

    // Gate the success toast + close on the real persist result — a fire-and-
    // forget emit could reject and previously still showed "added".
    setIsAdding(true);
    try {
      const ok = await addToLibrary({
        title: editableTitle.trim(),
        status,
        currentEpisode: currentEpisode > 0 ? currentEpisode : undefined,
        episodes: totalEpisodes > 0 ? totalEpisodes : undefined,
        coverImage: coverImage.trim() || undefined,
        resumeUrl: url || undefined,
      });

      if (ok) {
        toast.success(t('addDialog.toast.added'), { description: editableTitle.trim() });
        onOpenChange(false);
      } else {
        toast.error(t('addDialog.toast.failed'));
      }
    } finally {
      setIsAdding(false);
    }
  }, [
    isAdding,
    editableTitle,
    status,
    currentEpisode,
    totalEpisodes,
    coverImage,
    url,
    addToLibrary,
    onOpenChange,
    t,
  ]);

  return {
    statusOptions,
    editableTitle,
    setEditableTitle,
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    totalEpisodes,
    setTotalEpisodes,
    coverImage,
    setCoverImage,
    isAdding,
    isFetchingCover,
    isCompleted,
    handleAdd,
  };
}
