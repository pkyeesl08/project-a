import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/** 한 트랙에 투자 가능한 최대 포인트 */
export const DNA_MAX_PER_TRACK = 8;

/** 레벨 → 사용 가능한 총 DNA 포인트 (5레벨마다 1pt) */
export function calcAvailableDnaPoints(level: number): number {
  return Math.floor(Math.max(1, level) / 5);
}

/** 보석으로 리셋 시 비용 */
export const DNA_GEM_RESET_COST = 80;

/** 주간 토큰 한도 */
export const TOKEN_LIMITS = {
  eloShield: 1,   // reactionPts >= 7: ELO 하락 방지
  doubleUp: 1,    // actionPts  >= 5: ELO 상승 2배
  bestPick: 3,    // precisionPts >= 5: 베스트 점수 제출
} as const;

@Entity('gamer_dna')
@Index(['userId'], { unique: true })
export class GamerDnaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  /** ⚡ 반응 DNA */
  @Column({ type: 'integer', default: 0 })
  reactionPts: number;

  /** 🧠 두뇌 DNA */
  @Column({ type: 'integer', default: 0 })
  puzzlePts: number;

  /** 🎮 액션 DNA */
  @Column({ type: 'integer', default: 0 })
  actionPts: number;

  /** 🎯 정밀 DNA */
  @Column({ type: 'integer', default: 0 })
  precisionPts: number;

  /** 🌟 파티 DNA */
  @Column({ type: 'integer', default: 0 })
  partyPts: number;

  /** 마지막 무료 리셋 월 (YYYY-MM) */
  @Column({ type: 'varchar', length: 7, nullable: true, default: null })
  lastFreeResetMonth: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
