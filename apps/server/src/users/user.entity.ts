import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { RegionEntity } from '../regions/region.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  nickname: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'enum', enum: ['kakao', 'google', 'apple'] })
  authProvider: string;

  @Column({ type: 'text', nullable: true })
  profileImage: string | null;

  @Column({ type: 'uuid' })
  primaryRegionId: string;

  @Column({ type: 'uuid', nullable: true })
  secondaryRegionId: string | null;

  @Column({ type: 'uuid', nullable: true })
  schoolId: string | null;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'integer', default: 1000 })
  eloRating: number;

  /** 무료 재화 — 게임/미션 완료 시 획득, 코인 상점 아이템 구매에 사용 */
  @Column({ type: 'integer', default: 0 })
  coins: number;

  /** 프리미엄 재화 — 인앱 결제로 충전, 프리미엄 상점 아이템 구매에 사용 */
  @Column({ type: 'integer', default: 0 })
  gems: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastActiveAt: Date;

  @ManyToOne(() => RegionEntity)
  @JoinColumn({ name: 'primaryRegionId' })
  primaryRegion: RegionEntity;

  @ManyToOne(() => RegionEntity, { nullable: true })
  @JoinColumn({ name: 'secondaryRegionId' })
  secondaryRegion: RegionEntity | null;
}
