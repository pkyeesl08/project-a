import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

const ICONS = ['🔴', '🟡', '🔵', '🟢', '🟣', '⭐', '💎', '🍎'];

function fill(n: number) {
  const icon = ICONS[Math.floor(Math.random() * ICONS.length)];
  return Array.from({ length: n }, () => icon);
}

export default function CountMoreGame({ onScore, isPlaying }: GameComponentProps) {
  const [left, setLeft] = useState<string[]>([]);
  const [right, setRight] = useState<string[]>([]);

  const next = useCallback(() => {
    const a = Math.floor(Math.random() * 8) + 3;
    let b: number;
    do { b = Math.floor(Math.random() * 8) + 3; } while (b === a);
    setLeft(fill(a));
    setRight(fill(b));
  }, []);

  const { check, flashClass } = useFlash(onScore, next, 200);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const pick = (side: 'left' | 'right') => {
    if (!isPlaying) return;
    check(side === 'left' ? left.length > right.length : right.length > left.length);
  };

  return (
    <div className={`flex-1 flex items-center justify-center gap-4 px-4 transition-colors ${flashClass}`}>
      <button onPointerDown={() => pick('left')}
        className="flex-1 h-52 bg-white/10 rounded-2xl p-3 flex flex-wrap content-center justify-center gap-1 active:scale-95 transition-transform">
        {left.map((icon, i) => <span key={i} className="text-2xl">{icon}</span>)}
      </button>
      <span className="text-white/30 font-bold text-lg">VS</span>
      <button onPointerDown={() => pick('right')}
        className="flex-1 h-52 bg-white/10 rounded-2xl p-3 flex flex-wrap content-center justify-center gap-1 active:scale-95 transition-transform">
        {right.map((icon, i) => <span key={i} className="text-2xl">{icon}</span>)}
      </button>
    </div>
  );
}
