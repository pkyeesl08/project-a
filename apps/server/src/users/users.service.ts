import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { GameResultEntity } from '../games/game-result.entity';

/**
 * 단계별 레벨 구간 정의
 * [maxLevel, xpPerLevel] — 해당 레벨 범위에서 레벨업 1회당 필요 XP
 * Lv 1~10:   100 XP / 레벨
 * Lv 10~30:  300 XP / 레벨
 * Lv 30~50:  600 XP / 레벨
 * Lv 50~70: 1200 XP / 레벨
 * Lv 70~90: 2000 XP / 레벨
 * Lv 90~100:5000 XP / 레벨
 * 누적 Lv100: ≈132,900 XP (일 760 XP 기준 약 175일)
 */
const LEVEL_RANGES: Array<{ from: number; to: number; xpPer: number }> = [
  { from: 1,  to: 10,  xpPer: 100  },
  { from: 10, to: 30,  xpPer: 300  },
  { from: 30, to: 50,  xpPer: 600  },
  { from: 50, to: 70,  xpPer: 1200 },
  { from: 70, to: 90,  xpPer: 2000 },
  { from: 90, to: 100, xpPer: 5000 },
];

/** XP → 레벨 + 구간 내 진행도 계산 */
export function calcLevelFromXp(totalXp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
} {
  if (totalXp < 0) return { level: 1, xpIntoLevel: 0, xpForNextLevel: 100 };
  let remaining = totalXp;
  for (const { from, to, xpPer } of LEVEL_RANGES) {
    const levelsInRange = to - from;
    const totalForRange = levelsInRange * xpPer;
    if (remaining < totalForRange) {
      const levelsEarned = Math.floor(remaining / xpPer);
      return {
        level: from + levelsEarned,
        xpIntoLevel: remaining - levelsEarned * xpPer,
        xpForNextLevel: xpPer,
      };
    }
    remaining -= totalForRange;
  }
  return { level: 100, xpIntoLevel: 0, xpForNextLevel: null };
}

