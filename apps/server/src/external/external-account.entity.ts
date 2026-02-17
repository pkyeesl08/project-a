import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('external_accounts')
export class ExternalAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: ['riot', 'battlenet', 'nexon'] })
  platform: string;

  @Column({ type: 'enum', enum: ['lol', 'valorant', 'ow2', 'fifaonline'] })
  game: string;

  @Column({ type: 'varchar', length: 255 })
  externalId: string;

  @Column({ type: 'varchar', length: 100 })
  gameName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tier: string | null;

  /** 티어를 숫자로 변환한 값 — 랭킹 정렬용 (높을수록 높은 티어) */
  @Column({ type: 'integer', default: 0 })
  tierScore: number;

  @Column({ type: 'jsonb', nullable: true })
  stats: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
