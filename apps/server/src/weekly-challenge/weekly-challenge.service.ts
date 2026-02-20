import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GameType } from '@donggamerank/shared';
import { NotificationService } from '../notifications/notification.service';

/**
 * 주간 동네 챌린지 서비스
 *
 * - 매주 월요일 자동으로 게임 종류가 바뀜 (ISO 주차 기반 결정적 선택)
 * - 랭킹 키:  weekly:{weekKey}:region:{regionId}  (sorted set)
 * - 전국 키:  weekly:{weekKey}:national           (Cold Start fallback용)
 * - 닉네임 키: weekly:{weekKey}:nicknames         (hash: userId → nickname)
 * - 챔피언 키: weekly:{weekKey}:champ:{regionId}  (string: userId)
 * - 참가 키:  weekly:{weekKey}:participants:{regionId} (set)
 */

/** Cold Start 기준: 참가자 5명 미만이면 전국 리더보드 fallback */
const COLD_START_THRESHOLD = 5;

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
  nickname: string;
  score: number;
  participantCount: number;
}

@Injectable()
export class WeeklyChallengeService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly notificationService: NotificationService,
  ) {}

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

  /**
   * 게임 결과 제출 시 주간 점수 업데이트 — 최고 기록만 보존
   * - 닉네임을 Redis hash에 저장 (리더보드 표시용)
   * - 동네 1위 변경 시 알림 emit (신규 챔피언 & 왕좌 빼앗긴 유저)
   * - 전국 sorted set에도 병행 업데이트 (Cold Start fallback)
   */
  async updateScore(
    regionId: string,
    userId: string,
    nickname: string,
    gameType: GameType,
    score: number,
  ) {
    const { weekKey, gameType: weekGame } = this.getCurrentChallenge();
    if (gameType !== weekGame) return; // 이번 주 게임이 아니면 무시

    const rankKey  = `weekly:${weekKey}:region:${regionId}`;
    const natKey   = `weekly:${weekKey}:national`;
    const partKey  = `weekly:${weekKey}:participants:${regionId}`;
    const nickKey  = `weekly:${weekKey}:nicknames`;
    const champKey = `weekly:${weekKey}:champ:${regionId}`;
    const expireAt = Math.floor(new Date(this.getCurrentChallenge().endAt).getTime() / 1000) + 86400 * 8;

    try {
      // 닉네임 저장
      await this.redis.hset(nickKey, userId, nickname);
      await this.redis.expireat(nickKey, expireAt);

      const current = await this.redis.zscore(rankKey, userId);
      const isNewPersonalBest = current === null || parseFloat(current) < score;

      if (isNewPersonalBest) {
        await this.redis.zadd(rankKey, score, userId);
        await this.redis.expireat(rankKey, expireAt);

        // 전국 sorted set 업데이트 (Cold Start fallback)
        const natCurrent = await this.redis.zscore(natKey, userId);
        if (natCurrent === null || parseFloat(natCurrent) < score) {
          await this.redis.zadd(natKey, score, userId);
          await this.redis.expireat(natKey, expireAt);
        }

        // 챔피언 변경 감지
        await this.checkAndUpdateChampion(
          regionId, userId, nickname, score, rankKey, champKey, expireAt,
        );
      }

      await this.redis.sadd(partKey, userId);
      await this.redis.expireat(partKey, expireAt);
    } catch (err) {
      console.error('[WeeklyChallenge] updateScore 오류:', err);
    }
  }

  /** 동네 1위 변경 시 알림 처리 */
  private async checkAndUpdateChampion(
    regionId: string,
    userId: string,
    nickname: string,
    score: number,
    rankKey: string,
    champKey: string,
    expireAt: number,
  ) {
    // ZADD 직후이므로 현재 #1 확인
    const [top] = await this.redis.zrevrange(rankKey, 0, 0);
    if (!top || top !== userId) return; // 아직 1위 아님

    const prevChampId = await this.redis.get(champKey);
    if (prevChampId === userId) return; // 이미 나의 왕좌

    // 새로운 챔피언 등극
    await this.redis.set(champKey, userId, 'EXAT', expireAt);

    // 신규 챔피언에게 알림
    this.notificationService.notify(userId, 'notification:weekly_champion', {
      type: 'weekly_champion',
      regionId,
      score,
      message: `🏆 이번 주 동네 1위 달성! ${score}점으로 챔피언이 되었어요!`,
    });

    // 왕좌를 빼앗긴 기존 챔피언에게 알림
    if (prevChampId) {
      this.notificationService.notify(prevChampId, 'notification:dethroned', {
        type: 'dethroned',
        regionId,
        challengerNickname: nickname,
        challengerScore: score,
        message: `😤 ${nickname}님이 ${score}점으로 1위를 가져갔어요! 다시 도전하세요!`,
      });
    }
  }

  /**
   * 동네 주간 랭킹 상위 N명 조회
   * - 동네 참가자 < COLD_START_THRESHOLD 이면 전국 fallback
   */
  async getTopN(
    regionId: string,
    limit = 50,
  ): Promise<{ entries: WeeklyRankEntry[]; isFallback: boolean }> {
    const { weekKey } = this.getCurrentChallenge();
    const rankKey = `weekly:${weekKey}:region:${regionId}`;
    const natKey  = `weekly:${weekKey}:national`;
    const partKey = `weekly:${weekKey}:participants:${regionId}`;
    const nickKey = `weekly:${weekKey}:nicknames`;

    try {
      const participantCount = await this.redis.scard(partKey);
      const isFallback = participantCount < COLD_START_THRESHOLD;
      const sourceKey = isFallback ? natKey : rankKey;

      const [raw, nicknames] = await Promise.all([
        this.redis.zrevrange(sourceKey, 0, limit - 1, 'WITHSCORES'),
        this.redis.hgetall(nickKey),
      ]);

      const entries: WeeklyRankEntry[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        const uid = raw[i];
        entries.push({
          userId: uid,
          nickname: nicknames?.[uid] ?? uid.slice(0, 8) + '...',
          score: parseFloat(raw[i + 1]),
          rank: Math.floor(i / 2) + 1,
          participantCount,
        });
      }
      return { entries, isFallback };
    } catch (err) {
      console.error('[WeeklyChallenge] getTopN 오류:', err);
      return { entries: [], isFallback: false };
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

  /** 현재 동네 챔피언 조회 */
  async getChampion(regionId: string): Promise<{ userId: string; nickname: string } | null> {
    const { weekKey } = this.getCurrentChallenge();
    const champKey = `weekly:${weekKey}:champ:${regionId}`;
    const nickKey  = `weekly:${weekKey}:nicknames`;

    try {
      const champId = await this.redis.get(champKey);
      if (!champId) return null;
      const nickname = await this.redis.hget(nickKey, champId);
      return { userId: champId, nickname: nickname ?? champId.slice(0, 8) + '...' };
    } catch {
      return null;
    }
  }
}
