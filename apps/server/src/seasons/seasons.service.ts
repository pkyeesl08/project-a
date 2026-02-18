import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonEntity } from '../games/season.entity';
import { GameResultEntity } from '../games/game-result.entity';

@Injectable()
export class SeasonsService {
  constructor(
    @InjectRepository(SeasonEntity)
    private seasonRepo: Repository<SeasonEntity>,
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
  ) {}

  /** 현재 활성 시즌 조회 */
  async getCurrentSeason(): Promise<SeasonEntity | null> {
    const now = new Date();
    return this.seasonRepo.findOne({
      where: { isActive: true },
      order: { startDate: 'DESC' },
    });
  }

  /** 현재 시즌 ID (없으면 null) */
  async getCurrentSeasonId(): Promise<string | null> {
    const season = await this.getCurrentSeason();
    return season?.id ?? null;
  }

  /** 시즌 목록 */
  async getSeasons(): Promise<SeasonEntity[]> {
    return this.seasonRepo.find({ order: { startDate: 'DESC' } });
  }

  /** 시즌별 상위 랭킹 (게임 결과 집계) */
  async getSeasonRankings(seasonId: string, gameType: string, limit = 50) {
    const season = await this.seasonRepo.findOne({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('시즌을 찾을 수 없습니다.');

    const qb = this.resultsRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.user', 'user')
      .select(['user.id', 'user.nickname', 'user.profileImage'])
      .addSelect('MAX(r.normalizedScore)', 'bestScore')
      .addSelect('COUNT(r.id)', 'gamesPlayed')
      .where('r.seasonId = :seasonId', { seasonId })
      .groupBy('user.id')
      .groupBy('user.nickname')
      .groupBy('user.profileImage')
      .orderBy('bestScore', 'DESC')
      .limit(Math.min(limit, 100));

    if (gameType !== 'all') {
      qb.andWhere('r.gameType = :gameType', { gameType });
    }

    const raw = await qb.getRawMany();
    return raw.map((row, i) => ({
      rank: i + 1,
      userId: row['user_id'],
      nickname: row['user_nickname'],
      profileImage: row['user_profileImage'],
      bestScore: parseInt(row['bestScore'] ?? '0'),
      gamesPlayed: parseInt(row['gamesPlayed'] ?? '0'),
    }));
  }

  /** 새 시즌 시작 (관리자용) */
  async startSeason(name: string, durationDays = 30): Promise<SeasonEntity> {
    // 기존 활성 시즌 종료
    await this.seasonRepo.update({ isActive: true }, { isActive: false });

    const now = new Date();
    const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const season = this.seasonRepo.create({
      name,
      startDate: now,
      endDate: end,
      isActive: true,
    });
    return this.seasonRepo.save(season);
  }

  /** 시즌 종료 */
  async endSeason(seasonId: string): Promise<SeasonEntity> {
    const season = await this.seasonRepo.findOne({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('시즌을 찾을 수 없습니다.');
    season.isActive = false;
    season.endDate = new Date();
    return this.seasonRepo.save(season);
  }

  /** 내 시즌 순위 조회 */
  async getMySeasonRank(seasonId: string, userId: string, gameType: string) {
    const qb = this.resultsRepo
      .createQueryBuilder('r')
      .select('r.userId', 'userId')
      .addSelect('MAX(r.normalizedScore)', 'bestScore')
      .where('r.seasonId = :seasonId', { seasonId })
      .groupBy('r.userId')
      .orderBy('bestScore', 'DESC');

    if (gameType !== 'all') {
      qb.andWhere('r.gameType = :gameType', { gameType });
    }

    const all = await qb.getRawMany();
    const idx = all.findIndex(r => r.userId === userId);
    if (idx === -1) return null;

    return {
      rank: idx + 1,
      total: all.length,
      bestScore: parseInt(all[idx]['bestScore'] ?? '0'),
    };
  }
}
