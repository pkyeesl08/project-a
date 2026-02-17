import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

const TARGET = 50;
const SPEED = 2.5;

export default function TimingHitGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [pos, setPos] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying || tapped) return;
    let p = 0, dir = 1;
    const tick = () => {
      p += SPEED * dir;
      if (p >= 100 || p <= 0) dir *= -1;
      setPos(p);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, tapped]);

  const handleTap = () => {
    if (tapped || !isPlaying) return;
    setTapped(true);
    const acc = Math.max(0, Math.round(100 - Math.abs(pos - TARGET) * 2));
    setAccuracy(acc);
    onSetScore(acc);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8" onPointerDown={handleTap}>
      {/* 트랙 */}
      <div className="w-full h-3 bg-white/10 rounded-full relative mb-8">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-6 h-8 border-2 border-yellow-400 rounded bg-yellow-400/20" />
        <div
          className={`absolute top-1/2 w-4 h-4 rounded-full shadow-lg transition-none ${
            tapped ? (accuracy > 80 ? 'bg-green-400' : 'bg-red-400') : 'bg-white'
          }`}
          style={{ left: `${pos}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {tapped ? (
        <div className="text-center animate-bounce-in">
          <p className="text-6xl font-black">{accuracy}%</p>
          <p className="text-white/50 mt-2">
            {accuracy > 90 ? 'PERFECT!' : accuracy > 70 ? 'GREAT!' : accuracy > 40 ? 'GOOD' : 'MISS'}
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-2xl font-bold mb-2">정확한 타이밍에 터치!</p>
          <p className="text-white/40">노란 영역에서 탭하세요</p>
        </div>
      )}
    </div>
  );
}
