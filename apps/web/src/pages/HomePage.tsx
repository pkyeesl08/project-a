import { Link } from 'react-router-dom';
import { GAME_CONFIGS, GameCategory } from '@donggamerank/shared';

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

  return (
    <div className="p-4 space-y-6">
      {/* 동네 랭킹 요약 */}
      <section className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm opacity-80">🏠 역삼동 랭킹</p>
        <div className="flex items-end gap-3 mt-2">
          <span className="text-4xl font-black">#42</span>
          <span className="text-sm opacity-70 pb-1">/ 1,234명</span>
        </div>
        <div className="flex gap-2 mt-3">
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs">ELO 1,247</span>
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs">▲ 12 이번 주</span>
        </div>
      </section>

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
              <p className="font-bold text-sm">시즌 1 - 주간 챌린지</p>
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
