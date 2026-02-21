import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

interface QueuedPlayer {
  socketId: string;
  userId: string;
  gameType: string;
  mode: string;
  eloRating: number;
  joinedAt: number;
}

/** 허용된 게임 액션 화이트리스트 */
const VALID_GAME_ACTIONS = new Set(['tap', 'swipe', 'hold', 'release', 'score', 'result']);

/** 매칭 대기 최대 시간 (30초) */
const MATCH_QUEUE_TIMEOUT_MS = 30_000;

/** Redis에 저장할 매칭 기록 TTL (1시간) */
const MATCH_RECORD_TTL_SEC = 3600;

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

@WebSocketGateway({ cors: { origin: CORS_ORIGIN, credentials: true } })
export class MatchGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private matchQueue: QueuedPlayer[] = [];
  private activeMatches = new Map<string, { players: string[]; gameType: string; readyCount: number }>();

  /** 소켓ID → 인증된 userId 매핑 */
  private socketUserMap = new Map<string, string>();

  /** 큐 타임아웃 폴링 타이머 핸들 */
  private pruneTimer: ReturnType<typeof setInterval>;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    // 5초마다 타임아웃된 큐 플레이어 제거
    this.pruneTimer = setInterval(() => this.pruneTimedOutQueue(), 5000);
  }

  /** 모듈 종료 시 타이머 정리 */
  onModuleDestroy() {
    clearInterval(this.pruneTimer);
  }

  /** 30초 초과 대기자 큐에서 제거 후 클라이언트에 알림 */
  private pruneTimedOutQueue() {
    const now = Date.now();
    const timedOut: QueuedPlayer[] = [];
    this.matchQueue = this.matchQueue.filter(p => {
      if (now - p.joinedAt > MATCH_QUEUE_TIMEOUT_MS) {
        timedOut.push(p);
        return false;
      }
      return true;
    });
    for (const p of timedOut) {
      const socket = this.server?.sockets.sockets.get(p.socketId);
      socket?.emit('match:timeout', { message: '매칭 대기 시간이 초과되었습니다. 다시 시도해주세요.' });
    }
  }

  handleConnection(client: Socket) {
    // JWT 토큰 검증 (handshake.auth.token 또는 Authorization 헤더)
    const token =
      (client.handshake.auth as Record<string, string>)?.token ??
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      client.emit('auth:error', { message: '인증 토큰이 필요합니다.' });
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token) as { sub: string };
      this.socketUserMap.set(client.id, payload.sub);
    } catch {
      client.emit('auth:error', { message: '유효하지 않은 토큰입니다.' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUserMap.delete(client.id);
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
    @MessageBody() data: { gameType: string; mode: string; eloRating: number },
  ) {
    // 인증된 userId만 사용 (클라이언트 전달 userId 신뢰하지 않음)
    const userId = this.socketUserMap.get(client.id);
    if (!userId) {
      client.emit('match:error', { message: '인증이 필요합니다.' });
      return;
    }

    if (!data?.gameType || !data?.mode) {
      client.emit('match:error', { message: '잘못된 매칭 요청입니다.' });
      return;
    }

    // ELO는 서버에서 검증 (0~10000 범위 클램프)
    const safeElo = Math.max(0, Math.min(10000, Number(data.eloRating) || 1000));

    // 중복 등록 방지: 같은 유저가 이미 큐에 있으면 교체
    this.matchQueue = this.matchQueue.filter(p => p.userId !== userId);

    const player: QueuedPlayer = {
      socketId: client.id,
      userId,
      gameType: data.gameType,
      mode: data.mode,
      eloRating: safeElo,
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
    if (!data?.matchId || typeof data.matchId !== 'string') return;

    const match = this.activeMatches.get(data.matchId);
    if (!match) return;

    // 해당 매치의 참가자인지 검증
    if (!match.players.includes(client.id)) return;

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
    @MessageBody() data: { matchId: string; action: string; value: number },
  ) {
    if (!data?.matchId || !data?.action) return;

    // 액션 화이트리스트 검증
    if (!VALID_GAME_ACTIONS.has(data.action)) return;

    // 해당 매치의 참가자인지 검증
    const match = this.activeMatches.get(data.matchId);
    if (!match || !match.players.includes(client.id)) return;

    // value 범위 검증 (0 ~ 999999)
    const safeValue = Math.max(0, Math.min(999999, data.value ?? 0));
    // timestamp는 클라이언트 값 신뢰 안 함 — 서버 시간 사용
    client.to(data.matchId).emit('game:opponent_action', {
      matchId: data.matchId,
      action: data.action,
      value: safeValue,
      timestamp: Date.now(),
    });
  }

  private async tryMatch(player: QueuedPlayer) {
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

    // Redis에 매칭 기록 저장 (games.service.ts에서 PvP 결과 검증용)
    await this.redis.set(
      `pvp_match:${matchId}`,
      JSON.stringify({ players: [player.userId, opponent.userId], gameType: player.gameType }),
      'EX', MATCH_RECORD_TTL_SEC,
    );

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
