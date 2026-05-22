import { Module } from '@nestjs/common';
import { ArticleExtractorService } from './article-extractor.service';
import { FeedCacheService } from './feed-cache.service';
import { FeedGateway } from './feed.gateway';
import { FeedParserService } from './feed-parser.service';
import { FeedSchedulerService } from './feed-scheduler.service';
import { FeedService } from './feed.service';

@Module({
  providers: [
    FeedParserService,
    FeedCacheService,
    ArticleExtractorService,
    FeedService,
    FeedSchedulerService,
    FeedGateway,
  ],
  exports: [FeedService],
})
export class FeedModule {}
