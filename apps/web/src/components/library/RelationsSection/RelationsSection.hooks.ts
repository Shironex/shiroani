import { useEffect, useMemo } from 'react';
import { useAnimeDetailStore } from '@/stores/useAnimeDetailStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { AnimeDetailRelation, AnimeEntry } from '@shiroani/shared';
import type { IRelationsSectionProps, IRelationsSectionView } from './RelationsSection.types';

const { ensureDetails } = useAnimeDetailStore.getState();
const { openDetail } = useLibraryStore.getState();

export function useRelationsSection({ anilistId }: IRelationsSectionProps): IRelationsSectionView {
  // Per-id granular subscriptions keep this isolated from unrelated cache writes.
  const detail = useAnimeDetailStore(s => s.details.get(anilistId));
  const isLoading = useAnimeDetailStore(s => s.inFlight.has(anilistId));
  const failed = useAnimeDetailStore(s => s.failed.has(anilistId));
  // Map AniList media id -> library entry id, so we know which relations are openable.
  const libraryByAnilistId = useLibraryStore(s => s.entries);

  useEffect(() => {
    ensureDetails([anilistId]);
  }, [anilistId]);

  const relations = useMemo<AnimeDetailRelation[]>(() => detail?.relations?.edges ?? [], [detail]);

  const entryByAnilistId = useMemo(() => {
    const map = new Map<number, AnimeEntry>();
    for (const e of libraryByAnilistId) {
      if (e.anilistId) map.set(e.anilistId, e);
    }
    return map;
  }, [libraryByAnilistId]);

  return {
    detail,
    isLoading,
    failed,
    relations,
    entryByAnilistId,
    openLibraryEntry: openDetail,
  };
}
