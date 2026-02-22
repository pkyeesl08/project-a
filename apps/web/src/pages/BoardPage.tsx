import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, BoardPost } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type Tab = 'general' | 'party';

const TAB_LABELS: Record<Tab, string> = {
  general: '📋 통합',
  party:   '🎮 파티찾기',
};

type ExternalGame = { key: string; label: string; icon: string; bg: string; text: string; activeBg: string };

const EXTERNAL_GAMES: ExternalGame[] = [
  { key: 'lol',        label: '리그 오브 레전드', icon: '⚔️',  bg: 'bg-blue-100',   text: 'text-blue-700',   activeBg: 'bg-blue-500'   },
  { key: 'valorant',   label: '발로란트',          icon: '🔫',  bg: 'bg-red-100',    text: 'text-red-700',    activeBg: 'bg-red-500'    },
  { key: 'overwatch',  label: '오버워치 2',        icon: '🛡️',  bg: 'bg-orange-100', text: 'text-orange-700', activeBg: 'bg-orange-500' },
  { key: 'pubg',       label: '배틀그라운드',      icon: '🪂',  bg: 'bg-yellow-100', text: 'text-yellow-700', activeBg: 'bg-yellow-500' },
  { key: 'lost_ark',   label: '로스트아크',        icon: '⚓',  bg: 'bg-amber-100',  text: 'text-amber-700',  activeBg: 'bg-amber-500'  },
  { key: 'fc_online',  label: 'FC온라인',          icon: '⚽',  bg: 'bg-green-100',  text: 'text-green-700',  activeBg: 'bg-green-500'  },
  { key: 'maplestory', label: '메이플스토리',      icon: '🍁',  bg: 'bg-purple-100', text: 'text-purple-700', activeBg: 'bg-purple-500' },
  { key: 'starcraft',  label: '스타크래프트',      icon: '🚀',  bg: 'bg-indigo-100', text: 'text-indigo-700', activeBg: 'bg-indigo-500' },
  { key: 'minecraft',  label: '마인크래프트',      icon: '🧱',  bg: 'bg-emerald-100',text: 'text-emerald-700',activeBg: 'bg-emerald-500'},
  { key: 'diablo',     label: '디아블로',          icon: '💀',  bg: 'bg-rose-100',   text: 'text-rose-700',   activeBg: 'bg-rose-500'   },
  { key: 'other',      label: '기타',              icon: '🎮',  bg: 'bg-gray-100',   text: 'text-gray-600',   activeBg: 'bg-gray-500'   },
];

const GAME_MAP = new Map(EXTERNAL_GAMES.map(g => [g.key, g]));

function getGameTag(gameType: string | null | undefined): ExternalGame | null {
  if (!gameType) return null;
  return GAME_MAP.get(gameType) ?? { key: gameType, label: gameType, icon: '🎮', bg: 'bg-gray-100', text: 'text-gray-600', activeBg: 'bg-gray-500' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function PostCard({ post, onClick }: { post: BoardPost; onClick: () => void }) {
  const isParty = post.category === 'party';
  const isFull  = post.partyStatus === 'closed';

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100
                 active:scale-[0.98] transition-transform"
    >
      {/* 배지 행 */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {isParty && (
          <>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isFull ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
            }`}>
              {isFull ? '파티 완성' : '모집 중'}
            </span>
            {post.gameType && (() => {
              const g = getGameTag(post.gameType);
              return g ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${g.bg} ${g.text}`}>
                  {g.icon} {g.label}
                </span>
              ) : null;
            })()}
            {post.maxPlayers && (
              <span className="text-[10px] text-gray-400 ml-auto">
                {post.currentPlayers.length}/{post.maxPlayers}명
              </span>
            )}
          </>
        )}
      </div>

      {/* 제목 */}
      <p className="text-sm font-semibold text-gray-800 line-clamp-1">{post.title}</p>

      {/* 하단 메타 */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {post.user.profileImage ? (
          <img src={post.user.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
        ) : (
          <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">🎮</span>
        )}
        <span className="text-xs text-gray-500">{post.user.nickname}</span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
      </div>
    </button>
  );
}

export default function BoardPage() {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const user = useAuthStore(s => s.user);

  const [tab, setTab]       = useState<Tab>('general');
  const [posts, setPosts]   = useState<BoardPost[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState('');

  const regionId = user?.primaryRegionId;

  const fetchPosts = useCallback(async (cat: Tab, p: number, reset: boolean) => {
    setLoading(true);
    try {
      const res = await api.getBoardPosts({ category: cat, regionId, page: p, limit: 20 });
      setPosts(prev => reset ? res.posts : [...prev, ...res.posts]);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [regionId]);

  useEffect(() => {
    setPage(1);
    setSelectedGame('');
    fetchPosts(tab, 1, true);
  }, [tab, fetchPosts]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(tab, next, false);
  };

  const filteredPosts = selectedGame
    ? posts.filter(p => p.gameType === selectedGame)
    : posts;

  const hasMore = posts.length < total && !selectedGame;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-gray-900">동네 게시판</h1>
          {isLoggedIn && (
            <button
              onClick={() => navigate('/board/write')}
              className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full
                         active:scale-95 transition-transform"
            >
              ✏️ 글쓰기
            </button>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-1">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-t-xl transition-colors ${
                tab === t
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* 파티 탭 — 게임 필터 칩 */}
      {tab === 'party' && (
        <div className="bg-white border-b border-gray-100 px-4 py-2.5">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {/* 전체 */}
            <button
              onClick={() => setSelectedGame('')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                selectedGame === '' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              📋 전체
            </button>
            {EXTERNAL_GAMES.map(g => {
              const isActive = selectedGame === g.key;
              return (
                <button
                  key={g.key}
                  onClick={() => setSelectedGame(isActive ? '' : g.key)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    isActive ? `${g.activeBg} text-white` : `${g.bg} ${g.text}`
                  }`}
                >
                  <span>{g.icon}</span>
                  <span>{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {loading && posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-300">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-300">
            <p className="text-4xl mb-3">{tab === 'party' ? '🎮' : '📋'}</p>
            <p className="text-sm">
              {selectedGame ? `${getGameTag(selectedGame)?.label ?? selectedGame} 파티가 없어요` : '아직 게시글이 없어요'}
            </p>
            {isLoggedIn && !selectedGame && (
              <button
                onClick={() => navigate('/board/write')}
                className="mt-4 text-primary text-sm font-bold underline"
              >
                첫 글 작성하기
              </button>
            )}
          </div>
        ) : (
          <>
            {filteredPosts.map(p => (
              <PostCard
                key={p.id}
                post={p}
                onClick={() => navigate(`/board/${p.id}`)}
              />
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-gray-400 font-medium
                           bg-white rounded-2xl border border-gray-100
                           disabled:opacity-50"
              >
                {loading ? '불러오는 중...' : '더 보기'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
