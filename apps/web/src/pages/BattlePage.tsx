import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../lib/socket';

type MatchMode = 'region' | 'school' | 'national' | 'friend';

const MATCH_MODES: { key: MatchMode; label: string; icon: string; desc: string }[] = [
  { key: 'region', label: '동네 대전', icon: '🏠', desc: '같은 동네 유저와 1:1 대전' },
  { key: 'school', label: '학교 대전', icon: '🏫', desc: '같은 학교 유저와 1:1 대전' },
  { key: 'national', label: '빠른 매칭', icon: '🌏', desc: '전국 랜덤 매칭' },
  { key: 'friend', label: '친선전', icon: '🤝', desc: '친구를 초대해서 대전' },
];

export default function BattlePage() {
  const [selectedMode, setSelectedMode] = useState<MatchMode | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const { user, accessToken } = useAuthStore();
  const games = Object.values(GAME_CONFIGS);

  // 매칭 완료 이벤트 리스너 등록
  useEffect(() => {
    const onMatchFound = (data: unknown) => {
      setIsSearching(false);
      const match = data as { matchId: string; opponent: { nickname: string } };
      navigate(`/play/${selectedGame}`, {
        state: { mode: 'pvp', matchId: match.matchId, opponent: match.opponent },
      });
    };
    socketService.on('match:found', onMatchFound);
    return () => socketService.off('match:found', onMatchFound);
  }, [selectedGame, navigate]);

  const handleStartMatch = useCallback(() => {
    if (!selectedMode || !selectedGame || !user) return;
    socketService.connect(accessToken ?? undefined);
    setIsSearching(true);
    socketService.requestMatch({
      userId: user.id,
      gameType: selectedGame,
      mode: selectedMode,
      eloRating: user.eloRating,
    });
  }, [selectedMode, selectedGame, user, accessToken]);

  const handleCancelMatch = useCallback(() => {
    socketService.cancelMatch();
    setIsSearching(false);
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Searching Overlay */}
      {isSearching && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center">
          <div className="w-20 h-20 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-white text-xl font-bold mb-2">상대를 찾는 중...</p>
          <p className="text-white/50 text-sm mb-8">
            {MATCH_MODES.find(m => m.key === selectedMode)?.label}
          </p>
          <button
            onClick={handleCancelMatch}
            className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold"
          >
            취소
          </button>
        </div>
      )}

      <h2 className="text-lg font-bold">⚔️ 실시간 대전</h2>

      {/* Match Mode Selection */}
      <section>
        <h3 className="text-sm font-bold text-gray-500 mb-2">대전 모드</h3>
        <div className="grid grid-cols-2 gap-3">
          {MATCH_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setSelectedMode(mode.key)}
              className={`p-4 rounded-xl border-2 text-left transition-all active:scale-95 ${
                selectedMode === mode.key
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <span className="text-2xl">{mode.icon}</span>
              <p className="font-bold text-sm mt-2">{mode.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{mode.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Game Selection */}
      {selectedMode && (
        <section className="animate-slide-up">
          <h3 className="text-sm font-bold text-gray-500 mb-2">게임 선택</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {games.map((game) => (
              <button
                key={game.type}
                onClick={() => setSelectedGame(game.type)}
                className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 text-center transition-all ${
                  selectedGame === game.type
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <span className="text-2xl">{game.icon}</span>
                <p className="text-xs font-bold mt-1">{game.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Start Button */}
      {selectedMode && selectedGame && (
        <button
          onClick={handleStartMatch}
          className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform animate-slide-up"
        >
          🎮 대전 시작!
        </button>
      )}

      {/* Endless 생존 챌린지 */}
      <section className="pt-4 border-t border-gray-100">
        <h2 className="text-lg font-bold mb-3">♾️ 생존 챌린지</h2>
        <Link
          to="/endless"
          className="block bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4
                     border border-gray-700 active:scale-95 transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Endless 생존 챌린지</p>
              <p className="text-xs text-gray-400 mt-0.5">랜덤 미니게임 · 점점 빨라짐 · ❤️×3</p>
            </div>
            <span className="text-3xl">♾️</span>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full">점점 빨라짐</span>
            <span className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full">랜덤 게임</span>
            <span className="bg-accent/30 text-accent text-xs px-2 py-1 rounded-full font-bold">도전!</span>
          </div>
        </Link>
      </section>

      {/* Team Battle Section */}
      <section className="pt-4 border-t border-gray-100">
        <h2 className="text-lg font-bold mb-3">🛡️ 단체전</h2>
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">🏠 동네 대항전</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.regionName ?? '내 동네'} 팀 (5 vs 5)</p>
              </div>
              <button
                onClick={() => navigate('/rankings?tab=battle')}
                className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold active:scale-95 transition-transform"
              >
                랭킹 보기
              </button>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="flex-1 bg-primary/10 rounded h-2">
                <div className="bg-primary rounded h-2" style={{ width: '60%' }} />
              </div>
              <span className="text-xs text-gray-400">게임으로 기여</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">🏫 학교 대항전</p>
                <p className="text-xs text-gray-400 mt-0.5">{user?.schoolName ?? '학교 미인증'} 팀 (5 vs 5)</p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold active:scale-95 transition-transform ${
                  user?.schoolName ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                {user?.schoolName ? '랭킹 보기' : '학교 인증'}
              </button>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="flex-1 bg-primary/10 rounded h-2">
                <div className="bg-primary rounded h-2" style={{ width: '80%' }} />
              </div>
              <span className="text-xs text-gray-400">게임으로 기여</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
