import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

export interface NotificationPayload {
  type: string;
  [key: string]: unknown;
}

/**
 * 서버 → 클라이언트 단방향 푸시 알림 서비스
 *
 * 클라이언트는 WS 연결 시 `user:{userId}` 룸에 자동 입장.
 * 이 서비스로 특정 유저에게 언제든 알림을 보낼 수 있음.
 */
@Injectable()
export class NotificationService {
  private io: Server | null = null;

  /** NotificationGateway가 초기화된 뒤 서버 인스턴스를 주입 */
  setServer(io: Server) {
    this.io = io;
  }

  /** 특정 유저에게 알림 emit */
  notify(userId: string, event: string, payload: NotificationPayload) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
  }
}
