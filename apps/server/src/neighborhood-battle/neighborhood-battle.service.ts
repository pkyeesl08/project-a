import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeighborhoodBattleEntity } from './neighborhood-battle.entity';

export interface BattleRankEntry {
  rank: number;
  userId: string;
  nickname: string;
  contribution: number;
  regionId: string;
}

/** 오늘 자정 기준 KST Date */
function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrowMidnight(): Date {
  const d = todayMidnight();
  d.setDate(d.getDate() + 1);
  return d;
}

@Injectable()
export class NeighborhoodBattleService {
  /** 지역별 기여 점수: Map<battleId, Map<userId, { nickname, regionId, score }>> */
  private contributions = new Map<string, Map<string, { nickname: string; regionId: string; score: number }>>();

  constructor(
    @InjectRepository(NeighborhoodBattleEntity)
    private readonly repo: Repository<NeighborhoodBattleEntity>,
  ) {}

  /** 오늘의 활성 대항전 조회 (자정 마감, 없으면 자동 생성) */
  async getCurrentBattle(regionId: string): Promise<NeighborhoodBattleEntity & { myContribution?: number }> {
    const today = todayMidnight();
    const tomorrow = tomorrowMidnight();

    const battle = await this.repo.findOne({
      where: [
        { regionAId: regionId, isActive: true },
        { regionBId: regionId, isActive: true },
      ],
      order: { startAt: 'DESC' },
    });

    // 오늘 배틀이 이미 있으면 반환
    if (battle && new Date(battle.startAt) >= today) {
      return battle;
    }

    // 기존 배틀 만료 처리
    if (battle) {
      await this.finalizeExpired();
    }

    // 오늘 배틀 신규 생성
    return this.createDailyBattle(regionId, `${regionId}-rival`);
  }

  /** 오늘 하루짜리(자정 마감) 배틀 생성 */
  async createDailyBattle(
    regionAId: string,
    regionBId: string,
    regionAName = '우리 동네',
    regionBName = '상대 동네',
  ): Promise<NeighborhoodBattleEntity> {
    const startAt = todayMidnight();
    const endAt   = tomorrowMidnight();

    const battle = this.repo.create({
      regionAId, regionBId, regionAName, regionBName,
      startAt, endAt, isActive: true,
      regionAScore: 0, regionBScore: 0,
    });
    return this.repo.save(battle);
  }

  /** 기여 점수 적립 — 게임 결과 제출 시 자동 호출 */
  async contribute(
    battleId: string,
    userId: string,
    nickname: string,
    regionId: string,
    score: number,
  ): Promise<void> {
    const battle = await this.repo.findOneBy({ id: battleId });
    if (!battle || !battle.isActive) return;

    if (!this.contributions.has(battleId)) {
      this.contributions.set(battleId, new Map());
    }
    const map = this.contributions.get(battleId)!;
    const prev = map.get(userId) ?? { nickname, regionId, score: 0 };
    const newScore = prev.score + score;
    map.set(userId, { nickname, regionId, score: newScore });

    if (regionId === battle.regionAId) {
      await this.repo.increment({ id: battleId }, 'regionAScore', score);
    } else if (regionId === battle.regionBId) {
      await this.repo.increment({ id: battleId }, 'regionBScore', score);
    }
  }

  /** 배틀 기여 랭킹 (특정 지역 필터링 가능) */
  async getBattleRankings(battleId: string, regionId?: string): Promise<BattleRankEntry[]> {
    const map = this.contributions.get(battleId);
    if (!map) return [];

    return Array.from(map.entries())
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
  }

  /** 내 기여 점수 조회 */
  getMyContribution(battleId: string, userId: string): number {
    return this.contributions.get(battleId)?.get(userId)?.score ?? 0;
  }

  /** 만료된 배틀 정산 */
  async finalizeExpired(): Promise<void> {
    const now = new Date();
    const active = await this.repo.find({ where: { isActive: true } });
    for (const b of active) {
      if (new Date(b.endAt) <= now) {
        const winnerId = b.regionAScore >= b.regionBScore ? b.regionAId : b.regionBId;
        await this.repo.update(b.id, { isActive: false, winnerId });
        this.contributions.delete(b.id);
      }
    }
  }
}
