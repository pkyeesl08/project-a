import { useState, useEffect, useRef } from 'react';
import { GameComponentProps } from './GameEngine';

export default function StopTheBarGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [pos, setPos] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const animRef = useRef<number>();
  const TARGET = 50;
  const ZONE = 8;

  useEffect(() => {
    if (!isPlaying || stopped) return;
    let p = 0;
    let dir = 1;
    const speed = 1.8;
    const animate = () => {
      p += speed * dir;
      if (p >= 100 || p <= 0) dir *= -1;
      setPos(p);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, stopped]);

  const handleStop = () => {
    if (stopped || !isPlaying) return;
    setStopped(true);
    const diff = Math.abs(pos - TARGET);
    const acc = Math.max(0, Math.round(100 - diff * 2.5));
    setAccuracy(acc);
    onSetScore(acc);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8" onPointerDown={handleStop}>
      {/* Bar track */}
      <div className="w-full h-16 bg-white/10 rounded-2xl relative mb-8 overflow-hidden">
        {/* Target zone */}
        <div
          className="absolute top-0 h-full bg-green-500/30 border-x-2 border-green-400"
          style={{ left: `${TARGET - ZONE}%`, width: `${ZONE * 2}%` }}
        />
        {/* Center line */}
        <div className="absolute top-0 h-full w-0.5 bg-yellow-400" style={{ left: `${TARGET}%` }} />
        {/* Moving bar */}
        <div
          className={`absolute top-0 h-full w-2 shadow-lg transition-none ${stopped ? (accuracy > 80 ? 'bg-green-400' : 'bg-red-400') : 'bg-white'}`}
          style={{ left: `${pos}%` }}
        />
      </div>

      {stopped ? (
        <div className="text-center animate-bounce-in">
          <p className="text-6xl font-black">{accuracy}%</p>
          <p className="text-white/50 mt-2">
            {accuracy > 90 ? '🎰 JACKPOT!' : accuracy > 70 ? '🎯 정확해요!' : accuracy > 40 ? '👍 괜찮아요!' : '😅 아쉬워요'}
          </p>
        </div>
      ) : (
        <p className="text-xl font-bold">화면을 터치해서 멈추세요!</p>
      )}
    </div>
  );
}
