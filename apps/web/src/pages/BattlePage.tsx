import { useState } from 'react';
import { GAME_CONFIGS, GameType, GameCategory } from '@donggamerank/shared';

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

  const games = Object.values(GAME_CONFIGS);

  const handleStartMatch = () => {
    if (!selectedMode || !selectedGame) return;
    setIsSearching(true);
    // TODO: Socket.IO match:request 전송
    setTimeout(() => setIsSearching(false), 5000); // mock timeout
  };

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
            onClick={() => setIsSearching(false)}
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

      {/* Team Battle Section */}
      <section className="pt-4 border-t border-gray-100">
        <h2 className="text-lg font-bold mb-3">🛡️ 단체전</h2>
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">🏠 동네 대항전</p>
                <p className="text-xs text-gray-400 mt-0.5">역삼동 vs 논현동 (5 vs 5)</p>
              </div>
              <button className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                참가
              </button>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="flex-1 bg-primary/10 rounded h-2">
                <div className="bg-primary rounded h-2" style={{ width: '60%' }} />
              </div>
              <span className="text-xs text-gray-400">3/5명</span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm">🏫 학교 대항전</p>
                <p className="text-xs text-gray-400 mt-0.5">서울대 vs 연세대 (5 vs 5)</p>
              </div>
              <button className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                참가
              </button>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="flex-1 bg-primary/10 rounded h-2">
                <div className="bg-primary rounded h-2" style={{ width: '80%' }} />
              </div>
              <span className="text-xs text-gray-400">4/5명</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
