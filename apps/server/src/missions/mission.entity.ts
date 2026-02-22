import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum MissionType {
  PLAY_3_GAMES = 'play_3_games',      // 오늘 게임 3판
  WIN_2_PVP    = 'win_2_pvp',         // PvP 2승
  NEW_HIGHSCORE = 'new_highscore',    // 개인 최고 기록 경신
  PLAY_3_TYPES  = 'play_3_types',     // 다른 게임 3종 플레이
}

export const MISSION_DEFINITIONS: Record<MissionType, {
  title: string;
  description: string;
  targetValue: number;
  rewardElo: number;
  rewardCoins: number;
  rewardXp: number;
  icon: string;
}> = {
  [MissionType.PLAY_3_GAMES]: {
    title: '오늘의 플레이어',
    description: '오늘 게임을 3판 플레이하세요',
    targetValue: 3,
    rewardElo: 10,
    rewardCoins: 150,
    rewardXp: 50,
    icon: '🎮',
  },
  [MissionType.WIN_2_PVP]: {
    title: '무한 도전자',
    description: 'Endless 모드를 1회 플레이하세요',
    targetValue: 1,
    rewardElo: 20,
    rewardCoins: 300,
    rewardXp: 80,
    icon: '♾️',
  },
  [MissionType.NEW_HIGHSCORE]: {
    title: '기록 경신자',
    description: '어떤 게임이든 개인 최고 기록을 경신하세요',
    targetValue: 1,
    rewardElo: 15,
    rewardCoins: 200,
    rewardXp: 60,
    icon: '🏆',
  },
  [MissionType.PLAY_3_TYPES]: {
    title: '종합 게이머',
    description: '서로 다른 게임 3종류를 플레이하세요',
    targetValue: 3,
    rewardElo: 10,
    rewardCoins: 150,
    rewardXp: 50,
    icon: '🌟',
  },
};

@Entity('daily_missions')
@Index(['userId', 'missionDate'])
@Index(['userId', 'missionType', 'missionDate'], { unique: true })
export class DailyMissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: MissionType })
  missionType: MissionType;

  /** YYYY-MM-DD 형식 날짜 문자열 */
  @Column({ type: 'varchar', length: 10 })
  missionDate: string;

  @Column({ type: 'integer', default: 0 })
  currentValue: number;

  @Column({ type: 'integer' })
  targetValue: number;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'boolean', default: false })
  rewardClaimed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
