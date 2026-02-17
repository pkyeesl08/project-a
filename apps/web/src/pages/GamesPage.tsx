import { Link, useSearchParams } from 'react-router-dom';
import { GAME_CONFIGS, GameCategory, GameConfig } from '@donggamerank/shared';

const CATEGORIES = [
  { key: 'all', label: '전체', emoji: '🎲' },
  { key: GameCategory.REACTION, label: '반응', emoji: '⚡' },
  { key: GameCategory.PUZZLE, label: '퍼즐', emoji: '🧠' },
  { key: GameCategory.ACTION, label: '액션', emoji: '🎮' },
  { key: GameCategory.PRECISION, label: '정밀', emoji: '🎯' },
  { key: GameCategory.PARTY, label: '파티', emoji: '🌟' },
];

export default function GamesPage() {
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get('category') || 'all';

  const games = Object.values(GAME_CONFIGS).filter(
    (g) => activeCategory === 'all' || g.category === activeCategory,
  );

  return (
    <div className="p-4">
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setParams(cat.key === 'all' ? {} : { category: cat.key })}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-2 gap-3">
        {games.map((game) => (
          <GameCard key={game.type} game={game} />
        ))}
      </div>
    </div>
  );
}

function GameCard({ game }: { game: GameConfig }) {
  const categoryColors: Record<string, string> = {
    [GameCategory.REACTION]: 'border-l-game-reaction',
    [GameCategory.PUZZLE]: 'border-l-game-puzzle',
    [GameCategory.ACTION]: 'border-l-game-action',
    [GameCategory.PRECISION]: 'border-l-game-precision',
    [GameCategory.PARTY]: 'border-l-game-party',
  };

  return (
    <Link
      to={`/play/${game.type}`}
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 ${
        categoryColors[game.category] || ''
      } hover:shadow-md transition-all active:scale-95 transform`}
    >
      <div className="text-3xl mb-2">{game.icon}</div>
      <h3 className="font-bold text-sm">{game.name}</h3>
      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{game.description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5">
          {game.durationMs / 1000}초
        </span>
        <span className="text-xs text-primary font-bold">#-- 내 랭킹</span>
      </div>
    </Link>
  );
}
