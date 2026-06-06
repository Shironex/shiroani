import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import { AniListTokenPort, NoopAniListTokenPort } from './anilist-token.port';

/**
 * Global module that supplies the AniList OAuth token seam.
 *
 * Marked `@Global()` so the provider for `AniListTokenPort` is visible to
 * `AniListClient` (inside the static `AnimeModule`) without `AnimeModule`
 * having to import this module — this avoids turning `AnimeModule` into a
 * dynamic module, which would break `ScheduleModule`'s bare-class import of it.
 *
 * The Electron host supplies the concrete `useClass` at bootstrap via
 * `AppModule.forRoot({ anilistTokenProvider })`, mirroring how
 * NotificationsModule receives its host/store providers. When no provider is
 * passed, it falls back to {@link NoopAniListTokenPort} ("not connected") so
 * tests and unconfigured builds still boot.
 */
@Global()
@Module({})
export class AniListAuthModule {
  static forRoot(options?: { tokenProvider?: Provider }): DynamicModule {
    const tokenProvider: Provider = options?.tokenProvider ?? {
      provide: AniListTokenPort,
      useClass: NoopAniListTokenPort,
    };
    return {
      module: AniListAuthModule,
      providers: [tokenProvider],
      exports: [AniListTokenPort],
    };
  }
}
