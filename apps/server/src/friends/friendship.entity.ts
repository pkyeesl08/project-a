import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { UserEntity } from '../users/user.entity';

export enum FriendshipStatus {
  PENDING  = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED  = 'blocked',
}

@Entity('friendships')
@Index(['requesterId', 'addresseeId'], { unique: true })
@Index(['addresseeId', 'status'])
export class FriendshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({ type: 'uuid' })
  addresseeId: string;

  @Column({ type: 'enum', enum: FriendshipStatus, default: FriendshipStatus.PENDING })
  status: FriendshipStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'requesterId' })
  requester: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'addresseeId' })
  addressee: UserEntity;
}
