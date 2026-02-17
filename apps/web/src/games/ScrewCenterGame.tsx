import { useState, useEffect, useRef } from 'react';
import { GameComponentProps } from './GameEngine';

export default function ScrewCenterGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [angle, setAngle] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [tapPos, setTapPos] = useState<{ x: number; y: number } | null>(null);
  const [accuracy, setAccuracy] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying || tapped) return;
    const animate = () => {
      setAngle(prev => (prev + 3) % 360);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, tapped]);

  const handleTap = (e: React.PointerEvent) => {
    if (tapped || !isPlaying || !containerRef.current) return;
    setTapped(true);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.sqrt((e.clientX - centerX) ** 2 + (e.clientY - centerY) ** 2);
    const maxDist = rect.width / 4;
    const acc = Math.max(0, Math.round((1 - dist / maxDist) * 100));
    setAccuracy(acc);
    setTapPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    onSetScore(acc);
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center" onPointerDown={handleTap}>
      <div className="relative w-48 h-48">
        {/* Rotating screw */}
        <div
          className="w-48 h-48 rounded-full border-4 border-white/30 flex items-center justify-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="w-1 h-20 bg-white/40 absolute top-2" />
          <div className="w-20 h-1 bg-white/40 absolute left-2" />
          <div className="text-4xl">🔩</div>
        </div>
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />
        {/* Tap position */}
        {tapPos && (
          <div
            className="absolute w-4 h-4 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: tapPos.x, top: tapPos.y }}
          />
        )}
      </div>

      <div className="mt-8 text-center">
        {tapped ? (
          <div className="animate-bounce-in">
            <p className="text-5xl font-black">{accuracy}%</p>
            <p className="text-white/50 mt-2">
              {accuracy > 90 ? '🔩 완벽한 정중앙!' : accuracy > 60 ? '🎯 좋아요!' : '😅 아쉬워요'}
            </p>
          </div>
        ) : (
          <p className="text-lg font-bold">회전하는 나사의 정중앙을 터치!</p>
        )}
      </div>
    </div>
  );
}
