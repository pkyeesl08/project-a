import { Link, useSearchParams } from 'react-router-dom';
import { GAME_CONFIGS, GameCategory, GameConfig, GameDifficulty } from '@donggamerank/shared';

const CATEGORIES = [
  { key: 'all', label: '전체', emoji: '🎲' },
  { key: GameCategory.REACTION, label: '반응', emoji: '⚡' },
  { key: GameCategory.PUZZLE, label: '퍼즐', emoji: '🧠' },
  { key: GameCategory.ACTION, label: '액션', emoji: '🎮' },
  { key: GameCategory.PRECISION, label: '정밀', emoji: '🎯' },
  { key: GameCategory.PARTY, label: '파티', emoji: '🌟' },
];

const DIFFICULTIES: { key: GameDifficulty | 'all'; label: string; emoji: string; color: string }[] = [
  { key: 'all',    label: '전체',  emoji: '',   color: '' },
  { key: 'bronze', label: '입문',  emoji: '🥉', color: 'text-amber-700' },
  { key: 'silver', label: '중급',  emoji: '🥈', color: 'text-gray-500'  },
  { key: 'gold',   label: '고급',  emoji: '🥇', color: 'text-yellow-500' },
];

const DIFFICULTY_LABELS: Record<GameDifficulty, { emoji: string; label: string; bg: string; text: string }> = {
  bronze: { emoji: '🥉', label: '입문', bg: 'bg-amber-100', text: 'text-amber-700' },
  silver: { emoji: '🥈', label: '중급', bg: 'bg-gray-100',  text: 'text-gray-600'  },
  gold:   { emoji: '🥇', label: '고급', bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

export default function GamesPage() {
  const [params, setParams] = useSearchParams();
  const activeCategory  = params.get('category')   || 'all';
  const activeDifficulty = params.get('difficulty') || 'all';

  const games = Object.values(GAME_CONFIGS).filter(g => {
    const catOk  = activeCategory  === 'all' || g.category  === activeCategory;
    const diffOk = activeDifficulty === 'all' || g.difficulty === activeDifficulty;
    return catOk && diffOk;
  });

  function setFilter(key: 'category' | 'difficulty', value: string) {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  // 난이도별 설명 카드 (처음에만 표시)
  const showGuide = activeCategory === 'all' && activeDifficulty === 'all';

  return (
    <div className="p-4">
      {/* 난이도 안내 카드 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="font-black text-sm text-amber-800 mb-2">🎮 난이도 가이드</p>
          <div className="flex gap-3">
            {DIFFICULTIES.filter(d => d.key !== 'all').map(d => (
              <button
                key={d.key}
                onClick={() => setFilter('difficulty', d.key)}
                className="flex-1 bg-white rounded-xl p-2.5 text-center shadow-sm border border-amber-100 active:scale-95 transition-transform"
              >
                <p className="text-xl">{d.emoji}</p>
                <p className={`text-xs font-bold mt-1 ${d.color}`}>{d.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {Object.values(GAME_CONFIGS).filter(g => g.difficulty === d.key).length}개
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 난이도 필터 */}
      <div className="flex gap-1.5 mb-3">
        {DIFFICULTIES.map(d => (
          <button
            key={d.key}
            onClick={() => setFilter('difficulty', d.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeDifficulty === d.key
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {d.emoji} {d.label}
          </button>
        ))}
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter('category', cat.key)}
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

      {/* 결과 수 */}
      <p className="text-xs text-gray-400 mb-3">{games.length}개의 게임</p>

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
    [GameCategory.REACTION]:  'border-l-game-reaction',
    [GameCategory.PUZZLE]:    'border-l-game-puzzle',
    [GameCategory.ACTION]:    'border-l-game-action',
    [GameCategory.PRECISION]: 'border-l-game-precision',
    [GameCategory.PARTY]:     'border-l-game-party',
  };

  const diff = DIFFICULTY_LABELS[game.difficulty];

  return (
    <Link
      to={`/play/${game.type}`}
      className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 border-l-4 ${
        categoryColors[game.category] || ''
      } hover:shadow-md transition-all active:scale-95 transform`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="text-3xl">{game.icon}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diff.bg} ${diff.text}`}>
          {diff.emoji} {diff.label}
        </span>
      </div>
      <h3 className="font-bold text-sm mt-1">{game.name}</h3>
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
