import { Module } from '@nestjs/common';

/** Nothing is served through Nest any more: the renderer talks to the backend over IPC. */
@Module({})
export class AppModule {}
