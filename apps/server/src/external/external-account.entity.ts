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
