import { useState, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';

interface Target {
  id: number; x: number; y: number;
  dx: number; dy: number; size: number;
}

const SPAWN_MS = 1200;
const MOVE_MS = 50;
const LIFETIME_MS = 4000;
const MAX_TARGETS = 6;

export default function TargetSniperGame({ onScore, isPlaying }: GameComponentProps) {
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    if (!isPlaying) return;
    spawn();
    const spawnId = setInterval(spawn, SPAWN_MS);
    const moveId = setInterval(() => {
      setTargets(prev => prev
        .map(t => ({
          ...t,
          x: Math.max(5, Math.min(90, t.x + t.dx)),
          y: Math.max(10, Math.min(80, t.y + t.dy)),
          dx: (t.x <= 5 || t.x >= 90) ? -t.dx : t.dx,
          dy: (t.y <= 10 || t.y >= 80) ? -t.dy : t.dy,
        }))
        .filter(t => t.id > Date.now() - LIFETIME_MS));
    }, MOVE_MS);
    return () => { clearInterval(spawnId); clearInterval(moveId); };
  }, [isPlaying]);

  function spawn() {
    setTargets(prev => [...prev.slice(-(MAX_TARGETS - 1)), {
      id: Date.now(),
      x: 20 + Math.random() * 60, y: 20 + Math.random() * 50,
      dx: (Math.random() - 0.5) * 2, dy: (Math.random() - 0.5) * 2,
      size: 40 + Math.random() * 20,
    }]);
  }

  const hit = (id: number) => {
    if (!isPlaying) return;
    onScore(1);
    setTargets(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex-1 relative overflow-hidden select-none">
      {/* 조준선 */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
        <div className="w-20 h-0.5 bg-white" />
        <div className="w-0.5 h-20 bg-white absolute" />
      </div>

      {targets.map(t => (
        <button key={t.id} onPointerDown={() => hit(t.id)}
          className="absolute rounded-full bg-red-500/80 border-2 border-red-300
                     flex items-center justify-center active:scale-50 transition-transform duration-75"
          style={{
            left: `${t.x}%`, top: `${t.y}%`,
            width: t.size, height: t.size,
            transform: 'translate(-50%,-50%)',
          }}>
          🎯
        </button>
      ))}

      <p className="absolute bottom-6 inset-x-0 text-center text-white/40 text-sm pointer-events-none">
        움직이는 과녁을 터치!
      </p>
    </div>
  );
}
