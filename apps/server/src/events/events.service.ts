import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { NeighborhoodEventEntity } from './neighborhood-event.entity';
import { GameResultEntity } from '../games/game-result.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(NeighborhoodEventEntity)
    private eventRepo: Repository<NeighborhoodEventEntity>,
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
    private usersService: UsersService,
  ) {}

  /** 현재 진행 중인 이벤트 목록 */
  async getActiveEvents(regionId?: string) {
    const now = new Date();
    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.isActive = true')
      .andWhere('e.startAt <= :now', { now })
      .andWhere('e.endAt >= :now', { now })
      .orderBy('e.startAt', 'DESC');

    if (regionId) {
      qb.andWhere('(e.regionId = :regionId OR e.regionId = :global)', {
        regionId,
        global: '00000000-0000-0000-0000-000000000000', // 전국 이벤트
      });
    }

    return qb.getMany();
  }

  /** 이벤트 랭킹 (이벤트 기간 내 최고 기록) */
  async getEventRankings(eventId: string, limit = 50) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    const qb = this.resultsRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.user', 'user')
      .select(['user.id', 'user.nickname', 'user.profileImage'])
      .addSelect('MAX(r.normalizedScore)', 'bestScore')
      .where('r.playedAt >= :start', { start: event.startAt })
      .andWhere('r.playedAt <= :end', { end: event.endAt })
      .andWhere('r.regionId = :regionId', { regionId: event.regionId })
      .groupBy('user.id')
      .groupBy('user.nickname')
      .groupBy('user.profileImage')
      .orderBy('bestScore', 'DESC')
      .limit(Math.min(limit, 100));

    if (event.gameType !== 'all') {
      qb.andWhere('r.gameType = :gameType', { gameType: event.gameType });
    }

    const raw = await qb.getRawMany();
    return {
      event,
      rankings: raw.map((row, i) => ({
        rank: i + 1,
        userId: row['user_id'],
        nickname: row['user_nickname'],
        profileImage: row['user_profileImage'],
        bestScore: parseInt(row['bestScore'] ?? '0'),
      })),
    };
  }

  /** 내 이벤트 순위 */
  async getMyEventRank(eventId: string, userId: string) {
    const result = await this.getEventRankings(eventId, 200);
    const idx = result.rankings.findIndex(r => r.userId === userId);
    return {
      event: result.event,
      rank: idx === -1 ? null : idx + 1,
      total: result.rankings.length,
      score: idx === -1 ? 0 : result.rankings[idx].bestScore,
    };
  }

  /** 이벤트 생성 (관리자용) */
  async createEvent(data: {
    regionId: string;
    title: string;
    description: string;
    gameType?: string;
    startAt: Date;
    endAt: Date;
    topN?: number;
    rewardElo?: number;
  }) {
    const event = this.eventRepo.create({
      ...data,
      gameType: data.gameType ?? 'all',
      topN: data.topN ?? 3,
      rewardElo: data.rewardElo ?? 50,
      isActive: true,
    });
    return this.eventRepo.save(event);
  }

  /** 이벤트 종료 처리 및 보상 지급 */
  async finalizeEvent(eventId: string) {
    // 원자적 상태 변경 — 동시 요청 중 한 번만 성공하여 중복 보상 지급 방지
    const updateResult = await this.eventRepo
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('id = :id AND "isActive" = true', { id: eventId })
      .execute();

    if (!updateResult.affected || updateResult.affected === 0) {
      throw new ConflictException('이미 종료된 이벤트이거나 존재하지 않습니다.');
    }

    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('이벤트를 찾을 수 없습니다.');

    const result = await this.getEventRankings(eventId, event.topN);
    const winners = result.rankings.slice(0, event.topN);

    // 순위별 보상 (1위=100%, 2위=60%, 3위=40%)
    const rates = [1.0, 0.6, 0.4];
    const rewards: { userId: string; rank: number; eloReward: number }[] = [];

    for (let i = 0; i < winners.length; i++) {
      const rate = rates[i] ?? 0.2;
      const eloReward = Math.round(event.rewardElo * rate);
      await this.usersService.addElo(winners[i].userId, eloReward);
      rewards.push({ userId: winners[i].userId, rank: i + 1, eloReward });
    }

    return { finalized: true, rewards };
  }
}
