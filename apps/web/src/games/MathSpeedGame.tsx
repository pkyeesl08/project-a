import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

export default function MathSpeedGame({ onScore, isPlaying }: GameComponentProps) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [options, setOptions] = useState<number[]>([]);

  const next = useCallback(() => {
    const na = Math.floor(Math.random() * 20) + 1;
    const nb = Math.floor(Math.random() * 20) + 1;
    const ans = na + nb;
    const opts = [ans];
    while (opts.length < 4) {
      const w = ans + Math.floor(Math.random() * 11) - 5;
      if (w !== ans && w > 0 && !opts.includes(w)) opts.push(w);
    }
    setA(na);
    setB(nb);
    setOptions(opts.sort(() => Math.random() - 0.5));
  }, []);

  const { check, flashClass } = useFlash(onScore, next);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  return (
    <div className={`flex-1 flex flex-col items-center justify-center px-6 transition-colors ${flashClass}`}>
      <p className="text-6xl font-black mb-8">{a} + {b} = ?</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        {options.map((opt, i) => (
          <button key={i} onPointerDown={() => isPlaying && check(opt === a + b)}
            className="bg-white/15 py-5 rounded-2xl text-3xl font-black active:scale-90 transition-transform">
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
