import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccountEntity } from './external-account.entity';
import { RiotApiService, tierToScore, tierToKorean } from './riot-api.service';
import { NexonApiService, fcDivisionToScore } from './nexon-api.service';

@Injectable()
export class ExternalService {
  constructor(
    @InjectRepository(ExternalAccountEntity)
    private externalRepo: Repository<ExternalAccountEntity>,
    private riotApi: RiotApiService,
    private nexonApi: NexonApiService,
  ) {}

  /* ══════════════════════════════════════
   * 메이플스토리
   * ══════════════════════════════════════ */

  /** 메이플 캐릭터 조회 (연동 전 미리보기) */
  async lookupMaple(characterName: string) {
    return this.nexonApi.mapleGetPlayerInfo(characterName);
  }

  /** 메이플 계정 연동 */
  async connectMaple(userId: string, characterName: string) {
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'nexon', game: 'maplestory' },
    });
    if (existing) throw new BadRequestException('이미 메이플스토리 계정이 연동되어 있습니다.');

    const info = await this.nexonApi.mapleGetPlayerInfo(characterName);

    const account = this.externalRepo.create({
      userId,
      platform: 'nexon',
      game: 'maplestory',
      externalId: info.ocid,
      gameName: info.characterName,
      tier: `Lv.${info.level} ${info.class}`,
      tierScore: info.level,  // 레벨 기준 정렬
      stats: {
        world: info.world,
        class: info.class,
        level: info.level,
        combatPower: info.combatPower,
        guild: info.guild,
        image: info.image,
        expRate: info.expRate,
      },
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(account);
  }

  /** 메이플 데이터 갱신 */
  async syncMaple(userId: string) {
    const account = await this.externalRepo.findOne({
      where: { userId, platform: 'nexon', game: 'maplestory' },
    });
    if (!account) throw new NotFoundException('연동된 메이플스토리 계정이 없습니다.');

    const info = await this.nexonApi.mapleGetPlayerInfo(account.gameName);
    account.tier = `Lv.${info.level} ${info.class}`;
    account.tierScore = info.level;
    account.stats = {
      world: info.world, class: info.class, level: info.level,
      combatPower: info.combatPower, guild: info.guild,
      image: info.image, expRate: info.expRate,
    };
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  /** 동네/학교별 메이플 랭킹 (레벨순) */
  async getMapleRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    const qb = this.externalRepo
      .createQueryBuilder('ext')
      .innerJoinAndSelect('ext.user', 'user')
      .where('ext.game = :game', { game: 'maplestory' })
      .andWhere('ext.tierScore > 0')
      .orderBy('ext.tierScore', 'DESC')
      .limit(limit);

    if (scope === 'region') {
      qb.andWhere('user.primaryRegionId = :scopeId', { scopeId });
    } else {
      qb.andWhere('user.schoolId = :scopeId', { scopeId });
    }

    const results = await qb.getMany();
    return results.map((acc, i) => ({
      rank: i + 1,
      userId: acc.userId,
      nickname: acc.user?.nickname,
      characterName: acc.gameName,
      tier: acc.tier,
      level: acc.tierScore,
      stats: acc.stats,
      lastSynced: acc.lastSyncedAt,
    }));
  }

  /* ══════════════════════════════════════
   * FC 온라인
   * ══════════════════════════════════════ */

  /** FC온라인 조회 (연동 전 미리보기) */
  async lookupFcOnline(nickname: string) {
    return this.nexonApi.fcGetPlayerInfo(nickname);
  }

  /** FC온라인 계정 연동 */
  async connectFcOnline(userId: string, nickname: string) {
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'nexon', game: 'fconline' },
    });
    if (existing) throw new BadRequestException('이미 FC 온라인 계정이 연동되어 있습니다.');

    const info = await this.nexonApi.fcGetPlayerInfo(nickname);

    // 공식경기 최고 등급 찾기
    const officialDiv = info.maxDivision.find(d => d.matchType === '공식경기');
    const tierText = officialDiv ? officialDiv.division : '등급 없음';

    const account = this.externalRepo.create({
      userId,
      platform: 'nexon',
      game: 'fconline',
      externalId: info.ouid,
      gameName: info.nickname,
      tier: tierText,
      tierScore: officialDiv ? fcDivisionToScore(parseInt(info.ouid, 10) || 0) : 0,
      stats: {
        level: info.level,
        maxDivision: info.maxDivision,
      },
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(account);
  }

  /** FC온라인 데이터 갱신 */
  async syncFcOnline(userId: string) {
    const account = await this.externalRepo.findOne({
      where: { userId, platform: 'nexon', game: 'fconline' },
    });
    if (!account) throw new NotFoundException('연동된 FC 온라인 계정이 없습니다.');

    const info = await this.nexonApi.fcGetPlayerInfo(account.gameName);
    const officialDiv = info.maxDivision.find(d => d.matchType === '공식경기');
    account.tier = officialDiv ? officialDiv.division : '등급 없음';
    account.stats = { level: info.level, maxDivision: info.maxDivision };
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  /**
   * LoL 계정 연동 — Riot ID로 실제 API 조회 후 저장
   * @param riotId "닉네임#태그" 형식
   */
  async connectLol(userId: string, riotId: string) {
    // 중복 체크
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'riot', game: 'lol' },
    });
    if (existing) throw new BadRequestException('이미 LoL 계정이 연동되어 있습니다.');

    // Riot API 실제 호출
    const info = await this.riotApi.getPlayerInfo(riotId);

    const account = this.externalRepo.create({
      userId,
      platform: 'riot',
      game: 'lol',
      externalId: info.puuid,
      gameName: `${info.gameName}#${info.tagLine}`,
      tier: info.soloRank
        ? tierToKorean(info.soloRank.tier, info.soloRank.rank)
        : '언랭크',
      tierScore: info.soloRank
        ? tierToScore(info.soloRank.tier, info.soloRank.rank, info.soloRank.lp)
        : 0,
      stats: {
        soloRank: info.soloRank,
        flexRank: info.flexRank,
        summonerLevel: info.summonerLevel,
        profileIconId: info.profileIconId,
      },
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(account);
  }

  /** LoL 데이터 최신화 */
  async syncLol(userId: string) {
    const account = await this.externalRepo.findOne({
      where: { userId, platform: 'riot', game: 'lol' },
    });
    if (!account) throw new NotFoundException('연동된 LoL 계정이 없습니다.');

    const [gameName, tagLine] = account.gameName.split('#');
    const info = await this.riotApi.getPlayerInfo(`${gameName}#${tagLine}`);

    account.tier = info.soloRank
      ? tierToKorean(info.soloRank.tier, info.soloRank.rank)
      : '언랭크';
    account.tierScore = info.soloRank
      ? tierToScore(info.soloRank.tier, info.soloRank.rank, info.soloRank.lp)
      : 0;
    account.stats = {
      soloRank: info.soloRank,
      flexRank: info.flexRank,
      summonerLevel: info.summonerLevel,
      profileIconId: info.profileIconId,
    };
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  /** Riot ID로 LoL 정보 미리보기 (연동 전 확인용) */
  async lookupLol(riotId: string) {
    return this.riotApi.getPlayerInfo(riotId);
  }

  /** 동네/학교 기준 LoL 랭킹 */
  async getLolRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    const qb = this.externalRepo
      .createQueryBuilder('ext')
      .innerJoinAndSelect('ext.user', 'user')
      .where('ext.game = :game', { game: 'lol' })
      .andWhere('ext.tierScore > 0')
      .orderBy('ext.tierScore', 'DESC')
      .limit(limit);

    if (scope === 'region') {
      qb.andWhere('user.primaryRegionId = :scopeId', { scopeId });
    } else {
      qb.andWhere('user.schoolId = :scopeId', { scopeId });
    }

    const results = await qb.getMany();

    return results.map((acc, i) => ({
      rank: i + 1,
      userId: acc.userId,
      nickname: acc.user?.nickname,
      gameName: acc.gameName,
      tier: acc.tier,
      tierScore: acc.tierScore,
      soloRank: (acc.stats as any)?.soloRank ?? null,
      lastSynced: acc.lastSyncedAt,
    }));
  }

  /* ── 기존 범용 메서드 (다른 게임용) ── */

  async connect(userId: string, platform: string, data: { token: string; game: string }) {
    if (platform === 'riot' && data.game === 'lol') {
      return this.connectLol(userId, data.token);  // token에 riotId 전달
    }

    const validCombos: Record<string, string[]> = {
      riot: ['valorant'],
      battlenet: ['ow2'],
      nexon: ['fifaonline'],
    };
    if (!validCombos[platform]?.includes(data.game)) {
      throw new BadRequestException('지원하지 않는 플랫폼/게임 조합입니다.');
    }

    const existing = await this.externalRepo.findOne({
      where: { userId, platform, game: data.game },
    });
    if (existing) throw new BadRequestException('이미 연동된 계정입니다.');

    // TODO: 발로란트, OW2, 피파 등 실제 연동
    const account = this.externalRepo.create({
      userId, platform, game: data.game,
      externalId: `${platform}_${Date.now()}`,
      gameName: `Player#${Math.floor(Math.random() * 9999)}`,
      tier: 'Unranked',
      tierScore: 0,
      stats: {},
      lastSyncedAt: new Date(),
    });
    return this.externalRepo.save(account);
  }

  async disconnect(userId: string, platform: string, game: string) {
    const account = await this.externalRepo.findOne({ where: { userId, platform, game } });
    if (!account) throw new NotFoundException('연동된 계정이 없습니다.');
    await this.externalRepo.remove(account);
    return { disconnected: true };
  }

  async sync(userId: string, platform: string, game: string) {
    if (platform === 'riot' && game === 'lol') {
      return this.syncLol(userId);
    }
    throw new BadRequestException('해당 게임의 동기화는 아직 지원하지 않습니다.');
  }

  async getUserAccounts(userId: string) {
    return this.externalRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }
}
