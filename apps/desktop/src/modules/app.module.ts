import { Module, type DynamicModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AnimeGateway } from './anime/anime.gateway';
import { AnimeService } from './anime/anime.service';
import { AnimeProfileService } from './anime/anime-profile.service';
import { AnimeSocialService } from './anime/anime-social.service';
import { AnimeRecommendationsService } from './anime/anime-recommendations.service';
import { AniListSyncGateway } from './anilist-sync/anilist-sync.gateway';
import { AniListSyncService } from './anilist-sync/anilist-sync.service';
import { ImportExportGateway } from './import-export/import-export.gateway';
import { ImportExportService } from './import-export/import-export.service';
import { MalSyncGateway } from './mal-sync/mal-sync.gateway';
import { MalSyncService } from './mal-sync/mal-sync.service';

/** The services the socket gateways call. Built by the composition root, never by Nest. */
export interface GatewayServices {
  anime: AnimeService;
  animeProfile: AnimeProfileService;
  animeSocial: AnimeSocialService;
  animeRecommendations: AnimeRecommendationsService;
  importExport: ImportExportService;
  aniListSync: AniListSyncService;
  malSync: MalSyncService;
}

/**
 * Hosts the socket gateways during the move to IPC. Nest only owns the gateways:
 * services arrive as `useValue` so there is one instance of each, and they must
 * not define Nest lifecycle hook names, because Nest calls those on `useValue`
 * providers too.
 */
@Module({})
export class AppModule {
  static forRoot(services: GatewayServices): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000, // 1 second window
            limit: 100, // max 100 requests per second (desktop app, single user)
          },
          {
            name: 'medium',
            ttl: 10000, // 10 second window
            limit: 500, // max 500 requests per 10 seconds
          },
        ]),
      ],
      providers: [
        { provide: AnimeService, useValue: services.anime },
        { provide: AnimeProfileService, useValue: services.animeProfile },
        { provide: AnimeSocialService, useValue: services.animeSocial },
        { provide: AnimeRecommendationsService, useValue: services.animeRecommendations },
        { provide: ImportExportService, useValue: services.importExport },
        { provide: AniListSyncService, useValue: services.aniListSync },
        { provide: MalSyncService, useValue: services.malSync },
        AnimeGateway,
        AniListSyncGateway,
        ImportExportGateway,
        MalSyncGateway,
      ],
    };
  }
}
