import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * 넥슨 오픈 API 클라이언트
 *
 * API 문서: https://openapi.nexon.com
 * Base URL: https://open.api.nexon.com
 * 인증: x-nxopen-api-key 헤더
 *
 * 메이플스토리 플로우:
 *   1. 캐릭터명 → /maplestory/v1/id → OCID
 *   2. OCID → /maplestory/v1/character/basic → 기본 정보
 *   3. OCID → /maplestory/v1/character/stat → 전투력
 *
 * FC 온라인 플로우:
 *   1. 닉네임 → /fconline/v1/id → ouid
 *   2. ouid → /fconline/v1/user/basic → 유저 기본 정보
 *   3. ouid → /fconline/v1/user/maxdivision → 최고 등급
 *   4. ouid → /fconline/v1/user/match → 매치 기록
 */

/* ── 타입: 메이플스토리 ── */

export interface MapleCharacterBasic {
  date: string;
  character_name: string;
  world_name: string;
  character_gender: string;
  character_class: string;
  character_class_level: string;
  character_level: number;
  character_exp: number;
  character_exp_rate: string;
  character_guild_name: string | null;
  character_image: string;
  character_date_create: string;
  access_flag: string;
  liberation_quest_clear_flag: string;
}

export interface MapleCharacterStat {
  date: string;
  character_class: string;
  final_stat: { stat_name: string; stat_value: string }[];
}

export interface MaplePlayerInfo {
  ocid: string;
  characterName: string;
  world: string;
  class: string;
  level: number;
  exp: number;
  expRate: string;
  guild: string | null;
  image: string;
  combatPower: number;  // 전투력
}

/* ── 타입: FC 온라인 ── */

export interface FcOnlineMaxDivision {
  matchType: number;
  division: number;
  achievementDate: string;
}

export interface FcOnlinePlayerInfo {
  ouid: string;
  nickname: string;
  level: number;
  maxDivision: {
    matchType: string;   // 공식경기, 감독모드 등
    division: string;    // 슈퍼챔피언스, 챔피언스 등
    achievementDate: string;
  }[];
}

/* ── FC 온라인 등급 매핑 ── */

const FC_DIVISION_MAP: Record<number, string> = {
  800: '슈퍼챔피언스',
  900: '챔피언스',
  1000: '슈퍼챌린지',
  1100: '챌린지 1부',
  1200: '챌린지 2부',
  1300: '챌린지 3부',
  2000: '월드클래스 1부',
  2100: '월드클래스 2부',
  2200: '월드클래스 3부',
  2300: '프로 1부',
  2400: '프로 2부',
  2500: '프로 3부',
  2600: '세미프로 1부',
  2700: '세미프로 2부',
  2800: '세미프로 3부',
  2900: '유망주 1부',
  3000: '유망주 2부',
  3100: '유망주 3부',
};

const FC_MATCH_TYPE_MAP: Record<number, string> = {
  50: '공식경기',
  52: '감독모드',
  // 더 많은 매치타입은 메타데이터 API에서 가져올 수 있음
};

/** 등급 → 점수 (랭킹 정렬용, 높을수록 높은 등급) */
export function fcDivisionToScore(division: number): number {
  // 800(슈챔)이 가장 높고, 3100(유망주3부)이 가장 낮음
  // 역전시켜서 높은 등급 = 높은 점수
  return 4000 - division;
}

/* ── 서비스 ── */

@Injectable()
export class NexonApiService {
  private readonly apiKey = process.env.NEXON_API_KEY || '';
  private readonly BASE = 'https://open.api.nexon.com';

  private async fetch<T>(path: string): Promise<T> {
    const res = await globalThis.fetch(`${this.BASE}${path}`, {
      headers: { 'x-nxopen-api-key': this.apiKey },
    });

    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      throw new BadRequestException(body.error?.message || '잘못된 요청입니다.');
    }
    if (res.status === 403) {
      throw new BadRequestException('넥슨 API 키가 유효하지 않습니다.');
    }
    if (res.status === 429) {
      throw new BadRequestException('넥슨 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    }
    if (!res.ok) {
      throw new BadRequestException(`넥슨 API 오류 (${res.status})`);
    }

    return res.json();
  }

  /* ════════════════════════════════════════
   * 메이플스토리
   * ════════════════════════════════════════ */

  /** 캐릭터명 → OCID */
  async mapleGetOcid(characterName: string): Promise<string> {
    const data = await this.fetch<{ ocid: string }>(
      `/maplestory/v1/id?character_name=${encodeURIComponent(characterName)}`,
    );
    return data.ocid;
  }

  /** OCID → 캐릭터 기본 정보 */
  async mapleGetBasic(ocid: string): Promise<MapleCharacterBasic> {
    return this.fetch<MapleCharacterBasic>(
      `/maplestory/v1/character/basic?ocid=${ocid}`,
    );
  }

  /** OCID → 캐릭터 스탯 (전투력 포함) */
  async mapleGetStat(ocid: string): Promise<MapleCharacterStat> {
    return this.fetch<MapleCharacterStat>(
      `/maplestory/v1/character/stat?ocid=${ocid}`,
    );
  }

  /** 캐릭터명 → 전체 정보 한번에 */
  async mapleGetPlayerInfo(characterName: string): Promise<MaplePlayerInfo> {
    const ocid = await this.mapleGetOcid(characterName);
    const [basic, stat] = await Promise.all([
      this.mapleGetBasic(ocid),
      this.mapleGetStat(ocid),
    ]);

    // 전투력 추출
    const combatPowerStat = stat.final_stat.find(s => s.stat_name === '전투력');
    const combatPower = combatPowerStat ? parseInt(combatPowerStat.stat_value, 10) : 0;

    return {
      ocid,
      characterName: basic.character_name,
      world: basic.world_name,
      class: basic.character_class,
      level: basic.character_level,
      exp: basic.character_exp,
      expRate: basic.character_exp_rate,
      guild: basic.character_guild_name,
      image: basic.character_image,
      combatPower,
    };
  }

  /* ════════════════════════════════════════
   * FC 온라인
   * ════════════════════════════════════════ */

  /** 닉네임 → ouid */
  async fcGetOuid(nickname: string): Promise<string> {
    const data = await this.fetch<{ ouid: string }>(
      `/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`,
    );
    return data.ouid;
  }

  /** ouid → 유저 기본 정보 */
  async fcGetBasic(ouid: string): Promise<{ ouid: string; nickname: string; level: number }> {
    return this.fetch(`/fconline/v1/user/basic?ouid=${ouid}`);
  }

  /** ouid → 최고 등급 */
  async fcGetMaxDivision(ouid: string): Promise<FcOnlineMaxDivision[]> {
    return this.fetch<FcOnlineMaxDivision[]>(
      `/fconline/v1/user/maxdivision?ouid=${ouid}`,
    );
  }

  /** 닉네임 → 전체 정보 한번에 */
  async fcGetPlayerInfo(nickname: string): Promise<FcOnlinePlayerInfo> {
    const ouid = await this.fcGetOuid(nickname);
    const [basic, divisions] = await Promise.all([
      this.fcGetBasic(ouid),
      this.fcGetMaxDivision(ouid),
    ]);

    return {
      ouid,
      nickname: basic.nickname,
      level: basic.level,
      maxDivision: divisions.map(d => ({
        matchType: FC_MATCH_TYPE_MAP[d.matchType] || `타입 ${d.matchType}`,
        division: FC_DIVISION_MAP[d.division] || `등급 ${d.division}`,
        achievementDate: d.achievementDate,
      })),
    };
  }
}
