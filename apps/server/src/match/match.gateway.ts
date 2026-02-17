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

@WebSocketGateway({ cors: { origin: '*' } })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private matchQueue: QueuedPlayer[] = [];
  private activeMatches = new Map<string, { players: string[]; gameType: string }>();

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    this.matchQueue = this.matchQueue.filter(p => p.socketId !== client.id);
  }

  @SubscribeMessage('match:request')
  handleMatchRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; gameType: string; mode: string; eloRating: number },
  ) {
    const player: QueuedPlayer = {
      socketId: client.id,
      userId: data.userId,
      gameType: data.gameType,
      mode: data.mode,
      eloRating: data.eloRating,
      joinedAt: Date.now(),
    };

    this.matchQueue.push(player);
    this.tryMatch(player);
  }

  @SubscribeMessage('match:cancel')
  handleMatchCancel(@ConnectedSocket() client: Socket) {
    this.matchQueue = this.matchQueue.filter(p => p.socketId !== client.id);
  }

  @SubscribeMessage('game:ready')
  handleGameReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId: string },
  ) {
    const match = this.activeMatches.get(data.matchId);
    if (match) {
      // 양쪽 준비 완료 시 게임 시작
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
    // 상대에게 액션 전달
    client.to(data.matchId).emit('game:opponent_action', data);
  }

  private tryMatch(player: QueuedPlayer) {
    const opponent = this.matchQueue.find(
      p => p.socketId !== player.socketId &&
        p.gameType === player.gameType &&
        p.mode === player.mode &&
        Math.abs(p.eloRating - player.eloRating) < 300,
    );

    if (opponent) {
      // 매칭 성사
      this.matchQueue = this.matchQueue.filter(
        p => p.socketId !== player.socketId && p.socketId !== opponent.socketId,
      );

      const matchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // 방 생성
      const playerSocket = this.server.sockets.sockets.get(player.socketId);
      const opponentSocket = this.server.sockets.sockets.get(opponent.socketId);

      playerSocket?.join(matchId);
      opponentSocket?.join(matchId);

      this.activeMatches.set(matchId, {
        players: [player.userId, opponent.userId],
        gameType: player.gameType,
      });

      // 양쪽에게 매칭 알림
      playerSocket?.emit('match:found', {
        matchId,
        gameType: player.gameType,
        opponent: { id: opponent.userId, eloRating: opponent.eloRating },
      });
      opponentSocket?.emit('match:found', {
        matchId,
        gameType: player.gameType,
        opponent: { id: player.userId, eloRating: player.eloRating },
      });
    }
  }
}
