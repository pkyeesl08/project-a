import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from './game-result.entity';
import { UsersService } from '../users/users.service';
import { RankingsService } from '../rankings/rankings.service';
import { normalizeScore, calculateElo, calculateSoloEloAdjustment, GameType, GAME_CONFIGS } from '@donggamerank/shared';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
    private usersService: UsersService,
    private rankingsService: RankingsService,
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

    const result = this.resultsRepo.create({
      userId,
      gameType: data.gameType,
      score: data.score,
      normalizedScore: normalized,
      mode: data.mode,
      opponentId: data.opponentId ?? null,
      matchId: data.matchId ?? null,
      regionId: user.primaryRegionId,
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
      // 솔로 모드 — 저장 전 통계 사용 (0 나누기 방지됨)
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

    return {
      resultId: saved.id,
      rankChange: eloChange,
      newElo,
      regionRank: regionRankInfo?.rank ?? null,
      isNewHighScore,
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

  getGameTypes() {
    return Object.values(GAME_CONFIGS);
  }
}
