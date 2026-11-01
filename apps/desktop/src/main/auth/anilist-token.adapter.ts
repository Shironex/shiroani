import { AniListTokenPort } from '../../modules/anime';
import { getToken } from './anilist-token-store';

/**
 * Concrete {@link AniListTokenPort} built once by the composition root
 * (see `main/backend.ts`). Reads the safeStorage-backed
 * access token from the main-process token store so `AniListClient` can
 * authenticate outbound AniList requests.
 *
 * The token stays inside the main process — it is never returned across IPC.
 */
export class ElectronAniListTokenAdapter extends AniListTokenPort {
  async getAccessToken(): Promise<string | null> {
    return getToken();
  }
}
