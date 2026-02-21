import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ITEM_EMOJI } from '../stores/avatarStore';

interface PityInfo {
  epicPity: number;
  legendaryPity: number;
  epicAt: number;
  legendaryAt: number;
  singleCost: number;
  tenCost: number;
}

interface GachaResult {
  rarity: string;
  item: { id: string; name: string; assetKey: string; rarity: string; type: string } | null;
  isDuplicate: boolean;
  dupeCoins: number;
}

const RARITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  legendary: { bg: 'bg-gradient-to-br from-yellow-400 to-orange-500', text: 'text-white', label: '전설' },
  epic:      { bg: 'bg-gradient-to-br from-purple-500 to-indigo-600',  text: 'text-white', label: '에픽' },
  rare:      { bg: 'bg-gradient-to-br from-blue-400 to-cyan-500',      text: 'text-white', label: '레어' },
  common:    { bg: 'bg-gray-100',                                        text: 'text-gray-600', label: '일반' },
};

export default function GachaPage() {
  const navigate = useNavigate();
  const [pity, setPity] = useState<PityInfo | null>(null);
  const [results, setResults] = useState<GachaResult[]>([]);
  const [gems, setGems] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    api.getGachaPity().then(setPity).catch(() => {});
  }, []);

  const handlePull = async (count: 1 | 10) => {
    if (pulling) return;
    setPulling(true);
    try {
      const res = await api.pullGacha(count);
      setResults(res.results);
      setGems(res.remaining);
      // 피티 갱신
      api.getGachaPity().then(setPity).catch(() => {});
    } catch (e: any) {
      alert(e?.message ?? '보석이 부족합니다.');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-purple-950 text-white">
      {/* 헤더 */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="text-white/70 text-xl">←</button>
          <h1 className="text-xl font-black">🎲 럭키 드로우</h1>
          <div className="text-right">
            <p className="text-xs text-white/60">보유 보석</p>
            <p className="text-base font-black text-yellow-300">💎 {gems ?? '...'}개</p>
          </div>
        </div>
      </div>

      {/* 뽑기 확률 정보 */}
      <div className="mx-4 mb-4">
        <div className="bg-white/10 rounded-2xl p-4">
          <p className="text-sm font-black mb-3 text-center">📊 아이템 등급 확률</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '일반', prob: '50%', color: 'text-gray-300' },
              { label: '레어', prob: '35%', color: 'text-blue-300' },
              { label: '에픽', prob: '13%', color: 'text-purple-300' },
              { label: '전설', prob: '2%',  color: 'text-yellow-300' },
            ].map(r => (
              <div key={r.label} className="flex justify-between">
                <span className={`text-sm ${r.color} font-bold`}>{r.label}</span>
                <span className="text-sm text-white/70">{r.prob}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 피티 게이지 */}
      {pity && (
        <div className="mx-4 mb-4 bg-white/10 rounded-2xl p-4">
          <p className="text-xs text-white/60 mb-2">⚡ 천장 보증 (피티)</p>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-300 font-bold">에픽 보증</span>
                <span>{pity.epicPity}/{pity.epicAt}회</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(pity.epicPity / pity.epicAt) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-yellow-300 font-bold">전설 보증</span>
                <span>{pity.legendaryPity}/{pity.legendaryAt}회</span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(pity.legendaryPity / pity.legendaryAt) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 뽑기 결과 */}
      {results.length > 0 && (
        <div className="mx-4 mb-4">
          <p className="text-sm font-black mb-3">✨ 뽑기 결과</p>
          <div className="grid grid-cols-3 gap-2">
            {results.map((r, i) => {
              const style = RARITY_STYLE[r.rarity] ?? RARITY_STYLE.common;
              return (
                <div key={i} className={`rounded-2xl p-3 text-center ${style.bg}`}>
                  <div className="text-3xl mb-1">
                    {r.item ? (ITEM_EMOJI[r.item.assetKey] ?? '🎁') : '🪙'}
                  </div>
                  <p className={`text-[10px] font-bold ${style.text}`}>{style.label}</p>
                  <p className={`text-[9px] ${style.text} opacity-80 truncate`}>
                    {r.isDuplicate ? `+${r.dupeCoins}🪙` : (r.item?.name ?? '보상')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 뽑기 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-indigo-950 pt-8">
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={() => handlePull(1)}
            disabled={pulling}
            className="flex-1 bg-white/20 border border-white/30 text-white font-black py-4 rounded-2xl active:scale-95 transition-transform">
            <p className="text-base">1회 뽑기</p>
            <p className="text-sm text-yellow-300">💎 {pity?.singleCost ?? 100}보석</p>
          </button>
          <button
            onClick={() => handlePull(10)}
            disabled={pulling}
            className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black py-4 rounded-2xl active:scale-95 transition-transform shadow-lg">
            <p className="text-base">10회 뽑기</p>
            <p className="text-sm text-white/80">💎 {pity?.tenCost ?? 900}보석</p>
          </button>
        </div>
        <p className="text-center text-white/40 text-xs mt-2">중복 아이템은 코인으로 교환됩니다</p>
      </div>
    </div>
  );
}
