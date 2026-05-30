import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AnimeModule, AniListAuthModule, AniListTokenPort } from '../index';
import { AniListClient } from '../anilist-client';
import { AnimeService } from '../anime.service';
import { ScheduleModule, ScheduleService } from '../../schedule';

// Throwaway boot test (contract phase): proves the DI graph resolves with the
// @Global AniListAuthModule seam AND that ScheduleModule's bare-class import of
// the still-static AnimeModule still resolves AnimeService. Delete or fold into
// a real suite once the desktop OAuth slice lands.
describe('AniList auth module wiring', () => {
  it('resolves AnimeService, ScheduleService, AniListClient and the token port', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'short', ttl: 1000, limit: 100 }]),
        AniListAuthModule.forRoot(),
        AnimeModule,
        ScheduleModule,
      ],
    }).compile();

    expect(moduleRef.get(AnimeService)).toBeDefined();
    expect(moduleRef.get(ScheduleService)).toBeDefined();
    expect(moduleRef.get(AniListClient)).toBeDefined();

    const port = moduleRef.get(AniListTokenPort);
    expect(await port.getAccessToken()).toBeNull();

    await moduleRef.close();
  });
});
