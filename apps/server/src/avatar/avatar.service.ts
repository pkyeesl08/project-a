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

  /** 현재 아바타 설정 조회 */
  async getAvatar(userId: string) {
    let avatar = await this.avatarRepo.findOne({
      where: { userId },
      relations: ['activeFrame', 'activeIcon', 'activeTitle', 'activeEffect'],
    });
    if (!avatar) {
      // 첫 조회 시 기본 레코드 생성
      avatar = this.avatarRepo.create({
        userId,
        activeFrameId: null,
        activeIconId: null,
        activeTitleId: null,
        activeEffectId: null,
      });
      await this.avatarRepo.save(avatar);
    }
    return avatar;
  }

  /** 아바타 아이템 장착 */
  async equipItem(userId: string, itemId: string) {
    // 보유 확인
    const owned = await this.inventoryRepo.findOne({
      where: { userId, itemId },
      relations: ['item'],
    });
    if (!owned) throw new BadRequestException('보유하지 않은 아이템입니다.');

    let avatar = await this.avatarRepo.findOne({ where: { userId } });
    if (!avatar) {
      avatar = this.avatarRepo.create({ userId });
    }

    // 타입에 따라 적절한 슬롯에 장착
    switch (owned.item.type) {
      case ItemType.FRAME:  avatar.activeFrameId  = itemId; break;
      case ItemType.ICON:   avatar.activeIconId   = itemId; break;
      case ItemType.TITLE:  avatar.activeTitleId  = itemId; break;
      case ItemType.EFFECT: avatar.activeEffectId = itemId; break;
    }

    return this.avatarRepo.save(avatar);
  }

  /** 아바타 아이템 해제 (슬롯 비우기) */
  async unequipSlot(userId: string, slot: 'frame' | 'icon' | 'title' | 'effect') {
    let avatar = await this.avatarRepo.findOne({ where: { userId } });
    if (!avatar) return { unequipped: true };

    const slotMap: Record<string, keyof UserAvatarEntity> = {
      frame: 'activeFrameId', icon: 'activeIconId',
      title: 'activeTitleId', effect: 'activeEffectId',
    };
    (avatar as any)[slotMap[slot]] = null;
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
      // ── 무료 기본 프레임 ──
      {
        name: '기본 프레임', type: ItemType.FRAME, rarity: ItemRarity.COMMON,
        assetKey: 'frame_default', gemPrice: null, coinPrice: null,
        description: '기본으로 지급되는 프레임', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      // ── 코인 구매 프레임 ──
      {
        name: '실버 프레임', type: ItemType.FRAME, rarity: ItemRarity.RARE,
        assetKey: 'frame_silver', gemPrice: null, coinPrice: 500,
        description: '은빛으로 빛나는 프레임', acquireCondition: '코인 500개로 구매',
        isLimited: false, sortOrder: 10,
      },
      {
        name: '골드 프레임', type: ItemType.FRAME, rarity: ItemRarity.EPIC,
        assetKey: 'frame_gold', gemPrice: null, coinPrice: 1500,
        description: '황금빛으로 빛나는 프레임', acquireCondition: '코인 1,500개로 구매',
        isLimited: false, sortOrder: 11,
      },
      // ── 보석 구매 프레임 ──
      {
        name: '크라운 프레임', type: ItemType.FRAME, rarity: ItemRarity.LEGENDARY,
        assetKey: 'frame_crown', gemPrice: 500, coinPrice: null,
        description: '왕관을 형상화한 전설 프레임', acquireCondition: '보석 500개로 구매',
        isLimited: false, sortOrder: 20,
      },
      {
        name: '불꽃 프레임', type: ItemType.FRAME, rarity: ItemRarity.EPIC,
        assetKey: 'frame_fire', gemPrice: 200, coinPrice: null,
        description: '활활 타오르는 불꽃 프레임', acquireCondition: '보석 200개로 구매',
        isLimited: false, sortOrder: 21,
      },
      // ── 업적 전용 프레임 ──
      {
        name: '동네 전설 프레임', type: ItemType.FRAME, rarity: ItemRarity.LEGENDARY,
        assetKey: 'frame_region_legend', gemPrice: null, coinPrice: null,
        description: '동네 랭킹 1위 달성자에게만 지급', acquireCondition: "업적 '동네 전설' 달성",
        isLimited: false, sortOrder: 30,
      },
      {
        name: 'PvP 챔피언 프레임', type: ItemType.FRAME, rarity: ItemRarity.EPIC,
        assetKey: 'frame_pvp_champ', gemPrice: null, coinPrice: null,
        description: 'PvP 10승 달성자에게 지급', acquireCondition: "업적 'PvP 챔피언' 달성",
        isLimited: false, sortOrder: 31,
      },

      // ── 칭호 ──
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

      // ── 게임 이펙트 ──
      {
        name: '기본 이펙트', type: ItemType.EFFECT, rarity: ItemRarity.COMMON,
        assetKey: 'effect_default', gemPrice: null, coinPrice: null,
        description: '기본 게임 이펙트', acquireCondition: '기본 지급',
        isLimited: false, sortOrder: 0,
      },
      {
        name: '불꽃 히트 이펙트', type: ItemType.EFFECT, rarity: ItemRarity.RARE,
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

      // ── 시즌 한정 아이템 ──
      {
        name: '시즌 1 챔피언 프레임', type: ItemType.FRAME, rarity: ItemRarity.LEGENDARY,
        assetKey: 'frame_s1_champion', gemPrice: null, coinPrice: null,
        description: '시즌 1 최상위 랭커에게만 지급', acquireCondition: '시즌 1 랭킹 상위 1%',
        isLimited: true, sortOrder: 100,
      },
    ];

    await this.itemRepo.save(defaults.map(d => this.itemRepo.create(d)));
  }
}
