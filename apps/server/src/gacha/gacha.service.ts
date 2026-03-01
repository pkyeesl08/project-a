import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import { AvatarItemEntity, ItemRarity } from '../avatar/avatar-item.entity';
import { UserAvatarItemEntity } from '../avatar/user-avatar.entity';
import { UserEntity } from '../users/user.entity';
import { AvatarService } from '../avatar/avatar.service';
import { AcquireMethod } from '../avatar/avatar-item.entity';
import { REDIS_CLIENT } from '../redis/redis.module';

/** 뽑기 확률 */
const RARITY_WEIGHTS = {
  [ItemRarity.COMMON]:    50,
  [ItemRarity.RARE]:      35,
  [ItemRarity.EPIC]:      13,
  [ItemRarity.LEGENDARY]: 2,
};

/** 중복 시 코인 보상 */
const DUPE_COIN_REWARD: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]:    200,
  [ItemRarity.RARE]:      500,
  [ItemRarity.EPIC]:      800,
  [ItemRarity.LEGENDARY]: 1500,
};

/** 뽑기 비용 (보석) */
export const GACHA_GEM_COST = { single: 100, ten: 900 };

/** 피티 천장 */
const PITY_EPIC_AT      = 50;
const PITY_LEGENDARY_AT = 80;

@Injectable()
export class GachaService {
  constructor(
    @InjectRepository(AvatarItemEntity)
    private itemRepo: Repository<AvatarItemEntity>,
    @InjectRepository(UserAvatarItemEntity)
    private inventoryRepo: Repository<UserAvatarItemEntity>,
    @InjectRepository(UserEntity)
    private usersRepo: Repository<UserEntity>,
    private avatarService: AvatarService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  /** 피티 정보 조회 */
  async getPityInfo(userId: string) {
    const [epic, legendary] = await Promise.all([
      this.redis.get(`gacha:pity_epic:${userId}`),
      this.redis.get(`gacha:pity_legendary:${userId}`),
    ]);
    return {
      epicPity: parseInt(epic ?? '0'),
      legendaryPity: parseInt(legendary ?? '0'),
      epicAt: PITY_EPIC_AT,
      legendaryAt: PITY_LEGENDARY_AT,
      singleCost: GACHA_GEM_COST.single,
      tenCost: GACHA_GEM_COST.ten,
    };
  }

  /** 단일 / 10연 뽑기 */
  async pull(userId: string, count: 1 | 10) {
    const gemCost = count === 1 ? GACHA_GEM_COST.single : GACHA_GEM_COST.ten;

    // Redis 세마포어 — 동시 뽑기 요청 차단 (5초 TTL)
    const lockKey = `gacha:lock:${userId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 5, 'NX');
    if (!acquired) {
      throw new BadRequestException('뽑기가 이미 진행 중입니다. 잠시 후 다시 시도해주세요.');
    }

    try {
      // 보석 차감 (원자적)
      const deductResult = await this.usersRepo
        .createQueryBuilder()
        .update()
        .set({ gems: () => `gems - ${gemCost}` })
        .where('id = :userId AND gems >= :cost', { userId, cost: gemCost })
        .execute();

      if (!deductResult.affected || deductResult.affected === 0) {
        throw new BadRequestException('보석이 부족합니다.');
      }

      // 현재 소유 아이템 ID 목록
      const owned = await this.inventoryRepo.find({ where: { userId }, select: ['itemId'] });
      const ownedIds = new Set(owned.map(o => o.itemId));

      // 풀 전체 조회 (최대 10,000개 제한)
      const pool = await this.itemRepo.find({ where: { isActive: true }, take: 10_000 });
      const poolByRarity: Record<string, AvatarItemEntity[]> = {
        [ItemRarity.COMMON]:    pool.filter(i => i.rarity === ItemRarity.COMMON),
        [ItemRarity.RARE]:      pool.filter(i => i.rarity === ItemRarity.RARE),
        [ItemRarity.EPIC]:      pool.filter(i => i.rarity === ItemRarity.EPIC),
        [ItemRarity.LEGENDARY]: pool.filter(i => i.rarity === ItemRarity.LEGENDARY),
      };

      try {
        const results: GachaResult[] = [];
        for (let i = 0; i < count; i++) {
          const pullResult = await this.singlePull(userId, ownedIds, poolByRarity);
          results.push(pullResult);
          if (pullResult.item) ownedIds.add(pullResult.item.id);
        }
        return { results, remaining: await this.getUserGems(userId) };
      } catch (err) {
        // 아이템 지급 실패 시 보석 전액 환불
        await this.avatarService.addGems(userId, gemCost);
        throw err;
      }
    } finally {
      // 락 해제 (성공/실패 관계없이)
      await this.redis.del(lockKey);
    }
  }

  private async singlePull(
    userId: string,
    ownedIds: Set<string>,
    poolByRarity: Record<string, AvatarItemEntity[]>,
  ): Promise<GachaResult> {
    // 피티 카운터 증가
    const [epicPityRaw, legendaryPityRaw] = await Promise.all([
      this.redis.incr(`gacha:pity_epic:${userId}`),
      this.redis.incr(`gacha:pity_legendary:${userId}`),
    ]);

    let rarity = this.rollRarity();

    // 피티 천장 적용
    if (legendaryPityRaw >= PITY_LEGENDARY_AT) {
      rarity = ItemRarity.LEGENDARY;
    } else if (epicPityRaw >= PITY_EPIC_AT && rarity === ItemRarity.COMMON || rarity === ItemRarity.RARE) {
      // EPIC 피티: 50회 내 EPIC 미달성 시 EPIC 확정
      if (epicPityRaw >= PITY_EPIC_AT) rarity = ItemRarity.EPIC;
    }

    // 피티 리셋
    if (rarity === ItemRarity.LEGENDARY) {
      await Promise.all([
        this.redis.set(`gacha:pity_epic:${userId}`, '0'),
        this.redis.set(`gacha:pity_legendary:${userId}`, '0'),
      ]);
    } else if (rarity === ItemRarity.EPIC) {
      await this.redis.set(`gacha:pity_epic:${userId}`, '0');
    }

    // 해당 등급 아이템 풀에서 랜덤 선택
    const candidatePool = poolByRarity[rarity];
    if (!candidatePool || candidatePool.length === 0) {
      // 풀이 비어있으면 코인 보상
      await this.avatarService.addCoins(userId, DUPE_COIN_REWARD[rarity]);
      return { rarity, item: null, isDuplicate: true, dupeCoins: DUPE_COIN_REWARD[rarity] };
    }

    const item = candidatePool[Math.floor(Math.random() * candidatePool.length)];

    if (ownedIds.has(item.id)) {
      // 중복 → 코인 보상
      const coins = DUPE_COIN_REWARD[rarity];
      await this.avatarService.addCoins(userId, coins);
      return { rarity, item, isDuplicate: true, dupeCoins: coins };
    }

    // 신규 아이템 지급
    await this.avatarService.grantItemByKey(userId, item.assetKey, AcquireMethod.EVENT);
    return { rarity, item, isDuplicate: false, dupeCoins: 0 };
  }

  private rollRarity(): ItemRarity {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
      cumulative += weight;
      if (roll < cumulative) return rarity as ItemRarity;
    }
    return ItemRarity.COMMON;
  }

  private async getUserGems(userId: string): Promise<number> {
    const user = await this.usersRepo.findOne({ where: { id: userId }, select: ['gems'] });
    return user?.gems ?? 0;
  }
}

interface GachaResult {
  rarity: ItemRarity;
  item: AvatarItemEntity | null;
  isDuplicate: boolean;
  dupeCoins: number;
}
