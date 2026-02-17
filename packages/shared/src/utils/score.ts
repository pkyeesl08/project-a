import { GameType, GAME_CONFIGS } from '../types/game';

/**
 * 게임별 점수 정규화 (0~10000 스케일)
 * 서로 다른 지표를 가진 게임들의 점수를 비교 가능하게 만듬
 */
export function normalizeScore(gameType: GameType, rawScore: number): number {
  const normalizers: Record<GameType, (score: number) => number> = {
    // ⚡ 반응/스피드 - 낮을수록 좋은 것들은 역변환
    [GameType.TIMING_HIT]: (ms) => Math.max(0, 10000 - ms * 20),
    [GameType.SPEED_TAP]: (taps) => Math.min(10000, taps * 200),
    [GameType.LIGHTNING_REACTION]: (ms) => Math.max(0, 10000 - ms * 30),
    [GameType.BALLOON_POP]: (count) => Math.min(10000, count * 500),
    [GameType.WHACK_A_MOLE]: (count) => Math.min(10000, count * 500),
    // 🧠 판단/퍼즐
    [GameType.MEMORY_FLASH]: (acc) => Math.min(10000, acc * 100),
    [GameType.COLOR_MATCH]: (correct) => Math.min(10000, correct * 1000),
    [GameType.BIGGER_NUMBER]: (correct) => Math.min(10000, correct * 700),
    [GameType.SAME_PICTURE]: (ms) => Math.max(0, 10000 - ms * 5),
    [GameType.ODD_EVEN]: (rate) => Math.min(10000, rate * 100),
    // 🎮 액션/모션
    [GameType.SHAKE_IT]: (intensity) => Math.min(10000, intensity * 10),
    [GameType.DIRECTION_SWIPE]: (correct) => Math.min(10000, correct * 1000),
    [GameType.TILT_BALANCE]: (ms) => Math.max(0, 10000 - ms * 2),
    [GameType.STOP_THE_BAR]: (px) => Math.max(0, 10000 - px * 100),
    [GameType.RPS_SPEED]: (wins) => Math.min(10000, wins * 1500),
    // 🎯 정밀/집중
    [GameType.LINE_TRACE]: (acc) => Math.min(10000, acc * 100),
    [GameType.TARGET_SNIPER]: (hits) => Math.min(10000, hits * 1000),
    [GameType.DARK_ROOM_TAP]: (count) => Math.min(10000, count * 700),
    [GameType.SCREW_CENTER]: (px) => Math.max(0, 10000 - px * 200),
    [GameType.LINE_GROW]: (length) => Math.min(10000, length * 20),
    // 🌟 특수/파티
    [GameType.MATH_SPEED]: (correct) => Math.min(10000, correct * 1000),
    [GameType.MIC_SHOUT]: (db) => Math.min(10000, db * 80),
    [GameType.SHELL_GAME]: (correct) => Math.min(10000, correct * 2000),
    [GameType.EMOJI_SORT]: (correct) => Math.min(10000, correct * 700),
    [GameType.COUNT_MORE]: (rate) => Math.min(10000, rate * 100),
  };

  return Math.round(normalizers[gameType](rawScore));
}

/**
 * 연속 모드 (5판) 종합 점수 계산
 */
export function calculateSeriesScore(scores: { gameType: GameType; rawScore: number }[]): number {
  if (scores.length === 0) return 0;

  const normalized = scores.map(s => normalizeScore(s.gameType, s.rawScore));
  const total = normalized.reduce((sum, s) => sum + s, 0);

  return Math.round(total / scores.length);
}

/**
 * 게임 설정 가져오기
 */
export function getGameConfig(gameType: GameType) {
  return GAME_CONFIGS[gameType];
}

/**
 * 카테고리별 게임 목록
 */
export function getGamesByCategory(category: string): GameType[] {
  return Object.values(GAME_CONFIGS)
    .filter(g => g.category === category)
    .map(g => g.type);
}
