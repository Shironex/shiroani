import { Global, Module, type DynamicModule, type Provider } from '@nestjs/common';
import { MalTokenPort, NoopMalTokenPort } from './mal-token.port';

/**
 * Global module that supplies the MAL OAuth token seam.
 *
 * Marked `@Global()` so the provider for `MalTokenPort` is visible to a future
 * MAL client (inside the static `AnimeModule`) without `AnimeModule` having to
 * import this module — this avoids turning `AnimeModule` into a dynamic module,
 * which would break `ScheduleModule`'s bare-class import of it. Mirrors
 * {@link AniListAuthModule}.
 *
 * The Electron host supplies the concrete `useClass` at bootstrap via
 * `AppModule.forRoot({ malTokenProvider })`. When no provider is passed, it
 * falls back to {@link NoopMalTokenPort} ("not connected") so tests and
 * unconfigured builds still boot.
 */
@Global()
@Module({})
export class MalAuthModule {
  static forRoot(options?: { tokenProvider?: Provider }): DynamicModule {
    const tokenProvider: Provider = options?.tokenProvider ?? {
      provide: MalTokenPort,
      useClass: NoopMalTokenPort,
    };
    return {
      module: MalAuthModule,
      providers: [tokenProvider],
      exports: [MalTokenPort],
    };
  }
}
