import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { RegionEntity } from '../regions/region.entity';

@Entity('game_results')
@Index(['userId', 'gameType'])
@Index(['userId', 'playedAt'])
@Index(['regionId', 'gameType'])
@Index(['playedAt'])
export class GameResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  gameType: string;

  @Column({ type: 'integer' })
  score: number;

  @Column({ type: 'integer' })
  normalizedScore: number;

  @Column({ type: 'enum', enum: ['solo', 'pvp', 'team'] })
  mode: string;

  @Column({ type: 'uuid', nullable: true })
  opponentId: string | null;

  @Column({ type: 'uuid', nullable: true })
  matchId: string | null;

  @Column({ type: 'uuid' })
  regionId: string;

  @Column({ type: 'uuid', nullable: true })
  seasonId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  playedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'opponentId' })
  opponent: UserEntity | null;

  @ManyToOne(() => RegionEntity)
  @JoinColumn({ name: 'regionId' })
  region: RegionEntity;
}
