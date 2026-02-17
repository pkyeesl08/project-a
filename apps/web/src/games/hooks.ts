import { useState, useCallback, useRef } from 'react';

/**
 * 정답/오답 플래시 피드백 + 자동 다음 라운드
 *
 * 사용:
 *   const { flash, check, flashClass } = useFlash(onScore, next);
 *   check(userAnswer === correctAnswer);
 */
export function useFlash(onScore: (n: number) => void, next: () => void, delayMs = 150) {
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  const check = useCallback(
    (isCorrect: boolean) => {
      if (isCorrect) onScore(1);
      setFlash(isCorrect ? 'correct' : 'wrong');
      setTimeout(() => {
        setFlash(null);
        next();
      }, delayMs);
    },
    [onScore, next, delayMs],
  );

  const flashClass =
    flash === 'correct' ? 'bg-green-500/20' : flash === 'wrong' ? 'bg-red-500/20' : '';

  return { flash, check, flashClass };
}

/**
 * 게임 시작 시 한 번 next()를 호출해주는 패턴
 */
export function useAutoStart(isPlaying: boolean, next: () => void) {
  const started = useRef(false);
  if (isPlaying && !started.current) {
    started.current = true;
    next();
  }
  if (!isPlaying) started.current = false;
}

/**
 * 터치 스와이프 방향 감지
 */
export function useSwipe(onSwipe: (dir: 'up' | 'down' | 'left' | 'right') => void, threshold = 30) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        onSwipe(dx > 0 ? 'right' : 'left');
      } else {
        onSwipe(dy > 0 ? 'down' : 'up');
      }
    },
    [onSwipe, threshold],
  );

  return { onPointerDown, onPointerUp };
}
