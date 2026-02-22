import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMissionEntity, MissionType, MISSION_DEFINITIONS } from './mission.entity';
import { GameResultEntity } from '../games/game-result.entity';
import { UsersService } from '../users/users.service';
import { AvatarService } from '../avatar/avatar.service';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(DailyMissionEntity)
    private missionRepo: Repository<DailyMissionEntity>,
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
    private usersService: UsersService,
    private avatarService: AvatarService,
  ) {}

  private today(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /** 오늘 미션 조회 (없으면 생성) */
  async getDailyMissions(userId: string) {
    const date = this.today();

    // 오늘 미션 있는지 확인
    const existing = await this.missionRepo.find({
      where: { userId, missionDate: date },
    });

    if (existing.length === Object.keys(MissionType).length) {
      return this.formatMissions(existing);
    }

    // 없는 미션 유형만 생성
    const existingTypes = new Set(existing.map(m => m.missionType));
    const toCreate = Object.values(MissionType)
      .filter(t => !existingTypes.has(t))
      .map(type => this.missionRepo.create({
        userId,
        missionType: type,
        missionDate: date,
        currentValue: 0,
        targetValue: MISSION_DEFINITIONS[type].targetValue,
        isCompleted: false,
        rewardClaimed: false,
        completedAt: null,
      }));

    const created = await this.missionRepo.save(toCreate);
    return this.formatMissions([...existing, ...created]);
  }

  private formatMissions(missions: DailyMissionEntity[]) {
    return missions.map(m => ({
      id: m.id,
      type: m.missionType,
      ...MISSION_DEFINITIONS[m.missionType],
      currentValue: m.currentValue,
      isCompleted: m.isCompleted,
      rewardClaimed: m.rewardClaimed,
      completedAt: m.completedAt,
    }));
  }

  /**
   * 게임 결과 후 미션 진행도 갱신
   * games.service.ts에서 호출
   */
  async handleGameResult(userId: string, data: {
    gameType: string;
    mode: string;
    isNewHighScore: boolean;
    won?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const date = this.today();
    await this.getDailyMissions(userId); // 없으면 생성

    const missions = await this.missionRepo.find({
      where: { userId, missionDate: date, isCompleted: false },
    });

    const updates: Promise<any>[] = [];

    for (const mission of missions) {
      let increment = 0;

      switch (mission.missionType) {
        case MissionType.PLAY_3_GAMES:
          increment = 1;
          break;

        case MissionType.WIN_2_PVP:
          // PvP 제거 후 Endless 모드 달성 미션으로 전환
          if (data.metadata?.subMode === 'endless') increment = 1;
          break;

        case MissionType.NEW_HIGHSCORE:
          if (data.isNewHighScore) increment = 1;
          break;

        case MissionType.PLAY_3_TYPES:
          // 오늘 이미 플레이한 게임 타입 수 체크
          increment = await this.countUniqueTodayGameTypes(userId, date, data.gameType);
          if (increment > 0) {
            // 누적이 아닌 총 고유 타입 수로 설정
            const newCurrent = Math.max(mission.currentValue, increment);
            if (newCurrent > mission.currentValue) {
              mission.currentValue = newCurrent;
              if (newCurrent >= mission.targetValue && !mission.isCompleted) {
                mission.isCompleted = true;
                mission.completedAt = new Date();
              }
              updates.push(this.missionRepo.save(mission));
            }
            continue;
          }
          break;
      }

      if (increment > 0) {
        mission.currentValue = Math.min(
          mission.currentValue + increment,
          mission.targetValue,
        );
        if (mission.currentValue >= mission.targetValue && !mission.isCompleted) {
          mission.isCompleted = true;
          mission.completedAt = new Date();
        }
        updates.push(this.missionRepo.save(mission));
      }
    }

    await Promise.allSettled(updates);
  }

  /** 오늘 플레이한 고유 게임 타입 수 (DB에서 실제 집계) */
  private async countUniqueTodayGameTypes(userId: string, date: string, justPlayed: string): Promise<number> {
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(`${date}T23:59:59.999Z`);
    const raw = await this.resultsRepo
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r."gameType")', 'count')
      .where('r."userId" = :userId AND r."playedAt" >= :from AND r."playedAt" <= :to', { userId, from, to })
      .getRawOne<{ count: string }>();
    return parseInt(raw?.count ?? '0', 10);
  }

  /** 미션 보상 수령 — 원자적 UPDATE로 Race Condition 방지 */
  async claimReward(userId: string, missionId: string) {
    // 1단계: 완료됐지만 아직 미수령인 미션인지 먼저 확인 (읽기만)
    const mission = await this.missionRepo.findOne({
      where: { id: missionId, userId },
    });

    if (!mission) return { claimed: false, reason: '미션을 찾을 수 없습니다.' };
    if (!mission.isCompleted) return { claimed: false, reason: '미션을 완료하지 않았습니다.' };
    if (mission.rewardClaimed) return { claimed: false, reason: '이미 보상을 수령했습니다.' };

    // 2단계: WHERE rewardClaimed = false 조건부 UPDATE — 동시 요청 시 하나만 성공
    const result = await this.missionRepo
      .createQueryBuilder()
      .update()
      .set({ rewardClaimed: true })
      .where('id = :id AND "userId" = :userId AND "rewardClaimed" = false AND "isCompleted" = true', {
        id: missionId,
        userId,
      })
      .execute();

    if (!result.affected || result.affected === 0) {
      return { claimed: false, reason: '이미 보상을 수령했거나 조건이 맞지 않습니다.' };
    }

    const def = MISSION_DEFINITIONS[mission.missionType];
    await Promise.allSettled([
      this.usersService.addElo(userId, def.rewardElo),
      this.avatarService.addCoins(userId, def.rewardCoins),
      this.usersService.addXp(userId, def.rewardXp),
    ]);

    return {
      claimed: true,
      rewardElo: def.rewardElo,
      rewardCoins: def.rewardCoins,
      rewardXp: def.rewardXp,
      missionTitle: def.title,
    };
  }

  /** 오늘 완료된 미션 수 */
  async getCompletedCount(userId: string): Promise<number> {
    const date = this.today();
    return this.missionRepo.count({
      where: { userId, missionDate: date, isCompleted: true },
    });
  }
}
