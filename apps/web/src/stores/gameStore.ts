import { create } from 'zustand';
import { GameType, GameMode } from '@donggamerank/shared';

export type GamePhase = 'idle' | 'ready' | 'countdown' | 'playing' | 'result';

interface GameState {
  phase: GamePhase;
  gameType: GameType | null;
  mode: GameMode;
  score: number;
  timeLeftMs: number;
  countdown: number;
  matchId: string | null;
  opponentId: string | null;
  opponentScore: number;
  isNewHighScore: boolean;
  personalBest: number;
  eloChange: number;
  newRank: number;

  // Actions
  initGame: (gameType: GameType, mode?: GameMode) => void;
  startCountdown: () => void;
  startPlaying: (durationMs: number) => void;
  addScore: (points: number) => void;
  setScore: (score: number) => void;
  tick: (deltaMs: number) => void;
  endGame: () => void;
  setResult: (data: { eloChange: number; newRank: number; isNewHighScore: boolean }) => void;
  setOpponentScore: (score: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'idle',
  gameType: null,
  mode: GameMode.SOLO,
  score: 0,
  timeLeftMs: 0,
  countdown: 3,
  matchId: null,
  opponentId: null,
  opponentScore: 0,
  isNewHighScore: false,
  personalBest: 0,
  eloChange: 0,
  newRank: 0,

  initGame: (gameType, mode = GameMode.SOLO) =>
    set({ gameType, mode, phase: 'ready', score: 0, opponentScore: 0 }),

  startCountdown: () => set({ phase: 'countdown', countdown: 3 }),

  startPlaying: (durationMs) => set({ phase: 'playing', timeLeftMs: durationMs }),

  addScore: (points) => set((s) => ({ score: s.score + points })),

  setScore: (score) => set({ score }),

  tick: (deltaMs) => {
    const { timeLeftMs, phase } = get();
    if (phase !== 'playing') return;
    const newTime = Math.max(0, timeLeftMs - deltaMs);
    set({ timeLeftMs: newTime });
    if (newTime <= 0) get().endGame();
  },

  endGame: () => set({ phase: 'result' }),

  setResult: (data) => set(data),

  setOpponentScore: (score) => set({ opponentScore: score }),

  reset: () =>
    set({
      phase: 'idle', gameType: null, mode: GameMode.SOLO,
      score: 0, timeLeftMs: 0, countdown: 3,
      matchId: null, opponentId: null, opponentScore: 0,
      isNewHighScore: false, personalBest: 0, eloChange: 0, newRank: 0,
    }),
}));
