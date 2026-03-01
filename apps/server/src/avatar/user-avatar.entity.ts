import {
  Entity, PrimaryColumn, Column, UpdateDateColumn,
  ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { AvatarItemEntity, AcquireMethod } from './avatar-item.entity';

/** 유저가 보유한 아이템 인벤토리 */
@Entity('user_avatar_items')
@Index(['userId', 'itemId'], { unique: true })
export class UserAvatarItemEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'enum', enum: AcquireMethod })
  acquireMethod: AcquireMethod;

  @CreateDateColumn()
  acquiredAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => AvatarItemEntity)
  @JoinColumn({ name: 'itemId' })
  item: AvatarItemEntity;
}

/**
 * 유저의 현재 장착 캐릭터 설정 (유저당 1행)
 * 슬롯: 모자 / 선글라스 / 상의 / 하의 / 신발 / 악세서리 / 칭호 / 이펙트
 */
@Entity('user_avatars')
export class UserAvatarEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  // ── 의상 슬롯 ──
  @Column({ type: 'uuid', nullable: true }) activeHatId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeGlassesId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeTopId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeBottomId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeShoesId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeAccessoryId: string | null;

  // ── 얼굴 커스텀 슬롯 ──
  @Column({ type: 'uuid', nullable: true }) activeHairId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeEyesId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeNoseId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeLipsId: string | null;

  // ── 칭호 / 이펙트 ──
  @Column({ type: 'uuid', nullable: true }) activeTitleId: string | null;
  @Column({ type: 'uuid', nullable: true }) activeEffectId: string | null;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeHatId' })
  activeHat: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeGlassesId' })
  activeGlasses: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeTopId' })
  activeTop: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeBottomId' })
  activeBottom: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeShoesId' })
  activeShoes: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeAccessoryId' })
  activeAccessory: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeHairId' })
  activeHair: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeEyesId' })
  activeEyes: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeNoseId' })
  activeNose: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeLipsId' })
  activeLips: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeTitleId' })
  activeTitle: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'activeEffectId' })
  activeEffect: AvatarItemEntity | null;
}
