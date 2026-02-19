import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GAME_CONFIGS, GameCategory } from '@donggamerank/shared';
import { api, DailyMission } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { getTier, getNextTier } from '../lib/tier';
import DailyBattleBanner from '../components/DailyBattleBanner';
import DailyGameCard from '../components/DailyGameCard';

const CATEGORY_LABELS = {
  [GameCategory.REACTION]: { label: '⚡ 반응', color: 'bg-game-reaction' },
  [GameCategory.PUZZLE]: { label: '🧠 퍼즐', color: 'bg-game-puzzle' },
  [GameCategory.ACTION]: { label: '🎮 액션', color: 'bg-game-action' },
  [GameCategory.PRECISION]: { label: '🎯 정밀', color: 'bg-game-precision' },
  [GameCategory.PARTY]: { label: '🌟 파티', color: 'bg-game-party' },
};

export default function HomePage() {
  const randomGames = Object.values(GAME_CONFIGS)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  const user = useAuthStore(s => s.user);
  const myElo = user?.eloRating ?? 0;
  const myRegionName = user?.regionName ?? '내 동네';

  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [season, setSeason] = useState<{ id: string; name: string } | null>(null);
  const [myRank, setMyRank] = useState<{ regionRank?: number; totalPlayers?: number } | null>(null);

  const tier = getTier(myElo);
  const nextTier = getNextTier(myElo);

  // 미션, 시즌, 내 랭킹 로드
  useEffect(() => {
    api.getMissions().then(setMissions).catch(() => {});
    api.getCurrentSeason().then(s => setSeason({ id: s.id, name: s.name })).catch(() => {});
    api.getMyRankings().then(setMyRank).catch(() => {});
  }, []);

  const handleClaimMission = async (mission: DailyMission) => {
    if (!mission.isCompleted || mission.rewardClaimed || claiming) return;
    setClaiming(mission.id);
    try {
      await api.claimMission(mission.id);
      setMissions(prev => prev.map(m =>
        m.id === mission.id ? { ...m, rewardClaimed: true } : m
      ));
    } catch { /* 실패 시 무시 */ } finally {
      setClaiming(null);
    }
  };

  // 시즌 패스 XP 계산 (간단 버전)
  const completedMissionCount = missions.filter(m => m.rewardClaimed).length;
  const seasonXp = completedMissionCount * 50;
  const seasonLevel = Math.floor(seasonXp / 200) + 1;
  const xpInLevel = seasonXp % 200;
  const xpProgress = xpInLevel / 200;

  return (
    <div className="p-4 space-y-5">
      {/* 동네 랭킹 + 티어 요약 */}
      <section className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80">🏠 {myRegionName} 랭킹</p>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-4xl font-black">#{myRank?.regionRank ?? '—'}</span>
              {myRank?.totalPlayers != null && (
                <span className="text-sm opacity-70 pb-1">/ {myRank.totalPlayers.toLocaleString()}명</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl">{tier.emoji}</span>
            <p className="text-sm font-bold">{tier.name}</p>
            <p className="text-xs opacity-60">ELO {myElo.toLocaleString()}</p>
          </div>
        </div>
        {nextTier && (
          <div className="mt-3">
            <div className="flex justify-between text-xs opacity-60 mb-1">
              <span>다음 티어: {nextTier.tier.emoji} {nextTier.tier.name}</span>
              <span>-{nextTier.remaining} ELO</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all"
                style={{ width: `${Math.max(5, 100 - (nextTier.remaining / 200) * 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs">▲ 12 이번 주</span>
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs">🔥 5연승</span>
        </div>
      </section>

      {/* 시즌 패스 */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-black text-sm">🎫 {season?.name ?? 'Season 1'} 패스</p>
            <p className="text-xs text-gray-400">Lv.{seasonLevel} · {xpInLevel} / 200 XP</p>
          </div>
          <div className="text-right">
            <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-bold">무료</span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
            style={{ width: `${Math.max(3, xpProgress * 100)}%` }}
          />
        </div>
        {/* 트랙 미리보기 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['🪙×30', '🎨 칭호', '🪙×50', '💎×5', '👑 프레임'].map((reward, i) => (
            <div key={i} className={`flex-shrink-0 rounded-lg p-2 text-center w-14 ${
              i < seasonLevel ? 'bg-primary/10 border border-primary/30' : 'bg-gray-50 border border-gray-200'
            }`}>
              <p className="text-base">{reward.split(' ')[0]}</p>
              <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{reward.split(' ').slice(1).join(' ')}</p>
              {i < seasonLevel && <p className="text-[9px] text-primary font-bold">✓</p>}
            </div>
          ))}
        </div>
      </section>

      {/* 오늘의 게임 */}
      <DailyGameCard />

      {/* 오늘의 동네 배틀 */}
      <DailyBattleBanner />

      {/* 오늘의 미션 */}
      {missions.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">📋 오늘의 미션</h2>
          <div className="space-y-2">
            {missions.map(m => (
              <div key={m.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{m.title}</p>
                  <p className="text-xs text-gray-400">{m.description}</p>
                  {/* 진행도 바 */}
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${m.isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (m.currentValue / m.targetValue) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {m.currentValue}/{m.targetValue}
                    </span>
                  </div>
                </div>
                {m.isCompleted ? (
                  <button
                    onClick={() => handleClaimMission(m)}
                    disabled={m.rewardClaimed || claiming === m.id}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      m.rewardClaimed
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-accent text-white active:scale-95'
                    }`}
                  >
                    {m.rewardClaimed ? '완료' : claiming === m.id ? '...' : `+${m.rewardElo}ELO`}
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-xs text-gray-300 font-bold">+{m.rewardElo}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 빠른 시작 */}
      <section>
        <h2 className="text-lg font-bold mb-3">⚡ 빠른 게임</h2>
        <div className="grid grid-cols-2 gap-3">
          {randomGames.map((game) => (
            <Link
              key={game.type}
              to={`/play/${game.type}`}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-95 transform"
            >
              <span className="text-3xl">{game.icon}</span>
              <p className="font-bold text-sm mt-2">{game.name}</p>
              <p className="text-xs text-gray-400 mt-1">{game.durationMs / 1000}초</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 진행 중인 대회 */}
      <section>
        <h2 className="text-lg font-bold mb-3">🏆 진행 중인 대회</h2>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{season?.name ?? 'Season 1'} 주간 챌린지</p>
              <p className="text-xs text-gray-400 mt-1">스피드 탭 랭킹전</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-accent font-bold">D-3</p>
              <p className="text-xs text-gray-400">참가자 847명</p>
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 */}
      <section>
        <h2 className="text-lg font-bold mb-3">📂 카테고리</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Object.values(GameCategory).map((cat) => (
            <Link
              key={cat}
              to={`/games?category=${cat}`}
              className="flex-shrink-0 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 text-center"
            >
              <p className="text-sm font-bold">{CATEGORY_LABELS[cat]?.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {Object.values(GAME_CONFIGS).filter(g => g.category === cat).length}종
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
