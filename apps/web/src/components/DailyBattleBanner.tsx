import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, NeighborhoodBattle } from '../lib/api';

function useCountdown(endAt: string): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setLabel('마감'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  return label;
}

export default function DailyBattleBanner() {
  const [battle, setBattle] = useState<NeighborhoodBattle | null>(null);

  useEffect(() => {
    // regionId 없이 호출 → 서버에서 JWT 유저의 primaryRegionId 사용
    api.getCurrentBattle().then(setBattle).catch(() => {});
  }, []);

  const countdown = useCountdown(battle?.endAt ?? new Date(Date.now() + 86400000).toISOString());

  if (!battle) return null;

  const total = (battle.regionAScore + battle.regionBScore) || 1;
  const aRatio = Math.max(4, (battle.regionAScore / total) * 100);
  const bRatio = Math.max(4, (battle.regionBScore / total) * 100);
  const aName = battle.regionAName ?? '우리 동네';
  const bName = battle.regionBName ?? '상대 동네';
  const aWinning = battle.regionAScore >= battle.regionBScore;

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <p className="font-black text-sm">🏆 오늘의 동네 배틀</p>
        <span className="text-xs font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
          {countdown}
        </span>
      </div>

      {/* 지역명 + 점수 */}
      <div className="flex items-center gap-2 text-xs font-bold mb-1.5">
        <span className={`flex-1 text-right truncate ${aWinning ? 'text-primary' : 'text-gray-400'}`}>
          {aName}
        </span>
        <span className="text-gray-300 text-[10px]">VS</span>
        <span className={`flex-1 text-left truncate ${!aWinning ? 'text-orange-400' : 'text-gray-400'}`}>
          {bName}
        </span>
      </div>

      {/* 점수 바 */}
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5 mb-3">
        <div
          className="bg-primary flex items-center justify-end pr-2 transition-all duration-700"
          style={{ width: `${aRatio}%` }}
        >
          {aRatio > 20 && (
            <span className="text-[10px] text-white font-bold">{battle.regionAScore.toLocaleString()}</span>
          )}
        </div>
        <div
          className="bg-orange-400 flex items-center justify-start pl-2 transition-all duration-700"
          style={{ width: `${bRatio}%` }}
        >
          {bRatio > 20 && (
            <span className="text-[10px] text-white font-bold">{battle.regionBScore.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* 기여 버튼 */}
      <Link
        to="/games"
        className="w-full bg-primary text-white text-sm font-bold py-2.5 rounded-xl
                   flex items-center justify-center gap-1 active:scale-95 transition-transform"
      >
        🎮 게임해서 동네에 기여하기
      </Link>
    </section>
  );
}
