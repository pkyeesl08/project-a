import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccountEntity } from './external-account.entity';
import { RiotApiService, tierToScore, tierToKorean } from './riot-api.service';
import { NexonApiService, fcDivisionToScore } from './nexon-api.service';
import { PubgApiService, pubgTierToScore, pubgTierToKorean } from './pubg-api.service';
import { SteamApiService, steamTierScore } from './steam-api.service';

@Injectable()
export class ExternalService {
  constructor(
    @InjectRepository(ExternalAccountEntity)
    private externalRepo: Repository<ExternalAccountEntity>,
    private riotApi: RiotApiService,
    private nexonApi: NexonApiService,
    private pubgApi: PubgApiService,
    private steamApi: SteamApiService,
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

  /* ══════════════════════════════════════
   * PUBG (배틀그라운드)
   * ══════════════════════════════════════ */

  /** PUBG 플레이어 정보 미리보기 (연동 전 확인) */
  async lookupPubg(playerName: string, shard: 'kakao' | 'steam' = 'kakao') {
    return this.pubgApi.getPlayerInfo(playerName, shard);
  }

  /** PUBG 계정 연동 */
  async connectPubg(userId: string, playerName: string, shard: 'kakao' | 'steam' = 'kakao') {
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'pubg', game: 'pubg' },
    });
    if (existing) throw new BadRequestException('이미 PUBG 계정이 연동되어 있습니다.');

    const info = await this.pubgApi.getPlayerInfo(playerName, shard);

    // 스쿼드FPP → 솔로FPP 순으로 대표 랭크 결정
    const repr = info.squadFpp ?? info.soloFpp;

    const account = this.externalRepo.create({
      userId,
      platform:    'pubg',
      game:        'pubg',
      externalId:  info.playerId,
      gameName:    info.playerName,
      tier: repr
        ? pubgTierToKorean(repr.tier, repr.subTier)
        : '언랭크',
      tierScore: repr
        ? pubgTierToScore(repr.tier, repr.subTier, repr.rp)
        : 0,
      stats: {
        shard,
        squadFpp: info.squadFpp,
        soloFpp:  info.soloFpp,
      },
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(account);
  }

  /** PUBG 데이터 갱신 */
  async syncPubg(userId: string) {
    const account = await this.externalRepo.findOne({
      where: { userId, platform: 'pubg', game: 'pubg' },
    });
    if (!account) throw new NotFoundException('연동된 PUBG 계정이 없습니다.');

    const shard = (account.stats as any)?.shard ?? 'kakao';
    const info  = await this.pubgApi.getPlayerInfo(account.gameName, shard);
    const repr  = info.squadFpp ?? info.soloFpp;

    account.tier      = repr ? pubgTierToKorean(repr.tier, repr.subTier) : '언랭크';
    account.tierScore = repr ? pubgTierToScore(repr.tier, repr.subTier, repr.rp) : 0;
    account.stats     = { shard, squadFpp: info.squadFpp, soloFpp: info.soloFpp };
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  /** 동네/학교별 PUBG 랭킹 (RP순) */
  async getPubgRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    const qb = this.externalRepo
      .createQueryBuilder('ext')
      .innerJoinAndSelect('ext.user', 'user')
      .where('ext.game = :game', { game: 'pubg' })
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
      rank:       i + 1,
      userId:     acc.userId,
      nickname:   acc.user?.nickname,
      playerName: acc.gameName,
      tier:       acc.tier,
      tierScore:  acc.tierScore,
      squadFpp:   (acc.stats as any)?.squadFpp ?? null,
      soloFpp:    (acc.stats as any)?.soloFpp  ?? null,
      lastSynced: acc.lastSyncedAt,
    }));
  }

  /* ══════════════════════════════════════
   * Steam
   * ══════════════════════════════════════ */

  /** Steam 프로필 미리보기 (연동 전 확인) */
  async lookupSteam(input: string) {
    return this.steamApi.getPlayerInfo(input);
  }

  /** Steam 계정 연동 */
  async connectSteam(userId: string, input: string) {
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'steam', game: 'steam' },
    });
    if (existing) throw new BadRequestException('이미 Steam 계정이 연동되어 있습니다.');

    const info = await this.steamApi.getPlayerInfo(input);

    const account = this.externalRepo.create({
      userId,
      platform:    'steam',
      game:        'steam',
      externalId:  info.steamId,
      gameName:    info.personaName,
      tier:        info.bestTitle ?? `${info.totalHours}시간`,
      tierScore:   steamTierScore(info.totalHours),
      stats: {
        avatarUrl:    info.avatarUrl,
        profileUrl:   info.profileUrl,
        totalHours:   info.totalHours,
        gameCount:    info.gameCount,
        notableGames: info.notableGames,
        bestTitle:    info.bestTitle,
      },
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(account);
  }

  /** Steam 데이터 갱신 */
  async syncSteam(userId: string) {
    const account = await this.externalRepo.findOne({
      where: { userId, platform: 'steam', game: 'steam' },
    });
    if (!account) throw new NotFoundException('연동된 Steam 계정이 없습니다.');

    const info = await this.steamApi.getPlayerInfo(account.externalId);

    account.gameName  = info.personaName;
    account.tier      = info.bestTitle ?? `${info.totalHours}시간`;
    account.tierScore = steamTierScore(info.totalHours);
    account.stats     = {
      avatarUrl: info.avatarUrl, profileUrl: info.profileUrl,
      totalHours: info.totalHours, gameCount: info.gameCount,
      notableGames: info.notableGames, bestTitle: info.bestTitle,
    };
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  /** 동네/학교별 Steam 랭킹 (총 플레이타임순) */
  async getSteamRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    const qb = this.externalRepo
      .createQueryBuilder('ext')
      .innerJoinAndSelect('ext.user', 'user')
      .where('ext.game = :game', { game: 'steam' })
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
      rank:         i + 1,
      userId:       acc.userId,
      nickname:     acc.user?.nickname,
      personaName:  acc.gameName,
      tier:         acc.tier,
      totalHours:   (acc.stats as any)?.totalHours ?? 0,
      gameCount:    (acc.stats as any)?.gameCount  ?? 0,
      notableGames: (acc.stats as any)?.notableGames ?? [],
      bestTitle:    (acc.stats as any)?.bestTitle ?? null,
      avatarUrl:    (acc.stats as any)?.avatarUrl ?? null,
      lastSynced:   acc.lastSyncedAt,
    }));
  }

  /* ── 범용 연동 라우터 ── */

  async connect(userId: string, platform: string, data: { token: string; game: string; shard?: string }) {
    if (platform === 'riot' && data.game === 'lol') {
      return this.connectLol(userId, data.token);
    }
    if (platform === 'riot' && data.game === 'valorant') {
      return this.connectValorant(userId, data.token);
    }
    if (platform === 'nexon' && data.game === 'maplestory') {
      return this.connectMaple(userId, data.token);
    }
    if (platform === 'nexon' && (data.game === 'fconline' || data.game === 'fifaonline')) {
      return this.connectFcOnline(userId, data.token);
    }
    if (platform === 'battlenet' && data.game === 'ow2') {
      return this.connectOw2(userId, data.token);
    }
    if (platform === 'pubg' && data.game === 'pubg') {
      return this.connectPubg(userId, data.token, (data.shard as 'kakao' | 'steam') ?? 'kakao');
    }
    if (platform === 'steam' && data.game === 'steam') {
      return this.connectSteam(userId, data.token);
    }
    throw new BadRequestException('지원하지 않는 플랫폼/게임 조합입니다.');
  }

  /** 발로란트 — Riot ID로 PUUID 검증 후 연동 */
  async connectValorant(userId: string, riotId: string) {
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'riot', game: 'valorant' },
    });
    if (existing) throw new BadRequestException('이미 발로란트 계정이 연동되어 있습니다.');

    const [gameName, tagLine] = riotId.split('#');
    if (!gameName?.trim() || !tagLine?.trim()) {
      throw new BadRequestException('Riot ID 형식이 올바르지 않습니다. (예: 닉네임#KR1)');
    }

    // Riot Account API로 PUUID 검증
    const account = await this.riotApi.getAccountByRiotId(gameName.trim(), tagLine.trim());

    const acct = this.externalRepo.create({
      userId,
      platform: 'riot',
      game: 'valorant',
      externalId: account.puuid,
      gameName: `${account.gameName}#${account.tagLine}`,
      tier: '연동됨', // 발로란트 랭크 API는 별도 지원 예정
      tierScore: 0,
      stats: { puuid: account.puuid },
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(acct);
  }

  /** 발로란트 데이터 갱신 */
  async syncValorant(userId: string) {
    const account = await this.externalRepo.findOne({
      where: { userId, platform: 'riot', game: 'valorant' },
    });
    if (!account) throw new NotFoundException('연동된 발로란트 계정이 없습니다.');

    const [gameName, tagLine] = account.gameName.split('#');
    const info = await this.riotApi.getAccountByRiotId(gameName, tagLine);
    account.gameName = `${info.gameName}#${info.tagLine}`;
    account.stats = { puuid: info.puuid };
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  /** 오버워치 2 — BattleTag 형식 검증 후 연동 (Blizzard 공개 API 없음) */
  async connectOw2(userId: string, battleTag: string) {
    const existing = await this.externalRepo.findOne({
      where: { userId, platform: 'battlenet', game: 'ow2' },
    });
    if (existing) throw new BadRequestException('이미 오버워치 2 계정이 연동되어 있습니다.');

    // BattleTag 형식: 이름#숫자 (예: Player#1234)
    if (!/^.+#\d{4,5}$/.test(battleTag)) {
      throw new BadRequestException('BattleTag 형식이 올바르지 않습니다. (예: Player#1234)');
    }

    const acct = this.externalRepo.create({
      userId,
      platform: 'battlenet',
      game: 'ow2',
      externalId: battleTag.replace('#', '-'),
      gameName: battleTag,
      tier: '연동됨',
      tierScore: 0,
      stats: {},
      lastSyncedAt: new Date(),
    });

    return this.externalRepo.save(acct);
  }

  async disconnect(userId: string, platform: string, game: string) {
    const account = await this.externalRepo.findOne({ where: { userId, platform, game } });
    if (!account) throw new NotFoundException('연동된 계정이 없습니다.');
    await this.externalRepo.remove(account);
    return { disconnected: true };
  }

  async sync(userId: string, platform: string, game: string) {
    if (platform === 'riot' && game === 'lol') return this.syncLol(userId);
    if (platform === 'riot' && game === 'valorant') return this.syncValorant(userId);
    if (platform === 'nexon' && game === 'maplestory') return this.syncMaple(userId);
    if (platform === 'nexon' && (game === 'fconline' || game === 'fifaonline')) return this.syncFcOnline(userId);
    if (platform === 'pubg' && game === 'pubg') return this.syncPubg(userId);
    if (platform === 'steam' && game === 'steam') return this.syncSteam(userId);
    throw new BadRequestException('해당 게임의 동기화는 아직 지원하지 않습니다.');
  }

  async getUserAccounts(userId: string) {
    return this.externalRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }
}
