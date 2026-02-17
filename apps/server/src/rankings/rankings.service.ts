import { Injectable } from '@nestjs/common';

/**
 * 랭킹 서비스
 *
 * 프로덕션에서는 Redis Sorted Set 사용 예정
 * Key 패턴: ranking:{scope}:{scopeId}:{gameType}:{seasonId}
 */

interface RankEntry {
  userId: string;
  score: number;
  rank: number;
}

@Injectable()
export class RankingsService {
  private store = new Map<string, Map<string, number>>();

  private key(scope: string, scopeId: string, gameType: string): string {
    return `${scope}:${scopeId}:${gameType}`;
  }

  /* ── 쓰기 ── */

  async updateScore(scope: string, scopeId: string, gameType: string, userId: string, score: number) {
    const k = this.key(scope, scopeId, gameType);
    if (!this.store.has(k)) this.store.set(k, new Map());
    const board = this.store.get(k)!;
    if (score > (board.get(userId) ?? 0)) board.set(userId, score);
  }

  /* ── 읽기 ── */

  async getTopN(scope: string, scopeId: string, gameType: string, limit = 100): Promise<RankEntry[]> {
    const board = this.store.get(this.key(scope, scopeId, gameType));
    if (!board) return [];

    return [...board.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, score], i) => ({ userId, score, rank: i + 1 }));
  }

  async getUserRank(scope: string, scopeId: string, gameType: string, userId: string) {
    const board = this.store.get(this.key(scope, scopeId, gameType));
    if (!board?.has(userId)) return null;

    const sorted = [...board.entries()].sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([id]) => id === userId);
    return { rank: idx + 1, score: board.get(userId)!, total: board.size };
  }

  async getMyRankings(userId: string) {
    const results: { scope: string; scopeId: string; gameType: string; rank: number; score: number }[] = [];

    for (const [k, board] of this.store) {
      if (!board.has(userId)) continue;
      const [scope, scopeId, gameType] = k.split(':');
      const sorted = [...board.entries()].sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([id]) => id === userId) + 1;
      results.push({ scope, scopeId, gameType, rank, score: board.get(userId)! });
    }

    return results;
  }
}
