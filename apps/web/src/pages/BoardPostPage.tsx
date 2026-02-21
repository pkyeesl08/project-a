import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BoardPost, BoardComment } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

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

type GameCategory = 'reaction' | 'puzzle' | 'action' | 'precision' | 'special';

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

const CATEGORY_CONFIG: Record<GameCategory, { icon: string; bg: string; text: string; border: string }> = {
  reaction:  { icon: '⚡', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  puzzle:    { icon: '🧠', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  action:    { icon: '🕹️', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  precision: { icon: '🎯', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  special:   { icon: '🌟', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
};

function getGameTag(gameType: string | null | undefined) {
  if (!gameType) return null;
  const cat = GAME_CATEGORY[gameType];
  const label = GAME_LABELS[gameType] ?? gameType;
  if (!cat) return { icon: '🎮', label, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  const c = CATEGORY_CONFIG[cat];
  return { icon: c.icon, label, bg: c.bg, text: c.text, border: c.border };
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

export default function BoardPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const me = useAuthStore(s => s.user);

  const [post, setPost]         = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partyLoading, setPartyLoading] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getBoardPost(id),
      api.getBoardComments(id),
    ]).then(([p, c]) => {
      setPost(p);
      setComments(c);
    }).catch(() => {
      navigate('/board', { replace: true });
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!id || !confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await api.deleteBoardPost(id);
      navigate('/board', { replace: true });
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleJoin = async () => {
    if (!id) return;
    setPartyLoading(true);
    try {
      const res = await api.joinParty(id);
      setPost(prev => prev ? { ...prev, currentPlayers: res.currentPlayers, partyStatus: res.isFull ? 'closed' : 'open' } : prev);
    } catch (e: any) {
      alert(e.message ?? '참가에 실패했습니다.');
    } finally {
      setPartyLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    setPartyLoading(true);
    try {
      const res = await api.leaveParty(id);
      setPost(prev => prev ? { ...prev, currentPlayers: res.currentPlayers, partyStatus: 'open' } : prev);
    } catch (e: any) {
      alert(e.message ?? '탈퇴에 실패했습니다.');
    } finally {
      setPartyLoading(false);
    }
  };

  const handleComment = async () => {
    if (!id || !commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const c = await api.createBoardComment(id, commentText.trim());
      setComments(prev => [...prev, c]);
      setCommentText('');
    } catch (e: any) {
      alert(e.message ?? '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await api.deleteBoardComment(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, isDeleted: true, content: '삭제된 댓글입니다.' } : c));
    } catch {
      alert('댓글 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  const isParty  = post.category === 'party';
  const isMine   = me?.id === post.userId;
  const isJoined = me ? post.currentPlayers.includes(me.id) : false;
  const isFull   = post.partyStatus === 'closed';
  const gameTag  = getGameTag(post.gameType);

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
          <span className="text-sm font-bold text-gray-700">
            {isParty ? '🎮 파티 찾기' : '📋 통합 게시판'}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 게시글 본문 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {/* 파티 정보 */}
          {isParty && (
            <div className={`rounded-xl p-3 mb-3 border ${gameTag ? `${gameTag.bg} ${gameTag.border}` : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  {gameTag && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5
                                     ${gameTag.bg} ${gameTag.text} border ${gameTag.border}`}>
                      {gameTag.icon} {gameTag.label}
                    </span>
                  )}
                  <p className={`text-sm font-bold mt-0.5 ${gameTag ? gameTag.text : 'text-blue-800'}`}>
                    {post.currentPlayers.length}/{post.maxPlayers}명 참가 중
                    {isFull && <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">파티 완성</span>}
                  </p>
                </div>
                {isLoggedIn && !isMine && (
                  isJoined ? (
                    <button
                      onClick={handleLeave}
                      disabled={partyLoading}
                      className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl font-bold
                                 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      탈퇴
                    </button>
                  ) : (
                    <button
                      onClick={handleJoin}
                      disabled={partyLoading || isFull}
                      className="text-xs bg-primary text-white px-3 py-1.5 rounded-xl font-bold
                                 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isFull ? '인원 마감' : '참가하기'}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* 제목 */}
          <h1 className="text-base font-black text-gray-900 mb-2">{post.title}</h1>

          {/* 작성자 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {post.user.profileImage ? (
                <img src={post.user.profileImage} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">🎮</div>
              )}
              <span className="text-xs font-medium text-gray-600">{post.user.nickname}</span>
              <span className="text-xs text-gray-300">{timeAgo(post.createdAt)}</span>
            </div>
            {isMine && (
              <button onClick={handleDelete} className="text-xs text-red-400 font-medium">삭제</button>
            )}
          </div>

          <hr className="border-gray-100 mb-3" />

          {/* 본문 */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* 댓글 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">댓글 {comments.filter(c => !c.isDeleted).length}개</h2>

          <div className="space-y-3">
            {comments.length === 0 && (
              <p className="text-xs text-gray-300 text-center py-4">첫 댓글을 남겨보세요!</p>
            )}
            {comments.map(c => (
              <div key={c.id} className={`flex gap-2 ${c.isDeleted ? 'opacity-40' : ''}`}>
                {c.user?.profileImage ? (
                  <img src={c.user.profileImage} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] shrink-0 mt-0.5">🎮</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{c.user?.nickname}</span>
                    <span className="text-[10px] text-gray-300">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                    {!c.isDeleted && me?.id === c.userId && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-[10px] text-red-300 shrink-0"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 댓글 입력 — 하단 고정 */}
      {isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <textarea
            ref={commentRef}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={1}
            maxLength={500}
            className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleComment();
              }
            }}
          />
          <button
            onClick={handleComment}
            disabled={submitting || !commentText.trim()}
            className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl
                       active:scale-95 transition-transform disabled:opacity-50 shrink-0"
          >
            등록
          </button>
        </div>
      )}
    </div>
  );
}
