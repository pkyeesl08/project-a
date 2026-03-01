import {
  WebSocketGateway, WebSocketServer,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from './notification.service';

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

/**
 * 알림 전용 WebSocket 게이트웨이
 *
 * MatchGateway와 동일 포트·네임스페이스를 공유해도 됨.
 * 연결 시 JWT를 검증하여 `user:{userId}` 룸에 자동 입장.
 */
@WebSocketGateway({ cors: { origin: CORS_ORIGIN, credentials: true } })
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  afterInit(server: Server) {
    this.notificationService.setServer(server);
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return;

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      });
      const userId = payload.sub;
      client.join(`user:${userId}`);
      // socketId → userId 매핑 저장 (disconnect 시 룸 정리용)
      (client.data as Record<string, string>).userId = userId;
      console.log(`[Notification] 유저 ${userId} 알림 룸 입장`);
    } catch {
      // 토큰 유효하지 않아도 연결은 유지 (비로그인 연결 허용)
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client.data as Record<string, string>)?.userId;
    if (userId) {
      console.log(`[Notification] 유저 ${userId} 알림 룸 퇴장`);
    }
  }
}
