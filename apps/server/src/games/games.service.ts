import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from './game-result.entity';
import { UsersService } from '../users/users.service';
import { RankingsService } from '../rankings/rankings.service';
import { SeasonsService } from '../seasons/seasons.service';
import { MissionsService } from '../missions/missions.service';
import { AchievementsService } from '../achievements/achievements.service';
import { AvatarService } from '../avatar/avatar.service';
import { normalizeScore, calculateElo, calculateSoloEloAdjustment, GameType, GAME_CONFIGS } from '@donggamerank/shared';

/** 게임별 클라이언트 제출 가능한 최대 raw 점수 — 조작 차단용 */
const RAW_SCORE_LIMITS: Partial<Record<GameType, number>> = {
  [GameType.TIMING_HIT]:          5000,   // ms (0 = 완벽, 최대 durationMs)
  [GameType.SPEED_TAP]:           200,    // 탭 횟수 (5초 × 40tps 여유치)
  [GameType.LIGHTNING_REACTION]:  5000,   // ms
  [GameType.BALLOON_POP]:         60,     // 5초 게임 최대
  [GameType.WHACK_A_MOLE]:        60,
  [GameType.MEMORY_FLASH]:        100,    // 정확도 %
  [GameType.COLOR_MATCH]:         60,
  [GameType.BIGGER_NUMBER]:       60,
  [GameType.SAME_PICTURE]:        5000,   // ms
  [GameType.ODD_EVEN]:            100,    // 정답률 %
  [GameType.DIRECTION_SWIPE]:     40,
  [GameType.STOP_THE_BAR]:        100,    // px 오차 (0 = 완벽)
  [GameType.RPS_SPEED]:           20,
  [GameType.SEQUENCE_TAP]:        7000,   // score = max(0, 7000 - elapsed_ms)
  [GameType.REVERSE_REACTION]:    15,     // 속도 포인트
  [GameType.LINE_TRACE]:          100,    // 정확도 %
  [GameType.TARGET_SNIPER]:       20,
  [GameType.DARK_ROOM_TAP]:       40,
  [GameType.SCREW_CENTER]:        100,    // px 오차
  [GameType.LINE_GROW]:           500,    // 선 길이
  [GameType.MATH_SPEED]:          40,
  [GameType.SHELL_GAME]:          10,
  [GameType.EMOJI_SORT]:          40,
  [GameType.COUNT_MORE]:          100,    // 정답률 %
  [GameType.DUAL_PRECISION]:      600,    // 누적 정밀도
  [GameType.REVERSE_MEMORY]:      5,      // 정답 개수 (0~5)
  [GameType.RAPID_AIM]:           800,    // 누적 조준 점수
};

function validateRawScore(gameType: GameType, rawScore: number): void {
  if (!Number.isFinite(rawScore) || rawScore < 0) {
    throw new BadRequestException('유효하지 않은 점수입니다.');
  }
  const maxScore = RAW_SCORE_LIMITS[gameType];
  if (maxScore !== undefined && rawScore > maxScore) {
    throw new BadRequestException(
      `${gameType} 게임의 최대 허용 점수(${maxScore})를 초과했습니다.`,
    );
  }
}

