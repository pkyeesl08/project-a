import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Steam Web API 클라이언트
 *
 * API 문서: https://steamcommunity.com/dev
 * Base URL: https://api.steampowered.com
 * 인증: ?key={STEAM_API_KEY} 쿼리 파라미터
 *
 * 플로우:
 *   1. 커스텀 URL or SteamID64 입력
 *      - 숫자 17자리 → SteamID64 바로 사용
 *      - 문자열 → ISteamUser/ResolveVanityURL → SteamID64
 *   2. SteamID64 → ISteamUser/GetPlayerSummaries → 프로필 정보
 *   3. SteamID64 → IPlayerService/GetOwnedGames → 소유 게임 + 플레이타임
 *   4. 특정 게임 플레이타임 기준으로 칭호 결정
 */

/* ── 주요 게임 AppID 매핑 ── */

const NOTABLE_GAMES: Record<number, string> = {
  730:     'CS2 / CS:GO',
  578080:  'PUBG',
  570:     'Dota 2',
  440:     'Team Fortress 2',
  271590:  'GTA V',
  1172470: 'Apex Legends',
  252490:  'Rust',
  892970:  'Valheim',
  1326470: 'Elden Ring',
  1245620: 'Elden Ring',   // 일부 지역 AppID 차이
  367520:  'Hollow Knight',
  1091500: 'Cyberpunk 2077',
  2767030: 'Black Myth: Wukong',
};

/* ── 플레이타임 기반 칭호 ── */

interface TitleCondition {
  appIds: number[];
  minHours: number;
  title: string;
}

const TITLE_CONDITIONS: TitleCondition[] = [
  { appIds: [578080],           minHours: 1000, title: 'PUBG 전설' },
  { appIds: [578080],           minHours: 500,  title: 'PUBG 프로' },
  { appIds: [578080],           minHours: 100,  title: 'PUBG 베테랑' },
  { appIds: [730],              minHours: 3000, title: 'CS 전설' },
  { appIds: [730],              minHours: 1000, title: 'CS 마스터' },
  { appIds: [730],              minHours: 100,  title: 'CS 베테랑' },
  { appIds: [570],              minHours: 3000, title: '도타 장인' },
  { appIds: [570],              minHours: 500,  title: '도타 베테랑' },
  { appIds: [1172470],          minHours: 500,  title: 'Apex 포식자' },
  { appIds: [1172470],          minHours: 100,  title: 'Apex 베테랑' },
];

/** 특정 게임(appId)의 플레이타임(분)으로 칭호 결정 */
export function getSteamTitle(appId: number, playtimeMinutes: number): string | null {
  const hours = playtimeMinutes / 60;
  const matches = TITLE_CONDITIONS
    .filter(c => c.appIds.includes(appId) && hours >= c.minHours)
    .sort((a, b) => b.minHours - a.minHours);
  return matches[0]?.title ?? null;
}

/** 총 플레이타임 시간 → 랭킹 정렬 점수 */
export function steamTierScore(totalHours: number): number {
  return Math.min(totalHours, 999_999);
}

/* ── 타입 ── */

export interface SteamNotableGame {
  appId: number;
  name: string;
  hours: number;
  title: string | null;
}

export interface SteamPlayerInfo {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
  totalHours: number;
  gameCount: number;
  notableGames: SteamNotableGame[];
  bestTitle: string | null;  // 가장 높은 등급 칭호
}

/* ── 서비스 ── */

@Injectable()
export class SteamApiService {
  private readonly apiKey = process.env.STEAM_API_KEY || '';
  private readonly BASE   = 'https://api.steampowered.com';

  private async fetch<T>(url: string): Promise<T> {
    const res = await globalThis.fetch(url);
    if (!res.ok) throw new BadRequestException(`Steam API 오류 (${res.status})`);
    return res.json();
  }

  /**
   * 커스텀 URL / SteamID64 → SteamID64 (17자리 숫자 문자열)
   * - "76561198012345678" 같은 숫자면 그대로 반환
   * - "myusername" 같은 문자열이면 VanityURL API로 조회
   */
  async resolveSteamId(input: string): Promise<string> {
    const trimmed = input.trim();

    if (/^\d{17}$/.test(trimmed)) return trimmed;

    // 스팀 프로필 URL에서 ID 추출
    const urlMatch = trimmed.match(/(?:steamcommunity\.com\/(?:id|profiles)\/)([^/]+)/);
    const vanity   = urlMatch ? urlMatch[1] : trimmed;

    // 숫자 17자리이면 바로 SteamID64
    if (/^\d{17}$/.test(vanity)) return vanity;

    const data = await this.fetch<any>(
      `${this.BASE}/ISteamUser/ResolveVanityURL/v1/?key=${this.apiKey}&vanityurl=${encodeURIComponent(vanity)}`,
    );

    if (data?.response?.success !== 1) {
      throw new BadRequestException(
        '스팀 프로필을 찾을 수 없습니다. Steam ID64(17자리 숫자) 또는 커스텀 URL을 확인해주세요.',
      );
    }
    return data.response.steamid;
  }

  /** SteamID64 → 공개 프로필 정보 */
  private async getPlayerSummary(steamId: string): Promise<any> {
    const data = await this.fetch<any>(
      `${this.BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${this.apiKey}&steamids=${steamId}`,
    );
    const player = data?.response?.players?.[0];
    if (!player) throw new BadRequestException('스팀 프로필을 불러올 수 없습니다. 비공개 계정일 수 있어요.');
    return player;
  }

  /** SteamID64 → 소유 게임 목록 + 플레이타임 (비공개 시 빈 배열) */
  private async getOwnedGames(steamId: string): Promise<any[]> {
    try {
      const data = await this.fetch<any>(
        `${this.BASE}/IPlayerService/GetOwnedGames/v1/?key=${this.apiKey}` +
        `&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`,
      );
      return data?.response?.games ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 전체 플로우: 스팀 ID/URL → SteamPlayerInfo
   * @param input SteamID64(17자리) | 커스텀 URL | 프로필 URL
   */
  async getPlayerInfo(input: string): Promise<SteamPlayerInfo> {
    const steamId = await this.resolveSteamId(input);

    const [profile, games] = await Promise.all([
      this.getPlayerSummary(steamId),
      this.getOwnedGames(steamId),
    ]);

    // 총 플레이타임 (분 → 시간)
    const totalMinutes = (games as any[]).reduce(
      (sum: number, g: any) => sum + (g.playtime_forever ?? 0), 0,
    );
    const totalHours = Math.round(totalMinutes / 60);
    const gameCount  = (games as any[]).length;

    // 주요 게임 필터링 + 칭호 계산
    const notableGames: SteamNotableGame[] = (games as any[])
      .filter((g: any) => NOTABLE_GAMES[g.appid])
      .map((g: any) => ({
        appId: g.appid,
        name:  NOTABLE_GAMES[g.appid]!,
        hours: Math.round(g.playtime_forever / 60),
        title: getSteamTitle(g.appid, g.playtime_forever),
      }))
      .sort((a, b) => b.hours - a.hours);

    // 칭호 우선순위: 조건에 맞는 것 중 minHours가 가장 높은 것
    const titledGames = notableGames.filter(g => g.title !== null);
    const bestTitle   = titledGames.length > 0 ? titledGames[0].title : null;

    return {
      steamId,
      personaName: profile.personaname,
      avatarUrl:   profile.avatarfull,
      profileUrl:  profile.profileurl,
      totalHours,
      gameCount,
      notableGames,
      bestTitle,
    };
  }
}
