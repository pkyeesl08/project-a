import { useState, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

const ROUNDS = 3;
const TARGET_R = 40; // px radius for scoring (max distance)
const CIRCLE_R = 30; // px visual radius

function randomTargets(): [{ x: number; y: number }, { x: number; y: number }] {
  const a = { x: 15 + Math.random() * 35, y: 15 + Math.random() * 70 };
  const b = { x: 50 + Math.random() * 35, y: 15 + Math.random() * 70 };
  return [a, b];
}

function accuracyScore(dist: number): number {
  return Math.max(0, Math.round((1 - dist / TARGET_R) * 100));
}

export default function DualPrecisionGame({ onScore, isPlaying }: GameComponentProps) {
  const [round, setRound] = useState(0);
  const [targets, setTargets] = useState(() => randomTargets());
  const [phase, setPhase] = useState<0 | 1>(0); // 0 = first target, 1 = second target
  const [feedbacks, setFeedbacks] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTap = (e: React.PointerEvent) => {
    if (!isPlaying || done) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tapX = e.clientX - rect.left;
    const tapY = e.clientY - rect.top;
    const targetPercent = targets[phase];
    const targetX = (targetPercent.x / 100) * rect.width;
    const targetY = (targetPercent.y / 100) * rect.height;
    const dist = Math.hypot(tapX - targetX, tapY - targetY);
    const pts = accuracyScore(dist);
    onScore(pts);
    setFeedbacks(prev => [...prev, pts]);

    if (phase === 1) {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        setDone(true);
      } else {
        setRound(nextRound);
        setTargets(randomTargets());
        setPhase(0);
      }
    } else {
      setPhase(1);
    }
  };

  const totalPts = feedbacks.reduce((s, v) => s + v, 0);
  const maxPts = ROUNDS * 2 * 100;

  return (
    <div
      ref={containerRef}
      className="flex-1 relative select-none overflow-hidden"
      onPointerDown={handleTap}
    >
      <p className="absolute top-3 left-0 right-0 text-center text-white/50 text-sm pointer-events-none">
        {done
          ? `완료! ${totalPts} / ${maxPts}점`
          : `${round + 1}라운드 · ${phase === 0 ? '🔴 첫 번째' : '🔵 두 번째'} 타겟을 정중앙에 탭`}
      </p>

      {!done && targets.map((pos, i) => {
        const isActive = i === phase;
        const isTapped = i < phase || (phase === 0 && feedbacks.length > round * 2 + 1);
        return (
          <div
            key={`${round}-${i}`}
            className={`absolute rounded-full border-4 flex items-center justify-center
                        transition-all duration-200 pointer-events-none
                        ${isActive
                          ? i === 0 ? 'border-red-400 bg-red-400/20 animate-pulse' : 'border-blue-400 bg-blue-400/20 animate-pulse'
                          : 'border-white/20 bg-white/5'
                        }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: CIRCLE_R * 2,
              height: CIRCLE_R * 2,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white/60" />
          </div>
        );
      })}

      {done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-4xl font-black">🎯 {totalPts}점!</p>
        </div>
      )}
    </div>
  );
}