/** 게임 완료 시 지급 코인 (솔로 기본값) */
const COIN_REWARD_SOLO = 5;
/** PvP 승리 추가 보너스 */
const COIN_REWARD_PVP_WIN = 10;

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
    private usersService: UsersService,
    private rankingsService: RankingsService,
    private seasonsService: SeasonsService,
    private missionsService: MissionsService,
    private achievementsService: AchievementsService,
    private avatarService: AvatarService,
  ) {}

  async submitResult(userId: string, data: {
    gameType: string;
    score: number;
    mode: string;
    opponentId?: string;
    matchId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    // 서버 측 raw 점수 검증 — 클라이언트 조작 방지
    if (!Object.values(GameType).includes(data.gameType as GameType)) {
      throw new BadRequestException('유효하지 않은 게임 타입입니다.');
    }
    validateRawScore(data.gameType as GameType, data.score);

    const normalized = normalizeScore(data.gameType as GameType, data.score);

    // 최고 기록 체크 — 저장 전 조회
    const statsBefore = await this.getPersonalStats(userId, data.gameType);
    const isNewHighScore = normalized > statsBefore.best;

    // 현재 시즌 ID 조회
    const seasonId = await this.seasonsService.getCurrentSeasonId();

    const result = this.resultsRepo.create({
      userId,
      gameType: data.gameType,
      score: data.score,
      normalizedScore: normalized,
      mode: data.mode,
      opponentId: data.opponentId ?? null,
      matchId: data.matchId ?? null,
      regionId: user.primaryRegionId,
      seasonId,
      metadata: data.metadata ?? null,
    });

    const saved = await this.resultsRepo.save(result);

    // ELO 업데이트
    let eloChange = 0;
    let newElo = user.eloRating;

    if (data.mode === 'pvp' && data.opponentId) {
      const opponent = await this.usersService.findById(data.opponentId);
      if (opponent && data.opponentId !== userId) {
        const playerWon = data.metadata?.won === true;
        const eloResult = calculateElo(
          user.eloRating,
          opponent.eloRating,
          playerWon ? 'win' : 'lose',
        );
        newElo = eloResult.newRating;
        eloChange = eloResult.change;
      }
    } else {
      const soloResult = calculateSoloEloAdjustment(
        user.eloRating, normalized, statsBefore.best, statsBefore.average,
      );
      newElo = soloResult.newRating;
      eloChange = soloResult.change;
    }

    await this.usersService.updateElo(userId, newElo);

    // 랭킹 업데이트 (Redis Sorted Set)
    await Promise.allSettled([
      this.rankingsService.updateScore('national', 'all', data.gameType, userId, normalized),
      this.rankingsService.updateScore('region', user.primaryRegionId, data.gameType, userId, normalized),
      user.schoolId
        ? this.rankingsService.updateScore('school', user.schoolId, data.gameType, userId, normalized)
        : Promise.resolve(),
    ]);

    // 내 동네 랭킹 조회
    const regionRankInfo = await this.rankingsService.getUserRank(
      'region', user.primaryRegionId, data.gameType, userId,
    );

    const regionRank = regionRankInfo?.rank ?? null;

    // ── 미션 / 업적 비동기 처리 (실패해도 결과 반환에 영향 없음) ──
    const statsAfter = await this.getPersonalStats(userId, data.gameType);
    const totalGames = await this.resultsRepo.count({ where: { userId } });
    const uniqueGameTypesCount = await this.getUniqueGameTypeCount(userId);

    const pvpResults = await this.resultsRepo.find({
      where: { userId, mode: 'pvp' },
      order: { playedAt: 'DESC' },
      take: 20,
    });
    const pvpWins = pvpResults.filter(r => r.metadata?.won === true).length;
    let pvpStreak = 0;
    for (const r of pvpResults) {
      if (r.metadata?.won === true) pvpStreak++;
      else break;
    }

    // 코인 지급 (게임 완료 기본 보상)
    const coinReward = COIN_REWARD_SOLO +
      (data.mode === 'pvp' && data.metadata?.won === true ? COIN_REWARD_PVP_WIN : 0);

    Promise.allSettled([
      this.avatarService.addCoins(userId, coinReward),
      this.missionsService.handleGameResult(userId, {
        gameType: data.gameType,
        mode: data.mode,
        isNewHighScore,
        won: data.metadata?.won === true,
      }),
      this.achievementsService.checkAfterGame(userId, {
        gameType: data.gameType,
        normalizedScore: normalized,
        rawScore: data.score,
        mode: data.mode,
        isNewHighScore,
        totalGames,
        pvpWins,
        pvpStreak,
        regionRank,
        uniqueGameTypes: uniqueGameTypesCount,
      }),
    ]);

    return {
      resultId: saved.id,
      rankChange: eloChange,
      newElo,
      regionRank,
      isNewHighScore,
      seasonId,
      coinReward,
    };
  }

  async getHistory(userId: string, limit = 20, offset = 0) {
    const safeLimit = Math.min(limit, 100);
    const [items, total] = await this.resultsRepo.findAndCount({
      where: { userId },
      order: { playedAt: 'DESC' },
      take: safeLimit,
      skip: offset,
    });

    return {
      items,
      total,
      page: Math.floor(offset / safeLimit) + 1,
      limit: safeLimit,
      hasMore: offset + safeLimit <= total,
    };
  }

  async getPersonalStats(userId: string, gameType: string) {
    const results = await this.resultsRepo.find({
      where: { userId, gameType },
      order: { normalizedScore: 'DESC' },
    });

    if (results.length === 0) return { best: 0, average: 0, count: 0 };

    const scores = results.map(r => r.normalizedScore);
    return {
      best: scores[0],
      average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    };
  }

  /** 유저가 플레이한 고유 게임 타입 수 */
  private async getUniqueGameTypeCount(userId: string): Promise<number> {
    const raw = await this.resultsRepo
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r.gameType)', 'count')
      .where('r.userId = :userId', { userId })
      .getRawOne();
    return parseInt(raw?.count ?? '0');
  }

  getGameTypes() {
    return Object.values(GAME_CONFIGS);
  }

  /**
   * 도전 타겟 조회
   * - targetUserId 없으면 → 요청자 동네 1위 플레이어 자동 선택
   * - scoreTimeline은 metadata 안에 저장된 [elapsedMs, score][] 배열
   */
  async getChallengeTarget(requestingUserId: string, gameType: string, targetUserId?: string) {
    let resolvedId = targetUserId;

    if (!resolvedId) {
      const user = await this.usersService.findById(requestingUserId);
      if (!user?.primaryRegionId) return null;

      const topEntries = await this.rankingsService.getTopN(
        'region', user.primaryRegionId, gameType, 5,
      );
      // 자기 자신은 제외, 없으면 1위
      const top = topEntries.find(e => e.userId !== requestingUserId) ?? topEntries[0];
      if (!top) return null;
      resolvedId = top.userId;
    }

    if (resolvedId === requestingUserId) return null;

    const best = await this.resultsRepo.findOne({
      where: { userId: resolvedId, gameType },
      order: { normalizedScore: 'DESC' },
      relations: ['user'],
    });
    if (!best) return null;

    return {
      userId: best.userId,
      nickname: best.user?.nickname ?? '알 수 없음',
      score: best.score,
      normalizedScore: best.normalizedScore,
      scoreTimeline: (best.metadata?.scoreTimeline as [number, number][]) ?? [],
    };
  }
}
