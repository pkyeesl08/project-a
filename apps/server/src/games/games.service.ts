import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from './game-result.entity';
import { UsersService } from '../users/users.service';
import { normalizeScore, calculateElo, calculateSoloEloAdjustment, GameType, GAME_CONFIGS } from '@donggamerank/shared';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
    private usersService: UsersService,
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
    if (!user) throw new Error('User not found');

    const normalized = normalizeScore(data.gameType as GameType, data.score);

    const result = this.resultsRepo.create({
      userId,
      gameType: data.gameType,
      score: data.score,
      normalizedScore: normalized,
      mode: data.mode,
      opponentId: data.opponentId || null,
      matchId: data.matchId || null,
      regionId: user.primaryRegionId,
      metadata: data.metadata || null,
    });

    const saved = await this.resultsRepo.save(result);

    // ELO 업데이트
    let eloChange = 0;
    let newElo = user.eloRating;

    if (data.mode === 'pvp' && data.opponentId) {
      const opponent = await this.usersService.findById(data.opponentId);
      if (opponent) {
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
      // 솔로 모드
      const stats = await this.getPersonalStats(userId, data.gameType);
      const soloResult = calculateSoloEloAdjustment(
        user.eloRating, normalized, stats.best, stats.average,
      );
      newElo = soloResult.newRating;
      eloChange = soloResult.change;
    }

    await this.usersService.updateElo(userId, newElo);

    return {
      resultId: saved.id,
      rankChange: eloChange,
      newElo,
      regionRank: 0, // TODO: Redis에서 조회
      isNewHighScore: false, // TODO: 개인 최고 기록 비교
    };
  }

  async getHistory(userId: string, limit = 20, offset = 0) {
    const [items, total] = await this.resultsRepo.findAndCount({
      where: { userId },
      order: { playedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total, page: Math.floor(offset / limit) + 1, limit, hasMore: offset + limit < total };
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
