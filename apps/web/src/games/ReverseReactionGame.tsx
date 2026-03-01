import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

const ROUNDS = 5;
const DIRS = ['↑', '↓', '←', '→'] as const;
type Dir = typeof DIRS[number];

const OPPOSITE: Record<Dir, Dir> = { '↑': '↓', '↓': '↑', '←': '→', '→': '←' };

function randomDir(): Dir {
  return DIRS[Math.floor(Math.random() * 4)];
}

export default function ReverseReactionGame({ onScore, isPlaying }: GameComponentProps) {
  const [round, setRound] = useState(0);
  const [arrow, setArrow] = useState<Dir>(randomDir());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [done, setDone] = useState(false);
  const roundStartRef = useRef<number>(0);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (isPlaying && round === 0 && !done) {
      roundStartRef.current = Date.now();
    }
  }, [isPlaying, round, done]);

  const handleDir = (tapped: Dir) => {
    if (!isPlaying || done || lockedRef.current) return;
    lockedRef.current = true;

    const elapsed = Date.now() - roundStartRef.current;
    const correct = OPPOSITE[arrow] === tapped;

    if (correct) {
      const pts = elapsed < 500 ? 3 : elapsed < 800 ? 2 : elapsed < 1200 ? 1 : 0;
      onScore(pts);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        setDone(true);
      } else {
        setRound(nextRound);
        setArrow(randomDir());
        setFeedback(null);
        roundStartRef.current = Date.now();
      }
      lockedRef.current = false;
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-6 select-none">
      <p className="text-white/50 text-sm">{round + 1} / {ROUNDS} 라운드 &nbsp;·&nbsp; 반대 방향을 탭!</p>

      <div className={`text-9xl font-black transition-colors ${
        feedback === 'correct' ? 'text-green-400' : feedback === 'wrong' ? 'text-red-400' : 'text-white'
      }`}>
        {done ? '🎉' : arrow}
      </div>

      <div className="grid grid-cols-3 gap-3 w-48">
        <div />
        <button onPointerDown={() => handleDir('↑')}
          className="aspect-square rounded-2xl bg-white/15 text-3xl flex items-center justify-center active:scale-90 transition-transform">
          ↑
        </button>
        <div />
        <button onPointerDown={() => handleDir('←')}
          className="aspect-square rounded-2xl bg-white/15 text-3xl flex items-center justify-center active:scale-90 transition-transform">
          ←
        </button>
        <button onPointerDown={() => handleDir('↓')}
          className="aspect-square rounded-2xl bg-white/15 text-3xl flex items-center justify-center active:scale-90 transition-transform">
          ↓
        </button>
        <button onPointerDown={() => handleDir('→')}
          className="aspect-square rounded-2xl bg-white/15 text-3xl flex items-center justify-center active:scale-90 transition-transform">
          →
        </button>
      </div>
    </div>
  );
}
