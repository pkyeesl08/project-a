import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GameType } from '@donggamerank/shared';
import { NotificationService } from '../notifications/notification.service';
import { AvatarService } from '../avatar/avatar.service';
import { AcquireMethod } from '../avatar/avatar-item.entity';

/**
 * 주간 동네 챌린지 서비스
 *
 * Redis 키 목록:
 * - weekly:{weekKey}:region:{regionId}       sorted set — 동네 점수
 * - weekly:{weekKey}:national                sorted set — 전국 점수 (Cold Start fallback)
 * - weekly:{weekKey}:nicknames               hash       — userId → nickname
 * - weekly:{weekKey}:champ:{regionId}        string     — 현재 챔피언 userId
 * - weekly:{weekKey}:participants:{regionId} set        — 참가 유저 집합
 * - champ:streak:{userId}                    string     — 현재 연속 챔피언 횟수
 * - champ:total:{userId}                     string     — 통산 챔피언 횟수
 * - champ:history:{userId}                   list       — 챔피언 달성 weekKey 목록 (최신순)
 */

const COLD_START_THRESHOLD = 5;

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
  remainingMs: number;
}

export interface WeeklyRankEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  participantCount: number;
}

export interface ChampionStats {
  streak: number;
  totalCount: number;
  history: string[];          // weekKey 목록 (최신 20개)
  nextReward: string | null;  // 다음 스트릭 보상 설명
}

/**
 * 연속 챔피언 달성 시 지급 보상 정의
 * streak: 해당 연속 주수가 됐을 때 지급
 */
const STREAK_REWARDS: {
  streak: number;
  assetKey: string;
  name: string;
}[] = [
  { streak: 1, assetKey: 'title_weekly_champ',  name: '동네 챔피언 칭호' },
  { streak: 1, assetKey: 'hat_weekly_crown',    name: '주간 챔피언 왕관' },
  { streak: 2, assetKey: 'effect_champ_aura',   name: '챔피언 오라 이펙트' },
  { streak: 4, assetKey: 'title_champ_legend',  name: '전설의 챔피언 칭호' },
  { streak: 4, assetKey: 'hat_champ_crown_gold', name: '황금 챔피언 왕관' },
  { streak: 8, assetKey: 'effect_champ_flame',  name: '챔피언 불꽃 이펙트' },
];

/** 다음 스트릭 보상 안내 문자열 */
function getNextStreakReward(currentStreak: number): string | null {
  const milestones = [1, 2, 4, 8];
  const next = milestones.find(n => n > currentStreak);
  if (!next) return null;
  const items = STREAK_REWARDS.filter(r => r.streak === next);
  return `${next}주 연속 달성 시: ${items.map(i => i.name).join(' + ')} 지급`;
}

