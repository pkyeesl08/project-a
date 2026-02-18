import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { getGameComponent } from '../games/GameEngine';
import { api } from '../lib/api';

// ── 상수 ──────────────────────────────────────────

const LIVES_MAX = 3;
const ROUND_BASE_MS = 4000;    // 1라운드 제한시간
const ROUND_DECAY_MS = 200;    // 라운드마다 200ms 감소
const ROUND_MIN_MS = 1500;     // 최솟값
const PASS_THRESHOLD = 1;      // 이 이상 득점해야 클리어 (0점 = 실패)
const COUNTDOWN_SEC = 3;
const TRANSITION_MS = 1200;    // 라운드 결과 표시 시간

// Endless에 사용할 게임 목록 (빠른 반응 위주 + 전 카테고리 균형)
const ENDLESS_POOL: GameType[] = [
  GameType.SPEED_TAP,
  GameType.LIGHTNING_REACTION,
  GameType.BALLOON_POP,
  GameType.WHACK_A_MOLE,
  GameType.TIMING_HIT,
  GameType.COLOR_MATCH,
  GameType.BIGGER_NUMBER,
  GameType.ODD_EVEN,
  GameType.DIRECTION_SWIPE,
  GameType.RPS_SPEED,
  GameType.REVERSE_REACTION,
  GameType.STOP_THE_BAR,
  GameType.DARK_ROOM_TAP,
  GameType.TARGET_SNIPER,
  GameType.MATH_SPEED,
  GameType.EMOJI_SORT,
  GameType.COUNT_MORE,
];

