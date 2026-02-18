import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('neighborhood_events')
@Index(['regionId', 'isActive'])
@Index(['startAt', 'endAt'])
export class NeighborhoodEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  regionId: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  /** 특정 게임 타입 또는 'all' */
  @Column({ type: 'varchar', length: 50, default: 'all' })
  gameType: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  /** 상위 N명 보상 */
  @Column({ type: 'integer', default: 3 })
  topN: number;

  /** 1위 보상 ELO */
  @Column({ type: 'integer', default: 50 })
  rewardElo: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
