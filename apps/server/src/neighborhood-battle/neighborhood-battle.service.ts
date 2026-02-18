import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { NeighborhoodBattleEntity } from './neighborhood-battle.entity';

export interface BattleRankEntry {
  rank: number;
  userId: string;
  nickname: string;
  contribution: number;
  regionId: string;
}

@Injectable()
export class NeighborhoodBattleService {
  /** 지역별 기여 점수: Map<battleId, Map<userId, { nickname, regionId, score }>> */
  private contributions = new Map<string, Map<string, { nickname: string; regionId: string; score: number }>>();

  constructor(
    @InjectRepository(NeighborhoodBattleEntity)
    private readonly repo: Repository<NeighborhoodBattleEntity>,
  ) {}

  /** 현재 활성 대항전 조회 (내 지역이 A 또는 B인 것) */
  async getCurrentBattle(regionId: string): Promise<NeighborhoodBattleEntity> {
    const now = new Date();
    const battle = await this.repo.findOne({
      where: [
        { regionAId: regionId, isActive: true },
        { regionBId: regionId, isActive: true },
      ],
      order: { startAt: 'DESC' },
    });
    if (battle) return battle;

    // 활성 대항전이 없으면 자동 생성 (현재 지역 vs 인접 더미 지역)
    return this.createBattle(regionId, `${regionId}-rival`);
  }

  /** 대항전 생성 */
  async createBattle(
    regionAId: string,
    regionBId: string,
    regionAName = '우리 동네',
    regionBName = '상대 동네',
  ): Promise<NeighborhoodBattleEntity> {
    const now = new Date();
    const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일 후
    const battle = this.repo.create({
      regionAId, regionBId, regionAName, regionBName,
      startAt: now, endAt, isActive: true,
    });
    return this.repo.save(battle);
  }

  /** 기여 점수 적립 (게임 결과 제출 시 호출) */
  async contribute(
    battleId: string,
    userId: string,
    nickname: string,
    regionId: string,
    score: number,
  ): Promise<void> {
    const battle = await this.repo.findOneBy({ id: battleId });
    if (!battle || !battle.isActive) return;

    // 기여 점수 누적 (In-memory — 프로덕션에서는 Redis 권장)
    if (!this.contributions.has(battleId)) {
      this.contributions.set(battleId, new Map());
    }
    const map = this.contributions.get(battleId)!;
    const prev = map.get(userId) ?? { nickname, regionId, score: 0 };
    map.set(userId, { nickname, regionId, score: prev.score + score });

    // 지역 총점 갱신
    if (regionId === battle.regionAId) {
      await this.repo.update(battleId, { regionAScore: battle.regionAScore + score });
    } else if (regionId === battle.regionBId) {
      await this.repo.update(battleId, { regionBScore: battle.regionBScore + score });
    }
  }

  /** 대항전 기여 랭킹 (특정 지역) */
  async getBattleRankings(battleId: string, regionId?: string): Promise<BattleRankEntry[]> {
    const map = this.contributions.get(battleId);
    if (!map) return [];

    const entries = Array.from(map.entries())
      .filter(([, v]) => !regionId || v.regionId === regionId)
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((e, i) => ({
        rank: i + 1,
        userId: e.userId,
        nickname: e.nickname,
        contribution: e.score,
        regionId: e.regionId,
      }));

    return entries;
  }

  /** 종료된 대항전 정리 (스케줄러에서 주기적 호출 가능) */
  async finalizeExpired(): Promise<void> {
    const now = new Date();
    const expired = await this.repo.find({
      where: { isActive: true },
    });
    for (const b of expired) {
      if (new Date(b.endAt) <= now) {
        const winnerId = b.regionAScore >= b.regionBScore ? b.regionAId : b.regionBId;
        await this.repo.update(b.id, { isActive: false, winnerId });
        this.contributions.delete(b.id);
      }
    }
  }
}
