import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from './game-result.entity';
import { UsersService } from '../users/users.service';
import { RankingsService } from '../rankings/rankings.service';
import { SeasonsService } from '../seasons/seasons.service';
import { MissionsService } from '../missions/missions.service';
import { AchievementsService } from '../achievements/achievements.service';
import { normalizeScore, calculateElo, calculateSoloEloAdjustment, GameType, GAME_CONFIGS } from '@donggamerank/shared';

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

    Promise.allSettled([
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
}
