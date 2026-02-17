import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash, useSwipe } from './hooks';

const DIRS = [
  { key: 'up',    arrow: '⬆️' },
  { key: 'down',  arrow: '⬇️' },
  { key: 'left',  arrow: '⬅️' },
  { key: 'right', arrow: '➡️' },
] as const;

export default function DirectionSwipeGame({ onScore, isPlaying }: GameComponentProps) {
  const [dir, setDir] = useState(DIRS[0]);

  const next = useCallback(() => {
    setDir(DIRS[Math.floor(Math.random() * 4)]);
  }, []);

  const { check, flashClass } = useFlash(onScore, next);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const swipe = useSwipe((swiped) => {
    if (!isPlaying) return;
    check(swiped === dir.key);
  });

  return (
    <div className={`flex-1 flex flex-col items-center justify-center select-none transition-colors ${flashClass}`}
      {...swipe}>
      <p className="text-[120px] mb-4">{dir.arrow}</p>
      <p className="text-white/40">이 방향으로 스와이프!</p>
    </div>
  );
}
