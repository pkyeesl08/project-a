import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

const POOL = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑', '🌽', '🥕', '🍄', '🌸', '⭐', '🌙', '💎', '🔥'];

export default function SamePictureGame({ onScore, isPlaying }: GameComponentProps) {
  const [icons, setIcons] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  const next = useCallback(() => {
    const shuffled = [...POOL].sort(() => Math.random() - 0.5);
    const target = shuffled[0];
    const grid = [...shuffled.slice(1, 5), target, target].sort(() => Math.random() - 0.5);
    setIcons(grid);
    setSelected([]);
  }, []);

  const { check, flashClass } = useFlash(onScore, next, 300);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const tap = (idx: number) => {
    if (!isPlaying || selected.includes(idx)) return;
    const sel = [...selected, idx];
    setSelected(sel);
    if (sel.length === 2) check(icons[sel[0]] === icons[sel[1]]);
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-center px-6 transition-colors ${flashClass}`}>
      <p className="text-white/40 text-sm mb-6">같은 그림 2개를 찾으세요!</p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {icons.map((icon, i) => (
          <button key={i} onPointerDown={() => tap(i)}
            className={`aspect-square rounded-xl text-4xl flex items-center justify-center transition-all ${
              selected.includes(i) ? 'bg-accent/50 scale-95' : 'bg-white/15 active:scale-90'
            }`}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
