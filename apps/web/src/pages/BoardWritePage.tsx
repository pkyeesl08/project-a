import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type Category = 'general' | 'party';

const VALID_GAME_TYPES = [
  'timing_hit', 'speed_tap', 'lightning_reaction', 'balloon_pop', 'whack_a_mole',
  'memory_flash', 'color_match', 'bigger_number', 'same_picture', 'odd_even',
  'reverse_memory', 'direction_swipe', 'stop_the_bar', 'rps_speed',
  'sequence_tap', 'reverse_reaction', 'line_trace', 'target_sniper',
  'dark_room_tap', 'screw_center', 'line_grow', 'dual_precision', 'rapid_aim',
  'math_speed', 'shell_game', 'emoji_sort', 'count_more',
];

const GAME_LABELS: Record<string, string> = {
  timing_hit: '타이밍 히트', speed_tap: '스피드 탭',
  lightning_reaction: '번개 반응', balloon_pop: '풍선 터트리기',
  whack_a_mole: '두더지 잡기', memory_flash: '기억 플래시',
  color_match: '색깔 맞추기', bigger_number: '큰 숫자',
  same_picture: '같은 그림', odd_even: '홀짝',
  reverse_memory: '역순 기억', direction_swipe: '방향 스와이프',
  stop_the_bar: '바 멈추기', rps_speed: '빠른 가위바위보',
  sequence_tap: '순서대로 탭', reverse_reaction: '역방향 반응',
  line_trace: '선 따라가기', target_sniper: '타겟 저격',
  dark_room_tap: '암실 탭', screw_center: '나사 중심',
  line_grow: '선 늘리기', dual_precision: '이중 정밀 탭',
  rapid_aim: '연속 조준', math_speed: '수학 속산',
  shell_game: '컵 게임', emoji_sort: '이모지 분류', count_more: '더 많이 세기',
};

export default function BoardWritePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  const defaultCategory = (params.get('category') as Category) ?? 'general';

  const [category, setCategory]   = useState<Category>(defaultCategory);
  const [title, setTitle]         = useState('');
  const [content, setContent]     = useState('');
  const [gameType, setGameType]   = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  if (!isLoggedIn) {
    navigate('/register', { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return; }
    if (category === 'party' && !gameType) { setError('게임 종류를 선택해주세요.'); return; }

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
                onClick={() => setCategory(cat)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  category === cat
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {cat === 'general' ? '📋 통합 게시판' : '🎮 파티 찾기'}
              </button>
            ))}
          </div>
        </div>

        {/* 파티 찾기 옵션 */}
        {category === 'party' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs text-gray-500 font-medium">파티 설정</p>

            {/* 게임 종류 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">게임 종류 *</label>
              <select
                value={gameType}
                onChange={e => setGameType(e.target.value)}
                className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm text-gray-700
                           focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">선택해주세요</option>
                {VALID_GAME_TYPES.map(g => (
                  <option key={g} value={g}>{GAME_LABELS[g] ?? g}</option>
                ))}
              </select>
            </div>

            {/* 최대 인원 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">최대 인원</label>
              <div className="flex gap-2">
                {[2, 3, 4, 6, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                      maxPlayers === n
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-500'
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
                ? '예: 스피드탭 파티원 구합니다 (3/4)'
                : '예: 타이밍히트 공략 공유해요!'}
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
                ? '파티 모집 조건, 연락 방법, 플레이 시간대 등을 적어주세요.'
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
