import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

const TARGETS = 8;
const VISIBLE_MS = 1200;
const TARGET_R = 35; // scoring radius px

function randomPos(): { x: number; y: number } {
  return { x: 12 + Math.random() * 76, y: 12 + Math.random() * 76 };
}

export default function RapidAimGame({ onScore, isPlaying }: GameComponentProps) {
  const [pos, setPos] = useState(() => randomPos());
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [flashColor, setFlashColor] = useState<'hit' | 'miss' | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const tappedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const advance = (pts: number) => {
    onScore(pts);
    setTotalScore(s => s + pts);
    tappedRef.current = true;
    const next = current + 1;
    if (next >= TARGETS) {
      setDone(true);
      setFlashColor(pts > 50 ? 'hit' : 'miss');
      return;
    }
    setFlashColor(pts > 50 ? 'hit' : 'miss');
    setTimeout(() => {
      setFlashColor(null);
      setCurrent(next);
      setPos(randomPos());
      tappedRef.current = false;
    }, 200);
  };

  // 시간 초과 시 miss 처리
  useEffect(() => {
    if (!isPlaying || done) return;
    tappedRef.current = false;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!tappedRef.current) advance(0);
    }, VISIBLE_MS);
    return () => clearTimeout(timerRef.current);
  }, [current, isPlaying, done]);

  const handleTap = (e: React.PointerEvent) => {
    if (!isPlaying || done || tappedRef.current) return;
    clearTimeout(timerRef.current);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tapX = e.clientX - rect.left;
    const tapY = e.clientY - rect.top;
    const targetX = (pos.x / 100) * rect.width;
    const targetY = (pos.y / 100) * rect.height;
    const dist = Math.hypot(tapX - targetX, tapY - targetY);
    const pts = Math.max(0, Math.round((1 - dist / TARGET_R) * 100));
    advance(pts);
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative select-none overflow-hidden transition-colors duration-100
        ${flashColor === 'hit' ? 'bg-green-500/10' : flashColor === 'miss' ? 'bg-red-500/10' : ''}`}
      onPointerDown={handleTap}
    >
      <p className="absolute top-3 left-0 right-0 text-center text-white/50 text-sm pointer-events-none">
        {done
          ? `완료! ${totalScore} / ${TARGETS * 100}점`
          : `${current + 1} / ${TARGETS} · 정중앙을 탭!`}
      </p>

      {!done && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          {/* 외부 링 */}
          <div className="absolute w-20 h-20 rounded-full border-2 border-accent/40 animate-ping"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          {/* 타겟 원 */}
          <div className="w-16 h-16 rounded-full border-4 border-accent bg-accent/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-accent" />
          </div>
        </div>
      )}

      {done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-6xl font-black">{totalScore}점</p>
            <p className="text-white/50 mt-1">/ {TARGETS * 100}점 만점</p>
          </div>
        </div>
      )}
    </div>
  );
}
