import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GameType } from '@donggamerank/shared';

/**
 * 주간 동네 챌린지 서비스
 *
 * - 매주 월요일 자동으로 게임 종류가 바뀜 (ISO 주차 기반 결정적 선택)
 * - 랭킹 키: weekly:{weekKey}:region:{regionId}
 * - 챌린지 참가 기록: weekly:{weekKey}:participants:{regionId} (set)
 */

/** 주간 챌린지 게임 풀 (8개 게임 주기 순환) */
const WEEKLY_GAME_POOL: GameType[] = [
  GameType.SPEED_TAP,
  GameType.TIMING_HIT,
  GameType.WHACK_A_MOLE,
  GameType.MATH_SPEED,
  GameType.RPS_SPEED,
  GameType.COLOR_MATCH,
  GameType.REVERSE_REACTION,
  GameType.TARGET_SNIPER,
];

function getISOWeekNumber(date = new Date()): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const weekNo = getISOWeekNumber(date);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekBounds(date = new Date()): { startAt: Date; endAt: Date } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day + 1);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return { startAt: monday, endAt: sunday };
}

export interface WeeklyChallengeInfo {
  weekKey: string;
  gameType: GameType;
  startAt: string;
  endAt: string;
  /** 남은 시간 ms */
  remainingMs: number;
}

export interface WeeklyRankEntry {
  rank: number;
  userId: string;
  score: number;
  participantCount: number;
}

@Injectable()
export class WeeklyChallengeService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** 현재 주간 챌린지 정보 반환 */
  getCurrentChallenge(): WeeklyChallengeInfo {
    const weekKey = getWeekKey();
    const weekNo  = getISOWeekNumber();
    const gameType = WEEKLY_GAME_POOL[weekNo % WEEKLY_GAME_POOL.length];
    const { startAt, endAt } = getWeekBounds();
    return {
      weekKey,
      gameType,
      startAt: startAt.toISOString(),
      endAt:   endAt.toISOString(),
      remainingMs: endAt.getTime() - Date.now(),
    };
  }

  /** 게임 결과 제출 시 주간 점수 업데이트 — 최고 기록만 보존 */
  async updateScore(regionId: string, userId: string, gameType: GameType, score: number) {
    const { weekKey, gameType: weekGame } = this.getCurrentChallenge();
    if (gameType !== weekGame) return; // 이번 주 게임이 아니면 무시

    const rankKey = `weekly:${weekKey}:region:${regionId}`;
    const partKey = `weekly:${weekKey}:participants:${regionId}`;

    try {
      const current = await this.redis.zscore(rankKey, userId);
      if (current === null || parseFloat(current) < score) {
        await this.redis.zadd(rankKey, score, userId);
        // 주 종료 후 8일 뒤에 자동 삭제 (최대 보존 8일)
        await this.redis.expireat(rankKey, Math.floor(new Date(this.getCurrentChallenge().endAt).getTime() / 1000) + 86400);
      }
      await this.redis.sadd(partKey, userId);
      await this.redis.expireat(partKey, Math.floor(new Date(this.getCurrentChallenge().endAt).getTime() / 1000) + 86400);
    } catch (err) {
      console.error('[WeeklyChallenge] updateScore 오류:', err);
    }
  }

  /** 동네 주간 랭킹 상위 N명 조회 */
  async getTopN(regionId: string, limit = 50): Promise<WeeklyRankEntry[]> {
    const { weekKey } = this.getCurrentChallenge();
    const rankKey = `weekly:${weekKey}:region:${regionId}`;
    const partKey = `weekly:${weekKey}:participants:${regionId}`;

    try {
      const [raw, participantCount] = await Promise.all([
        this.redis.zrevrange(rankKey, 0, limit - 1, 'WITHSCORES'),
        this.redis.scard(partKey),
      ]);
      const entries: WeeklyRankEntry[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({
          userId: raw[i],
          score: parseFloat(raw[i + 1]),
          rank: Math.floor(i / 2) + 1,
          participantCount,
        });
      }
      return entries;
    } catch (err) {
      console.error('[WeeklyChallenge] getTopN 오류:', err);
      return [];
    }
  }

  /** 특정 유저의 동네 주간 순위 조회 */
  async getUserRank(regionId: string, userId: string) {
    const { weekKey } = this.getCurrentChallenge();
    const rankKey = `weekly:${weekKey}:region:${regionId}`;
    const partKey = `weekly:${weekKey}:participants:${regionId}`;

    try {
      const [rank, score, total] = await Promise.all([
        this.redis.zrevrank(rankKey, userId),
        this.redis.zscore(rankKey, userId),
        this.redis.scard(partKey),
      ]);
      if (rank === null || score === null) return null;
      return { rank: rank + 1, score: parseFloat(score), total };
    } catch (err) {
      console.error('[WeeklyChallenge] getUserRank 오류:', err);
      return null;
    }
  }
}
