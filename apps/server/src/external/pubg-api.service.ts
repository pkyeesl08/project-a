import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * PUBG (배틀그라운드) 공식 API 클라이언트
 *
 * API 문서: https://developer.pubg.com/
 * Base URL: https://api.pubg.com
 * 인증: Authorization: Bearer {API_KEY}  +  Accept: application/vnd.api+json
 *
 * 플로우:
 *   1. 플레이어명 → /shards/{shard}/players?filter[playerNames]={name} → accountId
 *   2. 현재 시즌 조회 → /shards/{shard}/seasons → seasonId
 *   3. accountId + seasonId → /shards/{shard}/players/{id}/seasons/{sid}/ranked → 랭크 스탯
 *
 * 국내 PC 배그: shard = 'kakao' (카카오 게임즈 배급)
 *              shard = 'steam' (스팀 글로벌)
 */

/* ── 타입 ── */

export interface PubgRankedMode {
  tier: string;       // Bronze | Silver | Gold | Platinum | Diamond | Master
  subTier: string;    // 1 ~ 5 (1이 최고)
  rp: number;         // 랭크 포인트
  kills: number;
  deaths: number;
  wins: number;
  top10s: number;
  roundsPlayed: number;
  kda: number;
  winRate: string;    // "54.3" 형태
}

export interface PubgPlayerInfo {
  playerId: string;
  playerName: string;
  shard: 'kakao' | 'steam';
  squadFpp: PubgRankedMode | null;
  soloFpp: PubgRankedMode | null;
}

/* ── 티어 정렬 점수 ── */

const TIER_ORDER: Record<string, number> = {
  Bronze: 1, Silver: 2, Gold: 3, Platinum: 4, Diamond: 5, Master: 6,
};

/** 티어 + 서브티어 + RP → 단일 정수 (높을수록 좋음) */
export function pubgTierToScore(tier: string, subTier: string, rp: number): number {
  const tierVal    = TIER_ORDER[tier] ?? 0;
  const subVal     = 6 - (parseInt(subTier, 10) || 5);  // subTier 1이 최고이므로 역전
  return tierVal * 100_000 + subVal * 10_000 + rp;
}

/** 티어 한국어 표기 */
const TIER_KR: Record<string, string> = {
  Bronze: '브론즈', Silver: '실버', Gold: '골드',
  Platinum: '플래티넘', Diamond: '다이아몬드', Master: '마스터',
};

export function pubgTierToKorean(tier: string, subTier: string): string {
  const kr = TIER_KR[tier] || tier;
  if (tier === 'Master') return kr;
  return `${kr} ${subTier}`;
}

/* ── 서비스 ── */

@Injectable()
export class PubgApiService {
  private readonly apiKey = process.env.PUBG_API_KEY || '';
  private readonly BASE   = 'https://api.pubg.com';

  private async fetch<T>(url: string): Promise<T> {
    const res = await globalThis.fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept':        'application/vnd.api+json',
      },
    });

    if (res.status === 401) throw new BadRequestException('PUBG API 키가 유효하지 않습니다.');
    if (res.status === 404) throw new BadRequestException('PUBG 플레이어를 찾을 수 없습니다.');
    if (res.status === 429) throw new BadRequestException('PUBG API 요청 한도 초과. 잠시 후 다시 시도해주세요.');
    if (!res.ok) throw new BadRequestException(`PUBG API 오류 (${res.status})`);

    return res.json();
  }

  /** 플레이어명 → accountId + 실제 이름 */
  async getPlayerByName(
    playerName: string,
    shard: 'kakao' | 'steam' = 'kakao',
  ): Promise<{ id: string; name: string }> {
    const data = await this.fetch<any>(
      `${this.BASE}/shards/${shard}/players?filter[playerNames]=${encodeURIComponent(playerName)}`,
    );
    const player = data?.data?.[0];
    if (!player) throw new BadRequestException('플레이어를 찾을 수 없습니다.');
    return {
      id:   player.id,
      name: player.attributes?.name ?? playerName,
    };
  }

  /** 해당 shard 의 현재 시즌 ID */
  async getCurrentSeasonId(shard: 'kakao' | 'steam' = 'kakao'): Promise<string> {
    const data = await this.fetch<any>(`${this.BASE}/shards/${shard}/seasons`);
    const current = (data?.data ?? []).find((s: any) => s.attributes?.isCurrentSeason);
    if (!current) throw new BadRequestException('현재 PUBG 시즌 정보를 가져올 수 없습니다.');
    return current.id;
  }

  /** accountId + seasonId → 랭크 스탯 응답 */
  private async fetchRankedStats(
    accountId: string,
    seasonId: string,
    shard: 'kakao' | 'steam',
  ): Promise<any> {
    return this.fetch<any>(
      `${this.BASE}/shards/${shard}/players/${accountId}/seasons/${seasonId}/ranked`,
    );
  }

  /** 모드 객체 → PubgRankedMode (언랭이면 null 반환) */
  private formatMode(mode: any): PubgRankedMode | null {
    if (!mode || !mode.currentTier?.tier || mode.currentTier.tier === 'Unranked') return null;
    const plays = mode.roundsPlayed ?? 0;
    return {
      tier:         mode.currentTier.tier,
      subTier:      mode.currentTier.subTier ?? '5',
      rp:           mode.currentRankPoint ?? 0,
      kills:        mode.kills ?? 0,
      deaths:       mode.deaths ?? 0,
      wins:         mode.wins ?? 0,
      top10s:       mode.top10s ?? 0,
      roundsPlayed: plays,
      kda:          +(mode.kda ?? 0).toFixed(2),
      winRate:      plays > 0 ? ((mode.wins / plays) * 100).toFixed(1) : '0.0',
    };
  }

  /**
   * 전체 플로우: 플레이어명 → 랭크 정보
   * @param playerName 인게임 닉네임
   * @param shard      'kakao' (국내 PC) | 'steam' (글로벌 PC)
   */
  async getPlayerInfo(
    playerName: string,
    shard: 'kakao' | 'steam' = 'kakao',
  ): Promise<PubgPlayerInfo> {
    const player   = await this.getPlayerByName(playerName, shard);
    const seasonId = await this.getCurrentSeasonId(shard);

    let rankedData: any;
    try {
      rankedData = await this.fetchRankedStats(player.id, seasonId, shard);
    } catch {
      // 랭크 스탯 없음 (언랭 또는 시즌 미플레이)
      return { playerId: player.id, playerName: player.name, shard, squadFpp: null, soloFpp: null };
    }

    const modes = rankedData?.data?.attributes?.rankedGameModeStats ?? {};

    return {
      playerId:   player.id,
      playerName: player.name,
      shard,
      squadFpp:   this.formatMode(modes['squad-fpp'] ?? modes['squad']),
      soloFpp:    this.formatMode(modes['solo-fpp']  ?? modes['solo']),
    };
  }
}
