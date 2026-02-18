import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum ItemType {
  FRAME  = 'frame',   // 프로필 프레임
  ICON   = 'icon',    // 아바타 아이콘
  TITLE  = 'title',   // 닉네임 아래 칭호
  EFFECT = 'effect',  // 게임 플레이 이펙트
}

export enum ItemRarity {
  COMMON    = 'common',
  RARE      = 'rare',
  EPIC      = 'epic',
  LEGENDARY = 'legendary',
}

export enum AcquireMethod {
  DEFAULT      = 'default',       // 모두에게 기본 지급
  PURCHASE_GEM  = 'purchase_gem', // 보석(프리미엄) 구매
  PURCHASE_COIN = 'purchase_coin',// 코인(무료) 구매
  ACHIEVEMENT  = 'achievement',   // 업적 달성 보상
  MISSION      = 'mission',       // 미션 보상
  SEASON       = 'season',        // 시즌 보상
  EVENT        = 'event',         // 이벤트 보상
}

@Entity('avatar_items')
export class AvatarItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ItemType })
  type: ItemType;

  @Column({ type: 'enum', enum: ItemRarity, default: ItemRarity.COMMON })
  rarity: ItemRarity;

  /**
   * 프론트엔드에서 에셋 로딩에 사용하는 키
   * 예: 'frame_gold_crown', 'icon_fire', 'title_legend'
   */
  @Column({ type: 'varchar', length: 100 })
  assetKey: string;

  /** 보석 가격 — null이면 보석으로 구매 불가 */
  @Column({ type: 'integer', nullable: true })
  gemPrice: number | null;

  /** 코인 가격 — null이면 코인으로 구매 불가 */
  @Column({ type: 'integer', nullable: true })
  coinPrice: number | null;

  /** 획득 조건 설명 (예: "업적 '동네 전설' 달성 시 지급") */
  @Column({ type: 'text', nullable: true })
  acquireCondition: string | null;

  /** 한정 판매 여부 */
  @Column({ type: 'boolean', default: false })
  isLimited: boolean;

  /** 한정 판매 종료일 */
  @Column({ type: 'timestamp', nullable: true })
  availableUntil: Date | null;

  /** 상점 노출 여부 */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** 출시 순서 정렬용 */
  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
