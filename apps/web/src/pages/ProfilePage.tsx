import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_CONFIGS } from '@donggamerank/shared';
import { api, AchievementItem, Friend, FriendRequest } from '../lib/api';
import { useAvatarStore, FRAME_RING, TITLE_STYLE } from '../stores/avatarStore';
import { useAuthStore } from '../stores/authStore';
import { getTier } from '../lib/tier';

/** 서버 레벨 공식과 동일한 클라이언트 계산 */
const LEVEL_RANGES = [
  { from: 1,  to: 10,  xpPer: 100  },
  { from: 10, to: 30,  xpPer: 300  },
  { from: 30, to: 50,  xpPer: 600  },
  { from: 50, to: 70,  xpPer: 1200 },
  { from: 70, to: 90,  xpPer: 2000 },
  { from: 90, to: 100, xpPer: 5000 },
] as const;

function calcLevelFromXp(totalXp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number | null } {
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

type Tab = 'stats' | 'games' | 'achievements' | 'friends' | 'external' | 'trophy';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);
  const { user, updateUser: updateAuthUser } = useAuthStore();
  const { avatar, coins, gems, fetchAll } = useAvatarStore();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { api.getMe().then(setProfile).catch(() => {}); }, []);

  const activeFrame = avatar?.activeFrame;
  const activeTitle = avatar?.activeTitle;
  const frameRingCls = activeFrame
    ? (FRAME_RING[activeFrame.assetKey] ?? 'ring-2 ring-white/40')
    : 'ring-2 ring-white/20';
  const titleCls = activeTitle
    ? (TITLE_STYLE[activeTitle.assetKey] ?? 'bg-white/20 text-white')
    : null;

  const displayNickname = user?.nickname ?? profile?.nickname ?? '...';
  const displayElo = user?.eloRating ?? profile?.eloRating ?? 0;
  const displayRegion = user?.regionName ?? profile?.regionName ?? '동네 미설정';
  const displaySchool = user?.schoolName ?? profile?.schoolName ?? null;
  const displayRegionRank = profile?.regionRank ?? '—';
  const displayWinRate = profile?.winRate ?? '—';
  const displayStreak = profile?.currentStreak ?? 0;
  const displayBadges: string[] = profile?.badges ?? [];
  const displayXp = user?.xp ?? profile?.xp ?? 0;
  const { level: calcedLevel, xpIntoLevel, xpForNextLevel } = calcLevelFromXp(displayXp);

  const tier = getTier(displayElo);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: '📊 전적' },
    { key: 'games', label: '🎮 게임' },
    { key: 'achievements', label: '🏅 업적' },
    { key: 'friends', label: '👥 친구' },
    { key: 'external', label: '🔗 외부' },
    { key: 'trophy', label: '🏆 트로피' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <section className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          {/* 아바타 */}
          <button onClick={() => navigate('/avatar')} className="relative flex-shrink-0 group">
            <div className={`w-16 h-16 bg-white/20 rounded-full flex items-center justify-center
              text-3xl ring-offset-2 ring-offset-primary transition-all ${frameRingCls}`}>
              🐯
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center
              opacity-0 group-active:opacity-100 transition-opacity">
              <span className="text-xs text-white font-bold">꾸미기</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-5 h-5
              flex items-center justify-center shadow-sm">
              <span className="text-[10px]">✏️</span>
            </div>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black">{displayNickname}</h1>
              <button onClick={() => setShowNicknameEdit(true)}
                className="bg-white/20 rounded-lg px-2 py-0.5 text-xs active:scale-95 transition-transform">
                ✏️ 수정
              </button>
            </div>
            {/* 칭호 + 티어 + 레벨 */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {activeTitle && (
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${titleCls}`}>
                  {activeTitle.name}
                </span>
              )}
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                {tier.emoji} {tier.name}
              </span>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/30 text-yellow-200">
                ⚡ Lv.{calcedLevel}
              </span>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🏠 {displayRegion}</span>
              {displaySchool && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🏫 {displaySchool}</span>
              )}
            </div>
          </div>
          <button className="bg-white/20 p-2 rounded-lg text-lg">⚙️</button>
        </div>

        {/* 재화 잔액 */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => navigate('/avatar')}
            className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-1.5 active:scale-95 transition-transform">
            <span className="text-amber-300 font-black text-sm">💎 {gems.toLocaleString()}</span>
          </button>
          <button onClick={() => navigate('/avatar')}
            className="flex items-center gap-1 bg-white/10 rounded-xl px-3 py-1.5 active:scale-95 transition-transform">
            <span className="text-yellow-200 font-black text-sm">🪙 {coins.toLocaleString()}</span>
          </button>
          <button onClick={() => navigate('/avatar')}
            className="ml-auto bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold active:scale-95 transition-transform">
            🎨 아바타 꾸미기
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'ELO', value: displayElo.toLocaleString() },
            { label: '동네 랭킹', value: `#${displayRegionRank}` },
            { label: '승률', value: displayWinRate !== '—' ? `${displayWinRate}%` : '—' },
            { label: '연승', value: `${displayStreak}🔥` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-black">{stat.value}</p>
              <p className="text-[10px] opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* XP 진행 바 */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-yellow-200">⚡ Lv.{calcedLevel}</span>
            {xpForNextLevel != null ? (
              <span className="text-[10px] text-white/50">
                {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
              </span>
            ) : (
              <span className="text-[10px] text-yellow-300 font-bold">MAX LEVEL</span>
            )}
          </div>
          <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all"
              style={{ width: xpForNextLevel ? `${Math.min(100, (xpIntoLevel / xpForNextLevel) * 100)}%` : '100%' }}
            />
          </div>
          {xpForNextLevel != null && (
            <p className="text-[10px] text-white/40 text-right mt-0.5">
              다음 레벨까지 {(xpForNextLevel - xpIntoLevel).toLocaleString()} XP
            </p>
          )}
        </div>

        {/* Badges */}
        {displayBadges.length > 0 && (
          <div className="flex gap-2 mt-3">
            {displayBadges.map((badge, i) => (
              <span key={i} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
                {badge}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Nickname Edit Modal */}
      {showNicknameEdit && (
        <NicknameEditor
          currentNickname={displayNickname}
          onClose={() => setShowNicknameEdit(false)}
          onSaved={(name) => {
            updateAuthUser({ nickname: name });
            setShowNicknameEdit(false);
          }}
        />
      )}

      {/* Tab Switch */}
      <div className="flex overflow-x-auto bg-gray-100 rounded-xl p-1 gap-0.5 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 flex-1 min-w-0 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white shadow text-primary' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'games' && <GamesTab />}
      {activeTab === 'achievements' && <AchievementsTab />}
      {activeTab === 'friends' && <FriendsTab />}
      {activeTab === 'external' && <ExternalTab />}
      {activeTab === 'trophy' && <TrophyCaseTab />}
    </div>
  );
}

/* ── 트로피 케이스 탭 ── */

const STREAK_MILESTONE_REWARDS: { streak: number; items: string[] }[] = [
  { streak: 1, items: ['동네 챔피언 칭호', '주간 챔피언 왕관', '코인 100개'] },
  { streak: 2, items: ['챔피언 오라 이펙트', '코인 200개'] },
  { streak: 4, items: ['전설의 챔피언 칭호', '황금 챔피언 왕관', '코인 300개'] },
  { streak: 8, items: ['챔피언 불꽃 이펙트', '코인 300개'] },
];

function TrophyCaseTab() {
  const [stats, setStats] = useState<{
    streak: number;
    totalCount: number;
    history: string[];
    nextReward: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyChampionStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
        <p className="text-3xl animate-bounce">🏆</p>
        <p className="text-sm">불러오는 중...</p>
      </div>
    );
  }

  const streak     = stats?.streak ?? 0;
  const total      = stats?.totalCount ?? 0;
  const history    = stats?.history ?? [];
  const nextReward = stats?.nextReward ?? null;

  // 스트릭 진행 바 — 다음 마일스톤까지
  const milestones = [1, 2, 4, 8];
  const nextMilestone = milestones.find(m => m > streak) ?? 8;
  const prevMilestone = [...milestones].reverse().find(m => m <= streak) ?? 0;
  const progressPct = nextMilestone === prevMilestone
    ? 100
    : Math.min(100, ((streak - prevMilestone) / (nextMilestone - prevMilestone)) * 100);

  return (
    <div className="space-y-4">

      {/* 총 챔피언 통계 */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-xs opacity-80 mb-1">주간 동네 챔피언 기록</p>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-5xl font-black">{total}</p>
            <p className="text-xs opacity-70">통산 챔피언 횟수</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-3xl font-black">{streak}🔥</p>
            <p className="text-xs opacity-70">현재 연속 챔피언</p>
          </div>
        </div>

        {/* 스트릭 진행 바 */}
        {total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] opacity-70 mb-1">
              <span>현재 연속 {streak}주</span>
              <span>다음 마일스톤: {nextMilestone}주</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 다음 보상 안내 */}
      {nextReward && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">🎁</span>
          <div>
            <p className="text-xs font-bold text-violet-700">다음 보상</p>
            <p className="text-xs text-violet-600 mt-0.5">{nextReward}</p>
          </div>
        </div>
      )}

      {/* 스트릭 마일스톤 로드맵 */}
      <section>
        <h3 className="text-sm font-black mb-2 text-gray-700">연속 챔피언 보상 로드맵</h3>
        <div className="space-y-2">
          {STREAK_MILESTONE_REWARDS.map(({ streak: ms, items }) => {
            const achieved = streak >= ms;
            return (
              <div
                key={ms}
                className={`rounded-xl p-3 flex items-center gap-3 ${
                  achieved
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                  achieved ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {achieved ? '✅' : `${ms}주`}
                </div>
                <div>
                  <p className={`text-xs font-bold ${achieved ? 'text-amber-700' : 'text-gray-500'}`}>
                    {ms}주 연속 달성
                  </p>
                  <p className={`text-[11px] mt-0.5 ${achieved ? 'text-amber-600' : 'text-gray-400'}`}>
                    {items.join(' · ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 달성 역사 타임라인 */}
      {history.length > 0 ? (
        <section>
          <h3 className="text-sm font-black mb-2 text-gray-700">챔피언 달성 기록</h3>
          <div className="grid grid-cols-2 gap-2">
            {history.map((weekKey, i) => (
              <div
                key={`${weekKey}-${i}`}
                className="bg-white border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2"
              >
                <span className="text-base">{i === 0 ? '🏆' : '👑'}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700">{weekKey}</p>
                  <p className="text-[10px] text-gray-400">동네 1위</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        total === 0 && (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">👑</p>
            <p className="font-bold text-gray-700 mb-1">아직 챔피언 기록이 없어요</p>
            <p className="text-sm text-gray-400">주간 동네 챌린지에서 1위를 달성해보세요!</p>
          </div>
        )
      )}
    </div>
  );
}

/* ── 닉네임 수정 ── */

function NicknameEditor({ currentNickname, onClose, onSaved }: {
  currentNickname: string; onClose: () => void; onSaved: (nickname: string) => void;
}) {
  const [input, setInput] = useState(currentNickname);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]+$/;

  const validate = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.length < 2) { setStatus('invalid'); setMessage('2자 이상 입력해주세요.'); return; }
    if (value.length > 12) { setStatus('invalid'); setMessage('12자 이하로 입력해주세요.'); return; }
    if (!NICKNAME_REGEX.test(value)) { setStatus('invalid'); setMessage('한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.'); return; }
    if (value === currentNickname) { setStatus('idle'); setMessage(''); return; }
    setStatus('checking'); setMessage('확인 중...');
    timerRef.current = setTimeout(async () => {
      try {
        const result = await api.checkNickname(value);
        if (result.available) { setStatus('available'); setMessage('사용 가능한 닉네임입니다!'); }
        else { setStatus('taken'); setMessage(result.reason || '이미 사용 중인 닉네임입니다.'); }
      } catch { setStatus('available'); setMessage('사용 가능해 보입니다. (서버 미확인)'); }
    }, 400);
  }, [currentNickname]);

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  const handleSave = async () => {
    if (status !== 'available' || saving) return;
    setSaving(true);
    try { await api.updateMe({ nickname: input }); onSaved(input); }
    catch (err: any) { setStatus('taken'); setMessage(err.message || '저장 실패'); }
    finally { setSaving(false); }
  };

  const canSave = status === 'available' && !saving;
  const statusColor = { idle: 'text-gray-400', checking: 'text-yellow-500', available: 'text-green-500', taken: 'text-red-500', invalid: 'text-red-500' }[status];
  const statusIcon = { idle: '', checking: '⏳', available: '✅', taken: '❌', invalid: '⚠️' }[status];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black">닉네임 변경</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <div className="relative">
          <input type="text" value={input} onChange={e => { setInput(e.target.value); validate(e.target.value); }}
            maxLength={12} autoFocus placeholder="새 닉네임 입력"
            className="w-full border-2 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none transition-colors"
            style={{ borderColor: status === 'available' ? '#22C55E' : status === 'taken' || status === 'invalid' ? '#EF4444' : '#E5E7EB' }} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{input.length}/12</span>
        </div>
        <p className={`text-sm mt-2 h-5 ${statusColor}`}>{statusIcon} {message}</p>
        <div className="bg-gray-50 rounded-xl p-3 mt-3 space-y-1">
          <p className="text-xs text-gray-500 font-bold">닉네임 규칙</p>
          <Rule ok={input.length >= 2 && input.length <= 12} text="2~12자" />
          <Rule ok={input.length === 0 || NICKNAME_REGEX.test(input)} text="한글, 영문, 숫자, 밑줄(_)만 가능" />
          <Rule ok={status !== 'taken'} text="중복 불가" />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-500">취소</button>
          <button onClick={handleSave} disabled={!canSave}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${canSave ? 'bg-primary text-white active:scale-95' : 'bg-gray-200 text-gray-400'}`}>
            {saving ? '저장 중...' : '변경하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`text-xs flex items-center gap-1 ${ok ? 'text-green-500' : 'text-gray-400'}`}>
      {ok ? '✓' : '○'} {text}
    </p>
  );
}

/* ── 탭 컴포넌트들 ── */

function StatsTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGameHistory(10)
      .then((data: any) => setHistory(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const totalGames = history.length;
  const wins = history.filter((g: any) => g.result === 'win' || g.won === true).length;
  const losses = totalGames - wins;
  const recentResults = history.slice(0, 10).map((g: any) =>
    (g.result === 'win' || g.won === true) ? 'W' : 'L'
  );

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>;

  return (
    <div className="space-y-3">
      {recentResults.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-sm mb-3">📈 최근 전적</h3>
          <div className="flex gap-1">
            {recentResults.map((r, i) => (
              <div key={i} className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${r === 'W' ? 'bg-green-500' : 'bg-red-400'}`}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">🎮 총 전적</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-black">{totalGames}</p><p className="text-xs text-gray-400">총 게임</p></div>
          <div><p className="text-2xl font-black text-green-500">{wins}</p><p className="text-xs text-gray-400">승리</p></div>
          <div><p className="text-2xl font-black text-red-400">{losses}</p><p className="text-xs text-gray-400">패배</p></div>
        </div>
      </div>
    </div>
  );
}

function GamesTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGameHistory(20)
      .then((data: any) => setHistory(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>;

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm">
        아직 게임 기록이 없어요. 게임을 해보세요!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((game: any, i) => {
        const config = game.gameType ? GAME_CONFIGS[game.gameType as keyof typeof GAME_CONFIGS] : null;
        return (
          <div key={game.id ?? i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="text-3xl">{config?.icon ?? '🎮'}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{config?.name ?? game.gameType ?? '게임'}</p>
              <p className="text-xs text-gray-400">점수: {game.score ?? 0}</p>
            </div>
            <div className="text-right">
              {game.result && (
                <p className={`text-sm font-bold ${game.result === 'win' || game.won ? 'text-green-500' : 'text-red-400'}`}>
                  {game.result === 'win' || game.won ? 'WIN' : 'LOSE'}
                </p>
              )}
              {game.eloChange != null && (
                <p className={`text-xs font-bold ${game.eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {game.eloChange >= 0 ? '+' : ''}{game.eloChange} ELO
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementsTab() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAchievements()
      .then(setAchievements)
      .catch(() => setAchievements([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>;
  }

  const unlocked = achievements.filter(a => a.isUnlocked);
  const locked = achievements.filter(a => !a.isUnlocked);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-sm mb-3">🏅 달성한 업적 ({unlocked.length})</h3>
        {unlocked.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            아직 달성한 업적이 없어요. 게임을 해보세요!
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map((a) => (
              <div key={a.type} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                <p className="text-3xl mb-1">{a.icon}</p>
                <p className="text-xs font-bold text-gray-800 leading-tight">{a.title}</p>
                <p className="text-[10px] text-accent font-bold mt-0.5">+{a.rewardElo} ELO</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {locked.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400">🔒 미달성 ({locked.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {locked.slice(0, 9).map((a) => (
              <div key={a.type} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-3xl mb-1 opacity-25">{a.icon}</p>
                <p className="text-xs text-gray-400 leading-tight">{a.title}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">+{a.rewardElo}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FriendsTab() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ userId: string; nickname: string; eloRating: number; regionName: string }>>([]);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([api.getFriends(), api.getFriendRequests()])
      .then(([f, r]) => { setFriends(f); setRequests(r); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // 위치 기반 근처 게이머 추천 (GPS 허용 시)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        api.getMapUsers(pos.coords.latitude, pos.coords.longitude, 3)
          .then((users: any[]) => {
            setSuggestions(users.slice(0, 6));
          })
          .catch(() => {});
      }, () => {/* 위치 거부 시 조용히 무시 */});
    }
  }, []);

  const handleSuggestRequest = async (userId: string) => {
    try {
      await api.sendFriendRequest(userId);
      setRequestedIds(prev => new Set([...prev, userId]));
    } catch { /* 무시 */ }
  };

  const handleAccept = async (requesterId: string) => {
    try {
      await api.acceptFriendRequest(requesterId);
      setRequests(r => r.filter(req => req.from.userId !== requesterId));
      const updated = await api.getFriends();
      setFriends(updated);
    } catch { /* 무시 */ }
  };

  const handleSendRequest = async () => {
    if (!search.trim() || sending) return;
    setSending(true); setMsg('');
    try {
      await api.sendFriendRequest(search.trim());
      setMsg('친구 요청을 보냈습니다!');
      setSearch('');
    } catch (e: any) {
      setMsg(e.message || '친구 요청 실패');
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await api.removeFriend(userId);
      setFriends(f => f.filter(fr => fr.userId !== userId));
    } catch { /* 무시 */ }
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>;

  return (
    <div className="space-y-4">
      {/* 친구 추가 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">👥 친구 추가</h3>
        <div className="flex gap-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="유저 ID 입력" onKeyDown={e => e.key === 'Enter' && handleSendRequest()}
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          <button onClick={handleSendRequest} disabled={sending || !search.trim()}
            className={`px-4 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              sending || !search.trim() ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'
            }`}>
            {sending ? '요청 중...' : '요청'}
          </button>
        </div>
        {msg && <p className="text-xs mt-2 text-center text-primary font-medium">{msg}</p>}
      </div>

      {/* 받은 요청 */}
      {requests.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2">📬 받은 요청 ({requests.length})</h3>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.from.userId}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">🐯</div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{req.from.nickname}</p>
                  <p className="text-xs text-gray-400">ELO {req.from.eloRating}</p>
                </div>
                <button onClick={() => handleAccept(req.from.userId)}
                  className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95 transition-transform">
                  수락
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 동네 게이머 추천 */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-2">📍 근처 게이머 추천</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestions.map(u => {
              const alreadyFriend = friends.some(f => f.userId === u.userId);
              const requested = requestedIds.has(u.userId);
              return (
                <div key={u.userId}
                  className="shrink-0 bg-white rounded-2xl p-3 shadow-sm border border-gray-100
                             flex flex-col items-center gap-1.5 w-24 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark
                                  rounded-full flex items-center justify-center text-lg">🐯</div>
                  <p className="text-[11px] font-bold text-gray-800 leading-tight line-clamp-1 w-full">
                    {u.nickname}
                  </p>
                  <p className="text-[9px] text-gray-400">{u.regionName}</p>
                  {alreadyFriend ? (
                    <span className="text-[9px] text-green-500 font-bold">친구</span>
                  ) : (
                    <button
                      onClick={() => handleSuggestRequest(u.userId)}
                      disabled={requested}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        requested ? 'bg-gray-100 text-gray-400' : 'bg-primary/10 text-primary active:scale-95'
                      }`}
                    >
                      {requested ? '요청됨' : '+ 친구'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 친구 목록 */}
      <div>
        <h3 className="font-bold text-sm mb-2">🤝 친구 ({friends.length})</h3>
        {friends.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
            친구를 추가해보세요!
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.userId}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">🐯</div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{f.nickname}</p>
                  <p className="text-xs text-gray-400">ELO {f.eloRating}</p>
                </div>
                <button onClick={() => handleRemove(f.userId)}
                  className="text-gray-300 text-sm px-2 py-1 hover:text-red-400 transition-colors">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExternalTab() {
  return (
    <div className="space-y-3">
      <LolConnector />
      <MapleConnector />
      <FcOnlineConnector />
      <PubgConnector />
      <SteamConnector />

      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
        💡 연동하면 동네/학교 기준으로 게임별 랭킹을 확인할 수 있어요!
      </div>
    </div>
  );
}

/* ── LoL 연동 ── */

function LolConnector() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const TIER_COLORS: Record<string, string> = {
    IRON: 'text-gray-400', BRONZE: 'text-amber-700', SILVER: 'text-gray-300',
    GOLD: 'text-yellow-500', PLATINUM: 'text-cyan-400', EMERALD: 'text-emerald-400',
    DIAMOND: 'text-blue-400', MASTER: 'text-purple-400',
    GRANDMASTER: 'text-red-500', CHALLENGER: 'text-yellow-300',
  };
  const TIER_KR: Record<string, string> = {
    IRON: '아이언', BRONZE: '브론즈', SILVER: '실버', GOLD: '골드',
    PLATINUM: '플래티넘', EMERALD: '에메랄드', DIAMOND: '다이아몬드',
    MASTER: '마스터', GRANDMASTER: '그랜드마스터', CHALLENGER: '챌린저',
  };

  const handleSearch = async () => {
    if (!input.includes('#')) { setError('"닉네임#태그" 형식으로 입력해주세요.'); return; }
    setLoading(true); setError(''); setResult(null);
    try { setResult(await api.lookupLol(input)); }
    catch (e: any) { setError(e.message || '소환사를 찾을 수 없습니다.'); }
    finally { setLoading(false); }
  };

  const handleConnect = async () => {
    setLoading(true);
    try { await api.connectLol(input); setConnected(true); }
    catch (e: any) { setError(e.message || '연동 실패'); }
    finally { setLoading(false); }
  };

  const fmtRank = (r: any) => {
    if (!r) return null;
    const kr = TIER_KR[r.tier] || r.tier;
    const div = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(r.tier) ? '' : ` ${r.rank}`;
    return { text: `${kr}${div}`, lp: r.lp, wins: r.wins, losses: r.losses, winRate: r.winRate, tier: r.tier };
  };

  return (
    <GameConnectorCard icon="🎮" title="League of Legends" connected={connected} successMsg="동네 LoL 랭킹에 등록되었습니다.">
      <SearchInput value={input} onChange={v => { setInput(v); setError(''); setResult(null); }}
        placeholder="닉네임#태그 (예: Hide on bush#KR1)" onSearch={handleSearch} loading={loading} />
      {error && <p className="text-red-500 text-xs mt-2">❌ {error}</p>}
      {result && (
        <div className="mt-3 bg-gray-900 text-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <img src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${result.profileIconId}.png`}
              className="w-12 h-12 rounded-full" alt=""
              onError={e => { (e.target as HTMLImageElement).className = 'w-12 h-12 rounded-full bg-gray-700'; }} />
            <div>
              <p className="font-bold">{result.gameName}<span className="text-gray-400">#{result.tagLine}</span></p>
              <p className="text-xs text-gray-400">레벨 {result.summonerLevel}</p>
            </div>
          </div>
          {(() => { const s = fmtRank(result.soloRank); return s ? (
            <div className="bg-white/10 rounded-lg p-3 mb-2">
              <p className="text-xs text-gray-400 mb-1">솔로 랭크</p>
              <p className={`text-xl font-black ${TIER_COLORS[s.tier] || ''}`}>{s.text} <span className="text-sm font-normal text-gray-400">{s.lp} LP</span></p>
              <p className="text-xs text-gray-400 mt-1">{s.wins}승 {s.losses}패 · 승률 {s.winRate}%</p>
            </div>
          ) : <div className="bg-white/10 rounded-lg p-3 mb-2"><p className="text-gray-500 font-bold">언랭크</p></div>; })()}
          <ConnectButton onClick={handleConnect} loading={loading} />
        </div>
      )}
    </GameConnectorCard>
  );
}

/* ── 메이플스토리 연동 ── */

function MapleConnector() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await api.lookupMaple(input)); }
    catch (e: any) { setError(e.message || '캐릭터를 찾을 수 없습니다.'); }
    finally { setLoading(false); }
  };

  const handleConnect = async () => {
    setLoading(true);
    try { await api.connectMaple(input); setConnected(true); }
    catch (e: any) { setError(e.message || '연동 실패'); }
    finally { setLoading(false); }
  };

  const fmtPower = (n: number) => {
    if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
    if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
    return n.toLocaleString();
  };

  return (
    <GameConnectorCard icon="🍁" title="메이플스토리" connected={connected} successMsg="동네 메이플 랭킹에 등록되었습니다.">
      <SearchInput value={input} onChange={v => { setInput(v); setError(''); setResult(null); }}
        placeholder="캐릭터명 입력" onSearch={handleSearch} loading={loading} />
      {error && <p className="text-red-500 text-xs mt-2">❌ {error}</p>}
      {result && (
        <div className="mt-3 bg-gradient-to-br from-orange-900 to-amber-900 text-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            {result.image
              ? <img src={result.image} className="w-14 h-14 rounded-lg bg-white/10" alt="" />
              : <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-2xl">🍁</div>
            }
            <div>
              <p className="font-bold text-lg">{result.characterName}</p>
              <p className="text-xs text-white/60">{result.world} · {result.guild ? `길드: ${result.guild}` : '길드 없음'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/10 rounded-lg p-2 text-center"><p className="text-lg font-black">Lv.{result.level}</p><p className="text-[10px] text-white/50">레벨</p></div>
            <div className="bg-white/10 rounded-lg p-2 text-center"><p className="text-lg font-black">{result.class}</p><p className="text-[10px] text-white/50">직업</p></div>
            <div className="bg-white/10 rounded-lg p-2 text-center"><p className="text-lg font-black">{fmtPower(result.combatPower)}</p><p className="text-[10px] text-white/50">전투력</p></div>
          </div>
          <ConnectButton onClick={handleConnect} loading={loading} />
        </div>
      )}
    </GameConnectorCard>
  );
}

/* ── FC 온라인 연동 ── */

function FcOnlineConnector() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await api.lookupFcOnline(input)); }
    catch (e: any) { setError(e.message || '유저를 찾을 수 없습니다.'); }
    finally { setLoading(false); }
  };

  const handleConnect = async () => {
    setLoading(true);
    try { await api.connectFcOnline(input); setConnected(true); }
    catch (e: any) { setError(e.message || '연동 실패'); }
    finally { setLoading(false); }
  };

  return (
    <GameConnectorCard icon="⚽" title="FC 온라인" connected={connected} successMsg="동네 FC 온라인 랭킹에 등록되었습니다.">
      <SearchInput value={input} onChange={v => { setInput(v); setError(''); setResult(null); }}
        placeholder="FC 온라인 닉네임 입력" onSearch={handleSearch} loading={loading} />
      {error && <p className="text-red-500 text-xs mt-2">❌ {error}</p>}
      {result && (
        <div className="mt-3 bg-gradient-to-br from-green-900 to-emerald-900 text-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">⚽</div>
            <div><p className="font-bold text-lg">{result.nickname}</p><p className="text-xs text-white/60">레벨 {result.level}</p></div>
          </div>
          {result.maxDivision?.length > 0 ? (
            <div className="space-y-2 mb-3">
              {result.maxDivision.map((d: any, i: number) => (
                <div key={i} className="bg-white/10 rounded-lg p-3">
                  <p className="text-xs text-white/50">{d.matchType}</p>
                  <p className="text-lg font-black">{d.division}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/10 rounded-lg p-3 mb-3 text-center"><p className="text-white/50">등급 정보 없음</p></div>
          )}
          <ConnectButton onClick={handleConnect} loading={loading} />
        </div>
      )}
    </GameConnectorCard>
  );
}

/* ── 공통 컴포넌트 ── */

function GameConnectorCard({ icon, title, connected, successMsg, children }: {
  icon: string; title: string; connected: boolean; successMsg: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      {connected
        ? <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700 font-bold text-center">✅ 연동 완료! {successMsg}</div>
        : children}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, onSearch, loading }: {
  value: string; onChange: (v: string) => void; placeholder: string; onSearch: () => void; loading: boolean;
}) {
  return (
    <div className="flex gap-2">
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onKeyDown={e => e.key === 'Enter' && onSearch()}
        className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
      <button onClick={onSearch} disabled={loading || !value.trim()}
        className={`px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${
          loading || !value.trim() ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'
        }`}>
        {loading ? '검색중...' : '검색'}
      </button>
    </div>
  );
}

function ConnectButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full mt-2 bg-accent py-3 rounded-xl font-bold active:scale-95 transition-transform text-white">
      {loading ? '연동 중...' : '이 계정으로 연동하기'}
    </button>
  );
}

/* ── PUBG 연동 ── */

function PubgConnector() {
  const [input, setInput]       = useState('');
  const [shard, setShard]       = useState<'kakao' | 'steam'>('kakao');
  const [result, setResult]     = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [connected, setConnected] = useState(false);

  const PUBG_TIER_COLORS: Record<string, string> = {
    Bronze: 'text-amber-700', Silver: 'text-gray-400', Gold: 'text-yellow-500',
    Platinum: 'text-cyan-400', Diamond: 'text-blue-400', Master: 'text-purple-400',
  };

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await api.lookupPubg(input.trim(), shard)); }
    catch (e: any) { setError(e.message || '플레이어를 찾을 수 없습니다.'); }
    finally { setLoading(false); }
  };

  const handleConnect = async () => {
    setLoading(true);
    try { await api.connectPubg(input.trim(), shard); setConnected(true); }
    catch (e: any) { setError(e.message || '연동 실패'); }
    finally { setLoading(false); }
  };

  const fmtMode = (mode: any) => {
    if (!mode) return null;
    return `${mode.tier} ${mode.subTier} · ${mode.rp} RP · KDA ${mode.kda} · 승률 ${mode.winRate}%`;
  };

  return (
    <GameConnectorCard icon="🪖" title="PUBG (배틀그라운드)" connected={connected} successMsg="동네 PUBG 랭킹에 등록되었습니다.">
      {/* 서버 선택 */}
      <div className="flex gap-2 mb-2">
        {(['kakao', 'steam'] as const).map(s => (
          <button
            key={s}
            onClick={() => { setShard(s); setResult(null); setError(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              shard === s ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            {s === 'kakao' ? '🇰🇷 카카오 배그' : '🌐 스팀 글로벌'}
          </button>
        ))}
      </div>
      <SearchInput
        value={input}
        onChange={v => { setInput(v); setError(''); setResult(null); }}
        placeholder="인게임 닉네임 입력"
        onSearch={handleSearch}
        loading={loading}
      />
      {error && <p className="text-red-500 text-xs mt-2">❌ {error}</p>}
      {result && (
        <div className="mt-3 bg-gradient-to-br from-yellow-900 to-orange-900 text-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">🪖</div>
            <div>
              <p className="font-bold text-lg">{result.playerName}</p>
              <p className="text-xs text-white/60">{shard === 'kakao' ? '카카오 배그' : '스팀 글로벌'}</p>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            {result.squadFpp ? (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-white/50 mb-1">스쿼드 FPP</p>
                <p className={`text-xl font-black ${PUBG_TIER_COLORS[result.squadFpp.tier] || 'text-white'}`}>
                  {result.squadFpp.tier} {result.squadFpp.subTier}
                </p>
                <p className="text-xs text-white/60 mt-1">{fmtMode(result.squadFpp)?.split('·').slice(1).join('·')}</p>
              </div>
            ) : (
              <div className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-white/50 font-bold">스쿼드FPP 언랭크</p>
              </div>
            )}
            {result.soloFpp && (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-white/50 mb-1">솔로 FPP</p>
                <p className={`text-lg font-black ${PUBG_TIER_COLORS[result.soloFpp.tier] || 'text-white'}`}>
                  {result.soloFpp.tier} {result.soloFpp.subTier}
                </p>
                <p className="text-xs text-white/60">{result.soloFpp.rp} RP · KDA {result.soloFpp.kda}</p>
              </div>
            )}
          </div>
          <ConnectButton onClick={handleConnect} loading={loading} />
        </div>
      )}
    </GameConnectorCard>
  );
}

/* ── Steam 연동 ── */

function SteamConnector() {
  const [input, setInput]         = useState('');
  const [result, setResult]       = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [connected, setConnected] = useState(false);

  const handleSearch = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try { setResult(await api.lookupSteam(input.trim())); }
    catch (e: any) { setError(e.message || '스팀 프로필을 찾을 수 없습니다.'); }
    finally { setLoading(false); }
  };

  const handleConnect = async () => {
    setLoading(true);
    try { await api.connectSteam(input.trim()); setConnected(true); }
    catch (e: any) { setError(e.message || '연동 실패'); }
    finally { setLoading(false); }
  };

  const fmtHours = (h: number) => h >= 1000 ? `${(h / 1000).toFixed(1)}k시간` : `${h}시간`;

  return (
    <GameConnectorCard icon="🎯" title="Steam" connected={connected} successMsg="동네 Steam 랭킹에 등록되었습니다.">
      <p className="text-xs text-gray-400 mb-2">
        SteamID64 (17자리 숫자) 또는 커스텀 URL (예: myusername)
      </p>
      <SearchInput
        value={input}
        onChange={v => { setInput(v); setError(''); setResult(null); }}
        placeholder="76561198012345678 또는 커스텀 URL"
        onSearch={handleSearch}
        loading={loading}
      />
      {error && <p className="text-red-500 text-xs mt-2">❌ {error}</p>}
      {result && (
        <div className="mt-3 bg-gradient-to-br from-slate-800 to-gray-900 text-white rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            {result.avatarUrl ? (
              <img src={result.avatarUrl} className="w-12 h-12 rounded-full" alt="" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">🎯</div>
            )}
            <div>
              <p className="font-bold text-lg">{result.personaName}</p>
              <p className="text-xs text-white/60">
                게임 {result.gameCount}개 · 총 {fmtHours(result.totalHours)}
              </p>
            </div>
          </div>

          {/* 칭호 */}
          {result.bestTitle && (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 mb-3">
              <p className="text-[10px] text-purple-300">획득 칭호</p>
              <p className="font-black text-purple-200">{result.bestTitle}</p>
            </div>
          )}

          {/* 주요 게임 목록 */}
          {result.notableGames?.length > 0 && (
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-white/50">주요 게임</p>
              {result.notableGames.slice(0, 3).map((g: any) => (
                <div key={g.appId} className="bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{g.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-black text-cyan-300">{fmtHours(g.hours)}</span>
                    {g.title && <p className="text-[9px] text-purple-300">{g.title}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.notableGames?.length === 0 && (
            <div className="bg-white/10 rounded-lg p-3 mb-3 text-center">
              <p className="text-white/50 text-sm">주요 게임 없음 (라이브러리 비공개일 수 있음)</p>
            </div>
          )}

          <ConnectButton onClick={handleConnect} loading={loading} />
        </div>
      )}
    </GameConnectorCard>
  );
}
