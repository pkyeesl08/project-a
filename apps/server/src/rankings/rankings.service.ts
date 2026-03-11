import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * 랭킹 서비스 — Redis Sorted Set 기반
 *
 * Key 패턴: ranking:{scope}:{scopeId}:{gameType}
 * - ZADD: 점수 업데이트 (최고 기록만 보존)
 * - ZREVRANGE: 상위 N명 조회
 * - ZREVRANK: 유저 순위 조회
 * - ZCARD: 총 참가자 수
 */

export interface RankEntry {
  userId: string;
  score: number;
  rank: number;
}

const MAX_LIMIT = 200; // 최대 조회 수 제한

@Injectable()
export class RankingsService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(scope: string, scopeId: string, gameType: string): string {
    return `ranking:${scope}:${scopeId}:${gameType}`;
  }

  /* ── 쓰기 ── */

  /** 점수 업데이트 — 기존 최고 기록보다 높을 때만 반영 */
  async updateScore(scope: string, scopeId: string, gameType: string, userId: string, score: number) {
    const k = this.key(scope, scopeId, gameType);
    try {
      const current = await this.redis.zscore(k, userId);
      if (current === null || parseFloat(current) < score) {
        await this.redis.zadd(k, score, userId);
      }
    } catch (err) {
      console.error('[Rankings] updateScore 오류:', err);
    }
  }

  /* ── 읽기 ── */

  /** 상위 N명 조회 */
  async getTopN(scope: string, scopeId: string, gameType: string, limit = 100): Promise<RankEntry[]> {
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const k = this.key(scope, scopeId, gameType);
    try {
      const raw = await this.redis.zrevrange(k, 0, safeLimit - 1, 'WITHSCORES');
      const entries: RankEntry[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({
          userId: raw[i],
          score: parseFloat(raw[i + 1]),
          rank: Math.floor(i / 2) + 1,
        });
      }
      return entries;
    } catch (err) {
      console.error('[Rankings] getTopN 오류:', err);
      return [];
    }
  }

  /** 특정 유저의 순위 조회 */
  async getUserRank(scope: string, scopeId: string, gameType: string, userId: string) {
    const k = this.key(scope, scopeId, gameType);
    try {
      const [rank, score, total] = await Promise.all([
        this.redis.zrevrank(k, userId),
        this.redis.zscore(k, userId),
        this.redis.zcard(k),
      ]);
      if (rank === null || score === null) return null;
      return { rank: rank + 1, score: parseFloat(score), total };
    } catch (err) {
      console.error('[Rankings] getUserRank 오류:', err);
      return null;
    }
  }

  /** 내 모든 랭킹 조회 (패턴 스캔) */
  async getMyRankings(userId: string) {
    const results: { scope: string; scopeId: string; gameType: string; rank: number; score: number }[] = [];
    const MAX_ITERATIONS = 50; // Redis 키가 많아도 최대 50회 SCAN 반복으로 제한
    try {
      let cursor = '0';
      let iterations = 0;
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', 'ranking:*', 'COUNT', 100);
        cursor = next;
        iterations++;
        for (const key of keys) {
          const [, scope, scopeId, gameType] = key.split(':');
          const rank = await this.redis.zrevrank(key, userId);
          if (rank === null) continue;
          const score = await this.redis.zscore(key, userId);
          results.push({ scope, scopeId, gameType, rank: rank + 1, score: parseFloat(score ?? '0') });
        }
        if (iterations >= MAX_ITERATIONS) {
          console.warn(`[Rankings] SCAN 반복 상한 도달 (${MAX_ITERATIONS}회), 조기 종료`);
          break;
        }
      } while (cursor !== '0');
    } catch (err) {
      console.error('[Rankings] getMyRankings 오류:', err);
    }
    return results;
  }
}
