import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type Step = 'welcome' | 'games' | 'region' | 'done';

const GAME_PREVIEWS = [
  { icon: '⚡', name: '번개 반응', desc: '화면이 번쩍이면 즉시 탭!', color: 'from-yellow-500 to-orange-500' },
  { icon: '👆', name: '스피드 탭', desc: '5초 안에 최대한 빠르게', color: 'from-blue-500 to-cyan-500' },
  { icon: '🧠', name: '기억 플래시', desc: '패턴을 기억하고 재현', color: 'from-purple-500 to-pink-500' },
  { icon: '🎯', name: '과녁 저격', desc: '움직이는 타겟을 정확히', color: 'from-green-500 to-teal-500' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [verifying, setVerifying] = useState(false);
  const [regionResult, setRegionResult] = useState<{ regionName: string; district: string } | null>(null);
  const [regionError, setRegionError] = useState('');
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (stepTimerRef.current) clearTimeout(stepTimerRef.current); };
  }, []);

  const handleVerifyRegion = useCallback(async () => {
    setVerifying(true);
    setRegionError('');
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const result: any = await api.verifyRegion(
        position.coords.latitude,
        position.coords.longitude,
      );
      setRegionResult({ regionName: result.regionName, district: result.district });
      stepTimerRef.current = setTimeout(() => setStep('done'), 1200);
    } catch (err: any) {
      setRegionError(err.message || '위치 확인에 실패했습니다. 나중에 설정에서 변경할 수 있어요.');
    } finally {
      setVerifying(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex flex-col text-white overflow-hidden">

      {/* 진행 바 */}
      <div className="w-full h-1 bg-white/10">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: step === 'welcome' ? '25%' : step === 'games' ? '50%' : step === 'region' ? '75%' : '100%' }}
        />
      </div>

      {/* ── 환영 ── */}
      {step === 'welcome' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-slide-up">
          <div className="text-8xl mb-6">🎮</div>
          <h1 className="text-4xl font-black mb-3 text-center">동겜랭크</h1>
          <p className="text-white/60 text-center text-lg mb-2">
            동네 친구들과 미니게임으로<br />실력을 겨뤄보세요!
          </p>
          <div className="flex gap-3 mt-6 mb-10">
            {['⚡ 반응속도', '🧠 기억력', '🎯 정밀도'].map(tag => (
              <span key={tag} className="bg-white/10 rounded-full px-3 py-1 text-sm">{tag}</span>
            ))}
          </div>
          <div className="bg-white/5 rounded-2xl p-5 w-full max-w-sm mb-8 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏘️</span>
              <div>
                <p className="font-bold text-sm">동네 랭킹</p>
                <p className="text-white/40 text-xs">우리 동네 1등을 차지하세요</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚔️</span>
              <div>
                <p className="font-bold text-sm">실시간 대전</p>
                <p className="text-white/40 text-xs">주변 게이머와 즉시 매칭</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="font-bold text-sm">27가지 미니게임</p>
                <p className="text-white/40 text-xs">매일 새로운 도전</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep('games')}
            className="bg-accent w-full max-w-sm py-4 rounded-2xl text-xl font-black active:scale-95 transition-transform shadow-lg"
          >
            시작하기 →
          </button>
        </div>
      )}

      {/* ── 게임 소개 ── */}
      {step === 'games' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-slide-up">
          <p className="text-white/40 text-sm mb-2">어떤 게임이 있나요?</p>
          <h2 className="text-3xl font-black mb-6 text-center">27가지 순발력 게임</h2>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
            {GAME_PREVIEWS.map(g => (
              <div
                key={g.name}
                className={`bg-gradient-to-br ${g.color} rounded-2xl p-4 flex flex-col items-center text-center`}
              >
                <span className="text-4xl mb-2">{g.icon}</span>
                <p className="font-black text-sm">{g.name}</p>
                <p className="text-white/70 text-xs mt-1">{g.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-white/30 text-xs mb-6">⚡ 반응/스피드  🧠 퍼즐  🎮 액션  🎯 정밀  🌟 특수</p>
          <button
            onClick={() => setStep('region')}
            className="bg-accent w-full max-w-sm py-4 rounded-2xl text-xl font-black active:scale-95 transition-transform"
          >
            다음 →
          </button>
        </div>
      )}

      {/* ── 동네 인증 ── */}
      {step === 'region' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-slide-up">
          <div className="text-7xl mb-5">📍</div>
          <h2 className="text-3xl font-black mb-2 text-center">내 동네 등록</h2>
          <p className="text-white/50 text-center mb-6">
            동네 랭킹에 참여하려면<br />현재 위치를 인증해야 해요.
          </p>

          {regionResult ? (
            <div className="bg-green-500/20 border border-green-500/40 rounded-2xl p-5 w-full max-w-sm text-center mb-6">
              <p className="text-green-400 text-2xl mb-2">✅</p>
              <p className="font-black text-lg">{regionResult.district}</p>
              <p className="text-white/60 text-sm">{regionResult.regionName} 인증 완료!</p>
            </div>
          ) : (
            <>
              <div className="bg-white/5 rounded-2xl p-4 w-full max-w-sm mb-6 space-y-2">
                <p className="text-xs text-white/40 font-bold">인증 안내</p>
                <p className="text-xs text-white/60">• GPS로 현재 위치를 1회 확인합니다</p>
                <p className="text-xs text-white/60">• 동네 변경은 7일에 1번만 가능해요</p>
                <p className="text-xs text-white/60">• 위치 정보는 구(區) 단위로만 표시됩니다</p>
              </div>

              {regionError && (
                <p className="text-red-400 text-sm text-center mb-4">{regionError}</p>
              )}

              <button
                onClick={handleVerifyRegion}
                disabled={verifying}
                className="bg-accent w-full max-w-sm py-4 rounded-2xl text-lg font-black active:scale-95 transition-transform disabled:opacity-50 mb-3"
              >
                {verifying ? '위치 확인 중...' : '📍 내 동네 인증하기'}
              </button>
            </>
          )}

          <button
            onClick={() => setStep('done')}
            className="text-white/30 text-sm underline"
          >
            나중에 하기
          </button>
        </div>
      )}

      {/* ── 완료 ── */}
      {step === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-slide-up">
          <div className="text-8xl mb-6 animate-bounce">🚀</div>
          <h2 className="text-4xl font-black mb-3">준비 완료!</h2>
          <p className="text-white/50 text-center mb-8">
            {regionResult
              ? `${regionResult.district} 게이머로 등록됐어요!\n이제 동네 랭킹에 도전하세요.`
              : '설정을 마쳤어요!\n동네 인증은 프로필에서 언제든 할 수 있어요.'}
          </p>
          <div className="flex gap-3 mb-8">
            {['🎮 게임 시작', '🏆 랭킹 확인', '👥 친구 찾기'].map(item => (
              <span key={item} className="bg-white/10 rounded-full px-3 py-1.5 text-xs font-bold">{item}</span>
            ))}
          </div>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-accent w-full max-w-sm py-4 rounded-2xl text-xl font-black active:scale-95 transition-transform shadow-lg shadow-accent/30"
          >
            게임 시작하기 🎮
          </button>
        </div>
      )}
    </div>
  );
}
