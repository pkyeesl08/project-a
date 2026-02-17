import { useState, useEffect, useCallback } from 'react';
import type { GameComponentProps } from './GameEngine';

interface Balloon { id: number; x: number; y: number; bomb: boolean; }

const EMOJIS = ['🎈', '🟡', '🔵', '🟢', '🟣'];

export default function BalloonPopGame({ onScore, isPlaying }: GameComponentProps) {
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [combo, setCombo] = useState(0);

  // 0.5초마다 풍선 생성
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setBalloons(prev => [...prev.slice(-8), {
        id: Date.now() + Math.random(),
        x: 10 + Math.random() * 75,
        y: 15 + Math.random() * 60,
        bomb: Math.random() < 0.2,
      }]);
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying]);

  const pop = useCallback((balloonId: number, isBomb: boolean) => {
    if (!isPlaying) return;
    setBalloons(prev => prev.filter(b => b.id !== balloonId));
    if (isBomb) { setCombo(0); onScore(-2); }
    else        { setCombo(c => c + 1); onScore(1); }
  }, [isPlaying, onScore]);

  return (
    <div className="flex-1 relative overflow-hidden select-none">
      {combo > 2 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 text-yellow-400 text-sm font-black animate-pulse-fast">
          {combo}x COMBO!
        </div>
      )}

      {balloons.map(b => (
        <button key={b.id} onPointerDown={() => pop(b.id, b.bomb)}
          className="absolute text-4xl -translate-x-1/2 -translate-y-1/2 active:scale-0 transition-transform duration-100 animate-bounce-in"
          style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {b.bomb ? '💣' : EMOJIS[Math.floor(b.x) % EMOJIS.length]}
        </button>
      ))}

      <p className="absolute bottom-8 inset-x-0 text-center text-white/40 text-sm pointer-events-none">
        🎈 풍선만 터뜨리세요! 💣는 피해요!
      </p>
    </div>
  );
}
