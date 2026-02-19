import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { getGameComponent } from '../games/GameEngine';
import { api } from '../lib/api';

// ── 상수 ──────────────────────────────────────────

const LIVES_MAX = 3;
const ROUND_BASE_MS = 4000;   // 1라운드 제한시간
const ROUND_DECAY_MS = 200;   // 라운드마다 200ms 감소
const ROUND_MIN_MS = 1500;    // 최솟값
const PASS_THRESHOLD = 1;     // 이 이상 득점해야 클리어
const COUNTDOWN_SEC = 3;
const TRANSITION_MS = 1200;   // 라운드 결과 표시 시간

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

function pickRandom(exclude?: GameType): GameType {
  const pool = ENDLESS_POOL.filter(t => t !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function roundDuration(round: number): number {
  return Math.max(ROUND_MIN_MS, ROUND_BASE_MS - round * ROUND_DECAY_MS);
}

type Phase = 'idle' | 'countdown' | 'playing' | 'transition' | 'gameover';

// ── 컴포넌트 ──────────────────────────────────────

export default function EndlessModePage() {
  const navigate = useNavigate();

  // UI 상태
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(LIVES_MAX);
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentGame, setCurrentGame] = useState<GameType>(ENDLESS_POOL[0]);
  const [roundPassed, setRoundPassed] = useState<boolean | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Refs — 콜백 내에서 최신 값 참조 (stale closure 방지)
  const phaseRef = useRef<Phase>('idle');
  const roundRef = useRef(0);
  const livesRef = useRef(LIVES_MAX);
  const currentGameRef = useRef<GameType>(ENDLESS_POOL[0]);
  const scoreRef = useRef(0);

  // Ref + state 동시 업데이트 헬퍼
  const setPhaseSync = useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);
  const setRoundSync = useCallback((v: number) => { roundRef.current = v; setRound(v); }, []);
  const setLivesSync = useCallback((v: number) => { livesRef.current = v; setLives(v); }, []);

  // ── startRound ───────────────────────────────────

  const startRound = useCallback((nextRound: number, prevGame?: GameType) => {
    const game = pickRandom(prevGame);
    currentGameRef.current = game;
    setCurrentGame(game);
    scoreRef.current = 0;
    setDisplayScore(0);
    setCountdown(COUNTDOWN_SEC);
    setTimeLeft(roundDuration(nextRound));
    setPhaseSync('countdown');
  }, [setPhaseSync]);

  // ── handleStart ──────────────────────────────────

  const handleStart = useCallback(() => {
    roundRef.current = 0;
    livesRef.current = LIVES_MAX;
    scoreRef.current = 0;
    setRound(0);
    setLives(LIVES_MAX);
    setDisplayScore(0);
    setRoundPassed(null);
    startRound(0);
  }, [startRound]);

  // ── 카운트다운 ───────────────────────────────────

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhaseSync('playing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, setPhaseSync]);

  // ── 라운드 종료 (ref 기반으로 stale closure 없음) ──

  const endRound = useCallback(() => {
    if (phaseRef.current !== 'playing') return; // 이중 호출 방지
    const passed = scoreRef.current >= PASS_THRESHOLD;
    setRoundPassed(passed);
    setPhaseSync('transition');

    if (passed) {
      const next = roundRef.current + 1;
      setRoundSync(next);
      setTimeout(() => startRound(next, currentGameRef.current), TRANSITION_MS);
    } else {
      const nextLives = livesRef.current - 1;
      setLivesSync(nextLives);
      if (nextLives <= 0) {
        setTimeout(() => setPhaseSync('gameover'), TRANSITION_MS);
      } else {
        setTimeout(() => startRound(roundRef.current, currentGameRef.current), TRANSITION_MS);
      }
    }
  }, [setPhaseSync, setRoundSync, setLivesSync, startRound]);

  // ── 게임 타이머 ──────────────────────────────────

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) { endRound(); return; }
    const t = setTimeout(() => setTimeLeft(ms => ms - 100), 100);
    return () => clearTimeout(t);
  }, [phase, timeLeft, endRound]);

  // ── 게임 스코어 콜백 ─────────────────────────────

  const handleScore = useCallback((pts: number) => {
    scoreRef.current = Math.max(0, scoreRef.current + pts);
    setDisplayScore(scoreRef.current);
  }, []);

  const handleSetScore = useCallback((total: number) => {
    scoreRef.current = total;
    setDisplayScore(total);
  }, []);

  // ── 게임오버 → 결과 서버 제출 ────────────────────

  useEffect(() => {
    if (phase !== 'gameover' || submitting) return;
    setSubmitting(true);
    api.submitResult({
      gameType: 'endless',
      score: roundRef.current,
      mode: 'solo',
      metadata: { subMode: 'endless', rounds: roundRef.current },
    })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 렌더 ─────────────────────────────────────────

  const GameComponent = getGameComponent(currentGame);
  const config = GAME_CONFIGS[currentGame];
  const progress = timeLeft / roundDuration(roundRef.current);

  return (
    <div className="game-fullscreen flex flex-col text-white bg-gray-950">
      {/* 닫기 */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 bg-white/10 rounded-full
                   flex items-center justify-center text-xl"
      >
        ✕
      </button>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 animate-slide-up">
          <p className="text-5xl">♾️</p>
          <h1 className="text-3xl font-black text-center">Endless 생존 챌린지</h1>
          <div className="bg-white/10 rounded-2xl p-5 w-full max-w-xs text-sm space-y-2 text-white/80">
            <p>🎮 라운드마다 <strong className="text-white">랜덤 미니게임</strong> 등장</p>
            <p>⚡ 매 라운드 <strong className="text-white">200ms씩 빨라짐</strong></p>
            <p>❤️ 목숨 {LIVES_MAX}개 — 0점이면 목숨 1개 소모</p>
            <p>🏆 목숨이 다하면 종료 · 클리어 라운드로 순위 결정</p>
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
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <span key={i} className={`text-2xl transition-opacity ${i < lives ? 'opacity-100' : 'opacity-20'}`}>
                ❤️
              </span>
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
                <span key={i} className={`text-base transition-opacity ${i < lives ? 'opacity-100' : 'opacity-20'}`}>
                  ❤️
                </span>
              ))}
            </div>
            <div className="text-center">
              <p className="text-white/30 text-[10px]">라운드 {round + 1}</p>
              <p className="text-white/50 text-xs font-mono">{config.icon} {(timeLeft / 1000).toFixed(1)}s</p>
            </div>
            <span className="bg-white/10 rounded-full px-3 py-1 font-black">{displayScore}</span>
          </div>

          {/* 게임 영역 */}
          <GameComponent
            onScore={handleScore}
            onSetScore={handleSetScore}
            timeLeftMs={timeLeft}
            isPlaying
          />
        </div>
      )}

      {/* ── TRANSITION ── */}
      {phase === 'transition' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-slide-up">
          <span className="text-7xl">{roundPassed ? '✅' : '💔'}</span>
          <p className="text-2xl font-black">
            {roundPassed ? `라운드 ${round} 클리어!` : '목숨 -1'}
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: LIVES_MAX }).map((_, i) => (
              <span key={i} className={`text-2xl transition-opacity ${i < lives ? 'opacity-100' : 'opacity-20'}`}>
                ❤️
              </span>
            ))}
          </div>
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
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handleStart}
              className="flex-1 bg-accent py-3.5 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              다시 도전
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-white/10 py-3.5 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              나가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
