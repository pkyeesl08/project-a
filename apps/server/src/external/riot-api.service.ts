import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Riot Games API 클라이언트
 *
 * API 문서: https://developer.riotgames.com/apis
 *
 * 플로우 (LoL):
 *   1. Riot ID (이름#태그) → Account-v1 → PUUID
 *   2. PUUID → Summoner-v4 → summonerId
 *   3. summonerId → League-v4 → 랭크 정보
 */

/* ── 타입 ── */

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface Summoner {
  id: string;           // encryptedSummonerId
  puuid: string;
  name: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface LeagueEntry {
  queueType: string;    // RANKED_SOLO_5x5, RANKED_FLEX_SR
  tier: string;         // IRON ~ CHALLENGER
  rank: string;         // I, II, III, IV
  leaguePoints: number;
  wins: number;
  losses: number;
}

export interface RiotPlayerInfo {
  puuid: string;
  gameName: string;
  tagLine: string;
  summonerLevel: number;
  profileIconId: number;
  soloRank: {
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
    winRate: string;
  } | null;
  flexRank: {
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
    winRate: string;
  } | null;
}

/* ── 티어 숫자 변환 (랭킹 정렬용) ── */

const TIER_ORDER: Record<string, number> = {
  IRON: 0, BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4,
  EMERALD: 5, DIAMOND: 6, MASTER: 7, GRANDMASTER: 8, CHALLENGER: 9,
};
const RANK_ORDER: Record<string, number> = { IV: 0, III: 1, II: 2, I: 3 };

/** 티어+랭크+LP를 단일 숫자로 (랭킹 정렬용) */
export function tierToScore(tier: string, rank: string, lp: number): number {
  return (TIER_ORDER[tier] ?? 0) * 400 + (RANK_ORDER[rank] ?? 0) * 100 + lp;
}

/** 숫자를 한국어 티어로 */
const TIER_KR: Record<string, string> = {
  IRON: '아이언', BRONZE: '브론즈', SILVER: '실버', GOLD: '골드',
  PLATINUM: '플래티넘', EMERALD: '에메랄드', DIAMOND: '다이아몬드',
  MASTER: '마스터', GRANDMASTER: '그랜드마스터', CHALLENGER: '챌린저',
};

export function tierToKorean(tier: string, rank: string): string {
  const kr = TIER_KR[tier] || tier;
  // 마스터 이상은 디비전 없음
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return kr;
  return `${kr} ${rank}`;
}

/* ── 서비스 ── */

@Injectable()
export class RiotApiService {
  private readonly apiKey = process.env.RIOT_API_KEY || '';

  // 리전별 API 호스트
  private readonly ACCOUNT_HOST = 'https://asia.api.riotgames.com';   // Account-v1 (아시아)
  private readonly KR_HOST = 'https://kr.api.riotgames.com';          // KR 서버

  private async fetch<T>(url: string): Promise<T> {
    const res = await globalThis.fetch(url, {
      headers: { 'X-Riot-Token': this.apiKey },
    });

    if (res.status === 403) {
      throw new BadRequestException('Riot API 키가 만료되었거나 유효하지 않습니다.');
    }
    if (res.status === 404) {
      throw new BadRequestException('해당 소환사를 찾을 수 없습니다.');
    }
    if (res.status === 429) {
      throw new BadRequestException('Riot API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (!res.ok) {
      throw new BadRequestException(`Riot API 오류 (${res.status})`);
    }

    return res.json();
  }

  /** 1. Riot ID → Account 정보 (PUUID) */
  async getAccountByRiotId(gameName: string, tagLine: string): Promise<RiotAccount> {
    return this.fetch<RiotAccount>(
      `${this.ACCOUNT_HOST}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    );
  }

  /** 2. PUUID → Summoner 정보 */
  async getSummonerByPuuid(puuid: string): Promise<Summoner> {
    return this.fetch<Summoner>(
      `${this.KR_HOST}/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    );
  }

  /** 3. Summoner ID → 랭크 정보 */
  async getLeagueEntries(summonerId: string): Promise<LeagueEntry[]> {
    return this.fetch<LeagueEntry[]>(
      `${this.KR_HOST}/lol/league/v4/entries/by-summoner/${summonerId}`,
    );
  }

  /**
   * 전체 플로우: Riot ID → 랭크 정보까지 한번에
   *
   * @param riotId "닉네임#태그" 형식 (예: "Hide on bush#KR1")
   */
  async getPlayerInfo(riotId: string): Promise<RiotPlayerInfo> {
    // Riot ID 파싱
    const [gameName, tagLine] = this.parseRiotId(riotId);

    // 1. Account
    const account = await this.getAccountByRiotId(gameName, tagLine);

    // 2. Summoner
    const summoner = await this.getSummonerByPuuid(account.puuid);

    // 3. League
    const entries = await this.getLeagueEntries(summoner.id);

    const soloEntry = entries.find(e => e.queueType === 'RANKED_SOLO_5x5');
    const flexEntry = entries.find(e => e.queueType === 'RANKED_FLEX_SR');

    const formatEntry = (e: LeagueEntry) => ({
      tier: e.tier,
      rank: e.rank,
      lp: e.leaguePoints,
      wins: e.wins,
      losses: e.losses,
      winRate: ((e.wins / (e.wins + e.losses)) * 100).toFixed(1),
    });

    return {
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      soloRank: soloEntry ? formatEntry(soloEntry) : null,
      flexRank: flexEntry ? formatEntry(flexEntry) : null,
    };
  }

  /** "이름#태그" 파싱 */
  private parseRiotId(riotId: string): [string, string] {
    const parts = riotId.split('#');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      throw new BadRequestException('Riot ID 형식이 올바르지 않습니다. "닉네임#태그" 형식으로 입력해주세요.');
    }
    return [parts[0].trim(), parts[1].trim()];
  }
}
