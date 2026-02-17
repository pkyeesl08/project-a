import { useState, useEffect, useRef } from 'react';
import { GameComponentProps } from './GameEngine';

export default function TiltBalanceGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [ballX, setBallX] = useState(50);
  const [ballY, setBallY] = useState(50);
  const [targetX] = useState(25 + Math.random() * 50);
  const [targetY] = useState(25 + Math.random() * 50);
  const [reached, setReached] = useState(false);
  const [timeToReach, setTimeToReach] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!isPlaying) return;
    startTimeRef.current = Date.now();

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0; // left-right tilt
      const beta = e.beta || 0;   // front-back tilt
      setBallX(prev => Math.max(5, Math.min(95, prev + gamma * 0.3)));
      setBallY(prev => Math.max(5, Math.min(95, prev + (beta - 45) * 0.3)));
    };

    if (typeof DeviceOrientationEvent !== 'undefined') {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isPlaying]);

  // Check if ball reached target
  useEffect(() => {
    if (reached || !isPlaying) return;
    const dist = Math.sqrt((ballX - targetX) ** 2 + (ballY - targetY) ** 2);
    if (dist < 8) {
      setReached(true);
      const time = Date.now() - startTimeRef.current;
      setTimeToReach(time);
      onSetScore(Math.max(0, 5000 - time));
    }
  }, [ballX, ballY, targetX, targetY, reached, isPlaying, onSetScore]);

  // Pointer fallback for desktop
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPlaying || reached) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setBallX((e.clientX - rect.left) / rect.width * 100);
    setBallY((e.clientY - rect.top) / rect.height * 100);
  };

  return (
    <div
      className="flex-1 relative overflow-hidden select-none"
      onPointerMove={handlePointerMove}
    >
      {/* Target */}
      <div
        className="absolute w-14 h-14 rounded-full border-4 border-dashed border-green-400 flex items-center justify-center"
        style={{ left: `${targetX}%`, top: `${targetY}%`, transform: 'translate(-50%,-50%)' }}
      >
        <span className="text-xs text-green-400">목표</span>
      </div>

      {/* Ball */}
      <div
        className={`absolute w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-xl transition-none ${
          reached ? 'bg-green-500' : 'bg-accent'
        }`}
        style={{ left: `${ballX}%`, top: `${ballY}%`, transform: 'translate(-50%,-50%)' }}
      >
        {reached ? '✓' : '⚪'}
      </div>

      {reached && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center animate-bounce-in bg-black/50 rounded-2xl p-6">
            <p className="text-4xl font-black text-green-400">{(timeToReach / 1000).toFixed(2)}초</p>
            <p className="text-white/50 mt-1">목표 도달!</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/30 text-sm">
          {reached ? '' : '기울이거나 드래그해서 공을 목표에!'}
        </p>
      </div>
    </div>
  );
}