function pickRandom(pool: GameType[], exclude?: GameType): GameType {
  const filtered = pool.filter(t => t !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function roundDuration(round: number): number {
  return Math.max(ROUND_MIN_MS, ROUND_BASE_MS - round * ROUND_DECAY_MS);
}

// ── 타입 ──────────────────────────────────────────

type Phase = 'idle' | 'countdown' | 'playing' | 'transition' | 'gameover';

// ── 컴포넌트 ──────────────────────────────────────

export default function EndlessModePage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);          // 클리어한 라운드 수
  const [lives, setLives] = useState(LIVES_MAX);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentGame, setCurrentGame] = useState<GameType>(ENDLESS_POOL[0]);
  const [roundPassed, setRoundPassed] = useState<boolean | null>(null); // transition에서 표시
  const [submitting, setSubmitting] = useState(false);

  // 라운드 중 점수 추적 (ref: 비동기 타이머와 동기화)
  const scoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);

  // ── 라운드 시작 ──────────────────────────────────

  const startRound = useCallback((nextRound: number, prevGame?: GameType) => {
    const game = pickRandom(ENDLESS_POOL, prevGame);
    setCurrentGame(game);
    scoreRef.current = 0;
    setDisplayScore(0);
    setCountdown(COUNTDOWN_SEC);
    setTimeLeft(roundDuration(nextRound));
    setPhase('countdown');
  }, []);

  const handleStart = useCallback(() => {
    setRound(0);
    setLives(LIVES_MAX);
    startRound(0);
  }, [startRound]);

  // ── 카운트다운 ───────────────────────────────────

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ── 게임 타이머 ──────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      endRound();
      return;
    }
    const t = setTimeout(() => setTimeLeft(ms => ms - 100), 100);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // ── 라운드 종료 ──────────────────────────────────

  const endRound = useCallback(() => {
    const passed = scoreRef.current >= PASS_THRESHOLD;
    setRoundPassed(passed);
    setPhase('transition');

    let nextLives = lives;
    let nextRound = round;

    if (passed) {
      nextRound = round + 1;
      setRound(nextRound);
    } else {
      nextLives = lives - 1;
      setLives(nextLives);
    }

    if (nextLives <= 0) {
      setTimeout(() => setPhase('gameover'), TRANSITION_MS);
    } else {
      setTimeout(() => startRound(nextRound, currentGame), TRANSITION_MS);
    }
  }, [lives, round, currentGame, startRound]);

  // ── 게임 스코어 콜백 ─────────────────────────────

  const handleScore = useCallback((pts: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setDisplayScore(scoreRef.current);
  }, []);

  const handleSetScore = useCallback((total: number) => {
    scoreRef.current = total;
    setDisplayScore(total);
  }, []);

  // ── 결과 제출 ────────────────────────────────────

  const submitScore = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.submitResult({
        gameType: GameType.SPEED_TAP, // 대표 게임 타입으로 제출
        score: round,
        mode: 'solo',
        metadata: { subMode: 'endless', rounds: round, maxLives: LIVES_MAX },
      });
    } catch {
      // 제출 실패 무시 — 오프라인 대응
    } finally {
      setSubmitting(false);
    }
  }, [round, submitting]);

  useEffect(() => {
    if (phase === 'gameover') {
      submitScore();
    }
  }, [phase]);

  // ── 렌더링 ───────────────────────────────────────

  const GameComponent = getGameComponent(currentGame);
  const config = GAME_CONFIGS[currentGame];
  const progress = timeLeft / roundDuration(round);

  return (
    <div className="game-fullscreen flex flex-col text-white bg-gray-950">
      {/* 닫기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 rounded-full
                   flex items-center justify-center text-xl"
      >
        ✕
      </button>

      {/* ── IDLE: 시작 화면 ── */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 animate-slide-up">
          <p className="text-5xl">♾️</p>
          <h1 className="text-3xl font-black text-center">Endless 생존 챌린지</h1>
          <div className="bg-white/10 rounded-2xl p-5 w-full max-w-xs text-sm space-y-2">
            <p>🎮 라운드마다 <strong>랜덤 미니게임</strong> 등장</p>
            <p>⚡ 점점 빨라지는 제한시간</p>
            <p>❤️ 목숨 {LIVES_MAX}개 — 0점이면 목숨 1개 소모</p>
            <p>🏆 목숨이 다하면 게임 종료</p>
          </div>
          <button
            onClick={handleStart}
            className="bg-accent px-14 py-4 rounded-2xl text-xl font-bold shadow-lg
                       active:scale-95 transition-transform"
          >
            도전 시작!
          </button>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-white/40 text-sm">
            라운드 {round + 1} · {config.icon} {config.name}
          </p>
          <div key={countdown} className="animate-bounce-in">
            <span className="text-9xl font-black">
              {countdown > 0 ? countdown : 'GO!'}
            </span>
          </div>
          {/* 목숨 표시 */}
          <div className="flex gap-1">
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <span key={i} className={`text-xl ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
            ))}
          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <div className="flex-1 flex flex-col">
          {/* 타이머 바 */}
          <div className="w-full h-1.5 bg-white/10">
            <div
              className={`h-full transition-all duration-100 ${
                progress > 0.4 ? 'bg-accent' : progress > 0.15 ? 'bg-yellow-400' : 'bg-red-500'
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* HUD */}
          <div className="flex items-center justify-between px-5 py-2">
            <div className="flex gap-1">
              {Array.from({ length: LIVES_MAX }).map((_, i) => (
                <span key={i} className={`text-base ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
              ))}
            </div>
            <span className="text-white/50 text-xs font-mono">
              {config.icon} {(timeLeft / 1000).toFixed(1)}s
            </span>
            <span className="bg-white/10 rounded-full px-3 py-1 font-black">{displayScore}</span>
          </div>

          {/* 라운드 번호 */}
          <p className="text-center text-white/30 text-xs pb-1">라운드 {round + 1}</p>

          {/* 게임 영역 */}
          <GameComponent
            onScore={handleScore}
            onSetScore={handleSetScore}
            timeLeftMs={timeLeft}
            isPlaying
          />
        </div>
      )}

      {/* ── TRANSITION: 라운드 결과 ── */}
      {phase === 'transition' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 animate-slide-up">
          <span className="text-7xl">{roundPassed ? '✅' : '❌'}</span>
          <p className="text-2xl font-black">{roundPassed ? '클리어!' : '실패...'}</p>
          {!roundPassed && (
            <div className="flex gap-1">
              {Array.from({ length: LIVES_MAX }).map((_, i) => (
                <span key={i} className={`text-xl ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GAMEOVER ── */}
      {phase === 'gameover' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5 animate-slide-up">
          <p className="text-6xl">💀</p>
          <h2 className="text-3xl font-black">게임 오버</h2>
          <div className="bg-white/10 rounded-2xl p-6 w-full max-w-xs text-center">
            <p className="text-white/50 text-sm mb-1">클리어한 라운드</p>
            <p className="text-6xl font-black text-accent">{round}</p>
            <p className="text-white/30 text-xs mt-2">
              {round >= 10 ? '🔥 전설의 생존자!' : round >= 5 ? '⚡ 대단해요!' : '다시 도전해보세요!'}
            </p>
          </div>
          {submitting && <p className="text-white/40 text-xs">결과 저장 중...</p>}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              className="bg-accent px-8 py-3.5 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              다시 도전
            </button>
            <button
              onClick={() => navigate(-1)}
              className="bg-white/10 px-8 py-3.5 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
