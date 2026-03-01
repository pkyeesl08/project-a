import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function BoardEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const me = useAuthStore(s => s.user);

  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!id) return;
    api.getBoardPost(id)
      .then(post => {
        // 본인 글만 수정 가능
        if (me?.id && post.userId !== me.id) {
          navigate(`/board/${id}`, { replace: true });
          return;
        }
        setTitle(post.title);
        setContent(post.content ?? '');
      })
      .catch(() => navigate('/board', { replace: true }))
      .finally(() => setLoading(false));
  }, [id, me, navigate]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!content.trim()) { setError('내용을 입력해주세요.'); return; }
    if (!id) return;

    setError('');
    setSubmitting(true);
    try {
      await api.updateBoardPost(id, { title: title.trim(), content: content.trim() });
      navigate(`/board/${id}`, { replace: true });
    } catch (e: any) {
      setError(e.message ?? '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl">←</button>
          <span className="text-sm font-bold text-gray-700">글 수정</span>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full
                       active:scale-95 transition-transform disabled:opacity-50"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
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
              rows={10}
              maxLength={2000}
              className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm resize-none
                         focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-[10px] text-gray-300 text-right mt-0.5">{content.length}/2000</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
