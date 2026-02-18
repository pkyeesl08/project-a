import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AchievementEntity, AchievementType, ACHIEVEMENT_DEFINITIONS } from './achievement.entity';
import { UsersService } from '../users/users.service';
import { AvatarService } from '../avatar/avatar.service';
import { AcquireMethod } from '../avatar/avatar-item.entity';

/** 업적 달성 시 자동 지급할 아바타 아이템 assetKey 목록 */
const ACHIEVEMENT_ITEM_REWARDS: Partial<Record<AchievementType, string[]>> = {
  [AchievementType.REGION_TOP1]:     ['frame_region_legend', 'title_goat'],
  [AchievementType.PVP_CHAMPION]:    ['frame_pvp_champ'],
  [AchievementType.SPEED_DEMON]:     ['title_speed_monster'],
};

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(AchievementEntity)
    private achievementRepo: Repository<AchievementEntity>,
    private usersService: UsersService,
    private avatarService: AvatarService,
  ) {}

  /** 유저의 전체 업적 조회 */
  async getUserAchievements(userId: string) {
    const unlocked = await this.achievementRepo.find({
      where: { userId },
      order: { unlockedAt: 'DESC' },
    });

    const unlockedTypes = new Set(unlocked.map(a => a.type));

    // 미달성 목록도 함께 반환
    const all = Object.values(AchievementType).map(type => ({
      type,
      ...ACHIEVEMENT_DEFINITIONS[type],
      isUnlocked: unlockedTypes.has(type),
      unlockedAt: unlocked.find(a => a.type === type)?.unlockedAt ?? null,
    }));

    return {
      unlocked: unlocked.length,
      total: all.length,
      achievements: all,
    };
  }

  /**
   * 게임 결과 후 업적 체크 & 잠금 해제
   * games.service.ts에서 호출
   */
  async checkAfterGame(userId: string, data: {
    gameType: string;
    normalizedScore: number;
    rawScore: number;
    mode: string;
    isNewHighScore: boolean;
    totalGames: number;
    pvpWins: number;
    pvpStreak: number;
    regionRank: number | null;
    uniqueGameTypes: number;
  }) {
    const toUnlock: AchievementType[] = [];

    if (data.totalGames === 1) toUnlock.push(AchievementType.FIRST_BLOOD);
    if (data.totalGames >= 100) toUnlock.push(AchievementType.VETERAN_100);
    if (data.gameType === 'speed_tap' && data.rawScore >= 50) toUnlock.push(AchievementType.SPEED_DEMON);
    if (data.gameType === 'rapid_aim' && data.normalizedScore >= 10000) toUnlock.push(AchievementType.PERFECT_AIM);
    if (data.gameType === 'reverse_memory' && data.rawScore >= 5) toUnlock.push(AchievementType.MEMORY_KING);
    if (data.gameType === 'sequence_tap' && data.normalizedScore >= 8571) toUnlock.push(AchievementType.SEQUENCE_MASTER); // 6000/7000*10000
    if (data.gameType === 'timing_hit' && data.rawScore >= 95) toUnlock.push(AchievementType.TIMING_ACE);
    if (data.pvpWins >= 10) toUnlock.push(AchievementType.PVP_CHAMPION);
    if (data.pvpStreak >= 5) toUnlock.push(AchievementType.WINNING_STREAK_5);
    if (data.regionRank !== null && data.regionRank <= 10) toUnlock.push(AchievementType.REGION_TOP10);
    if (data.regionRank === 1) toUnlock.push(AchievementType.REGION_TOP1);
    if (data.uniqueGameTypes >= 20) toUnlock.push(AchievementType.GAME_COLLECTOR);
    if (data.normalizedScore >= 9000) toUnlock.push(AchievementType.HIGH_SCORER);

    const newlyUnlocked = await this.unlockBatch(userId, toUnlock);
    return newlyUnlocked;
  }

  /** 미션 연속 완료 업적 체크 */
  async checkMissionStreak(userId: string, streakDays: number) {
    const toUnlock: AchievementType[] = [];
    if (streakDays >= 3) toUnlock.push(AchievementType.MISSION_STREAK_3);
    if (streakDays >= 7) toUnlock.push(AchievementType.MISSION_STREAK_7);
    return this.unlockBatch(userId, toUnlock);
  }

  /** 배치 업적 잠금 해제 (이미 달성한 건 무시) */
  private async unlockBatch(userId: string, types: AchievementType[]) {
    if (types.length === 0) return [];

    const existing = await this.achievementRepo.find({ where: { userId } });
    const existingTypes = new Set(existing.map(a => a.type));

    const newTypes = types.filter(t => !existingTypes.has(t));
    if (newTypes.length === 0) return [];

    const entities = newTypes.map(type => this.achievementRepo.create({ userId, type, metadata: null }));
    const saved = await this.achievementRepo.save(entities);

    // ELO 보상 지급
    const totalElo = newTypes.reduce((sum, t) => sum + ACHIEVEMENT_DEFINITIONS[t].rewardElo, 0);
    if (totalElo > 0) {
      await this.usersService.addElo(userId, totalElo);
    }

    // 업적 연계 아바타 아이템 자동 지급
    const itemGrants: Promise<any>[] = [];
    for (const type of newTypes) {
      const keys = ACHIEVEMENT_ITEM_REWARDS[type];
      if (keys) {
        for (const key of keys) {
          itemGrants.push(
            this.avatarService.grantItemByKey(userId, key, AcquireMethod.ACHIEVEMENT),
          );
        }
      }
    }
    await Promise.allSettled(itemGrants);

    return saved.map(a => ({
      type: a.type,
      ...ACHIEVEMENT_DEFINITIONS[a.type],
      itemsGranted: (ACHIEVEMENT_ITEM_REWARDS[a.type] ?? []),
    }));
  }
}
