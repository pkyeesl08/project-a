/**
 * ELO Rating System for DongGameRank
 * K-factor varies by rating bracket for balanced matchmaking
 */

const K_FACTOR_BRACKETS = [
  { maxRating: 1000, k: 40 },  // 뉴비: 빠른 변동
  { maxRating: 1500, k: 32 },  // 중급: 보통
  { maxRating: 2000, k: 24 },  // 고급: 느린 변동
  { maxRating: Infinity, k: 16 }, // 마스터: 매우 느림
];

function getKFactor(rating: number): number {
  const bracket = K_FACTOR_BRACKETS.find(b => rating < b.maxRating);
  return bracket?.k ?? 32;
}

/**
 * 1:1 대전 후 새로운 ELO 레이팅 계산
 */
export function calculateElo(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'lose' | 'draw'
): { newRating: number; change: number } {
  const k = getKFactor(playerRating);
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

  const actual = result === 'win' ? 1 : result === 'lose' ? 0 : 0.5;
  const change = Math.round(k * (actual - expected));
  const newRating = Math.max(0, playerRating + change);

  return { newRating, change };
}

/**
 * 솔로 모드 ELO 보정 (자기 자신과의 경쟁)
 * 최고 기록 갱신 시 소폭 상승, 평균 이하 시 소폭 하락
 */
export function calculateSoloEloAdjustment(
  currentRating: number,
  score: number,
  personalBest: number,
  personalAverage: number
): { newRating: number; change: number } {
  let change = 0;

  if (score > personalBest) {
    // 최고 기록 갱신: +5 ~ +15
    const improvement = (score - personalBest) / personalBest;
    change = Math.min(15, Math.max(5, Math.round(improvement * 50)));
  } else if (score >= personalAverage) {
    // 평균 이상: +1 ~ +3
    change = Math.min(3, Math.max(1, Math.round((score - personalAverage) / personalAverage * 10)));
  } else {
    // 평균 이하: -1 ~ -3
    change = Math.max(-3, Math.round((score - personalAverage) / personalAverage * 5));
  }

  const newRating = Math.max(0, currentRating + change);
  return { newRating, change };
}
