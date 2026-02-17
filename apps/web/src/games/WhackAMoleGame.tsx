import { useState, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';

const HOLES = 9;
const SPAWN_MS = 700;

export default function WhackAMoleGame({ onScore, isPlaying }: GameComponentProps) {
  const [active, setActive] = useState(-1);
  const [hit, setHit] = useState(-1);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setActive(Math.floor(Math.random() * HOLES));
      setHit(-1);
    }, SPAWN_MS);
    return () => clearInterval(id);
  }, [isPlaying]);

  const whack = (i: number) => {
    if (!isPlaying || i !== active) return;
    onScore(1);
    setHit(i);
    setActive(-1);
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        {Array.from({ length: HOLES }, (_, i) => (
          <button key={i} onPointerDown={() => whack(i)}
            className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all duration-100 ${
              hit === i    ? 'bg-yellow-400 scale-90' :
              active === i ? 'bg-amber-600 scale-110 shadow-lg' :
                             'bg-white/10'
            }`}>
            {active === i ? '🐹' : hit === i ? '💥' : '🕳️'}
          </button>
        ))}
      </div>
    </div>
  );
}
