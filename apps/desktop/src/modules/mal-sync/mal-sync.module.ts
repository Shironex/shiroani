import { Module } from '@nestjs/common';
import { MalClient } from '../anime/mal-client';
import { AniListClient } from '../anime/anilist-client';
import { LibraryModule } from '../library';
import { MalSyncService } from './mal-sync.service';
import { MalSyncGateway } from './mal-sync.gateway';

/**
 * Two-way MyAnimeList sync. The MAL twin of {@link AniListSyncModule}: provides
 * its own {@link MalClient} instance (which injects the `@Global()`
 * {@link MalTokenPort}, so authenticated calls work with no extra wiring) and
 * imports {@link LibraryModule} for `LibraryService`.
 *
 * Also provides an {@link AniListClient} (which injects the `@Global()`
 * AniListTokenPort) used ONLY for the idMal link pre-pass — linking `mal_id` on
 * AniList rows from AniList's exact `idMal` before the import loop, so MAL sync
 * is order-independent (a MAL-first sync no longer duplicates AniList anime).
 *
 * Kept as a dedicated module to mirror the AniList sync module's separation of a
 * long-running, gateway-driven data op — and so the MAL sync's single-flight
 * guard lives in its own service instance, independent of AniList's.
 */
@Module({
  imports: [LibraryModule],
  providers: [MalClient, AniListClient, MalSyncService, MalSyncGateway],
  exports: [MalSyncService],
})
export class MalSyncModule {}
