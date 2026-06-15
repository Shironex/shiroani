import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { getActivePane } from '@/stores/useBrowserStore';
import { getStatusOptions } from '@/lib/constants';
import { useAnimeDetailForm } from '@/hooks/useAnimeDetailForm';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { IAnimeDetailModalProps, IAnimeDetailModalView } from './AnimeDetailModal.types';

const { updateEntry, removeFromLibrary } = useLibraryStore.getState();

export function useAnimeDetailModal({
  entry,
  onOpenChange,
}: IAnimeDetailModalProps): IAnimeDetailModalView {
  const { t, i18n } = useTranslation(['library', 'status']);
  const statusOptions = useMemo(() => getStatusOptions(), [i18n.language]);
  const navigateToBrowser = useNavigateToBrowser();

  const {
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    score,
    setScore,
    notes,
    setNotes,
    resumeUrl,
    setResumeUrl,
    anilistId,
    setAnilistId,
  } = useAnimeDetailForm(entry);

  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = useCallback(() => {
    if (!entry) return;
    const parsedAnilistId = anilistId.trim() ? parseInt(anilistId.trim(), 10) : null;
    updateEntry({
      id: entry.id,
      anilistId: parsedAnilistId && !isNaN(parsedAnilistId) ? parsedAnilistId : null,
      status,
      currentEpisode,
      // Send score directly (incl. 0) so clearing a rating persists — buildUpdate
      // skips `undefined`, which would otherwise leave the old score in the DB.
      score,
      notes: notes.trim() || undefined,
      resumeUrl: resumeUrl.trim() || undefined,
    });
    onOpenChange(false);
  }, [entry, status, currentEpisode, score, notes, resumeUrl, anilistId, onOpenChange]);

  const handleRemove = useCallback(() => {
    if (!entry) return;
    removeFromLibrary(entry.id);
    onOpenChange(false);
  }, [entry, onOpenChange]);

  const handleOpenInBrowser = useCallback(() => {
    if (entry?.resumeUrl) {
      navigateToBrowser(entry.resumeUrl);
    } else {
      navigateToBrowser();
    }
    onOpenChange(false);
  }, [entry, navigateToBrowser, onOpenChange]);

  // Reference links (AniList / MAL) open in the in-app browser and close the
  // modal, matching handleOpenInBrowser and the schedule view's onNavigate.
  const handleNavigate = useCallback(
    (url: string) => {
      navigateToBrowser(url);
      onOpenChange(false);
    },
    [navigateToBrowser, onOpenChange]
  );

  const handleUpdateUrl = useCallback(() => {
    if (!entry) return;

    const activePane = getActivePane();

    if (!activePane?.url) {
      toast.error(t('library:toast.noBrowserTab'));
      return;
    }

    setResumeUrl(activePane.url);
    toast.success(t('library:toast.linkUpdated'), {
      description: activePane.url,
    });
  }, [entry, setResumeUrl, t]);

  return {
    statusOptions,
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    score,
    setScore,
    notes,
    setNotes,
    resumeUrl,
    setResumeUrl,
    anilistId,
    setAnilistId,
    showConfirm,
    setShowConfirm,
    handleSave,
    handleRemove,
    handleOpenInBrowser,
    handleNavigate,
    handleUpdateUrl,
  };
}
