import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

export default function OddEvenGame({ onScore, isPlaying }: GameComponentProps) {
  const [num, setNum] = useState(0);
  const next = useCallback(() => setNum(Math.floor(Math.random() * 99) + 1), []);
  const { check, flashClass } = useFlash(onScore, next);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const answer = (isOdd: boolean) => {
    if (!isPlaying) return;
    check(isOdd === (num % 2 !== 0));
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-center transition-colors ${flashClass}`}>
      <p className="text-8xl font-black mb-10">{num}</p>
      <div className="flex gap-6">
        <button onPointerDown={() => answer(true)}
          className="bg-purple-500 px-10 py-5 rounded-2xl text-2xl font-black active:scale-90 transition-transform">
          홀수
        </button>
        <button onPointerDown={() => answer(false)}
          className="bg-blue-500 px-10 py-5 rounded-2xl text-2xl font-black active:scale-90 transition-transform">
          짝수
        </button>
      </div>
    </div>
  );
}
