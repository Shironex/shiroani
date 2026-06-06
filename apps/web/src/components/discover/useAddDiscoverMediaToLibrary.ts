import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AnimeEvents,
  createLogger,
  type SaveMediaListEntryRequest,
  type SaveMediaListEntryResult,
} from '@shiroani/shared';
import { isAlreadyInLibrary } from '@/lib/anime-utils';
import { emitWithErrorHandling } from '@/lib/socket';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { getTitle } from '@/components/discover/random/random-utils';

const logger = createLogger('AddDiscoverMedia');

/**
 * Shared add-to-library flow for AniList-sourced Discover media. Folds in the
 * dedupe check (AniList id + title), the `DiscoverMedia` → library payload
 * mapping, and the success/error toasts so the Discover grid and the Random
 * showcase stay in lockstep. Returns one `(media) => Promise<void>`.
 *
 * Write-through add (item C3): when AniList is connected, a successful local
 * add ALSO pushes the title to the viewer's AniList list as PLANNING via
 * {@link AnimeEvents.SAVE_MEDIA_LIST_ENTRY}. This is best-effort — local stays
 * the source of truth, so a remote-write failure never rolls back the local
 * entry; we just surface a softer toast. Disconnected falls back to local-only.
 */
export function useAddDiscoverMediaToLibrary(): (media: DiscoverMedia) => Promise<void> {
  const { t } = useTranslation('discover');

  return useCallback(
    async (media: DiscoverMedia) => {
      const title = getTitle(media.title);
      const entries = useLibraryStore.getState().entries;
      if (isAlreadyInLibrary(entries, { anilistId: media.id, title })) {
        toast.error(t('toast.alreadyInLibrary'));
        return;
      }

      // Gate the success toast on the real persist result.
      const ok = await useLibraryStore.getState().addToLibrary({
        anilistId: media.id,
        title,
        titleRomaji: media.title.romaji,
        titleNative: media.title.native,
        coverImage:
          media.coverImage.large || media.coverImage.extraLarge || media.coverImage.medium,
        episodes: media.episodes,
        status: 'plan_to_watch',
      });

      if (!ok) {
        toast.error(t('toast.addFailed'));
        return;
      }

      // Best-effort write-through to the connected viewer's AniList list. Send
      // ONLY mediaId + status (default PLANNING) — omitting score/progress/notes
      // leaves the remote values untouched (a literal score:0 would unrate it).
      if (useAniListAuthStore.getState().status.connected) {
        try {
          await emitWithErrorHandling<SaveMediaListEntryRequest, SaveMediaListEntryResult>(
            AnimeEvents.SAVE_MEDIA_LIST_ENTRY,
            { mediaId: media.id, status: 'PLANNING' }
          );
          toast.success(t('toast.addedToLibraryAndAniList'), { description: title });
        } catch (err) {
          // Local add already succeeded — keep it; just note the sync miss.
          logger.error('AniList write-through failed:', (err as Error).message);
          toast.warning(t('toast.addedLocalOnly'), { description: title });
        }
        return;
      }

      toast.success(t('toast.addedToLibrary'), { description: title });
    },
    [t]
  );
}
