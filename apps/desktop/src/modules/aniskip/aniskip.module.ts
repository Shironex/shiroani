import { Module } from '@nestjs/common';
import { AniSkipClient } from './aniskip-client';

@Module({
  providers: [AniSkipClient],
  exports: [AniSkipClient],
})
export class AniSkipModule {}
