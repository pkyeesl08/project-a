import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum AchievementType {
  // 게임 입문
  FIRST_BLOOD       = 'first_blood',       // 첫 게임 완료
  VETERAN_100       = 'veteran_100',        // 총 100게임 플레이
  // 개인 기록
  SPEED_DEMON       = 'speed_demon',        // 스피드 탭 50회 이상 달성
  PERFECT_AIM       = 'perfect_aim',        // 연속 조준 800점 만점
  MEMORY_KING       = 'memory_king',        // 역순 기억 5/5 달성
  SEQUENCE_MASTER   = 'sequence_master',    // 순서대로 탭 6000점 이상
  TIMING_ACE        = 'timing_ace',         // 타이밍 히트 95점 이상
  // PvP
  PVP_CHAMPION      = 'pvp_champion',       // PvP 10승
  WINNING_STREAK_5  = 'winning_streak_5',   // PvP 5연승
  // 미션/일일
  MISSION_STREAK_3  = 'mission_streak_3',   // 3일 연속 모든 미션 완료
  MISSION_STREAK_7  = 'mission_streak_7',   // 7일 연속 모든 미션 완료
  // 랭킹
  REGION_TOP10      = 'region_top10',       // 동네 랭킹 10위 이내
  REGION_TOP1       = 'region_top1',        // 동네 랭킹 1위
  // 다양성
  GAME_COLLECTOR    = 'game_collector',     // 20종 게임 플레이
  HIGH_SCORER       = 'high_scorer',        // 어떤 게임이든 9000점 이상
}

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, {
  title: string;
  description: string;
  icon: string;
  rewardElo: number;
}> = {
  [AchievementType.FIRST_BLOOD]: {
    title: '첫 발걸음',
    description: '첫 게임을 완료했습니다!',
    icon: '🎮', rewardElo: 5,
  },
  [AchievementType.VETERAN_100]: {
    title: '백전노장',
    description: '총 100게임을 플레이했습니다.',
    icon: '🏅', rewardElo: 30,
  },
  [AchievementType.SPEED_DEMON]: {
    title: '스피드 악마',
    description: '스피드 탭에서 50회 이상 달성!',
    icon: '⚡', rewardElo: 20,
  },
  [AchievementType.PERFECT_AIM]: {
    title: '퍼펙트 에이머',
    description: '연속 조준에서 800점 만점 달성!',
    icon: '🎯', rewardElo: 30,
  },
  [AchievementType.MEMORY_KING]: {
    title: '기억의 왕',
    description: '역순 기억에서 5/5 완벽 달성!',
    icon: '🧠', rewardElo: 25,
  },
  [AchievementType.SEQUENCE_MASTER]: {
    title: '시퀀스 마스터',
    description: '순서대로 탭에서 6000점 이상!',
    icon: '🔢', rewardElo: 20,
  },
  [AchievementType.TIMING_ACE]: {
    title: '타이밍의 달인',
    description: '타이밍 히트에서 95점 이상!',
    icon: '⏱️', rewardElo: 20,
  },
  [AchievementType.PVP_CHAMPION]: {
    title: 'PvP 챔피언',
    description: 'PvP에서 10번 승리했습니다!',
    icon: '👑', rewardElo: 50,
  },
  [AchievementType.WINNING_STREAK_5]: {
    title: '5연승 행진',
    description: 'PvP에서 5연승을 달성했습니다!',
    icon: '🔥', rewardElo: 40,
  },
  [AchievementType.MISSION_STREAK_3]: {
    title: '3일 연속 달성',
    description: '3일 연속으로 모든 미션을 완료했습니다.',
    icon: '📅', rewardElo: 25,
  },
  [AchievementType.MISSION_STREAK_7]: {
    title: '일주일 전사',
    description: '7일 연속으로 모든 미션을 완료했습니다!',
    icon: '🗓️', rewardElo: 70,
  },
  [AchievementType.REGION_TOP10]: {
    title: '동네 강자',
    description: '동네 랭킹 10위 이내에 진입했습니다.',
    icon: '🏘️', rewardElo: 30,
  },
  [AchievementType.REGION_TOP1]: {
    title: '동네 전설',
    description: '동네 랭킹 1위를 차지했습니다!',
    icon: '🥇', rewardElo: 100,
  },
  [AchievementType.GAME_COLLECTOR]: {
    title: '장르 컬렉터',
    description: '20종류 이상의 게임을 플레이했습니다.',
    icon: '🎲', rewardElo: 30,
  },
  [AchievementType.HIGH_SCORER]: {
    title: '하이스코어',
    description: '어떤 게임에서든 9000점 이상을 달성했습니다!',
    icon: '💯', rewardElo: 40,
  },
};

@Entity('achievements')
@Index(['userId', 'type'], { unique: true })
export class AchievementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: AchievementType })
  type: AchievementType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  unlockedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
