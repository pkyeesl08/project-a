import { useState, useEffect, useRef, useCallback } from 'react';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const MOCK_PROFILE = {
  nickname: '빠른호랑이1234',
  elo: 1247,
  region: '역삼동',
  school: '서울대학교',
  totalGames: 342,
  totalWins: 198,
  winRate: 57.9,
  currentStreak: 5,
  regionRank: 42,
  schoolRank: 15,
  badges: ['🏆', '🔥', '⚡', '🎯', '💎'],
  topGames: [
    { type: GameType.SPEED_TAP, rank: 3, score: 847 },
    { type: GameType.LIGHTNING_REACTION, rank: 12, score: 156 },
    { type: GameType.TIMING_HIT, rank: 28, score: 42 },
  ],
};

type Tab = 'stats' | 'games' | 'external';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [showNicknameEdit, setShowNicknameEdit] = useState(false);

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <section className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            🐯
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">{MOCK_PROFILE.nickname}</h1>
              <button onClick={() => setShowNicknameEdit(true)}
                className="bg-white/20 rounded-lg px-2 py-0.5 text-xs active:scale-95 transition-transform">
                ✏️ 수정
              </button>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🏠 {MOCK_PROFILE.region}</span>
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🏫 {MOCK_PROFILE.school}</span>
            </div>
          </div>
          <button className="bg-white/20 p-2 rounded-lg text-lg">⚙️</button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'ELO', value: MOCK_PROFILE.elo.toLocaleString() },
            { label: '동네 랭킹', value: `#${MOCK_PROFILE.regionRank}` },
            { label: '승률', value: `${MOCK_PROFILE.winRate}%` },
            { label: '연승', value: `${MOCK_PROFILE.currentStreak}🔥` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-black">{stat.value}</p>
              <p className="text-[10px] opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="flex gap-2 mt-3">
          {MOCK_PROFILE.badges.map((badge, i) => (
            <span key={i} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* Nickname Edit Modal */}
      {showNicknameEdit && (
        <NicknameEditor
          currentNickname={MOCK_PROFILE.nickname}
          onClose={() => setShowNicknameEdit(false)}
          onSaved={(name) => {
            MOCK_PROFILE.nickname = name;
            setShowNicknameEdit(false);
          }}
        />
      )}

      {/* Tab Switch */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {([
          { key: 'stats', label: '📊 전적' },
          { key: 'games', label: '🎮 게임별' },
          { key: 'external', label: '🔗 외부 연동' },
        ] as { key: Tab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      {activeTab === 'external' && <ExternalTab />}
    </div>
  );
}

/* ── 닉네임 수정 컴포넌트 ── */

function NicknameEditor({ currentNickname, onClose, onSaved }: {
  currentNickname: string;
  onClose: () => void;
  onSaved: (nickname: string) => void;
}) {
  const [input, setInput] = useState(currentNickname);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]+$/;

  // 실시간 유효성 검사 + 중복 체크 (디바운스 400ms)
  const validate = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // 즉시 체크: 길이, 문자
    if (value.length < 2) {
      setStatus('invalid');
      setMessage('2자 이상 입력해주세요.');
      return;
    }
    if (value.length > 12) {
      setStatus('invalid');
      setMessage('12자 이하로 입력해주세요.');
      return;
    }
    if (!NICKNAME_REGEX.test(value)) {
      setStatus('invalid');
      setMessage('한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.');
      return;
    }
    if (value === currentNickname) {
      setStatus('idle');
      setMessage('');
      return;
    }

    // 서버 중복 체크 (디바운스)
    setStatus('checking');
    setMessage('확인 중...');

    timerRef.current = setTimeout(async () => {
      try {
        const result = await api.checkNickname(value);
        if (result.available) {
          setStatus('available');
          setMessage('사용 가능한 닉네임입니다!');
        } else {
          setStatus('taken');
          setMessage(result.reason || '이미 사용 중인 닉네임입니다.');
        }
      } catch {
        // 서버 미연결 시 로컬 검증만
        setStatus('available');
        setMessage('사용 가능해 보입니다. (서버 미확인)');
      }
    }, 400);
  }, [currentNickname]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInput(v);
    validate(v);
  };

  const handleSave = async () => {
    if (status !== 'available' || saving) return;
    setSaving(true);
    try {
      await api.updateMe({ nickname: input });
      onSaved(input);
    } catch (err: any) {
      setStatus('taken');
      setMessage(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const canSave = status === 'available' && !saving;

  const statusColor = {
    idle: 'text-gray-400',
    checking: 'text-yellow-500',
    available: 'text-green-500',
    taken: 'text-red-500',
    invalid: 'text-red-500',
  }[status];

  const statusIcon = {
    idle: '',
    checking: '⏳',
    available: '✅',
    taken: '❌',
    invalid: '⚠️',
  }[status];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black">닉네임 변경</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>

        {/* 입력 필드 */}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={handleChange}
            maxLength={12}
            autoFocus
            placeholder="새 닉네임 입력"
            className="w-full border-2 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none transition-colors"
            style={{
              borderColor: status === 'available' ? '#22C55E'
                : status === 'taken' || status === 'invalid' ? '#EF4444'
                : '#E5E7EB',
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {input.length}/12
          </span>
        </div>

        {/* 상태 메시지 */}
        <p className={`text-sm mt-2 h-5 ${statusColor}`}>
          {statusIcon} {message}
        </p>

        {/* 규칙 안내 */}
        <div className="bg-gray-50 rounded-xl p-3 mt-3 space-y-1">
          <p className="text-xs text-gray-500 font-bold">닉네임 규칙</p>
          <Rule ok={input.length >= 2 && input.length <= 12} text="2~12자" />
          <Rule ok={input.length === 0 || NICKNAME_REGEX.test(input)} text="한글, 영문, 숫자, 밑줄(_)만 가능" />
          <Rule ok={status !== 'taken'} text="중복 불가" />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-500">
            취소
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
              canSave ? 'bg-primary text-white active:scale-95' : 'bg-gray-200 text-gray-400'
            }`}>
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
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">📈 최근 전적</h3>
        <div className="flex gap-1">
          {['W', 'W', 'L', 'W', 'W', 'W', 'L', 'W', 'L', 'W'].map((r, i) => (
            <div key={i}
              className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${
                r === 'W' ? 'bg-green-500' : 'bg-red-400'
              }`}>
              {r}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">🎮 총 전적</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black">{MOCK_PROFILE.totalGames}</p>
            <p className="text-xs text-gray-400">총 게임</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-500">{MOCK_PROFILE.totalWins}</p>
            <p className="text-xs text-gray-400">승리</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-400">{MOCK_PROFILE.totalGames - MOCK_PROFILE.totalWins}</p>
            <p className="text-xs text-gray-400">패배</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">🏆 시즌 기록</h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-sm">Season 1</p>
            <p className="text-xs text-gray-400">골드 · 최종 #42</p>
          </div>
          <span className="text-xl">🥇</span>
        </div>
      </div>
    </div>
  );
}

function GamesTab() {
  return (
    <div className="space-y-2">
      {MOCK_PROFILE.topGames.map((game) => {
        const config = GAME_CONFIGS[game.type];
        return (
          <div key={game.type}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="text-3xl">{config.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{config.name}</p>
              <p className="text-xs text-gray-400">최고 점수: {game.score}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-primary">#{game.rank}</p>
              <p className="text-[10px] text-gray-400">동네 랭킹</p>
            </div>
          </div>
        );
      })}
      <p className="text-center text-xs text-gray-400 pt-2">
        25종 게임 중 {MOCK_PROFILE.topGames.length}종 플레이
      </p>
    </div>
  );
}

function ExternalTab() {
  const [riotId, setRiotId] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
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

  const handleLookup = async () => {
    if (!riotId.includes('#')) {
      setError('"닉네임#태그" 형식으로 입력해주세요. (예: Hide on bush#KR1)');
      return;
    }
    setLoading(true);
    setError('');
    setLookupResult(null);
    try {
      const result = await api.lookupLol(riotId);
      setLookupResult(result);
    } catch (err: any) {
      setError(err.message || '소환사를 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await api.connectLol(riotId);
      setConnected(true);
    } catch (err: any) {
      setError(err.message || '연동에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatRank = (rank: any) => {
    if (!rank) return null;
    const tierKr = TIER_KR[rank.tier] || rank.tier;
    const division = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(rank.tier) ? '' : ` ${rank.rank}`;
    return { text: `${tierKr}${division}`, lp: rank.lp, wins: rank.wins, losses: rank.losses, winRate: rank.winRate, tier: rank.tier };
  };

  return (
    <div className="space-y-3">
      {/* LoL 연동 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🎮</span>
          <h3 className="font-bold text-sm">League of Legends 연동</h3>
        </div>

        {connected ? (
          <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700 font-bold text-center">
            ✅ 연동 완료! 동네 LoL 랭킹에 등록되었습니다.
          </div>
        ) : (
          <>
            {/* Riot ID 입력 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={riotId}
                onChange={e => { setRiotId(e.target.value); setError(''); setLookupResult(null); }}
                placeholder="닉네임#태그 (예: Hide on bush#KR1)"
                className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={handleLookup} disabled={loading || !riotId}
                className={`px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${
                  loading || !riotId ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'
                }`}>
                {loading ? '검색중...' : '검색'}
              </button>
            </div>

            {error && <p className="text-red-500 text-xs mt-2">❌ {error}</p>}

            {/* 검색 결과 카드 */}
            {lookupResult && (
              <div className="mt-3 bg-gray-900 text-white rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={`https://ddragon.leagueoflegends.com/cdn/14.1.1/img/profileicon/${lookupResult.profileIconId}.png`}
                    className="w-12 h-12 rounded-full"
                    alt="icon"
                    onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).className = 'w-12 h-12 rounded-full bg-gray-700'; }}
                  />
                  <div>
                    <p className="font-bold">{lookupResult.gameName}<span className="text-gray-400">#{lookupResult.tagLine}</span></p>
                    <p className="text-xs text-gray-400">레벨 {lookupResult.summonerLevel}</p>
                  </div>
                </div>

                {/* 솔로랭크 */}
                {(() => {
                  const solo = formatRank(lookupResult.soloRank);
                  return solo ? (
                    <div className="bg-white/10 rounded-lg p-3 mb-2">
                      <p className="text-xs text-gray-400 mb-1">솔로 랭크</p>
                      <p className={`text-xl font-black ${TIER_COLORS[solo.tier] || ''}`}>
                        {solo.text} <span className="text-sm font-normal text-gray-400">{solo.lp} LP</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {solo.wins}승 {solo.losses}패 · 승률 {solo.winRate}%
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/10 rounded-lg p-3 mb-2">
                      <p className="text-xs text-gray-400">솔로 랭크</p>
                      <p className="text-gray-500 font-bold">언랭크</p>
                    </div>
                  );
                })()}

                {/* 자유랭크 */}
                {(() => {
                  const flex = formatRank(lookupResult.flexRank);
                  return flex ? (
                    <div className="bg-white/10 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">자유 랭크</p>
                      <p className={`font-bold ${TIER_COLORS[flex.tier] || ''}`}>
                        {flex.text} · {flex.lp} LP
                      </p>
                    </div>
                  ) : null;
                })()}

                {/* 연동 버튼 */}
                <button onClick={handleConnect} disabled={loading}
                  className="w-full mt-3 bg-accent py-3 rounded-xl font-bold active:scale-95 transition-transform">
                  {loading ? '연동 중...' : '이 계정으로 연동하기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 다른 게임 (준비 중) */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-2">🔜 연동 예정</h3>
        {[
          { icon: '🔫', name: 'VALORANT', status: '준비 중' },
          { icon: '🛡️', name: 'Overwatch 2', status: '준비 중' },
          { icon: '⚽', name: 'FIFA Online', status: '준비 중' },
        ].map(g => (
          <div key={g.name} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <span className="text-xl">{g.icon}</span>
            <span className="flex-1 text-sm">{g.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{g.status}</span>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
        💡 연동하면 동네/학교 기준으로 LoL 랭킹을 확인할 수 있어요!
      </div>
    </div>
  );
}
