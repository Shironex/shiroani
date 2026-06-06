import { Module } from '@nestjs/common';
import { AniListClient } from '../anime/anilist-client';
import { LibraryModule } from '../library';
import { AniListSyncService } from './anilist-sync.service';
import { AniListSyncGateway } from './anilist-sync.gateway';

/**
 * Two-way AniList sync. Provides its own {@link AniListClient} instance (which
 * injects the `@Global()` `AniListTokenPort`, so authenticated calls work with
 * no extra wiring) and imports {@link LibraryModule} for `LibraryService`.
 *
 * Kept as a dedicated module (rather than folded into AnimeModule) to mirror the
 * import-export module's separation of a long-running, gateway-driven data op.
 */
@Module({
  imports: [LibraryModule],
  providers: [AniListClient, AniListSyncService, AniListSyncGateway],
  exports: [AniListSyncService],
})
export class AniListSyncModule {}
