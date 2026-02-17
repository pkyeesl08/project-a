import { io, Socket } from 'socket.io-client';

type EventCallback = (...args: unknown[]) => void;

/**
 * Socket.IO 싱글턴 서비스
 * - 연결/해제 시 등록된 리스너 자동 재바인딩
 * - 타입별 편의 메서드 제공
 */
class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();

  /* ── 연결 ── */

  connect(token?: string) {
    if (this.socket?.connected) return;

    this.socket = io(window.location.origin, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => console.log('[socket] connected'));
    this.socket.on('disconnect', () => console.log('[socket] disconnected'));

    for (const [event, fns] of this.listeners) {
      for (const fn of fns) this.socket.on(event, fn as never);
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  /* ── 이벤트 ── */

  on(event: string, cb: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    this.socket?.on(event, cb as never);
  }

  off(event: string, cb: EventCallback) {
    this.listeners.get(event)?.delete(cb);
    this.socket?.off(event, cb as never);
  }

  private emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  /* ── 매칭 ── */

  requestMatch(data: { userId: string; gameType: string; mode: string; eloRating: number }) {
    this.emit('match:request', data);
  }

  cancelMatch()                                 { this.emit('match:cancel'); }
  gameReady(matchId: string)                    { this.emit('game:ready', { matchId }); }
  sendAction(matchId: string, action: string, value: number) {
    this.emit('game:action', { matchId, action, value, timestamp: Date.now() });
  }

  /* ── 지도 ── */

  sendChallenge(userId: string)                 { this.emit('map:challenge', { userId }); }
  respondChallenge(matchId: string, ok: boolean) { this.emit('map:challenge_response', { matchId, accepted: ok }); }
}

export const socketService = new SocketService();
