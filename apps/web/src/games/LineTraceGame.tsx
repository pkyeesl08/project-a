import { useState, useEffect, useRef, useCallback } from 'react';
import { GameComponentProps } from './GameEngine';

interface Point { x: number; y: number; }

export default function LineTraceGame({ onSetScore, isPlaying }: GameComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [targetPath, setTargetPath] = useState<Point[]>([]);
  const [userPath, setUserPath] = useState<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [done, setDone] = useState(false);
  const [accuracy, setAccuracy] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    // Generate a random bezier-like path
    const points: Point[] = [];
    const steps = 50;
    const startX = 50, startY = 300;
    const cp1x = 100 + Math.random() * 100, cp1y = 50 + Math.random() * 100;
    const cp2x = 200 + Math.random() * 60, cp2y = 250 + Math.random() * 100;
    const endX = 280, endY = 100 + Math.random() * 150;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = (1-t)**3*startX + 3*(1-t)**2*t*cp1x + 3*(1-t)*t**2*cp2x + t**3*endX;
      const y = (1-t)**3*startY + 3*(1-t)**2*t*cp1y + 3*(1-t)*t**2*cp2y + t**3*endY;
      points.push({ x, y });
    }
    setTargetPath(points);
    setUserPath([]);
    setDone(false);
    drawTarget(points);
  }, [isPlaying]);

  const drawTarget = (points: Point[]) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 340, 400);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
    // Start/end markers
    ctx.fillStyle = '#22C55E';
    ctx.beginPath(); ctx.arc(points[0].x, points[0].y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(points[points.length-1].x, points[points.length-1].y, 12, 0, Math.PI * 2); ctx.fill();
  };

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (!drawing || !isPlaying || done) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setUserPath(prev => [...prev, { x, y }]);

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || userPath.length < 1) return;
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const last = userPath[userPath.length - 1];
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [drawing, isPlaying, done, userPath]);

  const handleEnd = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    setDone(true);
    // Calculate accuracy
    if (userPath.length < 5 || targetPath.length < 5) { onSetScore(0); return; }
    let totalDist = 0;
    userPath.forEach(up => {
      const minDist = Math.min(...targetPath.map(tp => Math.sqrt((up.x-tp.x)**2 + (up.y-tp.y)**2)));
      totalDist += minDist;
    });
    const avgDist = totalDist / userPath.length;
    const acc = Math.max(0, Math.round(100 - avgDist * 2));
    setAccuracy(acc);
    onSetScore(acc);
  }, [drawing, userPath, targetPath, onSetScore]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <p className="text-white/40 text-sm mb-2">
        {done ? '' : '초록 점에서 빨간 점까지 선을 따라 그리세요!'}
      </p>
      <canvas
        ref={canvasRef}
        width={340}
        height={400}
        className="bg-white/5 rounded-2xl touch-none"
        onPointerDown={() => setDrawing(true)}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerLeave={handleEnd}
      />
      {done && (
        <div className="mt-4 text-center animate-bounce-in">
          <p className="text-4xl font-black">{accuracy}%</p>
          <p className="text-white/50">{accuracy > 80 ? '✏️ 정확해요!' : '다시 도전!'}</p>
        </div>
      )}
    </div>
  );
}
