import { useState, useCallback, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';
import { useFlash, useSwipe } from './hooks';

const HAPPY = ['😊', '😄', '🥳', '😍', '🤩', '😎', '🥰', '😁'];
const SAD   = ['😢', '😭', '😡', '🤬', '😤', '😰', '😱', '🥺'];

export default function EmojiSortGame({ onScore, isPlaying }: GameComponentProps) {
  const [emoji, setEmoji] = useState('');
  const [isHappy, setIsHappy] = useState(true);

  const next = useCallback(() => {
    const happy = Math.random() < 0.5;
    const list = happy ? HAPPY : SAD;
    setEmoji(list[Math.floor(Math.random() * list.length)]);
    setIsHappy(happy);
  }, []);

  const { check, flashClass } = useFlash(onScore, next);

  useEffect(() => { if (isPlaying) next(); }, [isPlaying]);

  const classify = (userSaysHappy: boolean) => {
    if (!isPlaying) return;
    check(userSaysHappy === isHappy);
  };

  const swipe = useSwipe((dir) => classify(dir === 'right'), 40);

  return (
    <div className={`flex-1 flex flex-col items-center justify-center select-none transition-colors ${flashClass}`}
      {...swipe}>
      <div className="flex justify-between w-full px-8 mb-8">
        <div className="text-center"><p className="text-3xl">😢</p><p className="text-xs text-white/40">← 슬픔</p></div>
        <div className="text-center"><p className="text-3xl">😊</p><p className="text-xs text-white/40">기쁨 →</p></div>
      </div>
      <p className="text-[100px] mb-4">{emoji}</p>
      <p className="text-white/40 text-sm">좌우 스와이프 또는 버튼!</p>
      <div className="flex gap-6 mt-6">
        <button onPointerDown={(e) => { e.stopPropagation(); classify(false); }}
          className="bg-blue-500 px-8 py-3 rounded-xl text-lg font-bold active:scale-90 transition-transform">
          😢 슬픔
        </button>
        <button onPointerDown={(e) => { e.stopPropagation(); classify(true); }}
          className="bg-yellow-500 px-8 py-3 rounded-xl text-lg font-bold active:scale-90 transition-transform">
          😊 기쁨
        </button>
      </div>
    </div>
  );
}
