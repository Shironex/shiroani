import { Module, type DynamicModule } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import { CORS_CONFIG } from './kernel/cors.config';

/**
 * Serves no requests. Nest only starts the socket server for a gateway, and the
 * renderer's first data load still waits for the socket's `connect`, so this has
 * to exist until the renderer loads without the socket.
 */
@WebSocketGateway({ cors: CORS_CONFIG })
class SocketHostGateway {}

/** The Nest application holds nothing but the socket host now. */
@Module({})
export class AppModule {
  static forRoot(): DynamicModule {
    return { module: AppModule, providers: [SocketHostGateway] };
  }
}
