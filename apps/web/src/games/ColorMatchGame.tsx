import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash } from './hooks';

const COLORS = [
  { kr: '빨강', hex: '#EF4444' },
  { kr: '파랑', hex: '#3B82F6' },
  { kr: '초록', hex: '#22C55E' },
  { kr: '노랑', hex: '#EAB308' },
];

export default function ColorMatchGame({ onScore, isPlaying }: GameComponentProps) {
  const [textIdx, setTextIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(1);
  const isMatch = textIdx === colorIdx;

  const next = useCallback(() => {
    setTextIdx(Math.floor(Math.random() * 4));
    const match = Math.random() < 0.5;
    setColorIdx(match ? Math.floor(Math.random() * 4) : Math.floor(Math.random() * 4));
    // 50% 확률로 일치하도록
    if (match) setColorIdx(textIdx);
  }, [textIdx]);

  const { check, flashClass } = useFlash(onScore, next);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  return (
    <div className={`flex-1 flex flex-col items-center justify-center transition-colors ${flashClass}`}>
      <p className="text-white/40 text-sm mb-6">글자 색과 단어가 같은가요?</p>
      <p className="text-7xl font-black mb-10" style={{ color: COLORS[colorIdx].hex }}>
        {COLORS[textIdx].kr}
      </p>
      <div className="flex gap-6">
        <button onPointerDown={() => isPlaying && check(isMatch)}
          className="bg-green-500 px-10 py-4 rounded-2xl text-xl font-black active:scale-90 transition-transform">
          ⭕ 같다
        </button>
        <button onPointerDown={() => isPlaying && check(!isMatch)}
          className="bg-red-500 px-10 py-4 rounded-2xl text-xl font-black active:scale-90 transition-transform">
          ❌ 다르다
        </button>
      </div>
    </div>
  );
}
