import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { GameResultEntity } from '../games/game-result.entity';

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
    // 닉네임 변경 시 중복 체크
    if (data.nickname) {
      const available = await this.isNicknameAvailable(data.nickname, userId);
      if (!available) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    await this.usersRepo.update(userId, data);
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
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
      .set({ eloRating: () => `"eloRating" + ${Math.abs(amount)}` })
      .where('id = :userId', { userId })
      .execute();
  }

  /**
   * XP 부여 & 레벨 자동 갱신
   * 레벨 공식: level = floor(sqrt(xp / 50)) + 1 (최대 100)
   */
  async addXp(userId: string, amount: number): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) return { newXp: 0, newLevel: 1, leveledUp: false };

    const prevLevel = user.level;
    // XP 상한 적용 (100,000,000)
    const newXp = Math.min(100_000_000, (user.xp ?? 0) + Math.abs(amount));
    const newLevel = Math.min(100, Math.floor(Math.sqrt(newXp / 50)) + 1);

    await this.usersRepo.update(userId, { xp: newXp, level: newLevel });
    return { newXp, newLevel, leveledUp: newLevel > prevLevel };
  }

  async getStats(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const results = await this.resultsRepo.find({
      where: { userId },
      order: { playedAt: 'DESC' },
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
