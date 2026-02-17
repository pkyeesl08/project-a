import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]+$/;

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerToken, completeRegister } = useAuthStore();

  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [message, setMessage] = useState('');
  const [checked, setChecked] = useState(false);   // 중복검사 버튼 눌렀는지
  const [submitting, setSubmitting] = useState(false);

  // registerToken 없으면 홈으로
  useEffect(() => {
    if (!registerToken) navigate('/', { replace: true });
  }, [registerToken, navigate]);

  /* ── 로컬 유효성 검사 ── */
  const localValidate = useCallback((value: string): { ok: boolean; msg: string } => {
    if (value.length === 0) return { ok: false, msg: '' };
    if (value.length < 2) return { ok: false, msg: '2자 이상 입력해주세요.' };
    if (value.length > 12) return { ok: false, msg: '12자 이하로 입력해주세요.' };
    if (!NICKNAME_REGEX.test(value)) return { ok: false, msg: '한글, 영문, 숫자, 밑줄(_)만 가능합니다.' };
    return { ok: true, msg: '' };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNickname(v);
    setChecked(false); // 수정하면 중복검사 초기화
    const { ok, msg } = localValidate(v);
    if (!ok) {
      setStatus(msg ? 'invalid' : 'idle');
      setMessage(msg);
    } else {
      setStatus('idle');
      setMessage('중복검사를 해주세요.');
    }
  };

  /* ── 중복검사 버튼 ── */
  const handleCheck = async () => {
    const { ok, msg } = localValidate(nickname);
    if (!ok) {
      setStatus('invalid');
      setMessage(msg);
      return;
    }

    setStatus('checking');
    setMessage('확인 중...');

    try {
      const result = await api.checkNickname(nickname);
      if (result.available) {
        setStatus('available');
        setMessage('사용 가능한 닉네임입니다!');
        setChecked(true);
      } else {
        setStatus('taken');
        setMessage(result.reason || '이미 사용 중인 닉네임입니다.');
        setChecked(false);
      }
    } catch {
      // 서버 미연결 시 로컬 검증만 통과
      setStatus('available');
      setMessage('사용 가능해 보입니다. (서버 미확인)');
      setChecked(true);
    }
  };

  /* ── 가입 완료 ── */
  const handleSubmit = async () => {
    if (!checked || status !== 'available' || submitting || !registerToken) return;

    setSubmitting(true);
    try {
      const result = await api.register(registerToken, nickname);
      api.setToken(result.accessToken);
      completeRegister(
        {
          id: result.user.id,
          nickname: result.user.nickname,
          email: '',
          profileImage: null,
          eloRating: 1000,
          regionName: '',
          schoolName: null,
          isPublic: false,
        },
        result.accessToken,
      );
      navigate('/', { replace: true });
    } catch (err: any) {
      setStatus('taken');
      setMessage(err.message || '가입에 실패했습니다.');
      setChecked(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = checked && status === 'available' && !submitting;
  const { ok: localOk } = localValidate(nickname);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center px-6 text-white">

      {/* 로고 */}
      <div className="text-center mb-10">
        <p className="text-5xl mb-3">🎮</p>
        <h1 className="text-3xl font-black">동겜랭크</h1>
        <p className="text-white/50 text-sm mt-1">닉네임을 설정하고 시작하세요!</p>
      </div>

      {/* 닉네임 입력 카드 */}
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-sm rounded-2xl p-6">

        <label className="text-sm font-bold text-white/70 mb-2 block">닉네임</label>

        {/* 입력 + 중복검사 버튼 */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={nickname}
              onChange={handleChange}
              maxLength={12}
              autoFocus
              placeholder="닉네임 입력"
              className="w-full bg-white/10 border-2 rounded-xl px-4 py-3 text-lg font-bold
                         placeholder-white/30 focus:outline-none transition-colors"
              style={{
                borderColor:
                  status === 'available' && checked ? '#22C55E'
                  : status === 'taken' || status === 'invalid' ? '#EF4444'
                  : 'rgba(255,255,255,0.2)',
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
              {nickname.length}/12
            </span>
          </div>

          <button
            onClick={handleCheck}
            disabled={!localOk || status === 'checking'}
            className={`px-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${
              localOk && status !== 'checking'
                ? 'bg-accent text-white'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {status === 'checking' ? '확인중...' : '중복검사'}
          </button>
        </div>

        {/* 상태 메시지 */}
        <p className={`text-sm mt-2 h-5 ${
          status === 'available' && checked ? 'text-green-400'
          : status === 'taken' || status === 'invalid' ? 'text-red-400'
          : 'text-white/40'
        }`}>
          {status === 'available' && checked ? '✅ ' : ''}
          {status === 'taken' ? '❌ ' : ''}
          {status === 'invalid' ? '⚠️ ' : ''}
          {message}
        </p>

        {/* 규칙 */}
        <div className="bg-white/5 rounded-xl p-3 mt-3 space-y-1.5">
          <p className="text-xs text-white/50 font-bold">닉네임 규칙</p>
          <Rule ok={nickname.length >= 2 && nickname.length <= 12} text="2~12자" />
          <Rule ok={nickname.length === 0 || NICKNAME_REGEX.test(nickname)} text="한글, 영문, 숫자, 밑줄(_)만 가능" />
          <Rule ok={checked && status === 'available'} text="중복검사 통과" />
        </div>

        {/* 가입 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full mt-5 py-3.5 rounded-xl font-black text-lg transition-all ${
            canSubmit
              ? 'bg-accent text-white active:scale-95 shadow-lg shadow-accent/30'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          {submitting ? '가입 중...' : '시작하기 🚀'}
        </button>
      </div>

      {/* 하단 안내 */}
      <p className="text-white/30 text-xs mt-6">
        가입하면 <span className="underline">이용약관</span>과 <span className="underline">개인정보처리방침</span>에 동의하게 됩니다.
      </p>
    </div>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`text-xs flex items-center gap-1.5 ${ok ? 'text-green-400' : 'text-white/30'}`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
        ok ? 'bg-green-400/20' : 'bg-white/5'
      }`}>
        {ok ? '✓' : '○'}
      </span>
      {text}
    </p>
  );
}
