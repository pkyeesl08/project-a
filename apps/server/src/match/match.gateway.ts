import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface QueuedPlayer {
  socketId: string;
  userId: string;
  gameType: string;
  mode: string;
  eloRating: number;
  joinedAt: number;
}

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

@WebSocketGateway({ cors: { origin: CORS_ORIGIN, credentials: true } })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private matchQueue: QueuedPlayer[] = [];
  private activeMatches = new Map<string, { players: string[]; gameType: string; readyCount: number }>();

  handleConnection(client: Socket) {
    console.log(`[WS] 클라이언트 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS] 클라이언트 해제: ${client.id}`);
    // 큐에서 제거
    this.matchQueue = this.matchQueue.filter(p => p.socketId !== client.id);
    // 진행 중인 매치에서 상대에게 알림
    for (const [matchId, match] of this.activeMatches) {
      if (match.players.includes(client.id)) {
        client.to(matchId).emit('match:opponent_disconnected', { matchId });
        this.activeMatches.delete(matchId);
      }
    }
  }

  @SubscribeMessage('match:request')
  handleMatchRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; gameType: string; mode: string; eloRating: number },
  ) {
    if (!data?.userId || !data?.gameType || !data?.mode) {
      client.emit('match:error', { message: '잘못된 매칭 요청입니다.' });
      return;
    }

    // 중복 등록 방지: 같은 유저가 이미 큐에 있으면 교체
    this.matchQueue = this.matchQueue.filter(p => p.userId !== data.userId);

    const player: QueuedPlayer = {
      socketId: client.id,
      userId: data.userId,
      gameType: data.gameType,
      mode: data.mode,
      eloRating: data.eloRating ?? 1000,
      joinedAt: Date.now(),
    };

    this.matchQueue.push(player);
    this.tryMatch(player);
  }

  @SubscribeMessage('match:cancel')
  handleMatchCancel(@ConnectedSocket() client: Socket) {
    this.matchQueue = this.matchQueue.filter(p => p.socketId !== client.id);
    client.emit('match:cancelled');
  }

  @SubscribeMessage('game:ready')
  handleGameReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    if (!data?.matchId) return;

    const match = this.activeMatches.get(data.matchId);
    if (!match) return;

    match.readyCount = (match.readyCount ?? 0) + 1;

    // 양쪽 모두 준비됐을 때 게임 시작
    if (match.readyCount >= 2) {
      this.server.to(data.matchId).emit('game:start', {
        matchId: data.matchId,
        gameType: match.gameType,
        countdown: 3,
        startTimestamp: Date.now() + 3000,
      });
    }
  }

  @SubscribeMessage('game:action')
  handleGameAction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string; action: string; value: number; timestamp: number },
  ) {
    if (!data?.matchId || !data?.action) return;

    // value 범위 검증 (0 ~ 999999)
    const safeValue = Math.max(0, Math.min(999999, data.value ?? 0));
    client.to(data.matchId).emit('game:opponent_action', {
      matchId: data.matchId,
      action: data.action,
      value: safeValue,
      timestamp: data.timestamp,
    });
  }

  private tryMatch(player: QueuedPlayer) {
    const opponent = this.matchQueue.find(
      p => p.socketId !== player.socketId &&
        p.userId !== player.userId &&
        p.gameType === player.gameType &&
        p.mode === player.mode &&
        Math.abs(p.eloRating - player.eloRating) < 300,
    );

    if (!opponent) return;

    // 큐에서 양쪽 제거
    this.matchQueue = this.matchQueue.filter(
      p => p.socketId !== player.socketId && p.socketId !== opponent.socketId,
    );

    const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const playerSocket = this.server.sockets.sockets.get(player.socketId);
    const opponentSocket = this.server.sockets.sockets.get(opponent.socketId);

    if (!playerSocket || !opponentSocket) {
      // 소켓이 끊겼으면 매칭 취소
      console.warn(`[WS] 매칭 실패 - 소켓 없음: player=${player.socketId}, opponent=${opponent.socketId}`);
      return;
    }

    playerSocket.join(matchId);
    opponentSocket.join(matchId);

    this.activeMatches.set(matchId, {
      players: [player.socketId, opponent.socketId],
      gameType: player.gameType,
      readyCount: 0,
    });

    playerSocket.emit('match:found', {
      matchId,
      gameType: player.gameType,
      opponent: { id: opponent.userId, eloRating: opponent.eloRating },
    });
    opponentSocket.emit('match:found', {
      matchId,
      gameType: player.gameType,
      opponent: { id: player.userId, eloRating: player.eloRating },
    });
  }
}
