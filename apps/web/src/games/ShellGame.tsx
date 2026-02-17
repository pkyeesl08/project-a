import { useState, useEffect } from 'react';
import { GameComponentProps } from './GameEngine';

export default function ShellGameComponent({ onScore, onSetScore, isPlaying }: GameComponentProps) {
  const [phase, setPhase] = useState<'show' | 'shuffle' | 'pick' | 'reveal'>('show');
  const [ballPos, setBallPos] = useState(1);
  const [cups, setCups] = useState([0, 1, 2]);
  const [picked, setPicked] = useState(-1);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    startRound();
  }, [isPlaying]);

  const startRound = () => {
    const pos = Math.floor(Math.random() * 3);
    setBallPos(pos);
    setCups([0, 1, 2]);
    setPicked(-1);
    setPhase('show');

    setTimeout(() => {
      setPhase('shuffle');
      // Simulate shuffles
      let c = [0, 1, 2];
      let step = 0;
      const shuffleInterval = setInterval(() => {
        const i = Math.floor(Math.random() * 3);
        const j = (i + 1 + Math.floor(Math.random() * 2)) % 3;
        [c[i], c[j]] = [c[j], c[i]];
        setCups([...c]);
        step++;
        if (step >= 5) {
          clearInterval(shuffleInterval);
          setPhase('pick');
        }
      }, 300);
    }, 1000);
  };

  const handlePick = (visualIdx: number) => {
    if (phase !== 'pick') return;
    setPicked(visualIdx);
    setPhase('reveal');
    const isCorrect = cups[visualIdx] === ballPos;
    if (isCorrect) {
      setCorrect(c => c + 1);
      onScore(1);
    }
    const newRound = round + 1;
    setRound(newRound);

    if (newRound < 3) {
      setTimeout(() => startRound(), 1200);
    } else {
      setTimeout(() => {
        onSetScore(isCorrect ? correct + 1 : correct);
      }, 1000);
    }
  };

  const getCupContent = (visualIdx: number) => {
    const actualIdx = cups[visualIdx];
    if (phase === 'show' && actualIdx === ballPos) return '🔴';
    if (phase === 'reveal') {
      if (actualIdx === ballPos) return '🔴';
      if (visualIdx === picked && actualIdx !== ballPos) return '❌';
    }
    return '';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <p className="text-white/50 text-sm mb-2">
        라운드 {Math.min(round + 1, 3)} / 3
        {correct > 0 && <span className="text-green-400 ml-2">✓ {correct}</span>}
      </p>
      <p className="text-white/40 text-sm mb-8">
        {phase === 'show' ? '공의 위치를 기억하세요!' :
         phase === 'shuffle' ? '섞는 중...' :
         phase === 'pick' ? '공이 어디에 있을까요?' : ''}
      </p>

      <div className="flex gap-6">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            onPointerDown={() => handlePick(i)}
            className={`w-24 h-28 rounded-2xl flex flex-col items-center justify-center text-4xl transition-all duration-300 ${
              phase === 'shuffle' ? 'animate-pulse' : ''
            } ${
              phase === 'reveal' && picked === i
                ? cups[i] === ballPos ? 'bg-green-500/40 scale-110' : 'bg-red-500/40'
                : 'bg-white/15 active:scale-95'
            }`}
          >
            <span className="text-4xl">🥤</span>
            <span className="text-xl mt-1">{getCupContent(i)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
