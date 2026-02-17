import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

export default function ShakeItGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [intensity, setIntensity] = useState(0);
  const [count, setCount] = useState(0);
  const lastRef = useRef(0);
  const reportedRef = useRef(false);

  // 가속도 센서 감지
  useEffect(() => {
    if (!isPlaying) return;
    const handle = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const total = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
      if (Math.abs(total - lastRef.current) > 8) {
        setCount(c => c + 1);
        setIntensity(prev => Math.min(100, prev + 5));
      }
      lastRef.current = total;
    };
    window.addEventListener('devicemotion', handle);
    return () => window.removeEventListener('devicemotion', handle);
  }, [isPlaying]);

  // 감쇠
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setIntensity(prev => Math.max(0, prev - 1)), 100);
    return () => clearInterval(id);
  }, [isPlaying]);

  // 종료 시 점수 보고
  useEffect(() => {
    if (!isPlaying && count > 0 && !reportedRef.current) {
      reportedRef.current = true;
      onSetScore(count);
    }
    if (isPlaying) reportedRef.current = false;
  }, [isPlaying, count, onSetScore]);

  // 데스크톱 탭 폴백
  const tap = () => {
    if (!isPlaying) return;
    setCount(c => c + 1);
    setIntensity(prev => Math.min(100, prev + 8));
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center" onPointerDown={tap}>
      <p className="text-8xl mb-4" style={{ transform: `rotate(${(Math.random() - 0.5) * intensity}deg)` }}>📳</p>
      <p className="text-5xl font-black mb-2">{count}</p>
      <p className="text-white/40 text-sm mb-6">흔들기 (또는 빠르게 탭!)</p>
      <div className="w-48 h-4 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all duration-100"
          style={{ width: `${intensity}%` }} />
      </div>
    </div>
  );
}
