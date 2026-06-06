import { Module } from '@nestjs/common';
import { AniListClient } from './anilist-client';
import { MalClient } from './mal-client';
import { AnimeService } from './anime.service';
import { AnimeGateway } from './anime.gateway';

/**
 * Anime module. Stays a static module so other modules (e.g. ScheduleModule)
 * can import it for `AnimeService` without the dynamic-module dedup hazard.
 *
 * `AniListClient` injects `AniListTokenPort` and `MalClient` injects
 * `MalTokenPort`, both provided + exported by their `@Global()` auth modules
 * (`AniListAuthModule` / `MalAuthModule`, wired in AppModule.forRoot). Those
 * global providers are visible here without an explicit import.
 */
@Module({
  providers: [AniListClient, MalClient, AnimeService, AnimeGateway],
  exports: [AnimeService],
})
export class AnimeModule {}