@Injectable()
export class WeeklyChallengeService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly notificationService: NotificationService,
    private readonly avatarService: AvatarService,
  ) {}

  getCurrentChallenge(): WeeklyChallengeInfo {
    const weekKey  = getWeekKey();
    const weekNo   = getISOWeekNumber();
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

  async updateScore(
    regionId: string,
    userId: string,
    nickname: string,
    gameType: GameType,
    score: number,
  ) {
    const { weekKey, gameType: weekGame } = this.getCurrentChallenge();
    if (gameType !== weekGame) return;

    const rankKey  = `weekly:${weekKey}:region:${regionId}`;
    const natKey   = `weekly:${weekKey}:national`;
    const partKey  = `weekly:${weekKey}:participants:${regionId}`;
    const nickKey  = `weekly:${weekKey}:nicknames`;
    const champKey = `weekly:${weekKey}:champ:${regionId}`;
    const expireAt = Math.floor(new Date(this.getCurrentChallenge().endAt).getTime() / 1000) + 86400 * 8;

    try {
      await this.redis.hset(nickKey, userId, nickname);
      await this.redis.expireat(nickKey, expireAt);

      const current = await this.redis.zscore(rankKey, userId);
      const isNewPersonalBest = current === null || parseFloat(current) < score;

      if (isNewPersonalBest) {
        await this.redis.zadd(rankKey, score, userId);
        await this.redis.expireat(rankKey, expireAt);

        const natCurrent = await this.redis.zscore(natKey, userId);
        if (natCurrent === null || parseFloat(natCurrent) < score) {
          await this.redis.zadd(natKey, score, userId);
          await this.redis.expireat(natKey, expireAt);
        }

        await this.checkAndUpdateChampion(
          regionId, userId, nickname, score, weekKey, rankKey, champKey, expireAt,
        );
      }

      await this.redis.sadd(partKey, userId);
      await this.redis.expireat(partKey, expireAt);
    } catch (err) {
      console.error('[WeeklyChallenge] updateScore 오류:', err);
    }
  }

  private async checkAndUpdateChampion(
    regionId: string,
    userId: string,
    nickname: string,
    score: number,
    weekKey: string,
    rankKey: string,
    champKey: string,
    expireAt: number,
  ) {
    const [top] = await this.redis.zrevrange(rankKey, 0, 0);
    if (!top || top !== userId) return;

    const prevChampId = await this.redis.get(champKey);
    if (prevChampId === userId) return;

    await this.redis.set(champKey, userId, 'EXAT', expireAt);

    /* ── 스트릭 · 기록 갱신 ── */
    const streakKey  = `champ:streak:${userId}`;
    const totalKey   = `champ:total:${userId}`;
    const historyKey = `champ:history:${userId}`;

    // 이전 챔피언 스트릭 리셋
    if (prevChampId && prevChampId !== userId) {
      await this.redis.set(`champ:streak:${prevChampId}`, '0');
    }

    const newStreak = await this.redis.incr(streakKey);
    await this.redis.incr(totalKey);
    await this.redis.lpush(historyKey, weekKey);
    await this.redis.ltrim(historyKey, 0, 49);
    await this.redis.expire(historyKey, 86400 * 365);

    /* ── 코인 지급 (스트릭에 따라 보너스) ── */
    const coinReward = newStreak >= 4 ? 300 : newStreak >= 2 ? 200 : 100;
    await this.avatarService.addCoins(userId, coinReward);

    /* ── 스트릭 기반 아이템 지급 ── */
    const rewards = STREAK_REWARDS.filter(r => r.streak === newStreak);
    await Promise.allSettled(
      rewards.map(r =>
        this.avatarService.grantItemByKey(userId, r.assetKey, AcquireMethod.EVENT),
      ),
    );

    /* ── 챔피언 등극 알림 ── */
    const rewardNames = [
      `🪙 코인 ${coinReward}개`,
      ...rewards.map(r => r.name),
    ].join(' · ');

    const champMsg =
      newStreak >= 4
        ? `🏆 ${newStreak}주 연속 동네 1위! 전설의 챔피언 등극! (${rewardNames})`
        : newStreak >= 2
        ? `🏆 ${newStreak}주 연속 동네 1위 달성! (${rewardNames})`
        : `🏆 이번 주 동네 1위! (${rewardNames})`;

    this.notificationService.notify(userId, 'notification:weekly_champion', {
      type: 'weekly_champion',
      regionId,
      score,
      streak: newStreak,
      coinReward,
      rewardNames,
      message: champMsg,
    });

    /* ── 왕좌 박탈 알림 ── */
    if (prevChampId) {
      const prevStreak = parseInt(await this.redis.get(`champ:streak:${prevChampId}`) ?? '0') + 1;
      this.notificationService.notify(prevChampId, 'notification:dethroned', {
        type: 'dethroned',
        regionId,
        challengerNickname: nickname,
        challengerScore: score,
        lostStreak: prevStreak,
        message: `😤 ${nickname}님이 ${score}점으로 1위를 가져갔어요! ${prevStreak > 1 ? `${prevStreak}주 연속 기록이 끊겼어요. ` : ''}다시 도전하세요!`,
      });
    }
  }

  /* ── 랭킹 조회 ── */

  async getTopN(regionId: string, limit = 50): Promise<{ entries: WeeklyRankEntry[]; isFallback: boolean }> {
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

  /** 내 챔피언 통계 조회 (트로피 케이스용) */
  async getChampionStats(userId: string): Promise<ChampionStats> {
    const streakKey  = `champ:streak:${userId}`;
    const totalKey   = `champ:total:${userId}`;
    const historyKey = `champ:history:${userId}`;

    try {
      const [streakRaw, totalRaw, history] = await Promise.all([
        this.redis.get(streakKey),
        this.redis.get(totalKey),
        this.redis.lrange(historyKey, 0, 19),
      ]);
      const streak     = parseInt(streakRaw ?? '0');
      const totalCount = parseInt(totalRaw ?? '0');
      return { streak, totalCount, history, nextReward: getNextStreakReward(streak) };
    } catch {
      return { streak: 0, totalCount: 0, history: [], nextReward: null };
    }
  }
}
