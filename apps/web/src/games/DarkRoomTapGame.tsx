import { useState, useEffect } from 'react';
import { GameComponentProps } from './GameEngine';

interface FlashIcon { id: number; x: number; y: number; emoji: string; }

export default function DarkRoomTapGame({ onScore, isPlaying }: GameComponentProps) {
  const [icons, setIcons] = useState<FlashIcon[]>([]);
  const EMOJIS = ['⭐', '💎', '🔥', '⚡', '🌙'];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const icon: FlashIcon = {
        id: Date.now(),
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 70,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      };
      setIcons(prev => [...prev.slice(-3), icon]);
      // Auto-remove after 1.2s
      setTimeout(() => {
        setIcons(prev => prev.filter(i => i.id !== icon.id));
      }, 1200);
    }, 600);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const tap = (id: number) => {
    if (!isPlaying) return;
    onScore(1);
    setIcons(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="flex-1 relative overflow-hidden select-none bg-gray-950">
      {/* Very subtle vignette */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)' }}
      />
      {icons.map(icon => (
        <button
          key={icon.id}
          onPointerDown={() => tap(icon.id)}
          className="absolute text-3xl animate-pulse-fast active:scale-0 transition-transform duration-100"
          style={{ left: `${icon.x}%`, top: `${icon.y}%`, transform: 'translate(-50%,-50%)' }}
        >
          {icon.emoji}
        </button>
      ))}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/20 text-sm">어둠 속에서 빛나는 아이콘을 터치!</p>
      </div>
    </div>
  );
}
