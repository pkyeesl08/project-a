import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import {
  GamerDnaEntity,
  calcAvailableDnaPoints,
  DNA_MAX_PER_TRACK,
  DNA_GEM_RESET_COST,
  TOKEN_LIMITS,
} from './gamer-dna.entity';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GameCategory } from '@donggamerank/shared';

/** 게임 카테고리 → DNA 트랙 컬럼명 매핑 */
const CATEGORY_TO_TRACK: Record<string, keyof Pick<GamerDnaEntity,
  'reactionPts' | 'puzzlePts' | 'actionPts' | 'precisionPts' | 'partyPts'>> = {
  [GameCategory.REACTION]:  'reactionPts',
  [GameCategory.PUZZLE]:    'puzzlePts',
  [GameCategory.ACTION]:    'actionPts',
  [GameCategory.PRECISION]: 'precisionPts',
  [GameCategory.PARTY]:     'partyPts',
};

@Injectable()
export class DnaService {
  constructor(
    @InjectRepository(GamerDnaEntity)
    private dnaRepo: Repository<GamerDnaEntity>,
    private usersService: UsersService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // ─────────────────────────────────────────────────
  // 기본 CRUD
  // ─────────────────────────────────────────────────

  async getOrCreate(userId: string): Promise<GamerDnaEntity> {
    const existing = await this.dnaRepo.findOne({ where: { userId } });
    if (existing) return existing;
    return this.dnaRepo.save(this.dnaRepo.create({ userId }));
  }

  /** 이번 주 ISO 주차 키 (YYYY-Www) */
  private weekKey(): string {
    const now = new Date();
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const year = d.getUTCFullYear();
    const week = Math.ceil((((d.getTime() - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────
  // 상태 조회
  // ─────────────────────────────────────────────────

  async getStatus(userId: string) {
    const dna = await this.getOrCreate(userId);
    const user = await this.usersService.findById(userId);
    const level = user?.level ?? 1;
    const totalAvailable = calcAvailableDnaPoints(level);
    const totalUsed = dna.reactionPts + dna.puzzlePts + dna.actionPts + dna.precisionPts + dna.partyPts;
    const wk = this.weekKey();

    const [esUsed, duUsed, bpUsed, pendingShield, pendingDoubleUp, bestPickSession] = await Promise.all([
      this.redis.get(`dna:elo_shield:${userId}:${wk}`),
      this.redis.get(`dna:double_up:${userId}:${wk}`),
      this.redis.get(`dna:best_pick:${userId}:${wk}`),
      this.redis.get(`dna:pending:elo_shield:${userId}`),
      this.redis.get(`dna:pending:double_up:${userId}`),
      this.redis.get(`dna:best_pick_active:${userId}`),
    ]);

    const currentMonth = new Date().toISOString().substring(0, 7);

    return {
      pts: {
        reaction:  dna.reactionPts,
        puzzle:    dna.puzzlePts,
        action:    dna.actionPts,
        precision: dna.precisionPts,
        party:     dna.partyPts,
      },
      totalUsed,
      totalAvailable,
      remaining: Math.max(0, totalAvailable - totalUsed),
      level,
      canFreeReset: dna.lastFreeResetMonth !== currentMonth,
      gemResetCost: DNA_GEM_RESET_COST,
      tokens: {
        eloShield: {
          unlocked: dna.reactionPts >= 7,
          weeklyLimit: TOKEN_LIMITS.eloShield,
          used: parseInt(esUsed ?? '0'),
          remaining: Math.max(0, TOKEN_LIMITS.eloShield - parseInt(esUsed ?? '0')),
          pendingActive: !!pendingShield,
        },
        doubleUp: {
          unlocked: dna.actionPts >= 5,
          weeklyLimit: TOKEN_LIMITS.doubleUp,
          used: parseInt(duUsed ?? '0'),
          remaining: Math.max(0, TOKEN_LIMITS.doubleUp - parseInt(duUsed ?? '0')),
          pendingActive: !!pendingDoubleUp,
        },
        bestPick: {
          unlocked: dna.precisionPts >= 5,
          weeklyLimit: TOKEN_LIMITS.bestPick,
          used: parseInt(bpUsed ?? '0'),
          remaining: Math.max(0, TOKEN_LIMITS.bestPick - parseInt(bpUsed ?? '0')),
          activeSession: bestPickSession ? JSON.parse(bestPickSession) : null,
        },
      },
    };
  }

  // ─────────────────────────────────────────────────
  // 포인트 배분 / 리셋
  // ─────────────────────────────────────────────────

  async allocate(userId: string, pts: {
    reaction: number; puzzle: number; action: number; precision: number; party: number;
  }) {
    const user = await this.usersService.findById(userId);
    const level = user?.level ?? 1;
    const totalAvailable = calcAvailableDnaPoints(level);

    const values = [pts.reaction, pts.puzzle, pts.action, pts.precision, pts.party];
    if (values.some(v => !Number.isInteger(v) || v < 0 || v > DNA_MAX_PER_TRACK)) {
      throw new BadRequestException(`각 트랙은 0~${DNA_MAX_PER_TRACK}pt 사이여야 합니다.`);
    }
    const total = values.reduce((a, b) => a + b, 0);
    if (total > totalAvailable) {
      throw new BadRequestException(`사용 가능 포인트(${totalAvailable}pt)를 초과했습니다.`);
    }

    const dna = await this.getOrCreate(userId);
    dna.reactionPts  = pts.reaction;
    dna.puzzlePts    = pts.puzzle;
    dna.actionPts    = pts.action;
    dna.precisionPts = pts.precision;
    dna.partyPts     = pts.party;
    await this.dnaRepo.save(dna);

    return { allocated: true, pts };
  }

  async resetFree(userId: string) {
    const dna = await this.getOrCreate(userId);
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (dna.lastFreeResetMonth === currentMonth) {
      throw new BadRequestException('이번 달 무료 리셋을 이미 사용했습니다. 보석(80💎)으로 추가 리셋하세요.');
    }
    await this.dnaRepo.update(dna.id, {
      reactionPts: 0, puzzlePts: 0, actionPts: 0, precisionPts: 0, partyPts: 0,
      lastFreeResetMonth: currentMonth,
    });
    return { reset: true, type: 'free' };
  }

  async resetWithGems(userId: string) {
    await this.usersService.spendGems(userId, DNA_GEM_RESET_COST);
    const dna = await this.getOrCreate(userId);
    await this.dnaRepo.update(dna.id, {
      reactionPts: 0, puzzlePts: 0, actionPts: 0, precisionPts: 0, partyPts: 0,
    });
    return { reset: true, type: 'gems', gemsSpent: DNA_GEM_RESET_COST };
  }

  // ─────────────────────────────────────────────────
  // 토큰 활성화
  // ─────────────────────────────────────────────────

  async activateEloShield(userId: string) {
    const dna = await this.getOrCreate(userId);
    if (dna.reactionPts < 7) throw new BadRequestException('⚡ 반응 DNA 7pt 이상 필요합니다.');

    const wk = this.weekKey();
    const used = parseInt(await this.redis.get(`dna:elo_shield:${userId}:${wk}`) ?? '0');
    if (used >= TOKEN_LIMITS.eloShield) {
      throw new BadRequestException('이번 주 ELO 쉴드를 이미 사용했습니다.');
    }
    await this.redis.set(`dna:pending:elo_shield:${userId}`, '1', 'EX', 3600);
    return { activated: true, token: 'elo_shield' };
  }

  async activateDoubleUp(userId: string) {
    const dna = await this.getOrCreate(userId);
    if (dna.actionPts < 5) throw new BadRequestException('🎮 액션 DNA 5pt 이상 필요합니다.');

    const wk = this.weekKey();
    const used = parseInt(await this.redis.get(`dna:double_up:${userId}:${wk}`) ?? '0');
    if (used >= TOKEN_LIMITS.doubleUp) {
      throw new BadRequestException('이번 주 더블업을 이미 사용했습니다.');
    }
    await this.redis.set(`dna:pending:double_up:${userId}`, '1', 'EX', 3600);
    return { activated: true, token: 'double_up' };
  }

  async activateBestPick(userId: string) {
    const dna = await this.getOrCreate(userId);
    if (dna.precisionPts < 5) throw new BadRequestException('🎯 정밀 DNA 5pt 이상 필요합니다.');

    const wk = this.weekKey();
    const used = parseInt(await this.redis.get(`dna:best_pick:${userId}:${wk}`) ?? '0');
    if (used >= TOKEN_LIMITS.bestPick) {
      throw new BadRequestException('이번 주 베스트픽을 모두 사용했습니다.');
    }
    const session = JSON.stringify({ attempts: [], startedAt: Date.now() });
    await this.redis.set(`dna:best_pick_active:${userId}`, session, 'EX', 86400);
    return { started: true };
  }

  // ─────────────────────────────────────────────────
  // 게임 결과 DNA 효과 적용 (games.service에서 호출)
  // ─────────────────────────────────────────────────

  async applyDnaEffects(userId: string, input: {
    gameCategory: string;
    isNewHighScore: boolean;
    rawEloChange: number;
    coinReward: number;
    xpReward: number;
  }): Promise<{
    finalCoinReward: number;
    finalXpReward: number;
    finalEloChange: number;
    activeBonuses: string[];
  }> {
    const dna = await this.getOrCreate(userId);
    const trackPts = this.getTrackPts(dna, input.gameCategory);

    let coinMult = 1.0;
    let xpMult   = 1.0;
    let finalElo = input.rawEloChange;
    const bonuses: string[] = [];

    // ── 기본 DNA 트랙 효과 ──────────────────────────
    if (trackPts >= 1) { xpMult   += 0.15; bonuses.push('XP+15%'); }
    if (trackPts >= 2) { coinMult += 0.20; bonuses.push('코인+20%'); }

    // ELO 효과 (4pt 이상)
    if (trackPts >= 4) {
      if (finalElo < 0 && (input.gameCategory === GameCategory.REACTION || input.gameCategory === GameCategory.PRECISION)) {
        finalElo = Math.floor(finalElo * 0.9);
        bonuses.push('ELO감소-10%');
      }
      if (finalElo > 0 && input.gameCategory === GameCategory.ACTION) {
        finalElo = Math.ceil(finalElo * 1.05);
        bonuses.push('ELO상승+5%');
      }
    }

    // 정밀 4pt: 신기록 코인 2배
    if (dna.precisionPts >= 4 && input.isNewHighScore && input.gameCategory === GameCategory.PRECISION) {
      coinMult *= 2;
      bonuses.push('신기록코인2배');
    }

    // ── 시너지 ──────────────────────────────────────
    // ⚡+🎯 예리한 반사신경: 신기록 XP +50%
    if (dna.reactionPts >= 4 && dna.precisionPts >= 4 && input.isNewHighScore) {
      xpMult += 0.5;
      bonuses.push('시너지:신기록XP+50%');
    }
    // ⚡+🎮 스피드 러너: 반응/액션 코인 +30%
    if (dna.reactionPts >= 4 && dna.actionPts >= 4 &&
        (input.gameCategory === GameCategory.REACTION || input.gameCategory === GameCategory.ACTION)) {
      coinMult += 0.3;
      bonuses.push('시너지:코인+30%');
    }
    // 🧠+🌟 만능 게이머: 전체 XP +5%
    if (dna.puzzlePts >= 4 && dna.partyPts >= 4) {
      xpMult += 0.05;
      bonuses.push('시너지:전체XP+5%');
    }
    // 🎯+🧠 집중 분석가: ELO 하락 -15%
    if (dna.precisionPts >= 4 && dna.puzzlePts >= 4 && finalElo < 0) {
      finalElo = Math.floor(finalElo * 0.85);
      bonuses.push('시너지:ELO감소-15%');
    }

    // ── ELO 쉴드 토큰 소모 ─────────────────────────
    const pendingShield = await this.redis.get(`dna:pending:elo_shield:${userId}`);
    if (pendingShield && finalElo < 0) {
      finalElo = 0;
      bonuses.push('🛡️ELO쉴드');
      await this.redis.del(`dna:pending:elo_shield:${userId}`);
      const wk = this.weekKey();
      await this.redis.incr(`dna:elo_shield:${userId}:${wk}`);
      await this.redis.expire(`dna:elo_shield:${userId}:${wk}`, 7 * 24 * 3600);
    }

    // ── 더블업 토큰 소모 ────────────────────────────
    const pendingDoubleUp = await this.redis.get(`dna:pending:double_up:${userId}`);
    if (pendingDoubleUp && finalElo > 0) {
      finalElo = Math.floor(finalElo * 2);
      bonuses.push('⚡더블업');
      await this.redis.del(`dna:pending:double_up:${userId}`);
      const wk = this.weekKey();
      await this.redis.incr(`dna:double_up:${userId}:${wk}`);
      await this.redis.expire(`dna:double_up:${userId}:${wk}`, 7 * 24 * 3600);
    }

    return {
      finalCoinReward: Math.round(input.coinReward * coinMult),
      finalXpReward:   Math.round(input.xpReward   * xpMult),
      finalEloChange:  finalElo,
      activeBonuses:   bonuses,
    };
  }

  /** 출석 시 파티 DNA 보상 배율 (partyPts >= 5 → 1.5배) */
  async getAttendanceBonus(userId: string): Promise<number> {
    const dna = await this.getOrCreate(userId);
    return dna.partyPts >= 5 ? 1.5 : 1.0;
  }

  /** Endless 모드 추가 하트 여부 (actionPts >= 3) */
  async getEndlessExtraHeart(userId: string): Promise<boolean> {
    const dna = await this.getOrCreate(userId);
    return dna.actionPts >= 3;
  }

  /** 게임 플레이 전 클라이언트에 전달할 DNA 강화 정보 */
  async getEnhancementsForGame(userId: string, gameCategory: string) {
    const dna = await this.getOrCreate(userId);
    const [pendingShield, pendingDoubleUp] = await Promise.all([
      this.redis.get(`dna:pending:elo_shield:${userId}`),
      this.redis.get(`dna:pending:double_up:${userId}`),
    ]);
    const wk = this.weekKey();
    const [esUsed, duUsed, bpUsed] = await Promise.all([
      this.redis.get(`dna:elo_shield:${userId}:${wk}`),
      this.redis.get(`dna:double_up:${userId}:${wk}`),
      this.redis.get(`dna:best_pick:${userId}:${wk}`),
    ]);

    return {
      // 패시브
      xpBonus:      dna[CATEGORY_TO_TRACK[gameCategory] ?? 'reactionPts'] >= 1,
      coinBonus:    dna[CATEGORY_TO_TRACK[gameCategory] ?? 'reactionPts'] >= 2,
      // 기능 특권
      hasSlowToken:       dna.reactionPts >= 5,
      hasPatternExtender: dna.puzzlePts >= 5 && gameCategory === GameCategory.PUZZLE,
      hasAimAssist:       dna.precisionPts >= 3 && gameCategory === GameCategory.PRECISION,
      hasSecondChance:    dna.puzzlePts >= 7,
      endlessExtraHeart:  dna.actionPts >= 3,
      hasBestPickActive:  dna.precisionPts >= 5 && parseInt(bpUsed ?? '0') < 3,
      // 토큰 대기 상태
      eloShieldPending:   !!pendingShield,
      doubleUpPending:    !!pendingDoubleUp,
      // 토큰 잔여
      eloShieldRemaining: Math.max(0, 1 - parseInt(esUsed ?? '0')),
      doubleUpRemaining:  Math.max(0, 1 - parseInt(duUsed ?? '0')),
      bestPickRemaining:  Math.max(0, 3 - parseInt(bpUsed ?? '0')),
    };
  }

  private getTrackPts(dna: GamerDnaEntity, category: string): number {
    const key = CATEGORY_TO_TRACK[category];
    return key ? dna[key] : 0;
  }
}
