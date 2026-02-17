import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

export default function BiggerNumberGame({ onScore, isPlaying }: GameComponentProps) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);

  const next = useCallback(() => {
    const a = Math.floor(Math.random() * 99) + 1;
    let b: number;
    do { b = Math.floor(Math.random() * 99) + 1; } while (b === a);
    setLeft(a);
    setRight(b);
  }, []);

  const { flash, check, flashClass } = useFlash(onScore, next);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const pick = (side: 'left' | 'right') => {
    if (!isPlaying) return;
    check(side === 'left' ? left > right : right > left);
  };

  const btnColor = (side: 'left' | 'right') => {
    if (!flash) return 'bg-white/15';
    if (side === 'left' && flash) return left > right ? 'bg-green-500' : 'bg-red-500';
    if (side === 'right' && flash) return right > left ? 'bg-green-500' : 'bg-red-500';
    return 'bg-white/15';
  };

  return (
    <div className={`flex-1 flex items-center justify-center gap-6 px-4 transition-colors ${flashClass}`}>
      <button onPointerDown={() => pick('left')}
        className={`flex-1 h-40 rounded-2xl flex items-center justify-center text-5xl font-black active:scale-95 transition-all ${btnColor('left')}`}>
        {left}
      </button>
      <span className="text-2xl text-white/30 font-bold">VS</span>
      <button onPointerDown={() => pick('right')}
        className={`flex-1 h-40 rounded-2xl flex items-center justify-center text-5xl font-black active:scale-95 transition-all ${btnColor('right')}`}>
        {right}
      </button>
    </div>
  );
}
