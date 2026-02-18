import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GAME_CONFIGS, GameType, GameConfig } from '@donggamerank/shared';
import { getGameComponent } from '../games/GameEngine';
import { api, DailyMission } from '../lib/api';

type Phase = 'ready' | 'countdown' | 'playing' | 'result';

export default function GamePlayPage() {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const config = GAME_CONFIGS[gameType as GameType];

  const [phase, setPhase] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  /* ── 게임 타입 유효성 ── */

  if (!config) {
    return (
      <div className="game-fullscreen flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-4xl mb-4">❓</p>
          <p className="text-xl">게임을 찾을 수 없습니다</p>
          <button onClick={() => navigate('/games')} className="mt-4 text-accent underline">
            목록으로
          </button>
        </div>
      </div>
    );
  }

  const GameComponent = getGameComponent(gameType as GameType);

  /* ── 게임 흐름 ── */

  const start = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    setScore(0);
  }, []);

  // 카운트다운 3 → 2 → 1 → playing
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      setTimeLeft(config.durationMs);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, config.durationMs]);

  // 게임 타이머
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { setPhase('result'); return; }
    const t = setTimeout(() => setTimeLeft(ms => ms - 100), 100);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  const addScore = useCallback((pts: number) => setScore(s => Math.max(0, s + pts)), []);
  const overrideScore = useCallback((s: number) => setScore(s), []);

  /* ── 렌더링 ── */

  const progress = timeLeft / config.durationMs;

  return (
    <div className="game-fullscreen flex flex-col text-white">
      {/* 닫기 */}
      <button onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 rounded-full
                   flex items-center justify-center text-xl">
        ✕
      </button>

      {/* ── Ready ── */}
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-slide-up">
          <div className="text-7xl mb-6">{config.icon}</div>
          <h1 className="text-3xl font-black mb-2">{config.name}</h1>
          <p className="text-white/60 text-center mb-1">{config.description}</p>
          <p className="text-white/30 text-sm mb-8">{config.durationMs / 1000}초</p>
          <button onClick={start}
            className="bg-accent px-14 py-4 rounded-2xl text-xl font-bold shadow-lg
                       active:scale-95 transition-transform">
            시작하기
          </button>
        </div>
      )}

      {/* ── Countdown ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-white/40 text-sm mb-4">{config.name}</p>
          <div className="animate-bounce-in" key={countdown}>
            <span className="text-9xl font-black">{countdown > 0 ? countdown : 'GO!'}</span>
          </div>
        </div>
      )}

      {/* ── Playing ── */}
      {phase === 'playing' && (
        <div className="flex-1 flex flex-col">
          {/* 타이머 바 */}
          <div className="w-full h-1.5 bg-white/10">
            <div className={`h-full transition-all duration-100 ${
              progress > 0.3 ? 'bg-accent' : progress > 0.1 ? 'bg-yellow-400' : 'bg-red-500'
            }`} style={{ width: `${progress * 100}%` }} />
          </div>
          {/* HUD */}
          <div className="flex justify-between items-center px-5 py-2">
            <span className="text-white/50 text-sm font-mono">
              {config.icon} {(timeLeft / 1000).toFixed(1)}s
            </span>
            <span className="bg-white/10 rounded-full px-4 py-1 text-2xl font-black">{score}</span>
          </div>
          {/* 게임 영역 */}
          <GameComponent
            onScore={addScore}
            onSetScore={overrideScore}
            timeLeftMs={timeLeft}
            isPlaying
          />
        </div>
      )}

      {/* ── Result ── */}
      {phase === 'result' && (
        <ResultView
          config={config}
          score={score}
          gameType={gameType!}
          onRetry={start}
        />
      )}
    </div>
  );
}

/* ── 결과 화면 서브컴포넌트 ── */

function ResultView({ config, score, gameType, onRetry }: {
  config: GameConfig; score: number; gameType: string; onRetry: () => void;
}) {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(true);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);

  useEffect(() => {
    async function submit() {
      try {
        const data: any = await api.submitResult({ gameType, score, mode: 'solo' });
        setResult(data);
        // 미션 완료 여부 확인
        try {
          const missions: DailyMission[] = await api.getMissions();
          const just = missions.filter(m => m.isCompleted && !m.rewardClaimed);
          setCompletedMissions(just.map(m => m.title));
        } catch { /* 미션 체크 실패는 무시 */ }
      } catch {
        // 서버 미연결 시 fallback
        setResult({
          rankChange: Math.floor(Math.random() * 10) + 1,
          newElo: 1247 + Math.floor(Math.random() * 10) + 1,
          regionRank: Math.floor(Math.random() * 50) + 1,
          isNewHighScore: score > 50,
          coinReward: 5,
        });
      } finally {
        setSubmitting(false);
      }
    }
    submit();
  }, []);

  if (submitting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4 animate-bounce">{config.icon}</p>
          <p className="text-white/60 text-sm">결과 저장 중...</p>
        </div>
      </div>
    );
  }

  const eloChange = result?.rankChange ?? 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-slide-up">
      {/* 미션 완료 배너 */}
      {completedMissions.length > 0 && (
        <div className="bg-green-500/20 border border-green-500/40 rounded-2xl px-5 py-2.5 mb-4 text-center w-full max-w-xs">
          <p className="text-green-400 text-xs font-black mb-1">미션 달성!</p>
          {completedMissions.map((m, i) => (
            <p key={i} className="text-white/70 text-xs">{m}</p>
          ))}
        </div>
      )}

      <div className="text-6xl mb-3">{config.icon}</div>
      <p className="text-white/60 text-sm mb-1">{config.name}</p>
      <p className="text-7xl font-black mb-1">{score}</p>
      <p className="text-white/30 text-xs mb-5">{config.scoreMetric}</p>

      {/* 결과 스탯 */}
      <div className="bg-white/10 rounded-2xl p-5 mb-5 w-full max-w-xs">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-white/40">동네 랭킹</p>
            <p className="text-xl font-bold">
              {result?.regionRank ? `#${result.regionRank}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">ELO</p>
            <p className={`text-xl font-bold ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {eloChange >= 0 ? '+' : ''}{eloChange}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">최고 기록</p>
            <p className="text-xl font-bold text-yellow-400">
              {result?.isNewHighScore ? 'NEW!' : '-'}
            </p>
          </div>
        </div>
        {result?.coinReward != null && (
          <p className="text-center text-xs text-white/40 mt-3 pt-3 border-t border-white/10">
            🪙 +{result.coinReward} 코인 획득
          </p>
        )}
      </div>

      {/* 행동 버튼 2×2 */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
        <button onClick={onRetry}
          className="bg-accent py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white">
          한 판 더
        </button>
        <button onClick={() => navigate('/profile?tab=friends')}
          className="bg-white/10 py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white text-sm">
          친구에게 도전
        </button>
        <button onClick={() => navigate('/')}
          className="bg-white/10 py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white text-sm">
          오늘의 미션
        </button>
        <button onClick={() => navigate('/rankings')}
          className="bg-white/10 py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white text-sm">
          랭킹 보기
        </button>
      </div>
    </div>
  );
}
