import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type Category = 'general' | 'party';

type ExternalGame = {
  key: string;
  label: string;
  icon: string;
  bg: string;
  text: string;
  activeBg: string;
};

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

export default function BoardWritePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const defaultCategory = (params.get('category') as Category) ?? 'general';

  const [category, setCategory]     = useState<Category>(defaultCategory);
  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [gameType, setGameType]     = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  if (!isLoggedIn) {
    navigate('/register', { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return; }
    if (category === 'party' && !gameType) { setError('게임을 선택해주세요.'); return; }

    setError('');
    setSubmitting(true);
    try {
      const post = await api.createBoardPost({
        category,
        regionId: user?.primaryRegionId || undefined,
        title: title.trim(),
        content: content.trim(),
        gameType: category === 'party' ? gameType : undefined,
        maxPlayers: category === 'party' ? maxPlayers : undefined,
      });
      navigate(`/board/${post.id}`, { replace: true });
    } catch (e: any) {
      setError(e.message ?? '게시글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGame = EXTERNAL_GAMES.find(g => g.key === gameType);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
          <span className="text-sm font-bold text-gray-700">글쓰기</span>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full
                       active:scale-95 transition-transform disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 카테고리 선택 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 font-medium mb-2">게시판 선택</p>
          <div className="flex gap-2">
            {(['general', 'party'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setGameType(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  category === cat ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {cat === 'general' ? '📋 통합 게시판' : '🎮 파티 찾기'}
              </button>
            ))}
          </div>
        </div>

        {/* 파티 찾기 옵션 */}
        {category === 'party' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <p className="text-xs text-gray-500 font-medium">파티 설정</p>

            {/* 게임 선택 */}
            <div>
              <label className="text-xs text-gray-400 block mb-2">게임 선택 *</label>
              <div className="flex flex-wrap gap-2">
                {EXTERNAL_GAMES.map(g => {
                  const isSelected = gameType === g.key;
                  return (
                    <button
                      key={g.key}
                      onClick={() => setGameType(g.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
                                  border transition-all active:scale-95 ${
                        isSelected
                          ? `${g.activeBg} text-white border-transparent`
                          : `${g.bg} ${g.text} border-transparent`
                      }`}
                    >
                      <span>{g.icon}</span>
                      <span>{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 최대 인원 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">최대 인원</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                      maxPlayers === n ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {n}명
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 제목 & 내용 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={category === 'party'
                ? (selectedGame ? `${selectedGame.label} 파티원 구합니다!` : '예: 같이 랭크 돌 분 구해요!')
                : '예: 동네 게임 후기 공유해요!'}
              maxLength={100}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-gray-300 text-right mt-0.5">{title.length}/100</p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">내용 *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={category === 'party'
                ? '티어, 플레이 스타일, 연락 방법, 플레이 시간대 등을 적어주세요.'
                : '자유롭게 작성해주세요. (공략, 질문, 잡담 모두 환영!)'}
              rows={8}
              maxLength={2000}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-gray-300 text-right mt-0.5">{content.length}/2000</p>
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        {/* 동네 범위 안내 */}
        <p className="text-[11px] text-gray-400 text-center">
          📍 {user?.regionName ? `${user.regionName} 주민에게 노출됩니다.` : '동네 인증 후 동네 게시판에 노출됩니다.'}
        </p>
      </div>
    </div>
  );
}
