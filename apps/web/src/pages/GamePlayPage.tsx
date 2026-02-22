import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { GAME_CONFIGS, GameType, GameConfig } from '@donggamerank/shared';
import { getGameComponent } from '../games/GameEngine';
import { api, DailyMission } from '../lib/api';
import GameTutorialOverlay from '../components/GameTutorialOverlay';

const TUTORIAL_KEY = (gt: string) => `tutorial_seen_${gt}`;

type Phase = 'ready' | 'countdown' | 'playing' | 'result';

export interface ChallengeTarget {
  userId: string;
  nickname: string;
  score: number;
  scoreTimeline: [number, number][]; // [elapsedMs, score]
}

/** 타임라인에서 경과 시간에 해당하는 ghost 점수 보간 */
function getGhostScore(timeline: [number, number][], elapsedMs: number): number {
  if (!timeline.length) return 0;
  let result = 0;
  for (const [t, s] of timeline) {
    if (t <= elapsedMs) result = s;
    else break;
  }
  return result;
}

export default function GamePlayPage() {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const gameMode = searchParams.get('mode') ?? 'solo';
  const config = GAME_CONFIGS[gameType as GameType];

  const [phase, setPhase] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() =>
    !localStorage.getItem(TUTORIAL_KEY(gameType ?? '')),
  );

  const handleTutorialDone = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY(gameType ?? ''), '1');
    setShowTutorial(false);
  }, [gameType]);

  // 도전 모드
  const locationState = location.state as { challengeTarget?: ChallengeTarget; challengeToken?: string } | null;
  const [challengeTarget, setChallengeTarget] = useState<ChallengeTarget | null>(
    locationState?.challengeTarget ?? null,
  );
  const challengeToken = locationState?.challengeToken ?? null;
  const [ghostScore, setGhostScore] = useState(0);

  // scoreTimeline 기록용
  const scoreTimelineRef = useRef<[number, number][]>([]);
  const gameStartTimeRef = useRef(0);

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
    scoreTimelineRef.current = [[0, 0]];
    gameStartTimeRef.current = 0;
  }, []);

  // 카운트다운 3 → 2 → 1 → playing
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      setTimeLeft(config.durationMs);
      gameStartTimeRef.current = Date.now();
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

  // ghost 점수 갱신 (100ms마다 경과 시간에 맞는 타겟 점수 계산)
  useEffect(() => {
    if (phase !== 'playing' || !challengeTarget || !challengeTarget.scoreTimeline.length) return;
    const elapsed = config.durationMs - timeLeft;
    setGhostScore(getGhostScore(challengeTarget.scoreTimeline, elapsed));
  }, [timeLeft, phase, challengeTarget, config.durationMs]);

  const addScore = useCallback((pts: number) => {
    setScore(s => {
      const next = Math.max(0, s + pts);
      if (gameStartTimeRef.current) {
        const elapsed = Date.now() - gameStartTimeRef.current;
        scoreTimelineRef.current.push([elapsed, next]);
      }
      return next;
    });
  }, []);

  const overrideScore = useCallback((next: number) => {
    if (gameStartTimeRef.current) {
      const elapsed = Date.now() - gameStartTimeRef.current;
      scoreTimelineRef.current.push([elapsed, next]);
    }
    setScore(next);
  }, []);

  /* ── 렌더링 ── */

  const progress = timeLeft / config.durationMs;
  const delta = score - ghostScore;

  return (
    <div className="game-fullscreen flex flex-col text-white">
      {/* 닫기 */}
      <button onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 rounded-full
                   flex items-center justify-center text-xl">
        ✕
      </button>

      {/* ── Tutorial (첫 플레이 시) ── */}
      {phase === 'ready' && showTutorial && (
        <GameTutorialOverlay config={config} onStart={handleTutorialDone} />
      )}

      {/* ── Ready ── */}
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 animate-slide-up">
          {/* 도전 배너 */}
          {challengeTarget && (
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl px-5 py-2.5 mb-5 text-center w-full max-w-xs">
              <p className="text-yellow-300 text-xs font-black mb-0.5">도전 모드</p>
              <p className="text-white/80 text-sm">
                <span className="font-bold text-yellow-300">{challengeTarget.nickname}</span>의{' '}
                기록 <span className="font-bold">{challengeTarget.score}</span>점을 넘어라!
              </p>
            </div>
          )}
          <div className="text-7xl mb-6">{config.icon}</div>
          <h1 className="text-3xl font-black mb-2">{config.name}</h1>
          <p className="text-white/60 text-center mb-1">{config.description}</p>
          <p className="text-white/30 text-sm mb-8">{config.durationMs / 1000}초</p>
          <button onClick={start}
            className="bg-accent px-14 py-4 rounded-2xl text-xl font-bold shadow-lg
                       active:scale-95 transition-transform">
            {challengeTarget ? '⚔️ 도전 시작' : '시작하기'}
          </button>
        </div>
      )}

      {/* ── Countdown ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-white/40 text-sm mb-4">{config.name}</p>
          {challengeTarget && (
            <p className="text-yellow-300/70 text-xs mb-2">
              vs {challengeTarget.nickname} ({challengeTarget.score}점)
            </p>
          )}
          <div className="animate-bounce-in" key={countdown}>
            <span className="text-9xl font-black">{countdown > 0 ? countdown : 'GO!'}</span>
          </div>
        </div>
      )}

      {/* ── Playing ── */}
      {phase === 'playing' && (
        <div className="flex-1 flex flex-col relative">
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

          {/* 고스트 비교 오버레이 */}
          {challengeTarget && challengeTarget.scoreTimeline.length > 0 && (
            <div className="flex justify-center px-4 mb-1">
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg transition-all ${
                delta >= 0
                  ? 'bg-green-500/90 text-white'
                  : 'bg-red-500/90 text-white'
              }`}>
                {delta >= 0
                  ? `${challengeTarget.nickname}보다 +${delta} 앞서는 중!`
                  : `${challengeTarget.nickname}보다 ${Math.abs(delta)} 뒤처지는 중`}
              </div>
            </div>
          )}

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
          gameMode={gameMode}
          scoreTimeline={scoreTimelineRef.current}
          challengeTarget={challengeTarget}
          challengeToken={challengeToken}
          onRetry={start}
        />
      )}
    </div>
  );
}

/* ── 결과 화면 서브컴포넌트 ── */

function ResultView({ config, score, gameType, gameMode, scoreTimeline, challengeTarget, challengeToken, onRetry }: {
  config: GameConfig;
  score: number;
  gameType: string;
  gameMode: string;
  scoreTimeline: [number, number][];
  challengeTarget: ChallengeTarget | null;
  challengeToken: string | null;
  onRetry: () => void;
}) {
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(true);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [dailyRank, setDailyRank] = useState<{ rank: number; total: number; score: number } | null>(null);
  const [nextChallenge, setNextChallenge] = useState<ChallengeTarget | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const submittedRef = useRef(false);

  // 도전 결과
  const beatChallenge = challengeTarget !== null && score > challengeTarget.score;

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    async function submit() {
      try {
        const metadata: Record<string, unknown> = gameMode === 'daily' ? { subMode: 'daily' } : {};
        if (challengeToken) metadata.challengeToken = challengeToken;
        const data: any = await api.submitResult({
          gameType,
          score,
          mode: 'solo',
          metadata,
          scoreTimeline,
        });
        setResult(data);

        // 게임 완료 후 현재 동네 배틀에 자동 기여 (백그라운드)
        api.getCurrentBattle()
          .then(b => b?.id && api.contributeToCurrentBattle(b.id, score))
          .catch(() => {});

        // daily 모드: 내 오늘 순위 조회
        if (gameMode === 'daily') {
          api.getMyDailyRank().then(setDailyRank).catch(() => {});
        }

        // 다음 도전 타겟 — 동네 1위 자동 조회 (도전 모드가 아닐 때도 CTA 표시)
        api.getChallengeTarget(gameType).then(t => {
          if (t) setNextChallenge(t);
        }).catch(() => {});

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

  /* ── Canvas 공유 카드 생성 ── */
  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSharing(true);
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = 480, H = 270;
      canvas.width = W;
      canvas.height = H;

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#1a1a2e');
      bg.addColorStop(1, '#16213e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
      accentGrad.addColorStop(0, '#7c3aed');
      accentGrad.addColorStop(1, '#4f46e5');
      ctx.fillStyle = accentGrad;
      ctx.fillRect(0, 0, W, 4);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('🎮 동겜랭크', 24, 30);

      ctx.font = '40px sans-serif';
      ctx.fillText(config.icon, 24, 90);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(config.name, 80, 72);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px sans-serif';
      ctx.fillText(config.description, 80, 92);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px sans-serif';
      const scoreStr = String(score);
      const scoreW = ctx.measureText(scoreStr).width;
      ctx.fillText(scoreStr, W / 2 - scoreW / 2, 175);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '12px sans-serif';
      ctx.fillText(config.scoreMetric, W / 2 - ctx.measureText(config.scoreMetric).width / 2, 195);

      const stats = [
        { label: '동네 랭킹', value: result?.regionRank ? `#${result.regionRank}` : '-' },
        { label: 'ELO', value: `${eloChange >= 0 ? '+' : ''}${eloChange}`, color: eloChange >= 0 ? '#4ade80' : '#f87171' },
        { label: '최고 기록', value: result?.isNewHighScore ? 'NEW!' : '-', color: result?.isNewHighScore ? '#fbbf24' : undefined },
      ];
      stats.forEach((s, i) => {
        const x = 24 + i * 145;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.roundRect(x, 215, 130, 44, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px sans-serif';
        ctx.fillText(s.label, x + 8, 232);
        ctx.fillStyle = s.color ?? '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(s.value, x + 8, 250);
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `동겜랭크_${config.name}_${score}.png`, { type: 'image/png' });
        const shareText = `🎮 동겜랭크 | ${config.icon} ${config.name}\n점수: ${score} ${config.scoreMetric}${result?.regionRank ? `\n동네 랭킹 #${result.regionRank}` : ''}\n`;
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: '동겜랭크 결과 공유', text: shareText, files: [file] });
        } else if (navigator.share) {
          await navigator.share({ title: '동겜랭크 결과 공유', text: shareText });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } finally {
      setSharing(false);
    }
  }, [config, score, result, eloChange]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-slide-up overflow-y-auto py-6">
      {/* 도전 결과 배너 */}
      {challengeTarget && (
        <div className={`rounded-2xl px-5 py-3 mb-4 text-center w-full max-w-xs border ${
          beatChallenge
            ? 'bg-green-500/20 border-green-500/40'
            : 'bg-red-500/20 border-red-500/40'
        }`}>
          <p className={`text-sm font-black mb-0.5 ${beatChallenge ? 'text-green-400' : 'text-red-400'}`}>
            {beatChallenge ? '🎉 도전 성공!' : '😤 도전 실패'}
          </p>
          <p className="text-white/70 text-xs">
            {challengeTarget.nickname} ({challengeTarget.score}점) vs 나 ({score}점)
            {' '}
            <span className={`font-bold ${beatChallenge ? 'text-green-300' : 'text-red-300'}`}>
              {beatChallenge ? `+${score - challengeTarget.score}` : `${score - challengeTarget.score}`}
            </span>
          </p>
        </div>
      )}

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
      <div className="bg-white/10 rounded-2xl p-5 mb-4 w-full max-w-xs">
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

      {/* daily 모드: 오늘의 순위 패널 */}
      {gameMode === 'daily' && dailyRank && (
        <div className="bg-white/10 rounded-2xl p-4 mb-4 w-full max-w-xs text-center">
          <p className="text-white/40 text-xs mb-2">⭐ 오늘의 게임 내 순위</p>
          <p className="text-3xl font-black text-accent">#{dailyRank.rank}</p>
          <p className="text-white/30 text-xs mt-1">전체 {dailyRank.total}명 중</p>
        </div>
      )}

      {/* 도전하기 CTA — 동네 1위 or 방금 이긴 상대의 다음 타겟 */}
      {nextChallenge && nextChallenge.userId !== challengeTarget?.userId && (
        <button
          onClick={() => navigate(`/play/${gameType}`, { state: { challengeTarget: nextChallenge } })}
          className="w-full max-w-xs bg-yellow-500/90 py-3.5 rounded-xl font-bold mb-3
                     active:scale-95 transition-transform text-gray-900 text-sm flex items-center justify-center gap-2">
          <span>⚔️</span>
          <span>
            {nextChallenge.nickname} ({nextChallenge.score}점) 도전하기
          </span>
        </button>
      )}

      {/* 챌린지 링크 (스트리머 공유용) */}
      {!linkToken ? (
        <button
          onClick={async () => {
            try {
              const res = await api.createChallengeLink(gameType);
              if (res?.token) setLinkToken(res.token);
            } catch { /* 실패 무시 */ }
          }}
          className="w-full max-w-xs bg-purple-600/80 py-3 rounded-xl font-bold mb-3
                     active:scale-95 transition-transform text-white text-sm flex items-center justify-center gap-2">
          🔗 내 기록 챌린지 링크 만들기
        </button>
      ) : (
        <button
          onClick={async () => {
            const url = `${window.location.origin}/challenge/${linkToken}`;
            try { await navigator.clipboard.writeText(url); } catch { /* 무시 */ }
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
          className="w-full max-w-xs bg-purple-600/80 py-3 rounded-xl font-bold mb-3
                     active:scale-95 transition-transform text-white text-sm flex items-center justify-center gap-2">
          {linkCopied ? '✅ 링크 복사됨!' : '🔗 링크 복사하기'}
        </button>
      )}

      {/* 행동 버튼 2×2 */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
        {gameMode === 'daily' ? (
          <button
            disabled
            className="bg-white/10 py-3.5 rounded-xl font-bold text-white/30 text-sm"
          >
            오늘 1회 완료 ✓
          </button>
        ) : (
          <button onClick={onRetry}
            className="bg-accent py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white">
            한 판 더
          </button>
        )}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="bg-indigo-500/80 py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white text-sm disabled:opacity-50">
          {sharing ? '생성 중...' : '📤 공유하기'}
        </button>
        <button onClick={() => navigate('/')}
          className="bg-white/10 py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white text-sm">
          {gameMode === 'daily' ? '홈으로' : '오늘의 미션'}
        </button>
        <button onClick={() => navigate('/rankings')}
          className="bg-white/10 py-3.5 rounded-xl font-bold active:scale-95 transition-transform text-white text-sm">
          랭킹 보기
        </button>
      </div>
      {/* 공유 카드 Canvas (숨김 — 이미지 생성용) */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
