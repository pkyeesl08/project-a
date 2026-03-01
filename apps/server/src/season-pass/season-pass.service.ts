import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity';
import {
  UserSeasonPassEntity,
  SEASON_PASS_TIERS,
  XP_GRANTS,
} from './season-pass.entity';
import { AvatarService } from '../avatar/avatar.service';
import { SeasonsService } from '../seasons/seasons.service';
import { AcquireMethod } from '../avatar/avatar-item.entity';

/** 골드 패스 가격 (보석) */
export const GOLD_PASS_GEM_PRICE = 500;

@Injectable()
export class SeasonPassService {
  constructor(
    @InjectRepository(UserSeasonPassEntity)
    private passRepo: Repository<UserSeasonPassEntity>,
    private avatarService: AvatarService,
    private seasonsService: SeasonsService,
  ) {}

  /** 현재 시즌 패스 진행 상황 조회 (없으면 자동 생성) */
  async getMyProgress(userId: string) {
    const seasonId = await this.seasonsService.getCurrentSeasonId();
    if (!seasonId) {
      return { noActiveSeason: true, tiers: SEASON_PASS_TIERS, seasonXp: 0, hasGoldPass: false };
    }

    const pass = await this.getOrCreatePass(userId, seasonId);
    const unlockedTiers = SEASON_PASS_TIERS.filter(t => pass.seasonXp >= t.requiredXp);
    const currentTier = unlockedTiers.length;
    const nextTier = SEASON_PASS_TIERS[currentTier];

    return {
      seasonId,
      seasonXp: pass.seasonXp,
      hasGoldPass: pass.hasGoldPass,
      currentTier,
      nextTierXp: nextTier?.requiredXp ?? null,
      xpToNext: nextTier ? nextTier.requiredXp - pass.seasonXp : null,
      claimedFreeTiers: pass.claimedFreeTiers,
      claimedGoldTiers: pass.claimedGoldTiers,
      tiers: SEASON_PASS_TIERS.map(t => ({
        ...t,
        unlocked: pass.seasonXp >= t.requiredXp,
        freeClaimable: pass.seasonXp >= t.requiredXp && !pass.claimedFreeTiers.includes(t.tier),
        goldClaimable: pass.hasGoldPass && pass.seasonXp >= t.requiredXp && !pass.claimedGoldTiers.includes(t.tier),
      })),
      goldPassPrice: GOLD_PASS_GEM_PRICE,
    };
  }

  /** 시즌 XP 추가 (게임 완료/미션 완료 시 내부 호출) */
  async addSeasonXp(userId: string, source: keyof typeof XP_GRANTS) {
    const seasonId = await this.seasonsService.getCurrentSeasonId();
    if (!seasonId) return;

    // 레코드 보장 후 원자적 UPDATE (Race Condition 방지: 읽기-쓰기 분리 제거)
    await this.getOrCreatePass(userId, seasonId);

    const xpAmount = XP_GRANTS[source];
    await this.passRepo
      .createQueryBuilder()
      .update()
      .set({ seasonXp: () => `"seasonXp" + :xpAmount` })
      .where('"userId" = :userId AND "seasonId" = :seasonId', { userId, seasonId, xpAmount })
      .execute();
  }

  /** 특정 티어 무료/골드 보상 수령 — PostgreSQL array_append로 Race Condition 방지 */
  async claimTierReward(userId: string, tier: number, track: 'free' | 'gold') {
    const seasonId = await this.seasonsService.getCurrentSeasonId();
    if (!seasonId) throw new BadRequestException('활성 시즌이 없습니다.');

    const tierDef = SEASON_PASS_TIERS.find(t => t.tier === tier);
    if (!tierDef) throw new NotFoundException('존재하지 않는 티어입니다.');

    const pass = await this.getOrCreatePass(userId, seasonId);
    if (pass.seasonXp < tierDef.requiredXp) throw new BadRequestException('XP가 부족합니다.');
    if (track === 'gold' && !pass.hasGoldPass) throw new BadRequestException('골드 패스가 필요합니다.');

    const claimedField = track === 'free' ? 'claimedFreeTiers' : 'claimedGoldTiers';
    const colName = track === 'free' ? '"claimedFreeTiers"' : '"claimedGoldTiers"';

    // 원자적 UPDATE — :tier가 이미 배열에 없는 경우에만 추가 (Race Condition 방지)
    const result = await this.passRepo
      .createQueryBuilder()
      .update()
      .set({ [claimedField]: () => `array_append(${colName}, ${tier})` })
      .where(
        '"userId" = :userId AND "seasonId" = :seasonId AND NOT (:tier = ANY(' + colName + '))',
        { userId, seasonId, tier },
      )
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new BadRequestException('이미 수령한 보상입니다.');
    }

    const reward = tierDef[track];

    // 보상 지급
    await Promise.allSettled([
      reward.coins ? this.avatarService.addCoins(userId, reward.coins) : Promise.resolve(),
      reward.gems  ? this.avatarService.addGems(userId, reward.gems)   : Promise.resolve(),
      reward.assetKey
        ? this.avatarService.grantItemByKey(userId, reward.assetKey, AcquireMethod.SEASON)
        : Promise.resolve(),
    ]);

    return { claimed: true, tier, track, reward };
  }

  /** 골드 패스 구매 (보석 차감) — 트랜잭션으로 원자성 보장 */
  async purchaseGoldPass(userId: string) {
    const seasonId = await this.seasonsService.getCurrentSeasonId();
    if (!seasonId) throw new BadRequestException('활성 시즌이 없습니다.');

    await this.getOrCreatePass(userId, seasonId);

    return this.passRepo.manager.transaction(async (em) => {
      // 1단계: 보석 차감 먼저 (잔액 부족 시 트랜잭션 전체 롤백)
      const gemResult = await em
        .getRepository(UserEntity)
        .createQueryBuilder()
        .update()
        .set({ gems: () => `gems - ${GOLD_PASS_GEM_PRICE}` })
        .where('id = :userId AND gems >= :price', { userId, price: GOLD_PASS_GEM_PRICE })
        .execute();

      if (!gemResult.affected || gemResult.affected === 0) {
        throw new BadRequestException('보석이 부족합니다.');
      }

      // 2단계: 패스 구매 상태 변경 (이미 보유 시 트랜잭션 전체 롤백)
      const passResult = await em
        .getRepository(UserSeasonPassEntity)
        .createQueryBuilder()
        .update()
        .set({ hasGoldPass: true })
        .where('"userId" = :userId AND "seasonId" = :seasonId AND "hasGoldPass" = false', { userId, seasonId })
        .execute();

      if (!passResult.affected || passResult.affected === 0) {
        throw new BadRequestException('이미 골드 패스를 보유하고 있습니다.');
      }

      return { purchased: true, gemsSpent: GOLD_PASS_GEM_PRICE };
    });
  }

  private async getOrCreatePass(userId: string, seasonId: string): Promise<UserSeasonPassEntity> {
    const existing = await this.passRepo.findOne({ where: { userId, seasonId } });
    if (existing) return existing;

    return this.passRepo.save(
      this.passRepo.create({
        userId,
        seasonId,
        seasonXp: 0,
        hasGoldPass: false,
        claimedFreeTiers: [],
        claimedGoldTiers: [],
      }),
    );
  }
}
