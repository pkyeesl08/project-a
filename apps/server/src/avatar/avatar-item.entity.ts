import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

/** 캐릭터 장착 슬롯 타입 */
export enum ItemType {
  // ── 의상 ──
  HAT       = 'hat',       // 모자
  GLASSES   = 'glasses',   // 선글라스/안경
  TOP       = 'top',       // 상의
  BOTTOM    = 'bottom',    // 하의
  SHOES     = 'shoes',     // 신발
  ACCESSORY = 'accessory', // 악세서리 (배지·목걸이 등)
  // ── 얼굴 커스텀 ──
  HAIR      = 'hair',      // 헤어스타일
  EYES      = 'eyes',      // 눈 스타일
  NOSE      = 'nose',      // 코 스타일
  LIPS      = 'lips',      // 입술 스타일
  // ── 칭호 / 이펙트 ──
  TITLE     = 'title',     // 닉네임 칭호
  EFFECT    = 'effect',    // 게임 이펙트
}

export enum ItemRarity {
  COMMON    = 'common',
  RARE      = 'rare',
  EPIC      = 'epic',
  LEGENDARY = 'legendary',
}

export enum AcquireMethod {
  DEFAULT       = 'default',        // 기본 지급
  PURCHASE_GEM  = 'purchase_gem',   // 보석 구매
  PURCHASE_COIN = 'purchase_coin',  // 코인 구매
  ACHIEVEMENT   = 'achievement',    // 업적 달성
  MISSION       = 'mission',        // 미션 완료
  SEASON        = 'season',         // 시즌 보상
  EVENT         = 'event',          // 이벤트 보상
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
   * 프론트엔드 비주얼 렌더링 키
   * 예: hat_baseball, top_blue_hoodie, bottom_jeans
   */
  @Column({ type: 'varchar', length: 100 })
  assetKey: string;

  /** 보석 가격 — null이면 보석 구매 불가 */
  @Column({ type: 'integer', nullable: true })
  gemPrice: number | null;

  /** 코인 가격 — null이면 코인 구매 불가 */
  @Column({ type: 'integer', nullable: true })
  coinPrice: number | null;

  /** 획득 조건 설명 */
  @Column({ type: 'text', nullable: true })
  acquireCondition: string | null;

  /** 한정 판매 */
  @Column({ type: 'boolean', default: false })
  isLimited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  availableUntil: Date | null;

  /** 상점 노출 여부 */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
