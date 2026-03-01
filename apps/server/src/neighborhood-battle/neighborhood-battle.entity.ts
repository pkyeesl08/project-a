import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('neighborhood_battles')
export class NeighborhoodBattleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() regionAId: string;
  @Column() regionBId: string;

  @Column({ nullable: true }) regionAName: string;
  @Column({ nullable: true }) regionBName: string;

  @Column({ type: 'int', default: 0 }) regionAScore: number;
  @Column({ type: 'int', default: 0 }) regionBScore: number;

  @Column({ type: 'timestamptz' }) startAt: Date;
  @Column({ type: 'timestamptz' }) endAt: Date;

  @Column({ default: true }) isActive: boolean;

  /** 종료 후 승리 지역 ID */
  @Column({ nullable: true }) winnerId: string;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
