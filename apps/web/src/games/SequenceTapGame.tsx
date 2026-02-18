import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

const TOTAL = 7;

function randomPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let pos: { x: number; y: number };
    let attempts = 0;
    do {
      pos = { x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 };
      attempts++;
    } while (
      attempts < 50 &&
      positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 18)
    );
    positions.push(pos);
  }
  return positions;
}

export default function SequenceTapGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [positions] = useState(() => randomPositions(TOTAL));
  const [next, setNext] = useState(1);
  const [done, setDone] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (isPlaying && startRef.current === 0) startRef.current = Date.now();
  }, [isPlaying]);

  const handleTap = (num: number) => {
    if (!isPlaying || done || num !== next) return;
    if (next === TOTAL) {
      const elapsed = Date.now() - startRef.current;
      const score = Math.max(0, 7000 - elapsed);
      onSetScore(score);
      setDone(true);
    }
    setNext(n => n + 1);
  };

  return (
    <div className="flex-1 relative select-none overflow-hidden">
      {!done && (
        <p className="absolute top-3 left-0 right-0 text-center text-white/60 text-sm pointer-events-none">
          <span className="text-white font-bold text-lg">{next}</span> 번을 탭하세요!
        </p>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-4xl font-black animate-bounce">완료! 🎉</p>
        </div>
      )}
      {positions.map((pos, i) => {
        const num = i + 1;
        const tapped = num < next;
        const isCurrent = num === next;
        return (
          <button
            key={num}
            onPointerDown={() => handleTap(num)}
            className={`absolute w-12 h-12 rounded-full flex items-center justify-center
                        text-lg font-black transition-all duration-150 shadow-lg
                        ${tapped
                          ? 'bg-white/10 text-white/20 scale-75'
                          : isCurrent
                            ? 'bg-accent text-white scale-110 ring-4 ring-white/40 animate-pulse'
                            : 'bg-white/20 text-white'
                        }`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%) ${isCurrent ? 'scale(1.1)' : tapped ? 'scale(0.75)' : 'scale(1)'}` }}
          >
            {tapped ? '✓' : num}
          </button>
        );
      })}
    </div>
  );
}
