import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from './game-result.entity';
import { GameType, GAME_CONFIGS } from '@donggamerank/shared';

const ALL_TYPES = Object.values(GameType);

/** 날짜 기반 결정론적 게임 타입 선택 (같은 날이면 전국 동일) */
function getDailyGameType(): GameType {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return ALL_TYPES[seed % ALL_TYPES.length];
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class DailyGameService {
  constructor(
    @InjectRepository(GameResultEntity)
    private readonly resultsRepo: Repository<GameResultEntity>,
  ) {}

  /** 오늘의 게임 타입 + 설정 + 마감 시간 반환 */
  getTodayGame() {
    const gameType = getDailyGameType();
    const config = GAME_CONFIGS[gameType];
    const endAt = new Date();
    endAt.setHours(23, 59, 59, 999);
    return { gameType, config, date: todayKey(), endAt };
  }

  /** 오늘 이미 플레이했는지 확인 */
  async checkAttempted(userId: string): Promise<boolean> {
    const count = await this.resultsRepo
      .createQueryBuilder('r')
      .where('r.userId = :userId', { userId })
      .andWhere('r.gameType = :gameType', { gameType: getDailyGameType() })
      .andWhere(`r.metadata IS NOT NULL AND r.metadata->>'subMode' = 'daily'`)
      .andWhere('r.playedAt >= :since', { since: todayStart() })
      .getCount();
    return count > 0;
  }

  /** 오늘의 리더보드 (지역 필터 선택) */
  async getDailyLeaderboard(regionId?: string, limit = 50) {
    const gameType = getDailyGameType();
    const qb = this.resultsRepo
      .createQueryBuilder('r')
      .innerJoin('r.user', 'u')
      .select([
        'u.id AS "userId"',
        'u.nickname AS nickname',
        'r.normalizedScore AS score',
      ])
      .where('r.gameType = :gameType', { gameType })
      .andWhere(`r.metadata IS NOT NULL AND r.metadata->>'subMode' = 'daily'`)
      .andWhere('r.playedAt >= :since', { since: todayStart() })
      .orderBy('r.normalizedScore', 'DESC')
      .limit(Math.min(limit, 100));

    if (regionId) {
      qb.andWhere('r.regionId = :regionId', { regionId });
    }

    const rows = await qb.getRawMany();
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: r.nickname,
      score: Number(r.score),
    }));
  }

  /** 내 오늘 순위 조회 */
  async getMyDailyRank(userId: string, regionId?: string) {
    const all = await this.getDailyLeaderboard(regionId, 1000);
    const idx = all.findIndex(e => e.userId === userId);
    if (idx === -1) return null;
    return { rank: idx + 1, total: all.length, score: all[idx].score };
  }
}
