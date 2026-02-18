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

/** 유저의 현재 장착 아바타 설정 (유저당 1행) */
@Entity('user_avatars')
export class UserAvatarEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  activeFrameId: string | null;

  @Column({ type: 'uuid', nullable: true })
  activeIconId: string | null;

  @Column({ type: 'uuid', nullable: true })
  activeTitleId: string | null;

  @Column({ type: 'uuid', nullable: true })
  activeEffectId: string | null;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => AvatarItemEntity, { nullable: true })
  @JoinColumn({ name: 'activeFrameId' })
  activeFrame: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true })
  @JoinColumn({ name: 'activeIconId' })
  activeIcon: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true })
  @JoinColumn({ name: 'activeTitleId' })
  activeTitle: AvatarItemEntity | null;

  @ManyToOne(() => AvatarItemEntity, { nullable: true })
  @JoinColumn({ name: 'activeEffectId' })
  activeEffect: AvatarItemEntity | null;
}
