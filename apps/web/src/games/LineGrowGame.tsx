import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

const MAX = 300;

export default function LineGrowGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [my, setMy] = useState(0);
  const [ai, setAi] = useState(0);
  const reportedRef = useRef(false);

  // AI 자동 성장
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setAi(prev => Math.min(MAX, prev + 2 + Math.random() * 2)), 100);
    return () => clearInterval(id);
  }, [isPlaying]);

  // 종료 시 점수 보고
  useEffect(() => {
    if (!isPlaying && my > 0 && !reportedRef.current) {
      reportedRef.current = true;
      onSetScore(Math.round(my));
    }
    if (isPlaying) reportedRef.current = false;
  }, [isPlaying, my, onSetScore]);

  const grow = () => { if (isPlaying) setMy(prev => Math.min(MAX, prev + 6)); };
  const winning = my > ai;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6" onPointerDown={grow}>
      <p className="text-white/40 text-sm mb-6">탭해서 줄을 늘려라! AI보다 길게!</p>

      <div className="w-full max-w-xs space-y-6">
        <Bar label="나" color="from-accent to-red-500" value={my} />
        <Bar label="AI" color="from-blue-400 to-purple-500" value={ai} />
      </div>

      <p className={`text-3xl font-black mt-8 ${winning ? 'text-green-400' : 'text-red-400'}`}>
        {winning ? '이기고 있어요! 👆' : '더 빨리 탭! 💨'}
      </p>
    </div>
  );
}

function Bar({ label, color, value }: { label: string; color: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-sm text-white/50">{Math.round(value)}px</span>
      </div>
      <div className="w-full h-6 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-75`}
          style={{ width: `${(value / MAX) * 100}%` }} />
      </div>
    </div>
  );
}
