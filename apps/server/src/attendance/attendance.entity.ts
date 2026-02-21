import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

/** 7일 사이클 출석 보상 정의 */
export const ATTENDANCE_REWARDS: Record<number, {
  coins?: number;
  gems?: number;
  label: string;
}> = {
  1: { coins: 200, label: '🪙 코인 200' },
  2: { coins: 300, label: '🪙 코인 300' },
  3: { gems: 20,   label: '💎 보석 20' },
  4: { coins: 500, label: '🪙 코인 500' },
  5: { gems: 30,   label: '💎 보석 30' },
  6: { coins: 800, label: '🪙 코인 800' },
  7: { coins: 300, gems: 100, label: '🎁 코인 300 + 💎 보석 100' },
};

@Entity('attendance')
@Index(['userId', 'checkDate'], { unique: true })
export class AttendanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  /** YYYY-MM-DD 체크인 날짜 */
  @Column({ type: 'varchar', length: 10 })
  checkDate: string;

  /** 연속 출석 일수 (이 날 기준 누적) */
  @Column({ type: 'integer', default: 1 })
  streak: number;

  /** 7일 사이클 내 순서 (1~7) */
  @Column({ type: 'integer', default: 1 })
  cycleDay: number;

  /** 지급된 보상 스냅샷 */
  @Column({ type: 'jsonb', nullable: true })
  rewards: { coins?: number; gems?: number; label: string } | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
