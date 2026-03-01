import { GameCategory, GameConfig } from '@donggamerank/shared';

const CATEGORY_TIP: Record<GameCategory, string> = {
  [GameCategory.REACTION]:  '⚡ 반응 속도가 핵심! 화면을 주시하고 즉시 반응하세요.',
  [GameCategory.PUZZLE]:    '🧠 서두르지 말고 침착하게 생각하세요.',
  [GameCategory.ACTION]:    '🕹️ 정확한 타이밍과 방향에 집중하세요.',
  [GameCategory.PRECISION]: '🎯 천천히, 정중앙을 노리세요. 속도보다 정확도!',
  [GameCategory.PARTY]:     '🌟 직관적으로 빠르게 판단하세요!',
};

interface Props {
  config: GameConfig;
  onStart: () => void;
}

export default function GameTutorialOverlay({ config, onStart }: Props) {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="bg-white/10 backdrop-blur rounded-3xl p-6 w-full max-w-xs text-center border border-white/20">
        {/* 게임 아이콘 */}
        <div className="text-6xl mb-3">{config.icon}</div>
        <h2 className="text-xl font-black text-white mb-1">{config.name}</h2>
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-4
                         bg-white/20 text-white/70">
          {config.durationMs / 1000}초 게임
        </span>

        {/* 설명 */}
        <div className="bg-white/10 rounded-2xl p-4 mb-4 text-left space-y-2">
          <p className="text-sm text-white/90 leading-relaxed">{config.description}</p>
          <p className="text-xs text-white/60 mt-2">{CATEGORY_TIP[config.category]}</p>
        </div>

        {/* 점수 방식 */}
        <p className="text-xs text-white/40 mb-5">
          점수 단위: <span className="text-white/60 font-bold">{config.scoreMetric}</span>
        </p>

        <button
          onClick={onStart}
          className="w-full bg-accent py-3.5 rounded-2xl text-base font-black text-white
                     active:scale-95 transition-transform shadow-lg"
        >
          이해했어요, 시작!
        </button>
        <button
          onClick={onStart}
          className="mt-2 text-xs text-white/30 underline"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  );
}
