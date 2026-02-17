import { useState, useEffect, useRef } from 'react';
import type { GameComponentProps } from './GameEngine';

export default function MicShoutGame({ onSetScore, isPlaying }: GameComponentProps) {
  const [db, setDb] = useState(0);
  const [maxDb, setMaxDb] = useState(0);
  const [hasMic, setHasMic] = useState<boolean | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying) return;

    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        setHasMic(true);

        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        ctxRef.current = ctx;

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const measure = () => {
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
          const val = Math.min(120, avg * 0.8);
          setDb(val);
          setMaxDb(prev => Math.max(prev, val));
          rafRef.current = requestAnimationFrame(measure);
        };
        measure();
      } catch {
        setHasMic(false);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ctxRef.current?.close();
    };
  }, [isPlaying]);

  // 게임 종료 시 점수 보고
  const reportedRef = useRef(false);
  useEffect(() => {
    if (!isPlaying && maxDb > 0 && !reportedRef.current) {
      reportedRef.current = true;
      onSetScore(Math.round(maxDb));
    }
    if (isPlaying) reportedRef.current = false;
  }, [isPlaying, maxDb, onSetScore]);

  // 데스크톱 탭 폴백
  const handleTap = () => {
    if (!isPlaying || hasMic) return;
    const fake = 40 + Math.random() * 60;
    setDb(fake);
    setMaxDb(prev => Math.max(prev, fake));
  };

  const pct = (db / 120) * 100;

  return (
    <div className="flex-1 flex flex-col items-center justify-center" onPointerDown={handleTap}>
      <div className="w-20 h-56 bg-white/10 rounded-2xl overflow-hidden relative mb-6">
        <div className="absolute bottom-0 w-full transition-all duration-75 rounded-t-lg"
          style={{
            height: `${pct}%`,
            background: pct > 70 ? 'linear-gradient(to top,#EF4444,#F97316)'
              : pct > 40 ? 'linear-gradient(to top,#EAB308,#F97316)'
              : 'linear-gradient(to top,#22C55E,#EAB308)',
          }} />
      </div>

      <p className="text-5xl font-black">{Math.round(db)}</p>
      <p className="text-white/40 text-sm">dB</p>
      <p className="text-white/30 text-xs mt-2">최고: {Math.round(maxDb)} dB</p>

      {hasMic === false && (
        <p className="text-yellow-400 text-xs mt-4">마이크 권한 필요 — 탭으로 대체</p>
      )}

      <p className="text-lg font-bold mt-4">
        {db > 80 ? '🔊 엄청나요!!!' : db > 50 ? '📢 더 크게!' : '🎤 소리를 질러!'}
      </p>
    </div>
  );
}
