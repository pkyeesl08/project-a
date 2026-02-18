import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AvatarItemEntity, ItemType, ItemRarity, AcquireMethod } from './avatar-item.entity';
import { UserAvatarItemEntity, UserAvatarEntity } from './user-avatar.entity';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class AvatarService {
  constructor(
    @InjectRepository(AvatarItemEntity)
    private itemRepo: Repository<AvatarItemEntity>,
    @InjectRepository(UserAvatarItemEntity)
    private inventoryRepo: Repository<UserAvatarItemEntity>,
    @InjectRepository(UserAvatarEntity)
    private avatarRepo: Repository<UserAvatarEntity>,
    @InjectRepository(UserEntity)
    private usersRepo: Repository<UserEntity>,
    private dataSource: DataSource,
  ) {}

  /* ═══════════════════════════════════════════
   * 상점
   * ═══════════════════════════════════════════ */

  /** 상점 아이템 목록 (구매 가능 아이템만) */
  async getShopItems(type?: ItemType) {
    const now = new Date();
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .where('item.isActive = true')
      .andWhere('(item.gemPrice IS NOT NULL OR item.coinPrice IS NOT NULL)')
      .andWhere('(item.availableUntil IS NULL OR item.availableUntil > :now)', { now })
      .orderBy('item.rarity', 'DESC')
      .addOrderBy('item.sortOrder', 'ASC');

    if (type) qb.andWhere('item.type = :type', { type });
    return qb.getMany();
  }

  /** 전체 아이템 카탈로그 (획득 방법 안내 포함) */
  async getCatalog(type?: ItemType) {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .where('item.isActive = true')
      .orderBy('item.type', 'ASC')
      .addOrderBy('item.rarity', 'DESC')
      .addOrderBy('item.sortOrder', 'ASC');

    if (type) qb.andWhere('item.type = :type', { type });
    return qb.getMany();
  }

  /* ═══════════════════════════════════════════
   * 구매
   * ═══════════════════════════════════════════ */

  /** 보석으로 구매 */
  async purchaseWithGems(userId: string, itemId: string) {
    return this.purchase(userId, itemId, 'gem');
  }

  /** 코인으로 구매 */
  async purchaseWithCoins(userId: string, itemId: string) {
    return this.purchase(userId, itemId, 'coin');
  }

  private async purchase(userId: string, itemId: string, currency: 'gem' | 'coin') {
    const item = await this.itemRepo.findOne({ where: { id: itemId, isActive: true } });
    if (!item) throw new NotFoundException('아이템을 찾을 수 없습니다.');

    const price = currency === 'gem' ? item.gemPrice : item.coinPrice;
    if (price === null) {
      throw new BadRequestException(
        currency === 'gem' ? '보석으로 구매할 수 없는 아이템입니다.' : '코인으로 구매할 수 없는 아이템입니다.',
      );
    }

    // 한정 판매 기간 체크
    if (item.availableUntil && item.availableUntil < new Date()) {
      throw new BadRequestException('판매가 종료된 아이템입니다.');
    }

    // 중복 보유 체크
    const alreadyOwned = await this.inventoryRepo.findOne({ where: { userId, itemId } });
    if (alreadyOwned) throw new ConflictException('이미 보유 중인 아이템입니다.');

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    // 재화 차감
    const field = currency === 'gem' ? 'gems' : 'coins';
    if ((user as any)[field] < price) {
      throw new BadRequestException(
        currency === 'gem' ? '보석이 부족합니다.' : '코인이 부족합니다.',
      );
    }

    // 트랜잭션: 재화 차감 + 아이템 지급
    return this.dataSource.transaction(async (em) => {
      await em.decrement(UserEntity, { id: userId }, field, price);
      const inv = em.create(UserAvatarItemEntity, {
        id: uuidv4(),
        userId,
        itemId,
        acquireMethod: currency === 'gem' ? AcquireMethod.PURCHASE_GEM : AcquireMethod.PURCHASE_COIN,
      });
      await em.save(UserAvatarItemEntity, inv);

      const updatedUser = await em.findOne(UserEntity, { where: { id: userId } });
      return {
        item,
        remainingGems: (updatedUser as any).gems,
        remainingCoins: (updatedUser as any).coins,
      };
    });
  }

  /* ═══════════════════════════════════════════
   * 무료 지급 (업적/미션/시즌/이벤트)
   * ═══════════════════════════════════════════ */

  /** 아이템 무료 지급 — 내부 서비스에서 호출 */
  async grantItem(
    userId: string,
    itemId: string,
    method: AcquireMethod,
  ): Promise<boolean> {
    const exists = await this.inventoryRepo.findOne({ where: { userId, itemId } });
    if (exists) return false; // 이미 보유

    const inv = this.inventoryRepo.create({
      id: uuidv4(),
      userId,
      itemId,
      acquireMethod: method,
    });
    await this.inventoryRepo.save(inv);
    return true;
  }

  /** 아이템명으로 찾아서 지급 (assetKey 기준) */
  async grantItemByKey(
    userId: string,
    assetKey: string,
    method: AcquireMethod,
  ): Promise<boolean> {
    const item = await this.itemRepo.findOne({ where: { assetKey } });
    if (!item) return false;
    return this.grantItem(userId, item.id, method);
  }

  /* ═══════════════════════════════════════════
   * 인벤토리
   * ═══════════════════════════════════════════ */

  /** 내 인벤토리 */
  async getInventory(userId: string) {
    const items = await this.inventoryRepo.find({
      where: { userId },
      relations: ['item'],
      order: { acquiredAt: 'DESC' },
    });
    return items.map(i => ({
      inventoryId: i.id,
      acquireMethod: i.acquireMethod,
      acquiredAt: i.acquiredAt,
      item: i.item,
    }));
  }

  /* ═══════════════════════════════════════════
   * 아바타 장착/조회
   * ═══════════════════════════════════════════ */

  /** 현재 아바타 설정 조회 (eager relations 로드) */
  async getAvatar(userId: string) {
    let avatar = await this.avatarRepo.findOne({ where: { userId } });
    if (!avatar) {
      avatar = this.avatarRepo.create({
        userId,
        activeHatId: null, activeGlassesId: null, activeTopId: null,
        activeBottomId: null, activeShoesId: null, activeAccessoryId: null,
        activeHairId: null, activeEyesId: null, activeNoseId: null, activeLipsId: null,
        activeTitleId: null, activeEffectId: null,
      });
      await this.avatarRepo.save(avatar);
    }
    return avatar;
  }

  /** 아이템 장착 — 타입별 슬롯 자동 매핑 */
  async equipItem(userId: string, itemId: string) {
    const owned = await this.inventoryRepo.findOne({
      where: { userId, itemId },
      relations: ['item'],
    });
    if (!owned) throw new BadRequestException('보유하지 않은 아이템입니다.');

    let avatar = await this.avatarRepo.findOne({ where: { userId } });
    if (!avatar) avatar = this.avatarRepo.create({ userId });

    const slotMap: Record<ItemType, keyof UserAvatarEntity> = {
      [ItemType.HAT]:       'activeHatId',
      [ItemType.GLASSES]:   'activeGlassesId',
      [ItemType.TOP]:       'activeTopId',
      [ItemType.BOTTOM]:    'activeBottomId',
      [ItemType.SHOES]:     'activeShoesId',
      [ItemType.ACCESSORY]: 'activeAccessoryId',
      [ItemType.HAIR]:      'activeHairId',
      [ItemType.EYES]:      'activeEyesId',
      [ItemType.NOSE]:      'activeNoseId',
      [ItemType.LIPS]:      'activeLipsId',
      [ItemType.TITLE]:     'activeTitleId',
      [ItemType.EFFECT]:    'activeEffectId',
    };
    (avatar as any)[slotMap[owned.item.type]] = itemId;
    return this.avatarRepo.save(avatar);
  }

  /** 슬롯 해제 */
  async unequipSlot(userId: string, slot: string) {
    const validSlots: Record<string, string> = {
      hat: 'activeHatId', glasses: 'activeGlassesId', top: 'activeTopId',
      bottom: 'activeBottomId', shoes: 'activeShoesId', accessory: 'activeAccessoryId',
      hair: 'activeHairId', eyes: 'activeEyesId', nose: 'activeNoseId', lips: 'activeLipsId',
      title: 'activeTitleId', effect: 'activeEffectId',
    };
    if (!validSlots[slot]) throw new BadRequestException('유효하지 않은 슬롯입니다.');

    let avatar = await this.avatarRepo.findOne({ where: { userId } });
    if (!avatar) return { unequipped: true };

    (avatar as any)[validSlots[slot]] = null;
    return this.avatarRepo.save(avatar);
  }

  /* ═══════════════════════════════════════════
   * 재화 충전 (서버 측 검증 — 결제는 외부 PG에서)
   * ═══════════════════════════════════════════ */

  /**
   * 보석 충전 — 실제 서비스에선 결제 검증 후 호출
   * receipt: 스토어(Apple/Google) 영수증 검증 토큰
   */
  async chargeGems(userId: string, amount: number, _receipt: string) {
    // TODO: Apple/Google IAP 영수증 검증 로직 삽입
    await this.usersRepo.increment({ id: userId }, 'gems', amount);
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    return { gems: (user as any).gems };
  }

  /** 코인 지급 (게임 완료/미션 보상 등 내부용) */
  async addCoins(userId: string, amount: number) {
    await this.usersRepo.increment({ id: userId }, 'coins', amount);
  }

  /* ═══════════════════════════════════════════
   * 아이템 시드 데이터 (서버 최초 기동 시)
   * ═══════════════════════════════════════════ */

  /** DB에 기본 아이템이 없으면 시드 데이터 삽입 */
  async seedDefaultItems() {
    const count = await this.itemRepo.count();
    if (count > 0) return;

    const defaults: Partial<AvatarItemEntity>[] = [
      // ══════════════════════════════════════════
      // 모자 (HAT)
      // ══════════════════════════════════════════
      {
        name: '기본 캡모자', type: ItemType.HAT, rarity: ItemRarity.COMMON,
        assetKey: 'hat_cap_basic', gemPrice: null, coinPrice: null,
        description: '가장 기본적인 캡모자', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '파란 캡모자', type: ItemType.HAT, rarity: ItemRarity.RARE,
        assetKey: 'hat_cap_blue', gemPrice: null, coinPrice: 500,
        description: '시원한 파란색 캡모자', acquireCondition: '코인 500개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '스냅백', type: ItemType.HAT, rarity: ItemRarity.RARE,
        assetKey: 'hat_snapback', gemPrice: 120, coinPrice: null,
        description: '힙한 스냅백 모자', acquireCondition: '보석 120개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '황금 왕관', type: ItemType.HAT, rarity: ItemRarity.LEGENDARY,
        assetKey: 'hat_crown_gold', gemPrice: 600, coinPrice: null,
        description: '진짜 승자만 쓸 수 있는 황금 왕관', acquireCondition: '보석 600개로 구매',
        isLimited: false, sortOrder: 20,
      },
      {
        name: '시즌 1 우승 왕관', type: ItemType.HAT, rarity: ItemRarity.LEGENDARY,
        assetKey: 'hat_s1_crown', gemPrice: null, coinPrice: null,
        description: '시즌 1 전국 랭킹 1위에게만 지급', acquireCondition: '시즌 1 전국 1위',
        isLimited: true, sortOrder: 100,
      },

      // ══════════════════════════════════════════
      // 선글라스/안경 (GLASSES)
      // ══════════════════════════════════════════
      {
        name: '동그란 선글라스', type: ItemType.GLASSES, rarity: ItemRarity.RARE,
        assetKey: 'glasses_round', gemPrice: null, coinPrice: 300,
        description: '레트로 감성의 동그란 선글라스', acquireCondition: '코인 300개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '에비에이터', type: ItemType.GLASSES, rarity: ItemRarity.EPIC,
        assetKey: 'glasses_aviator', gemPrice: 100, coinPrice: null,
        description: '조종사 스타일의 에비에이터 선글라스', acquireCondition: '보석 100개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '무지개 선글라스', type: ItemType.GLASSES, rarity: ItemRarity.EPIC,
        assetKey: 'glasses_rainbow', gemPrice: 250, coinPrice: null,
        description: '일곱 빛깔 무지개 선글라스', acquireCondition: '보석 250개로 구매',
        isLimited: false, sortOrder: 20,
      },
      {
        name: 'PvP 고글', type: ItemType.GLASSES, rarity: ItemRarity.EPIC,
        assetKey: 'glasses_pvp_goggle', gemPrice: null, coinPrice: null,
        description: 'PvP 챔피언 업적 달성자에게 지급', acquireCondition: "업적 'PvP 챔피언' 달성",
        isLimited: false, sortOrder: 30,
      },

      // ══════════════════════════════════════════
      // 상의 (TOP)
      // ══════════════════════════════════════════
      {
        name: '흰 티셔츠', type: ItemType.TOP, rarity: ItemRarity.COMMON,
        assetKey: 'top_tee_white', gemPrice: null, coinPrice: null,
        description: '깔끔한 기본 흰 티셔츠', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '회색 후드티', type: ItemType.TOP, rarity: ItemRarity.RARE,
        assetKey: 'top_hoodie_gray', gemPrice: null, coinPrice: 400,
        description: '편안한 회색 후드티', acquireCondition: '코인 400개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '파란 재킷', type: ItemType.TOP, rarity: ItemRarity.EPIC,
        assetKey: 'top_jacket_blue', gemPrice: 180, coinPrice: null,
        description: '세련된 파란 재킷', acquireCondition: '보석 180개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '전설의 로브', type: ItemType.TOP, rarity: ItemRarity.LEGENDARY,
        assetKey: 'top_legendary_robe', gemPrice: 700, coinPrice: null,
        description: '전설의 게이머만이 입을 수 있는 로브', acquireCondition: '보석 700개로 구매',
        isLimited: false, sortOrder: 20,
      },
      {
        name: '동네 전설 유니폼', type: ItemType.TOP, rarity: ItemRarity.LEGENDARY,
        assetKey: 'top_region_legend', gemPrice: null, coinPrice: null,
        description: '동네 랭킹 1위 달성자에게만 지급', acquireCondition: "업적 '동네 전설' 달성",
        isLimited: false, sortOrder: 30,
      },

      // ══════════════════════════════════════════
      // 하의 (BOTTOM)
      // ══════════════════════════════════════════
      {
        name: '청바지', type: ItemType.BOTTOM, rarity: ItemRarity.COMMON,
        assetKey: 'bottom_jeans', gemPrice: null, coinPrice: null,
        description: '어디에나 잘 어울리는 청바지', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '카고 팬츠', type: ItemType.BOTTOM, rarity: ItemRarity.RARE,
        assetKey: 'bottom_cargo', gemPrice: null, coinPrice: 400,
        description: '주머니 많은 실용적인 카고 팬츠', acquireCondition: '코인 400개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '트레이닝 팬츠', type: ItemType.BOTTOM, rarity: ItemRarity.EPIC,
        assetKey: 'bottom_training', gemPrice: 150, coinPrice: null,
        description: '퍼포먼스를 높여주는 트레이닝 팬츠', acquireCondition: '보석 150개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '전설의 슬랙스', type: ItemType.BOTTOM, rarity: ItemRarity.LEGENDARY,
        assetKey: 'bottom_legendary', gemPrice: 500, coinPrice: null,
        description: '전설 게이머의 품격 있는 슬랙스', acquireCondition: '보석 500개로 구매',
        isLimited: false, sortOrder: 20,
      },

      // ══════════════════════════════════════════
      // 신발 (SHOES)
      // ══════════════════════════════════════════
      {
        name: '기본 스니커즈', type: ItemType.SHOES, rarity: ItemRarity.COMMON,
        assetKey: 'shoes_sneakers_basic', gemPrice: null, coinPrice: null,
        description: '가장 기본적인 흰 스니커즈', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '컬러 스니커즈', type: ItemType.SHOES, rarity: ItemRarity.RARE,
        assetKey: 'shoes_sneakers_color', gemPrice: null, coinPrice: 300,
        description: '다양한 색상의 컬러 스니커즈', acquireCondition: '코인 300개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '첼시 부츠', type: ItemType.SHOES, rarity: ItemRarity.EPIC,
        assetKey: 'shoes_boots_chelsea', gemPrice: 120, coinPrice: null,
        description: '세련된 첼시 부츠', acquireCondition: '보석 120개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '전설의 운동화', type: ItemType.SHOES, rarity: ItemRarity.LEGENDARY,
        assetKey: 'shoes_legendary', gemPrice: 400, coinPrice: null,
        description: '전설 게이머만 신을 수 있는 운동화', acquireCondition: '보석 400개로 구매',
        isLimited: false, sortOrder: 20,
      },

      // ══════════════════════════════════════════
      // 악세서리 (ACCESSORY)
      // ══════════════════════════════════════════
      {
        name: '실버 목걸이', type: ItemType.ACCESSORY, rarity: ItemRarity.RARE,
        assetKey: 'acc_necklace_silver', gemPrice: null, coinPrice: 200,
        description: '심플한 실버 목걸이', acquireCondition: '코인 200개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '골드 시계', type: ItemType.ACCESSORY, rarity: ItemRarity.EPIC,
        assetKey: 'acc_watch_gold', gemPrice: 100, coinPrice: null,
        description: '고급스러운 골드 손목시계', acquireCondition: '보석 100개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: 'PvP 챔피언 배지', type: ItemType.ACCESSORY, rarity: ItemRarity.EPIC,
        assetKey: 'acc_pvp_badge', gemPrice: null, coinPrice: null,
        description: 'PvP 10승 달성 증명 배지', acquireCondition: "업적 'PvP 챔피언' 달성",
        isLimited: false, sortOrder: 30,
      },
      {
        name: '레전드 크리스탈', type: ItemType.ACCESSORY, rarity: ItemRarity.LEGENDARY,
        assetKey: 'acc_legend_crystal', gemPrice: 450, coinPrice: null,
        description: '전설 등급의 마법 크리스탈 악세서리', acquireCondition: '보석 450개로 구매',
        isLimited: false, sortOrder: 20,
      },

      // ══════════════════════════════════════════
      // 헤어 (HAIR)
      // ══════════════════════════════════════════
      {
        name: '자연스러운 검정 머리', type: ItemType.HAIR, rarity: ItemRarity.COMMON,
        assetKey: 'hair_black_natural', gemPrice: null, coinPrice: null,
        description: '자연스러운 기본 검정 단발', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '갈색 웨이브 헤어', type: ItemType.HAIR, rarity: ItemRarity.RARE,
        assetKey: 'hair_brown_wavy', gemPrice: null, coinPrice: 300,
        description: '부드러운 갈색 웨이브 스타일', acquireCondition: '코인 300개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '금발 스파이크 헤어', type: ItemType.HAIR, rarity: ItemRarity.EPIC,
        assetKey: 'hair_blonde_spike', gemPrice: 200, coinPrice: null,
        description: '강렬한 금발 스파이크 스타일', acquireCondition: '보석 200개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '레인보우 헤어', type: ItemType.HAIR, rarity: ItemRarity.LEGENDARY,
        assetKey: 'hair_rainbow', gemPrice: 600, coinPrice: null,
        description: '일곱 빛깔 무지개 헤어', acquireCondition: '보석 600개로 구매',
        isLimited: false, sortOrder: 20,
      },

      // ══════════════════════════════════════════
      // 눈 (EYES)
      // ══════════════════════════════════════════
      {
        name: '기본 눈', type: ItemType.EYES, rarity: ItemRarity.COMMON,
        assetKey: 'eyes_default', gemPrice: null, coinPrice: null,
        description: '기본 눈 스타일', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '반짝이는 눈', type: ItemType.EYES, rarity: ItemRarity.RARE,
        assetKey: 'eyes_sparkle', gemPrice: null, coinPrice: 200,
        description: '별처럼 반짝이는 눈', acquireCondition: '코인 200개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '결의의 눈', type: ItemType.EYES, rarity: ItemRarity.EPIC,
        assetKey: 'eyes_determined', gemPrice: 100, coinPrice: null,
        description: '강한 의지가 담긴 눈빛', acquireCondition: '보석 100개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '전설의 빛나는 눈', type: ItemType.EYES, rarity: ItemRarity.LEGENDARY,
        assetKey: 'eyes_legendary_glow', gemPrice: 450, coinPrice: null,
        description: '황금빛으로 빛나는 전설의 눈', acquireCondition: '보석 450개로 구매',
        isLimited: false, sortOrder: 20,
      },

      // ══════════════════════════════════════════
      // 코 (NOSE)
      // ══════════════════════════════════════════
      {
        name: '기본 코', type: ItemType.NOSE, rarity: ItemRarity.COMMON,
        assetKey: 'nose_default', gemPrice: null, coinPrice: null,
        description: '기본 코 스타일', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '귀여운 코', type: ItemType.NOSE, rarity: ItemRarity.RARE,
        assetKey: 'nose_cute', gemPrice: null, coinPrice: 100,
        description: '앙증맞고 귀여운 코', acquireCondition: '코인 100개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '우아한 코', type: ItemType.NOSE, rarity: ItemRarity.EPIC,
        assetKey: 'nose_elegant', gemPrice: 80, coinPrice: null,
        description: '품격 있는 우아한 코', acquireCondition: '보석 80개로 구매',
        isLimited: false, sortOrder: 11,
      },

      // ══════════════════════════════════════════
      // 입술 (LIPS)
      // ══════════════════════════════════════════
      {
        name: '기본 입술', type: ItemType.LIPS, rarity: ItemRarity.COMMON,
        assetKey: 'lips_default', gemPrice: null, coinPrice: null,
        description: '기본 입술 스타일', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '환한 미소', type: ItemType.LIPS, rarity: ItemRarity.RARE,
        assetKey: 'lips_smile_big', gemPrice: null, coinPrice: 200,
        description: '환하게 웃는 미소', acquireCondition: '코인 200개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '쿨한 미소', type: ItemType.LIPS, rarity: ItemRarity.EPIC,
        assetKey: 'lips_cool_smirk', gemPrice: 80, coinPrice: null,
        description: '자신감 넘치는 쿨한 미소', acquireCondition: '보석 80개로 구매',
        isLimited: false, sortOrder: 11,
      },
      {
        name: '레전드 루즈', type: ItemType.LIPS, rarity: ItemRarity.LEGENDARY,
        assetKey: 'lips_legendary_red', gemPrice: 350, coinPrice: null,
        description: '전설 게이머의 강렬한 입술', acquireCondition: '보석 350개로 구매',
        isLimited: false, sortOrder: 20,
      },

      // ══════════════════════════════════════════
      // 칭호 (TITLE)
      // ══════════════════════════════════════════
      {
        name: '뉴비', type: ItemType.TITLE, rarity: ItemRarity.COMMON,
        assetKey: 'title_newbie', gemPrice: null, coinPrice: null,
        description: '게임을 시작한 신입', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '동네 고수', type: ItemType.TITLE, rarity: ItemRarity.RARE,
        assetKey: 'title_local_pro', gemPrice: null, coinPrice: 800,
        description: '동네에서 인정받는 고수', acquireCondition: '코인 800개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '반응속도 괴물', type: ItemType.TITLE, rarity: ItemRarity.EPIC,
        assetKey: 'title_speed_monster', gemPrice: null, coinPrice: null,
        description: '스피드 악마 업적 달성자', acquireCondition: "업적 '스피드 악마' 달성",
        isLimited: false, sortOrder: 20,
      },
      {
        name: '전설의 시작', type: ItemType.TITLE, rarity: ItemRarity.LEGENDARY,
        assetKey: 'title_legend_start', gemPrice: 300, coinPrice: null,
        description: '전설의 시작점에 선 자', acquireCondition: '보석 300개로 구매',
        isLimited: false, sortOrder: 30,
      },
      {
        name: '동네 GOAT', type: ItemType.TITLE, rarity: ItemRarity.LEGENDARY,
        assetKey: 'title_goat', gemPrice: null, coinPrice: null,
        description: '동네 랭킹 1위를 차지한 자에게만 부여', acquireCondition: "업적 '동네 전설' 달성",
        isLimited: false, sortOrder: 31,
      },

      // ══════════════════════════════════════════
      // 게임 이펙트 (EFFECT)
      // ══════════════════════════════════════════
      {
        name: '기본 이펙트', type: ItemType.EFFECT, rarity: ItemRarity.COMMON,
        assetKey: 'effect_default', gemPrice: null, coinPrice: null,
        description: '기본 게임 이펙트', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '불꽃 히트', type: ItemType.EFFECT, rarity: ItemRarity.RARE,
        assetKey: 'effect_fire_hit', gemPrice: null, coinPrice: 600,
        description: '탭할 때마다 불꽃이 튀는 이펙트', acquireCondition: '코인 600개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '별빛 이펙트', type: ItemType.EFFECT, rarity: ItemRarity.EPIC,
        assetKey: 'effect_starlight', gemPrice: 150, coinPrice: null,
        description: '탭 시 별빛이 퍼지는 프리미엄 이펙트', acquireCondition: '보석 150개로 구매',
        isLimited: false, sortOrder: 20,
      },
      {
        name: '번개 이펙트', type: ItemType.EFFECT, rarity: ItemRarity.LEGENDARY,
        assetKey: 'effect_lightning', gemPrice: 400, coinPrice: null,
        description: '번개가 내리치는 전설 이펙트', acquireCondition: '보석 400개로 구매',
        isLimited: false, sortOrder: 21,
      },
    ];

    await this.itemRepo.save(defaults.map(d => this.itemRepo.create(d)));
  }
}
