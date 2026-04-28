import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database';
import { AnimeModule } from './anime';
import { LibraryModule } from './library';
import { ScheduleModule } from './schedule';
import { DiaryModule } from './diary';
import { ImportExportModule } from './import-export';
import { FeedModule } from './feed';
import { NotificationsModule } from './notifications';
import { AniSkipModule } from './aniskip';

@Module({})
export class AppModule {
  static forRoot(options: {
    dbPath: string;
    notificationHostProvider: Provider;
    notificationStoreProvider: Provider;
  }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000, // 1 second window
            limit: 100, // max 100 requests per second (desktop app — single user)
          },
          {
            name: 'medium',
            ttl: 10000, // 10 second window
            limit: 500, // max 500 requests per 10 seconds
          },
        ]),
        DatabaseModule.forRoot({ dbPath: options.dbPath }),
        AnimeModule,
        LibraryModule,
        ScheduleModule,
        DiaryModule,
        ImportExportModule,
        FeedModule,
        NotificationsModule.forRoot({
          hostProvider: options.notificationHostProvider,
          storeProvider: options.notificationStoreProvider,
        }),
        AniSkipModule,
      ],
    };
  }
}
