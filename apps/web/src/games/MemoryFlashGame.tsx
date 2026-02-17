import { useState, useEffect, useCallback } from 'react';
import type { GameComponentProps } from './GameEngine';

const GRID = 9;
const FLASH_INTERVAL = 400;

export default function MemoryFlashGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [phase, setPhase] = useState<'show' | 'input' | 'done'>('show');
  const [pattern, setPattern] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    if (!isPlaying) return;

    // 패턴 생성 (3~5칸)
    const len = 3 + Math.floor(Math.random() * 3);
    const p: number[] = [];
    while (p.length < len) {
      const n = Math.floor(Math.random() * GRID);
      if (!p.includes(n)) p.push(n);
    }
    setPattern(p);
    setUserInput([]);
    setPhase('show');

    // 순차 하이라이트
    p.forEach((cell, i) => {
      setTimeout(() => setLit(cell), i * FLASH_INTERVAL + 300);
      setTimeout(() => setLit(-1),   i * FLASH_INTERVAL + 600);
    });
    setTimeout(() => setPhase('input'), p.length * FLASH_INTERVAL + 600);
  }, [isPlaying]);

  const tap = useCallback((idx: number) => {
    if (phase !== 'input') return;
    const next = [...userInput, idx];
    setUserInput(next);

    if (next.length >= pattern.length) {
      setPhase('done');
      const correct = next.filter((v, i) => v === pattern[i]).length;
      onSetScore(Math.round((correct / pattern.length) * 100));
    }
  }, [phase, userInput, pattern, onSetScore]);

  const cellClass = (i: number) => {
    if (lit === i)                                            return 'bg-yellow-400 scale-110';
    if (phase === 'done' && pattern.includes(i) && userInput.includes(i)) return 'bg-green-400';
    if (phase === 'done' && !pattern.includes(i) && userInput.includes(i)) return 'bg-red-400';
    if (userInput.includes(i))                                return 'bg-accent/60';
    return 'bg-white/15';
  };

  const cellIcon = (i: number) => {
    if (lit === i) return '⭐';
    if (phase === 'done' && pattern.includes(i) && userInput.includes(i)) return '✓';
    if (phase === 'done' && !pattern.includes(i) && userInput.includes(i)) return '✗';
    return '';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8">
      <p className="text-sm text-white/50 mb-4">
        {phase === 'show' ? '패턴을 기억하세요!' : phase === 'input' ? '순서대로 탭하세요!' : '결과'}
      </p>
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {Array.from({ length: GRID }, (_, i) => (
          <button key={i} onPointerDown={() => tap(i)}
            className={`aspect-square rounded-xl transition-all duration-200 text-2xl
                        flex items-center justify-center ${cellClass(i)}`}>
            {cellIcon(i)}
          </button>
        ))}
      </div>
    </div>
  );
}
