import { useState, useEffect } from 'react';
import type { GameComponentProps } from './GameEngine';

const SEQ_LEN = 5;
const SHOW_MS = 600; // 각 숫자 표시 시간

function randomSeq(len: number): number[] {
  const nums: number[] = [];
  while (nums.length < len) {
    const n = 1 + Math.floor(Math.random() * 9);
    if (!nums.includes(n)) nums.push(n);
  }
  return nums;
}

type Phase = 'showing' | 'input' | 'done';

export default function ReverseMemoryGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [seq] = useState(() => randomSeq(SEQ_LEN));
  const [showIdx, setShowIdx] = useState(-1);
  const [phase, setPhase] = useState<Phase>('showing');
  const [inputIdx, setInputIdx] = useState(0); // 역순으로 맞춰야 하는 인덱스 (SEQ_LEN-1 → 0)
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<number | null>(null); // tapped number

  // 순서대로 숫자 표시
  useEffect(() => {
    if (!isPlaying || phase !== 'showing') return;
    let idx = 0;
    const show = () => {
      setShowIdx(idx);
      idx++;
      if (idx < SEQ_LEN) {
        setTimeout(show, SHOW_MS);
      } else {
        setTimeout(() => {
          setShowIdx(-1);
          setPhase('input');
        }, SHOW_MS);
      }
    };
    const timer = setTimeout(show, 300);
    return () => clearTimeout(timer);
  }, [isPlaying, phase]);

  const handleTap = (num: number) => {
    if (!isPlaying || phase !== 'input') return;
    const expectedIdx = SEQ_LEN - 1 - inputIdx; // 역순
    const expected = seq[expectedIdx];
    setFeedback(num);
    setTimeout(() => setFeedback(null), 300);

    if (num === expected) {
      const nextCorrect = correct + 1;
      setCorrect(nextCorrect);
      const nextIdx = inputIdx + 1;
      if (nextIdx >= SEQ_LEN) {
        onSetScore(nextCorrect);
        setPhase('done');
      } else {
        setInputIdx(nextIdx);
      }
    } else {
      // 틀리면 현재까지 정답 제출
      onSetScore(correct);
      setPhase('done');
    }
  };

  // 1~9 숫자 패드
  const nums = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col items-center justify-between py-4 select-none">
      {/* 표시 영역 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
        {phase === 'showing' && (
          <>
            <p className="text-white/50 text-sm">순서를 기억하세요!</p>
            <div className="text-8xl font-black text-accent min-h-[96px] flex items-center">
              {showIdx >= 0 ? seq[showIdx] : ''}
            </div>
            <div className="flex gap-2">
              {seq.map((_, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i <= showIdx ? 'bg-accent' : 'bg-white/20'}`} />
              ))}
            </div>
          </>
        )}

        {phase === 'input' && (
          <>
            <p className="text-white/50 text-sm">
              역순으로 입력! ({inputIdx + 1} / {SEQ_LEN})
            </p>
            <div className="flex gap-2">
              {Array.from({ length: SEQ_LEN }).map((_, i) => (
                <div key={i} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold
                  ${i < inputIdx ? 'bg-green-500/40 text-green-300' : i === inputIdx ? 'bg-white/20 border-2 border-accent' : 'bg-white/5'}`}>
                  {i < inputIdx ? '✓' : '?'}
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="text-center">
            <p className="text-6xl font-black">{correct} / {SEQ_LEN}</p>
            <p className="text-white/50 mt-2">{correct === SEQ_LEN ? '완벽! 🧠' : '아쉽다!'}</p>
          </div>
        )}
      </div>

      {/* 숫자 패드 */}
      {phase === 'input' && (
        <div className="grid grid-cols-3 gap-2 w-56 pb-2">
          {nums.map(n => (
            <button
              key={n}
              onPointerDown={() => handleTap(n)}
              className={`h-14 rounded-xl text-xl font-bold transition-all duration-150
                          ${feedback === n ? 'bg-accent/60 scale-90' : 'bg-white/15 active:bg-white/30 active:scale-95'}`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
