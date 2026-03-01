import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

const HANDS = [
  { name: '가위', emoji: '✌️', beats: '보' },
  { name: '바위', emoji: '✊', beats: '가위' },
  { name: '보',   emoji: '🖐️', beats: '바위' },
] as const;

export default function RpsSpeedGame({ onScore, isPlaying }: GameComponentProps) {
  const [ai, setAi] = useState<typeof HANDS[number]>(HANDS[0]);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);

  const next = useCallback(() => {
    setAi(HANDS[Math.floor(Math.random() * 3)]);
    setResult(null);
  }, []);

  const { flashClass } = useFlash(onScore, next, 400);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const play = (hand: typeof HANDS[number]) => {
    if (!isPlaying || result) return;
    const won = hand.beats === ai.name;
    if (won) onScore(1);
    setResult(won ? 'win' : 'lose');
    setTimeout(next, 400);
  };

  const winner = HANDS.find(h => h.beats === ai.name)!;

  return (
    <div className={`flex-1 flex flex-col items-center justify-center transition-colors ${flashClass}`}>
      <p className="text-white/40 text-sm mb-2">AI가 낸 것을 이기세요!</p>
      <div className={`text-8xl mb-2 transition-transform ${result === 'win' ? 'scale-75 opacity-50' : ''}`}>
        {ai.emoji}
      </div>
      <p className="text-lg font-bold mb-6">{ai.name}</p>

      {result && (
        <p className={`text-2xl font-black mb-4 animate-bounce-in ${result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
          {result === 'win' ? '승리!' : '패배!'}
        </p>
      )}

      <div className="flex gap-4">
        {HANDS.map(h => (
          <button key={h.name} onPointerDown={() => play(h)}
            className={`w-20 h-24 rounded-2xl flex flex-col items-center justify-center text-3xl active:scale-90 transition-all ${
              result && h.name === winner.name ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-white/15'
            }`}>
            {h.emoji}
            <span className="text-xs mt-1">{h.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
