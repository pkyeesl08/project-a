import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, NeighborhoodBattle, BattleRankEntry } from '../lib/api';
import { getTier } from '../lib/tier';

const SCOPES = ['동네', '학교', '구/군', '시/도', '전국', '대항전'];

const MOCK_ELO = 1247;
const MOCK_MY_RANK = 42;

export default function RankingsPage() {
  const [activeScope, setActiveScope] = useState(0);
  const [shareMsg, setShareMsg] = useState('');
  const navigate = useNavigate();

  const myTier = getTier(MOCK_ELO);

  const mockRankings = Array.from({ length: 20 }, (_, i) => ({
    rank: i + 1,
    nickname: `${['빠른', '용감한', '멋진', '강한'][i % 4]}${['호랑이', '독수리', '상어', '용'][i % 4]}${1000 + i}`,
    elo: 1500 - i * 15,
    bestGame: ['⏱️', '👆', '⚡', '🎈', '🐹'][i % 5],
  }));

  const handleShare = async () => {
    const text = `🎮 동겜랭크 역삼동 ${SCOPES[activeScope]} ${MOCK_MY_RANK}위!\nELO: ${MOCK_ELO.toLocaleString()} | ${myTier.emoji} ${myTier.name} 티어\n나도 해보기: https://donggamerank.app`;
    if (navigator.share) {
      try { await navigator.share({ title: '동겜랭크', text }); }
      catch { /* 취소 */ }
    } else {
      await navigator.clipboard.writeText(text);
      setShareMsg('클립보드에 복사됐어요!');
      setTimeout(() => setShareMsg(''), 2000);
    }
  };

  return (
    <div className="p-4">
      {/* Scope Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 overflow-x-auto scrollbar-hide">
        {SCOPES.map((scope, i) => (
          <button
            key={scope}
            onClick={() => setActiveScope(i)}
            className={`flex-shrink-0 flex-1 min-w-0 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
              activeScope === i ? 'bg-primary text-white shadow' : 'text-gray-500'
            }`}
          >
            {scope}
          </button>
        ))}
      </div>

      {/* 대항전 탭 */}
      {activeScope === 5 ? (
        <NeighborhoodBattleView />
      ) : (
        <>
          {/* 외부 게임 랭킹 배너 */}
          <button onClick={() => navigate('/rankings/external')}
            className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-4 mb-4 text-white text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-sm">🎮 외부 게임 동네 랭킹</p>
                <p className="text-xs text-white/70 mt-0.5">LoL · 메이플스토리 · FC 온라인</p>
              </div>
              <span className="text-white/60 text-xl">→</span>
            </div>
          </button>

          {/* My Ranking */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-primary">#{MOCK_MY_RANK}</span>
                <div>
                  <p className="font-bold text-sm">나</p>
                  <p className="text-xs text-gray-400">ELO {MOCK_ELO.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {myTier.emoji} {myTier.name}
                </span>
                <button onClick={handleShare}
                  className="text-xs bg-primary text-white rounded-full px-3 py-1 active:scale-95 transition-transform">
                  공유
                </button>
              </div>
            </div>
            {shareMsg && (
              <p className="text-center text-xs text-primary font-medium mt-2">{shareMsg}</p>
            )}
          </div>

          {/* Top 3 */}
          <div className="flex justify-center gap-4 mb-6">
            {[1, 0, 2].map((idx) => {
              const entry = mockRankings[idx];
              const isFirst = idx === 0;
              const entryTier = getTier(entry.elo);
              return (
                <div key={idx} className={`text-center ${isFirst ? '-mt-4' : 'mt-2'}`}>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                    isFirst ? 'from-yellow-400 to-orange-500' : 'from-gray-300 to-gray-400'
                  } flex items-center justify-center text-2xl shadow-lg mx-auto mb-2`}>
                    {entry.bestGame}
                  </div>
                  <p className="text-xs font-bold">{entry.nickname.slice(0, 6)}</p>
                  <p className="text-[10px] text-gray-400">{entry.elo}</p>
                  <p className="text-[10px] text-gray-500">{entryTier.emoji}</p>
                  <span className="text-lg">
                    {isFirst ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rankings List */}
          <div className="space-y-2">
            {mockRankings.slice(3).map((entry) => {
              const entryTier = getTier(entry.elo);
              return (
                <div
                  key={entry.rank}
                  className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100"
                >
                  <span className="w-8 text-center font-bold text-gray-400">{entry.rank}</span>
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
                    {entry.bestGame}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{entry.nickname}</p>
                    <p className="text-[10px] text-gray-400">{entryTier.emoji} {entryTier.name}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">{entry.elo}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── 동네 대항전 뷰 ── */

function NeighborhoodBattleView() {
  const [battle, setBattle] = useState<NeighborhoodBattle | null>(null);
  const [rankings, setRankings] = useState<BattleRankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock 동네 대항전 데이터 (서버 미연결 시 fallback)
  const MOCK_BATTLE: NeighborhoodBattle = {
    id: 'battle-1',
    regionAId: 'region-a',
    regionBId: 'region-b',
    regionAName: '역삼동',
    regionBName: '삼성동',
    regionAScore: 142500,
    regionBScore: 118300,
    startAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  };

  const MOCK_RANKINGS: BattleRankEntry[] = Array.from({ length: 5 }, (_, i) => ({
    rank: i + 1,
    userId: `user-${i}`,
    nickname: `기여자${i + 1}`,
    contribution: 15000 - i * 2500,
    regionId: 'region-a',
  }));

  useEffect(() => {
    // 현재 동네 ID는 유저 정보에서 가져와야 하나 Mock으로 처리
    api.getCurrentBattle('mock-region-id')
      .then(b => {
        setBattle(b);
        return api.getBattleRankings(b.id);
      })
      .then(setRankings)
      .catch(() => {
        setBattle(MOCK_BATTLE);
        setRankings(MOCK_RANKINGS);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-400 text-sm">로딩 중...</div>;
  }

  if (!battle) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">⚔️</p>
        <p className="font-bold">현재 진행 중인 대항전이 없습니다.</p>
      </div>
    );
  }

  const totalScore = battle.regionAScore + battle.regionBScore;
  const aRatio = totalScore > 0 ? (battle.regionAScore / totalScore) * 100 : 50;

  // 남은 시간 계산
  const endMs = new Date(battle.endAt).getTime() - Date.now();
  const endDays = Math.floor(endMs / (1000 * 60 * 60 * 24));
  const endHours = Math.floor((endMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const timeLeft = endDays > 0 ? `D-${endDays}` : `${endHours}시간 남음`;

  return (
    <div className="space-y-4">
      {/* 대항전 헤더 */}
      <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs opacity-70">주간 동네 대항전</p>
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-bold">{timeLeft}</span>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-center flex-1">
            <p className="text-xl font-black">{battle.regionAName ?? '우리 동네'}</p>
            <p className="text-3xl font-black mt-1">{battle.regionAScore.toLocaleString()}</p>
            <p className="text-xs opacity-60 mt-0.5">점수</p>
          </div>
          <div className="text-3xl font-black opacity-40 flex-shrink-0">VS</div>
          <div className="text-center flex-1">
            <p className="text-xl font-black">{battle.regionBName ?? '상대 동네'}</p>
            <p className="text-3xl font-black mt-1">{battle.regionBScore.toLocaleString()}</p>
            <p className="text-xs opacity-60 mt-0.5">점수</p>
          </div>
        </div>

        {/* 진행도 바 */}
        <div className="mt-4">
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-white rounded-l-full transition-all duration-500"
              style={{ width: `${aRatio}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] opacity-60 mt-1">
            <span>{aRatio.toFixed(1)}%</span>
            <span>{(100 - aRatio).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* 내 기여 안내 */}
      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
        <p className="font-bold text-sm text-orange-800">🎮 게임을 하면 동네에 기여해요!</p>
        <p className="text-xs text-orange-600 mt-1">
          게임 결과의 점수가 우리 동네 총점에 합산됩니다. 많이 플레이할수록 동네가 강해져요!
        </p>
      </div>

      {/* 기여 랭킹 */}
      <div>
        <h3 className="font-bold text-sm mb-3">🏆 우리 동네 기여 순위</h3>
        {rankings.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            아직 기여자가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((entry) => (
              <div key={entry.userId}
                className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100">
                <span className="w-6 text-center font-black text-gray-400 text-sm">{entry.rank}</span>
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-lg">
                  {['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][entry.rank - 1] ?? '🎮'}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{entry.nickname}</p>
                </div>
                <span className="text-sm font-bold text-orange-600">
                  +{entry.contribution.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
