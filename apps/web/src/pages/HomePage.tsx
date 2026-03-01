import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GAME_CONFIGS, GameCategory } from '@donggamerank/shared';
import { api, DailyMission } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { getTier, getNextTier } from '../lib/tier';

const LEVEL_RANGES = [
  { from: 1,  to: 10,  xpPer: 100  },
  { from: 10, to: 30,  xpPer: 300  },
  { from: 30, to: 50,  xpPer: 600  },
  { from: 50, to: 70,  xpPer: 1200 },
  { from: 70, to: 90,  xpPer: 2000 },
  { from: 90, to: 100, xpPer: 5000 },
] as const;

function calcLevelFromXp(totalXp: number) {
  let remaining = Math.max(0, totalXp);
  for (const { from, to, xpPer } of LEVEL_RANGES) {
    const rangeTotal = (to - from) * xpPer;
    if (remaining < rangeTotal) {
      const earned = Math.floor(remaining / xpPer);
      return { level: from + earned, xpIntoLevel: remaining - earned * xpPer, xpForNextLevel: xpPer };
    }
    remaining -= rangeTotal;
  }
  return { level: 100, xpIntoLevel: 0, xpForNextLevel: null };
}
import DailyBattleBanner from '../components/DailyBattleBanner';
import DailyGameCard from '../components/DailyGameCard';
import WeeklyChallengeCard from '../components/WeeklyChallengeCard';
import AttendanceModal from '../components/AttendanceModal';

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
  const myXp = user?.xp ?? 0;
  const { level: myLevel, xpIntoLevel, xpForNextLevel } = calcLevelFromXp(myXp);

  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [season, setSeason] = useState<{ id: string; name: string } | null>(null);
  const [myRank, setMyRank] = useState<{ regionRank?: number; totalPlayers?: number } | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceStreak, setAttendanceStreak] = useState(0);
  const [checkedInToday, setCheckedInToday] = useState(false);

  const tier = getTier(myElo);
  const nextTier = getNextTier(myElo);

  // 미션, 시즌, 내 랭킹, 출석 로드
  useEffect(() => {
    api.getMissions().then(setMissions).catch(() => {});
    api.getCurrentSeason().then(s => setSeason({ id: s.id, name: s.name })).catch(() => {});
    api.getMyRankings().then(setMyRank).catch(() => {});
    api.getAttendanceStatus().then(s => {
      setAttendanceStreak(s.streak);
      setCheckedInToday(s.checkedInToday);
    }).catch(() => {});
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

  return (
    <>
    {showAttendance && <AttendanceModal onClose={() => { setShowAttendance(false); api.getAttendanceStatus().then(s => { setAttendanceStreak(s.streak); setCheckedInToday(s.checkedInToday); }).catch(() => {}); }} />}
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
            <Link to="/profile" className="inline-block mt-1 bg-yellow-400/20 rounded-full px-2 py-0.5 text-[10px] font-bold text-yellow-200">
              ⚡ Lv.{myLevel}
            </Link>
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
        {/* XP 레벨 진행 바 */}
      <div className="mt-3">
        <div className="flex justify-between text-xs opacity-60 mb-1">
          <span>⚡ Lv.{myLevel} 경험치</span>
          {xpForNextLevel != null
            ? <span>{xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP</span>
            : <span className="text-yellow-300 font-bold">MAX</span>
          }
        </div>
        <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all"
            style={{ width: xpForNextLevel ? `${Math.max(3, (xpIntoLevel / xpForNextLevel) * 100)}%` : '100%' }}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs">▲ 12 이번 주</span>
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs">🔥 5연승</span>
        </div>
      </section>

      {/* 출석 체크 + 시즌 패스 버튼 */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAttendance(true)}
          className={`flex-1 rounded-2xl p-4 shadow-sm border text-left transition-all active:scale-95 ${
            checkedInToday ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
          }`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{checkedInToday ? '✅' : '📅'}</span>
            <div>
              <p className="text-sm font-black">{checkedInToday ? '출석 완료!' : '출석 체크'}</p>
              <p className="text-xs text-gray-400">🔥 {attendanceStreak}일 연속</p>
            </div>
          </div>
        </button>
        <Link
          to="/season-pass"
          className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-4 shadow-sm active:scale-95 transition-all">
          <p className="text-sm font-black">🎫 시즌 패스</p>
          <p className="text-xs opacity-70">{season?.name ?? 'Season 1'}</p>
          <div className="mt-2 flex gap-1">
            <Link to="/gacha" className="bg-white/20 rounded-full px-2 py-0.5 text-xs" onClick={e => e.stopPropagation()}>🎲 뽑기</Link>
          </div>
        </Link>
      </div>

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
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                      m.rewardClaimed
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-accent text-white active:scale-95'
                    }`}
                  >
                    {m.rewardClaimed ? '✓완료' : claiming === m.id ? '...' : (
                      <span>🪙{m.rewardCoins ?? 150}<br/><span className="text-[9px] opacity-70">+{m.rewardElo}ELO</span></span>
                    )}
                  </button>
                ) : (
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs text-gray-300 font-bold">🪙{m.rewardCoins ?? 150}</p>
                    <Link
                      to="/games"
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] text-primary font-bold underline"
                    >
                      하러 가기→
                    </Link>
                  </div>
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

      {/* 주간 동네 챌린지 */}
      <WeeklyChallengeCard />

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
    </>
  );
}
