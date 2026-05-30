import { Module } from '@nestjs/common';
import { AniListClient } from './anilist-client';
import { AnimeService } from './anime.service';
import { AnimeGateway } from './anime.gateway';

/**
 * Anime module. Stays a static module so other modules (e.g. ScheduleModule)
 * can import it for `AnimeService` without the dynamic-module dedup hazard.
 *
 * `AniListClient` injects `AniListTokenPort`, which is provided + exported by
 * the `@Global()` `AniListAuthModule` (wired in AppModule.forRoot). That global
 * provider is visible here without an explicit import.
 */
@Module({
  providers: [AniListClient, AnimeService, AnimeGateway],
  exports: [AnimeService],
})
export class AnimeModule {}
