import { useState } from 'react';
import type { GameComponentProps } from './GameEngine';

export default function SpeedTapGame({ onScore, isPlaying }: GameComponentProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleTap = (e: React.PointerEvent) => {
    if (!isPlaying) return;
    onScore(1);
    const rect = e.currentTarget.getBoundingClientRect();
    setRipples(prev => [...prev.slice(-5), {
      id: Date.now(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }]);
  };

  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden select-none"
      onPointerDown={handleTap}>
      {ripples.map(r => (
        <div key={r.id}
          className="absolute w-16 h-16 rounded-full bg-accent/30 animate-ping pointer-events-none"
          style={{ left: r.x - 32, top: r.y - 32 }} />
      ))}
      <div className="text-center pointer-events-none">
        <p className="text-8xl mb-4">👆</p>
        <p className="text-xl font-bold">화면을 미친 듯이 탭!</p>
      </div>
    </div>
  );
}
