import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { isAlreadyInLibrary } from '@/lib/anime-utils';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { getTitle } from '@/components/discover/random/random-utils';

/**
 * Shared add-to-library flow for AniList-sourced Discover media. Folds in the
 * dedupe check (AniList id + title), the `DiscoverMedia` → library payload
 * mapping, and the success/error toasts so the Discover grid and the Random
 * showcase stay in lockstep. Returns one `(media) => void`.
 */
export function useAddDiscoverMediaToLibrary(): (media: DiscoverMedia) => void {
  const { t } = useTranslation('discover');

  return useCallback(
    (media: DiscoverMedia) => {
      const title = getTitle(media.title);
      const entries = useLibraryStore.getState().entries;
      if (isAlreadyInLibrary(entries, { anilistId: media.id, title })) {
        toast.error(t('toast.alreadyInLibrary'));
        return;
      }

      try {
        useLibraryStore.getState().addToLibrary({
          anilistId: media.id,
          title,
          titleRomaji: media.title.romaji,
          titleNative: media.title.native,
          coverImage:
            media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium,
          episodes: media.episodes,
          status: 'plan_to_watch',
        });
        toast.success(t('toast.addedToLibrary'), { description: title });
      } catch {
        toast.error(t('toast.addFailed'));
      }
    },
    [t]
  );
}
