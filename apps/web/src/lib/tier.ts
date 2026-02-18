export interface Tier {
  name: string;
  emoji: string;
  color: string;
  bgClass: string;
  textClass: string;
  min: number;
}

const TIERS: Tier[] = [
  { name: '챌린저', emoji: '👑', color: '#FFD700', bgClass: 'bg-yellow-500', textClass: 'text-yellow-600', min: 2200 },
  { name: '다이아',  emoji: '💎', color: '#00BFFF', bgClass: 'bg-blue-500',   textClass: 'text-blue-600',   min: 1900 },
  { name: '플래티넘', emoji: '🔷', color: '#40E0D0', bgClass: 'bg-teal-500',  textClass: 'text-teal-600',   min: 1600 },
  { name: '골드',   emoji: '🥇', color: '#EAB308', bgClass: 'bg-yellow-400', textClass: 'text-yellow-600', min: 1350 },
  { name: '실버',   emoji: '🥈', color: '#9CA3AF', bgClass: 'bg-gray-400',   textClass: 'text-gray-500',   min: 1150 },
  { name: '브론즈', emoji: '🥉', color: '#92400E', bgClass: 'bg-amber-800',  textClass: 'text-amber-800',  min: 0 },
];

export function getTier(elo: number): Tier {
  return TIERS.find(t => elo >= t.min) ?? TIERS[TIERS.length - 1];
}

export function getNextTier(elo: number): { tier: Tier; remaining: number } | null {
  const idx = TIERS.findIndex(t => elo >= t.min);
  if (idx <= 0) return null;
  const next = TIERS[idx - 1];
  return { tier: next, remaining: next.min - elo };
}
