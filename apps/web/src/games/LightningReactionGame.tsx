import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

type Phase = 'wait' | 'go' | 'done' | 'early';

export default function LightningReactionGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [phase, setPhase] = useState<Phase>('wait');
  const [reactionMs, setReactionMs] = useState(0);
  const goTimeRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    setPhase('wait');
    const delay = 1000 + Math.random() * 2500;
    const timer = setTimeout(() => {
      setPhase('go');
      goTimeRef.current = performance.now();
    }, delay);
    return () => clearTimeout(timer);
  }, [isPlaying]);

  const handleTap = () => {
    if (!isPlaying) return;
    if (phase === 'wait') { setPhase('early'); onSetScore(0); return; }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - goTimeRef.current);
      setReactionMs(ms);
      setPhase('done');
      onSetScore(Math.max(0, 500 - ms));
    }
  };

  const BG: Record<Phase, string> = {
    wait: 'bg-red-600', go: 'bg-green-500', done: 'bg-blue-600', early: 'bg-yellow-500',
  };

  return (
    <div className={`flex-1 flex items-center justify-center ${BG[phase]} transition-colors`}
      onPointerDown={handleTap}>
      <div className="text-center">
        {phase === 'wait' && (
          <>
            <p className="text-6xl mb-4">🔴</p>
            <p className="text-2xl font-bold">기다리세요...</p>
            <p className="text-white/50">초록색이 되면 터치!</p>
          </>
        )}
        {phase === 'go' && (
          <>
            <p className="text-6xl mb-4 animate-pulse-fast">🟢</p>
            <p className="text-3xl font-black">지금! 터치!</p>
          </>
        )}
        {phase === 'done' && (
          <div className="animate-bounce-in">
            <p className="text-6xl font-black">{reactionMs}ms</p>
            <p className="text-white/60 mt-2">
              {reactionMs < 200 ? '⚡ 번개같은 반응!' : reactionMs < 300 ? '🔥 빠르다!' : '👍 좋아요!'}
            </p>
          </div>
        )}
        {phase === 'early' && (
          <>
            <p className="text-6xl mb-4">😵</p>
            <p className="text-2xl font-bold">너무 빨랐어요!</p>
          </>
        )}
      </div>
    </div>
  );
}
