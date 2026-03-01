import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface PassProgress {
  seasonId?: string;
  seasonXp: number;
  hasGoldPass: boolean;
  currentTier: number;
  nextTierXp: number | null;
  xpToNext: number | null;
  claimedFreeTiers: number[];
  claimedGoldTiers: number[];
  goldPassPrice: number;
  tiers: Array<{
    tier: number;
    requiredXp: number;
    unlocked: boolean;
    freeClaimable: boolean;
    goldClaimable: boolean;
    free: { coins?: number; gems?: number; assetKey?: string; label: string };
    gold: { coins?: number; gems?: number; assetKey?: string; label: string };
  }>;
}

const RARITY_COLOR: Record<string, string> = {
  coins: 'from-yellow-400 to-orange-400',
  gems:  'from-indigo-400 to-purple-400',
  item:  'from-pink-400 to-rose-500',
};

export default function SeasonPassPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<PassProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    api.getSeasonPassProgress().then(setProgress).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleClaim = async (tier: number, track: 'free' | 'gold') => {
    const key = `${tier}-${track}`;
    if (claiming === key) return;
    setClaiming(key);
    try {
      await api.claimSeasonPassTier(tier, track);
      const updated = await api.getSeasonPassProgress();
      setProgress(updated);
    } catch { /* 실패 무시 */ } finally {
      setClaiming(null);
    }
  };

  const handlePurchaseGold = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      await api.purchaseGoldPass();
      const updated = await api.getSeasonPassProgress();
      setProgress(updated);
    } catch (e: any) {
      alert(e?.message ?? '구매 실패');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!progress) return null;

  const xpPercent = progress.nextTierXp
    ? Math.min(100, (progress.seasonXp / progress.nextTierXp) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="text-white/80 text-xl">←</button>
          <h1 className="text-xl font-black">🎫 시즌 패스</h1>
        </div>

        {/* XP 바 */}
        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-black text-lg">Tier {progress.currentTier}</span>
            <span className="text-sm opacity-70">{progress.seasonXp} XP</span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all"
              style={{ width: `${Math.max(3, xpPercent)}%` }}
            />
          </div>
          {progress.xpToNext && (
            <p className="text-xs opacity-60 text-right">다음 티어까지 {progress.xpToNext} XP</p>
          )}
        </div>

        {/* 골드 패스 상태 */}
        {!progress.hasGoldPass ? (
          <button
            onClick={handlePurchaseGold}
            disabled={purchasing}
            className="mt-4 w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black py-3 rounded-xl active:scale-95 transition-transform">
            {purchasing ? '구매 중...' : `✨ 골드 패스 구매 · 💎 ${progress.goldPassPrice}보석`}
          </button>
        ) : (
          <div className="mt-4 bg-yellow-400/30 border border-yellow-400/50 rounded-xl py-2 px-3 text-center">
            <p className="text-sm font-bold">✨ 골드 패스 활성화됨</p>
          </div>
        )}
      </div>

      {/* XP 획득 가이드 */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-black mb-3">📈 XP 획득 방법</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '게임 완료', xp: '+10 XP' },
            { label: 'PvP 승리', xp: '+20 XP' },
            { label: '미션 완료', xp: '+50 XP' },
            { label: '출석 체크', xp: '+30 XP' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-2 flex justify-between items-center">
              <span className="text-xs text-gray-600">{item.label}</span>
              <span className="text-xs font-bold text-primary">{item.xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 티어 목록 */}
      <div className="p-4 space-y-3">
        <h2 className="text-base font-black">🎁 보상 트랙</h2>
        {progress.tiers.map((tier) => (
          <div key={tier.tier}
            className={`bg-white rounded-2xl p-4 shadow-sm border ${
              tier.unlocked ? 'border-primary/30' : 'border-gray-100 opacity-70'
            }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                  tier.unlocked ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {tier.unlocked ? '✓' : tier.tier}
                </div>
                <span className="text-sm font-bold">Tier {tier.tier}</span>
              </div>
              <span className="text-xs text-gray-400">{tier.requiredXp} XP</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 무료 트랙 */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 mb-1 font-bold">FREE</p>
                <p className="text-xs font-medium mb-2">{tier.free.label}</p>
                <button
                  onClick={() => handleClaim(tier.tier, 'free')}
                  disabled={!tier.freeClaimable || claiming === `${tier.tier}-free`}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                    progress.claimedFreeTiers.includes(tier.tier)
                      ? 'bg-gray-200 text-gray-400'
                      : tier.freeClaimable
                        ? 'bg-primary text-white active:scale-95'
                        : 'bg-gray-100 text-gray-300'
                  }`}>
                  {progress.claimedFreeTiers.includes(tier.tier) ? '✓ 수령' : tier.freeClaimable ? '수령하기' : '잠금'}
                </button>
              </div>

              {/* 골드 트랙 */}
              <div className={`rounded-xl p-3 ${progress.hasGoldPass ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                <p className="text-[10px] mb-1 font-bold" style={{ color: progress.hasGoldPass ? '#d97706' : '#9ca3af' }}>
                  ✨ GOLD
                </p>
                <p className="text-xs font-medium mb-2">{tier.gold.label}</p>
                <button
                  onClick={() => handleClaim(tier.tier, 'gold')}
                  disabled={!tier.goldClaimable || claiming === `${tier.tier}-gold`}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                    progress.claimedGoldTiers.includes(tier.tier)
                      ? 'bg-yellow-200 text-yellow-600'
                      : tier.goldClaimable
                        ? 'bg-yellow-400 text-white active:scale-95'
                        : 'bg-gray-100 text-gray-300'
                  }`}>
                  {progress.claimedGoldTiers.includes(tier.tier) ? '✓ 수령' : tier.goldClaimable ? '수령하기' : !progress.hasGoldPass ? '🔒 골드 전용' : '잠금'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
