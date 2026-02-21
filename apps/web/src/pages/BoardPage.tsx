import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, BoardPost } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type Tab = 'general' | 'party';
type GameCategory = 'reaction' | 'puzzle' | 'action' | 'precision' | 'special';

const TAB_LABELS: Record<Tab, string> = {
  general: '📋 통합',
  party:   '🎮 파티찾기',
};

const GAME_LABELS: Record<string, string> = {
  timing_hit:         '타이밍 히트',
  speed_tap:          '스피드 탭',
  lightning_reaction: '번개 반응',
  balloon_pop:        '풍선 터트리기',
  whack_a_mole:       '두더지 잡기',
  memory_flash:       '기억 플래시',
  color_match:        '색깔 맞추기',
  bigger_number:      '큰 숫자',
  same_picture:       '같은 그림',
  odd_even:           '홀짝',
  reverse_memory:     '역순 기억',
  direction_swipe:    '방향 스와이프',
  stop_the_bar:       '바 멈추기',
  rps_speed:          '빠른 가위바위보',
  sequence_tap:       '순서대로 탭',
  reverse_reaction:   '역방향 반응',
  line_trace:         '선 따라가기',
  target_sniper:      '타겟 저격',
  dark_room_tap:      '암실 탭',
  screw_center:       '나사 중심',
  line_grow:          '선 늘리기',
  dual_precision:     '이중 정밀 탭',
  rapid_aim:          '연속 조준',
  math_speed:         '수학 속산',
  shell_game:         '컵 게임',
  emoji_sort:         '이모지 분류',
  count_more:         '더 많이 세기',
};

const GAME_CATEGORY: Record<string, GameCategory> = {
  timing_hit: 'reaction', speed_tap: 'reaction', lightning_reaction: 'reaction',
  balloon_pop: 'reaction', whack_a_mole: 'reaction',
  memory_flash: 'puzzle', color_match: 'puzzle', bigger_number: 'puzzle',
  same_picture: 'puzzle', odd_even: 'puzzle', reverse_memory: 'puzzle',
  direction_swipe: 'action', stop_the_bar: 'action', rps_speed: 'action',
  sequence_tap: 'action', reverse_reaction: 'action',
  line_trace: 'precision', target_sniper: 'precision', dark_room_tap: 'precision',
  screw_center: 'precision', line_grow: 'precision', dual_precision: 'precision',
  rapid_aim: 'precision',
  math_speed: 'special', shell_game: 'special', emoji_sort: 'special', count_more: 'special',
};

type CategoryConfig = { label: string; icon: string; bg: string; text: string; activeBg: string };
const CATEGORY_CONFIG: Record<GameCategory, CategoryConfig> = {
  reaction:  { label: '반응/속도', icon: '⚡', bg: 'bg-orange-100', text: 'text-orange-700', activeBg: 'bg-orange-500' },
  puzzle:    { label: '퍼즐/논리', icon: '🧠', bg: 'bg-purple-100', text: 'text-purple-700', activeBg: 'bg-purple-500' },
  action:    { label: '액션/모션', icon: '🕹️', bg: 'bg-blue-100',   text: 'text-blue-700',   activeBg: 'bg-blue-500'   },
  precision: { label: '정밀/집중', icon: '🎯', bg: 'bg-green-100',  text: 'text-green-700',  activeBg: 'bg-green-500'  },
  special:   { label: '특수/파티', icon: '🌟', bg: 'bg-amber-100',  text: 'text-amber-700',  activeBg: 'bg-amber-500'  },
};

const CATEGORY_FILTERS: Array<{ key: '' | GameCategory; label: string; icon: string }> = [
  { key: '', label: '전체', icon: '📋' },
  { key: 'reaction',  label: '반응/속도', icon: '⚡' },
  { key: 'puzzle',    label: '퍼즐/논리', icon: '🧠' },
  { key: 'action',    label: '액션/모션', icon: '🕹️' },
  { key: 'precision', label: '정밀/집중', icon: '🎯' },
  { key: 'special',   label: '특수/파티', icon: '🌟' },
];

function gameTagClasses(gameType: string): string {
  const cat = GAME_CATEGORY[gameType];
  if (!cat) return 'bg-blue-100 text-blue-700';
  return `${CATEGORY_CONFIG[cat].bg} ${CATEGORY_CONFIG[cat].text}`;
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
            {post.gameType && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${gameTagClasses(post.gameType)}`}>
                {GAME_CATEGORY[post.gameType] ? `${CATEGORY_CONFIG[GAME_CATEGORY[post.gameType]].icon} ` : ''}{GAME_LABELS[post.gameType] ?? post.gameType}
              </span>
            )}
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
  const [selectedCategory, setSelectedCategory] = useState<'' | GameCategory>('');

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
    setSelectedCategory('');
    fetchPosts(tab, 1, true);
  }, [tab, fetchPosts]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(tab, next, false);
  };

  const filteredPosts = selectedCategory
    ? posts.filter(p => p.gameType && GAME_CATEGORY[p.gameType] === selectedCategory)
    : posts;

  const hasMore = posts.length < total && !selectedCategory;

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

      {/* 파티 탭 — 게임 카테고리 필터 칩 */}
      {tab === 'party' && (
        <div className="bg-white border-b border-gray-100 px-4 py-2.5">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {CATEGORY_FILTERS.map(f => {
              const isActive = selectedCategory === f.key;
              const catCfg = f.key ? CATEGORY_CONFIG[f.key] : null;
              return (
                <button
                  key={f.key}
                  onClick={() => setSelectedCategory(f.key)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? catCfg
                        ? `${catCfg.activeBg} text-white`
                        : 'bg-gray-700 text-white'
                      : catCfg
                        ? `${catCfg.bg} ${catCfg.text}`
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
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
              {selectedCategory ? `${CATEGORY_CONFIG[selectedCategory].label} 파티가 없어요` : '아직 게시글이 없어요'}
            </p>
            {isLoggedIn && !selectedCategory && (
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
