import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

/** 시즌 패스 티어 정의 (코드 상수) */
export interface PassTierReward {
  coins?: number;
  gems?: number;
  assetKey?: string;
  label: string;
}

export const SEASON_PASS_TIERS: Array<{
  tier: number;
  requiredXp: number;
  free: PassTierReward;
  gold: PassTierReward;
}> = [
  { tier: 1, requiredXp: 100,  free: { coins: 200,  label: '🪙 코인 200'           }, gold: { coins: 500,  gems: 10,  label: '🪙 500 + 💎 10'         } },
  { tier: 2, requiredXp: 300,  free: { gems: 20,    label: '💎 보석 20'            }, gold: { gems: 80,              label: '💎 보석 80'             } },
  { tier: 3, requiredXp: 600,  free: { coins: 500,  label: '🪙 코인 500'           }, gold: { gems: 50,  coins: 1000, label: '🪙 1000 + 💎 50'        } },
  { tier: 4, requiredXp: 1000, free: { coins: 1000, label: '🪙 코인 1000'          }, gold: { gems: 100,             label: '💎 보석 100'            } },
  { tier: 5, requiredXp: 1500, free: { gems: 50,    label: '💎 보석 50'            }, gold: { gems: 100, assetKey: 'title_season_hero',   label: '💎 100 + 시즌 영웅 칭호' } },
  { tier: 6, requiredXp: 2000, free: { coins: 2000, label: '🪙 코인 2000'          }, gold: { gems: 150, assetKey: 'hat_season_crown',    label: '💎 150 + 시즌 왕관'     } },
  { tier: 7, requiredXp: 3000, free: { assetKey: 'title_season_veteran', label: '🏅 시즌 베테랑 칭호' }, gold: { gems: 200, assetKey: 'effect_season_aura', label: '💎 200 + 시즌 오라'     } },
];

/** XP 소스별 지급량 */
export const XP_GRANTS = {
  gameComplete: 10,
  missionComplete: 50,
  weeklyMissionComplete: 100,
  pvpWin: 20,
  dailyCheckIn: 30,
};

@Entity('user_season_pass')
@Index(['userId', 'seasonId'], { unique: true })
export class UserSeasonPassEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  seasonId: string;

  /** 이번 시즌에 쌓은 시즌 XP */
  @Column({ type: 'integer', default: 0 })
  seasonXp: number;

  /** 골드 패스 보유 여부 (보석 결제) */
  @Column({ type: 'boolean', default: false })
  hasGoldPass: boolean;

  /**
   * 수령한 티어 번호 목록 (무료 트랙)
   * 예: [1, 2, 3]
   */
  @Column({ type: 'jsonb', default: [] })
  claimedFreeTiers: number[];

  /**
   * 수령한 티어 번호 목록 (골드 트랙)
   */
  @Column({ type: 'jsonb', default: [] })
  claimedGoldTiers: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
