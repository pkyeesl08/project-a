import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { api } from '../lib/api';

function useCountdown(endAt: string): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setLabel('마감'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  return label;
}

export default function DailyGameCard() {
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [endAt, setEndAt] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [myRank, setMyRank] = useState<{ rank: number; total: number; score: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ rank: number; nickname: string; score: number }[]>([]);

  const countdown = useCountdown(endAt || new Date(Date.now() + 86400000).toISOString());

  useEffect(() => {
    api.getDailyGame()
      .then((res) => {
        setGameType(res.gameType as GameType);
        setEndAt(res.endAt);
      })
      .catch(() => {});

    api.checkDailyAttempted()
      .then((res) => {
        setAttempted(res.attempted);
        if (res.attempted) {
          api.getMyDailyRank().then(setMyRank).catch(() => {});
          api.getDailyLeaderboard(undefined, 3).then(setLeaderboard).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  if (!gameType) return null;

  const config = GAME_CONFIGS[gameType];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <section className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl p-4 border border-accent/20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-black text-sm">⭐ 오늘의 게임</p>
          <p className="text-xs text-gray-400">하루 1번 · 전국 동시 플레이</p>
        </div>
        <span className="text-xs text-accent font-bold bg-white/60 rounded-full px-2 py-0.5">
          {countdown}
        </span>
      </div>

      {/* 게임 정보 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{config.icon}</span>
        <div>
          <p className="font-bold">{config.name}</p>
          <p className="text-xs text-gray-500">{config.description}</p>
        </div>
      </div>

      {/* 이미 플레이한 경우 → 내 순위 + 리더보드 */}
      {attempted ? (
        <div className="space-y-2">
          {myRank && (
            <div className="bg-white/60 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-bold">내 순위</span>
              <span className="text-accent font-black">
                #{myRank.rank} / {myRank.total}명 · {myRank.score.toLocaleString()}점
              </span>
            </div>
          )}
          {leaderboard.length > 0 && (
            <div className="bg-white/40 rounded-xl px-3 py-2 space-y-1">
              {leaderboard.map((e) => (
                <div key={e.rank} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-center">{medals[e.rank - 1] ?? e.rank}</span>
                  <span className="flex-1 font-medium text-gray-700">{e.nickname}</span>
                  <span className="text-gray-500">{e.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-gray-400">내일 다시 도전하세요!</p>
        </div>
      ) : (
        /* 미플레이 → 플레이 버튼 */
        <Link
          to={`/play/${gameType}?mode=daily`}
          className="w-full bg-accent text-white text-sm font-bold py-3 rounded-xl
                     flex items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          🎮 오늘의 게임 플레이 (1회 한정)
        </Link>
      )}
    </section>
  );
}