/** 레벨 마일스톤 보상 — 해당 레벨 달성 시 1회 지급 */
export const LEVEL_MILESTONE_REWARDS: Record<number, { coins?: number; gems?: number; titleKey?: string }> = {
  5:   { coins: 500 },
  10:  { coins: 1000, gems: 30 },
  15:  { coins: 500 },
  20:  { coins: 1000, gems: 30 },
  25:  { coins: 500, gems: 20 },
  30:  { coins: 1000, gems: 30 },
  40:  { coins: 1500, gems: 50 },
  50:  { coins: 2000, gems: 80,  titleKey: 'title_half_gamer' },
  60:  { coins: 1500, gems: 50 },
  70:  { coins: 2000, gems: 80 },
  80:  { coins: 2000, gems: 100 },
  90:  { coins: 3000, gems: 150 },
  100: { coins: 5000, gems: 200, titleKey: 'title_legend_gamer' },
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepo: Repository<UserEntity>,
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { id }, relations: ['primaryRegion'] });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByNickname(nickname: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { nickname } });
  }

  /** 닉네임 중복 체크 — 사용 가능하면 true */
  async isNicknameAvailable(nickname: string, excludeUserId?: string): Promise<boolean> {
    const existing = await this.findByNickname(nickname);
    if (!existing) return true;
    // 수정: excludeUserId와 일치하면 본인 것이므로 사용 가능
    if (excludeUserId && existing.id === excludeUserId) return true;
    return false;
  }

  async create(data: {
    email: string;
    nickname: string;
    authProvider: string;
    profileImage: string | null;
  }): Promise<UserEntity> {
    const user = this.usersRepo.create({
      ...data,
      primaryRegionId: '00000000-0000-0000-0000-000000000000',
      eloRating: 1000,
      isPublic: false,
    });
    return this.usersRepo.save(user);
  }

  async updateProfile(userId: string, data: Partial<UserEntity>): Promise<UserEntity> {
    // 서비스 레벨 화이트리스트 — 허용된 필드만 반영 (eloRating, gems, coins 등 민감 필드 차단)
    const ALLOWED: Array<keyof UserEntity> = ['nickname', 'isPublic', 'profileImage'];
    const sanitized: Partial<UserEntity> = {};
    for (const key of ALLOWED) {
      if (key in data) sanitized[key] = (data as any)[key];
    }

    // 닉네임 변경 시 중복 체크
    if (sanitized.nickname) {
      const available = await this.isNicknameAvailable(sanitized.nickname, userId);
      if (!available) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    await this.usersRepo.update(userId, sanitized);
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * GPS 동네 인증 — 쿨다운 체크와 업데이트를 원자적으로 처리
   * @returns true: 성공 / false: 쿨다운 중
   */
  async atomicUpdateRegion(
    userId: string,
    regionId: string,
    cooldownDays: number,
  ): Promise<boolean> {
    const cooldownDate = new Date(Date.now() - cooldownDays * 86400 * 1000);
    const result = await this.usersRepo
      .createQueryBuilder()
      .update(UserEntity)
      .set({ primaryRegionId: regionId, regionChangedAt: new Date() })
      .where(
        'id = :userId AND ("regionChangedAt" IS NULL OR "regionChangedAt" < :cooldownDate)',
        { userId, cooldownDate },
      )
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async updateElo(userId: string, newRating: number): Promise<void> {
    // ELO 범위 클램프 (0 ~ 10,000)
    const clampedRating = Math.max(0, Math.min(10000, newRating));
    await this.usersRepo.update(userId, { eloRating: clampedRating });
  }

  /** 미션/어치브먼트 보상용 ELO 가산 */
  async addElo(userId: string, amount: number): Promise<void> {
    await this.usersRepo
      .createQueryBuilder()
      .update()
      .set({ eloRating: () => `"eloRating" + :safeAmount` })
      .where('id = :userId', { userId, safeAmount: Math.abs(amount) })
      .execute();
  }

  /**
   * XP 부여 & 레벨 자동 갱신
   * 레벨 공식: 구간별 단계적 XP 필요량 (calcLevelFromXp)
   * 레벨 100 달성 누적 XP ≈ 132,900
   */
  async addXp(userId: string, amount: number): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) return { newXp: 0, newLevel: 1, leveledUp: false };

    const prevLevel = user.level;
    const newXp = Math.min(100_000_000, (user.xp ?? 0) + Math.abs(amount));
    const { level: newLevel } = calcLevelFromXp(newXp);

    await this.usersRepo.update(userId, { xp: newXp, level: newLevel });

    // 레벨 마일스톤 보상 — 이전 레벨 초과한 모든 마일스톤 지급
    if (newLevel > prevLevel) {
      for (let lv = prevLevel + 1; lv <= newLevel; lv++) {
        const reward = LEVEL_MILESTONE_REWARDS[lv];
        if (!reward) continue;
        await Promise.allSettled([
          reward.coins ? this.usersRepo.increment({ id: userId }, 'coins', reward.coins) : Promise.resolve(),
          reward.gems  ? this.usersRepo.increment({ id: userId }, 'gems',  reward.gems)  : Promise.resolve(),
        ]);
      }
    }

    return { newXp, newLevel, leveledUp: newLevel > prevLevel };
  }

  async getStats(userId: string, requestingUserId?: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // 본인이 아니고 비공개 프로필이면 거부
    if (userId !== requestingUserId && !user.isPublic) {
      throw new ForbiddenException('비공개 프로필입니다.');
    }

    // 최근 500개로 제한 (전체 조회 방지)
    const results = await this.resultsRepo.find({
      where: { userId },
      order: { playedAt: 'DESC' },
      take: 500,
    });

    const totalGames = results.length;
    const pvpResults = results.filter(r => r.mode === 'pvp');
    const totalWins = pvpResults.filter(r => r.metadata?.won === true).length;
    const winRate = pvpResults.length > 0
      ? Math.round((totalWins / pvpResults.length) * 100)
      : 0;

    // 게임별 최고 기록
    const bestByGame: Record<string, number> = {};
    for (const r of results) {
      if (bestByGame[r.gameType] === undefined || r.normalizedScore > bestByGame[r.gameType]) {
        bestByGame[r.gameType] = r.normalizedScore;
      }
    }
    const bestEntry = Object.entries(bestByGame).sort((a, b) => b[1] - a[1])[0];
    const bestGame = bestEntry ? { gameType: bestEntry[0], score: bestEntry[1] } : null;

    // 연승 계산 (최근 PvP 결과부터)
    let currentStreak = 0;
    for (const r of pvpResults) {
      if (r.metadata?.won === true) currentStreak++;
      else break;
    }

    return {
      totalGames,
      totalWins,
      winRate,
      bestGame,
      currentStreak,
      regionRank: null, // 랭킹 서비스에서 별도 조회
      schoolRank: null,
    };
  }

  async findPublicUsersNearby(lat: number, lng: number, radiusKm: number): Promise<UserEntity[]> {
    // PostGIS 또는 Haversine formula로 주변 유저 검색
    return this.usersRepo
      .createQueryBuilder('user')
      .innerJoin('user.primaryRegion', 'region')
      .where('user.isPublic = :isPublic', { isPublic: true })
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(region.latitude)) * cos(radians(region.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(region.latitude)))) < :radius`,
        { lat, lng, radius: radiusKm },
      )
      .limit(50)
      .getMany();
  }
}
