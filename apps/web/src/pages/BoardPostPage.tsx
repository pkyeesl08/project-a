import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BoardPost, BoardComment } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type ExternalGame = { key: string; label: string; icon: string; bg: string; bgLight: string; text: string; border: string };

const EXTERNAL_GAMES: ExternalGame[] = [
  { key: 'lol',        label: '리그 오브 레전드', icon: '⚔️',  bg: 'bg-blue-500',   bgLight: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  { key: 'valorant',   label: '발로란트',          icon: '🔫',  bg: 'bg-red-500',    bgLight: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
  { key: 'overwatch',  label: '오버워치 2',        icon: '🛡️',  bg: 'bg-orange-500', bgLight: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { key: 'pubg',       label: '배틀그라운드',      icon: '🪂',  bg: 'bg-yellow-500', bgLight: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  { key: 'lost_ark',   label: '로스트아크',        icon: '⚓',  bg: 'bg-amber-500',  bgLight: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  { key: 'fc_online',  label: 'FC온라인',          icon: '⚽',  bg: 'bg-green-500',  bgLight: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  { key: 'maplestory', label: '메이플스토리',      icon: '🍁',  bg: 'bg-purple-500', bgLight: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { key: 'starcraft',  label: '스타크래프트',      icon: '🚀',  bg: 'bg-indigo-500', bgLight: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { key: 'minecraft',  label: '마인크래프트',      icon: '🧱',  bg: 'bg-emerald-500',bgLight: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200'},
  { key: 'diablo',     label: '디아블로',          icon: '💀',  bg: 'bg-rose-500',   bgLight: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200'   },
  { key: 'other',      label: '기타',              icon: '🎮',  bg: 'bg-gray-500',   bgLight: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200'   },
];

const GAME_MAP = new Map(EXTERNAL_GAMES.map(g => [g.key, g]));

function getGameTag(gameType: string | null | undefined): ExternalGame | null {
  if (!gameType) return null;
  return GAME_MAP.get(gameType) ?? {
    key: gameType, label: gameType, icon: '🎮',
    bg: 'bg-gray-500', bgLight: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200',
  };
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
  const [likeLoading, setLikeLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
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

  const handleLike = async () => {
    if (!id || likeLoading) return;
    const alreadyLiked = me ? (post?.likes ?? []).includes(me.id) : false;
    setLikeLoading(true);
    try {
      if (alreadyLiked) {
        const res = await api.unlikePost(id);
        setPost(prev => prev ? { ...prev, likes: (prev.likes ?? []).filter(uid => uid !== me?.id) } : prev);
      } else {
        await api.likePost(id);
        setPost(prev => prev && me ? { ...prev, likes: [...(prev.likes ?? []), me.id] } : prev);
      }
    } catch { /* 무시 */ }
    finally { setLikeLoading(false); }
  };

  const handleReport = async () => {
    if (!id || !reportReason.trim() || reporting) return;
    setReporting(true);
    try {
      await api.reportBoardPost(id, reportReason.trim());
      setShowReport(false);
      setReportReason('');
      alert('신고가 접수되었습니다.');
    } catch (e: any) {
      alert(e.message ?? '신고에 실패했습니다.');
    } finally {
      setReporting(false);
    }
  };

  const startEditComment = (c: BoardComment) => {
    setEditingCommentId(c.id);
    setEditCommentText(c.content);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await api.updateBoardComment(commentId, editCommentText.trim());
      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, content: editCommentText.trim(), isEdited: true } : c,
      ));
      setEditingCommentId(null);
    } catch (e: any) {
      alert(e.message ?? '수정에 실패했습니다.');
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

  const isParty    = post.category === 'party';
  const isMine     = me?.id === post.userId;
  const isJoined   = me ? post.currentPlayers.includes(me.id) : false;
  const isFull     = post.partyStatus === 'closed';
  const gameTag    = getGameTag(post.gameType);
  const liked      = me ? (post.likes ?? []).includes(me.id) : false;
  const likesCount = (post.likes ?? []).length;

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
            <div className={`rounded-xl p-3 mb-3 border ${gameTag ? `${gameTag.bgLight} ${gameTag.border}` : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  {gameTag && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mb-1.5
                                     ${gameTag.bgLight} ${gameTag.text} border ${gameTag.border}`}>
                      {gameTag.icon} {gameTag.label}
                    </span>
                  )}
                  <p className={`text-sm font-bold mt-0.5 ${gameTag ? gameTag.text : 'text-gray-700'}`}>
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
            <div className="flex items-center gap-2">
              {isMine ? (
                <>
                  <button
                    onClick={() => navigate(`/board/${id}/edit`)}
                    className="text-xs text-primary font-medium"
                  >수정</button>
                  <button onClick={handleDelete} className="text-xs text-red-400 font-medium">삭제</button>
                </>
              ) : isLoggedIn && (
                <button
                  onClick={() => setShowReport(true)}
                  className="text-xs text-gray-300 font-medium"
                >신고</button>
              )}
            </div>
          </div>

          <hr className="border-gray-100 mb-3" />

          {/* 본문 */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {/* 좋아요 */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={handleLike}
              disabled={!isLoggedIn || likeLoading}
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl
                          transition-all active:scale-95 disabled:opacity-40 ${
                liked
                  ? 'bg-red-50 text-red-500'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span>{liked ? '❤️' : '🤍'}</span>
              <span>{likesCount > 0 ? likesCount : '좋아요'}</span>
            </button>
          </div>
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
                    {c.isEdited && <span className="text-[9px] text-gray-300">(수정됨)</span>}
                  </div>
                  {editingCommentId === c.id ? (
                    /* 수정 모드 */
                    <div className="space-y-1.5">
                      <textarea
                        value={editCommentText}
                        onChange={e => setEditCommentText(e.target.value)}
                        maxLength={500}
                        rows={2}
                        className="w-full bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs resize-none
                                   focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEditComment(c.id)}
                          className="text-[10px] bg-primary text-white px-2.5 py-1 rounded-lg font-bold"
                        >저장</button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="text-[10px] text-gray-400 px-2 py-1"
                        >취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                      {!c.isDeleted && me?.id === c.userId && (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => startEditComment(c)}
                            className="text-[10px] text-primary"
                          >수정</button>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-[10px] text-red-300"
                          >삭제</button>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* 신고 모달 */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={() => setShowReport(false)}
        >
          <div
            className="bg-white rounded-t-3xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-gray-900 mb-1">게시글 신고</h3>
            <p className="text-xs text-gray-400 mb-4">허위·도배·욕설·음란물 등 신고 사유를 입력해주세요.</p>
            <textarea
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder="신고 사유를 입력하세요..."
              maxLength={200}
              rows={3}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-red-300 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReport(false); setReportReason(''); }}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm"
              >취소</button>
              <button
                onClick={handleReport}
                disabled={reporting || !reportReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm
                           active:scale-95 transition-transform disabled:opacity-50"
              >
                {reporting ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
