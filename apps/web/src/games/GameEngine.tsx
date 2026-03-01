import { GameType } from '@donggamerank/shared';

/* ── 게임 컴포넌트 공통 Props ── */

export interface GameComponentProps {
  /** 점수 누적 (+n / -n) */
  onScore: (points: number) => void;
  /** 점수 덮어쓰기 (1회성 게임) */
  onSetScore: (score: number) => void;
  /** 남은 시간 (ms) */
  timeLeftMs: number;
  /** 플레이 중 여부 */
  isPlaying: boolean;
}

/* ── 게임별 컴포넌트 ── */

// ⚡ 반응/스피드
import TimingHitGame from './TimingHitGame';
import SpeedTapGame from './SpeedTapGame';
import LightningReactionGame from './LightningReactionGame';
import BalloonPopGame from './BalloonPopGame';
import WhackAMoleGame from './WhackAMoleGame';
// 🧠 판단/퍼즐
import MemoryFlashGame from './MemoryFlashGame';
import ColorMatchGame from './ColorMatchGame';
import BiggerNumberGame from './BiggerNumberGame';
import SamePictureGame from './SamePictureGame';
import OddEvenGame from './OddEvenGame';
// 🎮 액션/모션
import DirectionSwipeGame from './DirectionSwipeGame';
import StopTheBarGame from './StopTheBarGame';
import RpsSpeedGame from './RpsSpeedGame';
import SequenceTapGame from './SequenceTapGame';
import ReverseReactionGame from './ReverseReactionGame';
// 🎯 정밀/집중
import LineTraceGame from './LineTraceGame';
import TargetSniperGame from './TargetSniperGame';
import DarkRoomTapGame from './DarkRoomTapGame';
import ScrewCenterGame from './ScrewCenterGame';
import LineGrowGame from './LineGrowGame';
import DualPrecisionGame from './DualPrecisionGame';
import RapidAimGame from './RapidAimGame';
// 🌟 특수/파티
import MathSpeedGame from './MathSpeedGame';
import ShellGame from './ShellGame';
import EmojiSortGame from './EmojiSortGame';
import CountMoreGame from './CountMoreGame';
// 🧠 퍼즐/기억
import ReverseMemoryGame from './ReverseMemoryGame';

const REGISTRY: Partial<Record<GameType, React.ComponentType<GameComponentProps>>> = {
  [GameType.TIMING_HIT]:         TimingHitGame,
  [GameType.SPEED_TAP]:          SpeedTapGame,
  [GameType.LIGHTNING_REACTION]: LightningReactionGame,
  [GameType.BALLOON_POP]:        BalloonPopGame,
  [GameType.WHACK_A_MOLE]:      WhackAMoleGame,

  [GameType.MEMORY_FLASH]:       MemoryFlashGame,
  [GameType.COLOR_MATCH]:        ColorMatchGame,
  [GameType.BIGGER_NUMBER]:      BiggerNumberGame,
  [GameType.SAME_PICTURE]:       SamePictureGame,
  [GameType.ODD_EVEN]:           OddEvenGame,

  [GameType.DIRECTION_SWIPE]:    DirectionSwipeGame,
  [GameType.STOP_THE_BAR]:       StopTheBarGame,
  [GameType.RPS_SPEED]:          RpsSpeedGame,
  [GameType.SEQUENCE_TAP]:       SequenceTapGame,
  [GameType.REVERSE_REACTION]:   ReverseReactionGame,

  [GameType.LINE_TRACE]:         LineTraceGame,
  [GameType.TARGET_SNIPER]:      TargetSniperGame,
  [GameType.DARK_ROOM_TAP]:      DarkRoomTapGame,
  [GameType.SCREW_CENTER]:       ScrewCenterGame,
  [GameType.LINE_GROW]:          LineGrowGame,
  [GameType.DUAL_PRECISION]:     DualPrecisionGame,
  [GameType.RAPID_AIM]:          RapidAimGame,

  [GameType.MATH_SPEED]:         MathSpeedGame,
  [GameType.SHELL_GAME]:         ShellGame,
  [GameType.EMOJI_SORT]:         EmojiSortGame,
  [GameType.COUNT_MORE]:         CountMoreGame,
  [GameType.REVERSE_MEMORY]:     ReverseMemoryGame,
};

/* ── Fallback (미구현 게임) ── */

function FallbackGame({ onScore }: GameComponentProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <button onPointerDown={() => onScore(1)}
        className="w-48 h-48 rounded-full bg-gradient-to-br from-accent to-red-500 shadow-2xl
                   flex items-center justify-center text-4xl active:scale-90 transition-transform select-none">
        TAP!
      </button>
    </div>
  );
}

/* ── Public API ── */

export function getGameComponent(type: GameType): React.ComponentType<GameComponentProps> {
  return REGISTRY[type] ?? FallbackGame;
}
