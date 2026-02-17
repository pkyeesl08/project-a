import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepo: Repository<UserEntity>,
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
    return excludeUserId ? existing.id === excludeUserId : false;
  }

  async create(data: {
    email: string;
    nickname: string;
    authProvider: string;
    profileImage: string | null;
  }): Promise<UserEntity> {
    // 닉네임 충돌 시 숫자 붙여서 재시도
    let finalNickname = data.nickname;
    let attempts = 0;
    while (!(await this.isNicknameAvailable(finalNickname)) && attempts < 10) {
      finalNickname = `${data.nickname}${Math.floor(Math.random() * 9999)}`;
      attempts++;
    }

    const user = this.usersRepo.create({
      ...data,
      nickname: finalNickname,
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
    await this.usersRepo.update(userId, { eloRating: newRating });
  }

  async getStats(userId: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // TODO: game_results에서 통계 집계
    return {
      totalGames: 0,
      totalWins: 0,
      winRate: 0,
      bestGame: null,
      currentStreak: 0,
      regionRank: null,
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
