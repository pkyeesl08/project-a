import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum BoardCategory {
  GENERAL = 'general', // 통합 게시판
  PARTY   = 'party',   // 파티 찾기
}

export enum PartyStatus {
  OPEN   = 'open',
  CLOSED = 'closed',
}

@Entity('board_posts')
@Index(['regionId', 'category', 'createdAt'])
@Index(['category', 'createdAt'])
export class BoardPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  /** 동네 범위 (null이면 전국) */
  @Column({ type: 'uuid', nullable: true })
  regionId: string | null;

  @Column({ type: 'enum', enum: BoardCategory })
  category: BoardCategory;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  // ── 파티 찾기 전용 필드 ──────────────────────────────────────

  /** 어떤 미니게임의 파티를 찾는지 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  gameType: string | null;

  /** 최대 인원 (파티 찾기 전용, 2~8) */
  @Column({ type: 'integer', nullable: true })
  maxPlayers: number | null;

  /** 현재 참가자 userId 목록 */
  @Column({ type: 'jsonb', default: [] })
  currentPlayers: string[];

  /** 파티 상태 (파티 찾기 전용) */
  @Column({ type: 'enum', enum: PartyStatus, nullable: true })
  partyStatus: PartyStatus | null;

  // ──────────────────────────────────────────────────────────────

  /** 좋아요 누른 userId 목록 */
  @Column({ type: 'jsonb', default: [] })
  likes: string[];

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
