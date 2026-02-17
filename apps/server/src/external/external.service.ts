import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccountEntity } from './external-account.entity';

@Injectable()
export class ExternalService {
  constructor(
    @InjectRepository(ExternalAccountEntity)
    private externalRepo: Repository<ExternalAccountEntity>,
  ) {}

  async connect(userId: string, platform: string, data: { token: string; game: string }) {
    const validCombos: Record<string, string[]> = {
      riot: ['lol', 'valorant'],
      battlenet: ['ow2'],
      nexon: ['fifaonline'],
    };
    if (!validCombos[platform]?.includes(data.game)) {
      throw new BadRequestException('지원하지 않는 플랫폼/게임 조합입니다.');
    }

    // Check duplicate
    const existing = await this.externalRepo.findOne({
      where: { userId, platform, game: data.game },
    });
    if (existing) throw new BadRequestException('이미 연동된 계정입니다.');

    // TODO: 실제 API를 통한 계정 검증
    const accountInfo = await this.verifyExternalAccount(platform, data.game, data.token);

    const account = this.externalRepo.create({
      userId,
      platform,
      game: data.game,
      externalId: accountInfo.id,
      gameName: accountInfo.name,
      tier: accountInfo.tier,
      stats: accountInfo.stats,
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
    const account = await this.externalRepo.findOne({ where: { userId, platform, game } });
    if (!account) throw new NotFoundException('연동된 계정이 없습니다.');

    const fresh = await this.fetchExternalStats(platform, game, account.externalId);
    account.tier = fresh.tier;
    account.stats = fresh.stats;
    account.lastSyncedAt = new Date();

    return this.externalRepo.save(account);
  }

  async getUserAccounts(userId: string) {
    return this.externalRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  // ── External API Integrations ──

  private async verifyExternalAccount(platform: string, game: string, token: string) {
    // TODO: 실제 Riot/Battlenet/Nexon API 연동
    // 개발 단계에서는 mock 데이터 반환
    if (platform === 'riot') {
      return this.mockRiotAccount(game);
    }
    if (platform === 'battlenet') {
      return this.mockBattlenetAccount();
    }
    return this.mockNexonAccount();
  }

  private async fetchExternalStats(platform: string, game: string, externalId: string) {
    // TODO: 실제 API에서 최신 데이터 가져오기
    return this.verifyExternalAccount(platform, game, '');
  }

  private mockRiotAccount(game: string) {
    const tiers = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master'];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const division = Math.floor(Math.random() * 4) + 1;

    return {
      id: `riot_${Date.now()}`,
      name: `Player#KR${Math.floor(Math.random() * 9999)}`,
      tier: `${tier} ${['I', 'II', 'III', 'IV'][division - 1]}`,
      stats: {
        winRate: (45 + Math.random() * 15).toFixed(1),
        totalGames: Math.floor(Math.random() * 500) + 50,
        ...(game === 'lol'
          ? { mainChampion: ['야스오', '리신', '아리', '진'][Math.floor(Math.random() * 4)] }
          : { mainAgent: ['제트', '레이즈', '소바', '오멘'][Math.floor(Math.random() * 4)] }),
      },
    };
  }

  private mockBattlenetAccount() {
    const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
    return {
      id: `bnet_${Date.now()}`,
      name: `Player#${Math.floor(Math.random() * 99999)}`,
      tier: `${ranks[Math.floor(Math.random() * ranks.length)]} ${Math.floor(Math.random() * 5) + 1}`,
      stats: {
        mainHero: ['겐지', '트레이서', '아나', '라인하르트'][Math.floor(Math.random() * 4)],
        winRate: (45 + Math.random() * 15).toFixed(1),
      },
    };
  }

  private mockNexonAccount() {
    return {
      id: `nexon_${Date.now()}`,
      name: `FIFA_${Math.floor(Math.random() * 9999)}`,
      tier: `${Math.floor(Math.random() * 2000) + 500}`,
      stats: { winRate: (45 + Math.random() * 15).toFixed(1) },
    };
  }
}
