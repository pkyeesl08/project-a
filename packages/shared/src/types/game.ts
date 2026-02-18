// ── Game Types ──────────────────────────────────────────

export enum GameType {
  // ⚡ 반응/스피드
  TIMING_HIT = 'timing_hit',
  SPEED_TAP = 'speed_tap',
  LIGHTNING_REACTION = 'lightning_reaction',
  BALLOON_POP = 'balloon_pop',
  WHACK_A_MOLE = 'whack_a_mole',
  // 🧠 판단/퍼즐
  MEMORY_FLASH = 'memory_flash',
  COLOR_MATCH = 'color_match',
  BIGGER_NUMBER = 'bigger_number',
  SAME_PICTURE = 'same_picture',
  ODD_EVEN = 'odd_even',
  // 🎮 액션/모션
  DIRECTION_SWIPE = 'direction_swipe',
  STOP_THE_BAR = 'stop_the_bar',
  RPS_SPEED = 'rps_speed',
  SEQUENCE_TAP = 'sequence_tap',
  REVERSE_REACTION = 'reverse_reaction',
  // 🎯 정밀/집중
  LINE_TRACE = 'line_trace',
  TARGET_SNIPER = 'target_sniper',
  DARK_ROOM_TAP = 'dark_room_tap',
  SCREW_CENTER = 'screw_center',
  LINE_GROW = 'line_grow',
  // 🌟 특수/파티
  MATH_SPEED = 'math_speed',
  SHELL_GAME = 'shell_game',
  EMOJI_SORT = 'emoji_sort',
  COUNT_MORE = 'count_more',
  DUAL_PRECISION = 'dual_precision',
  REVERSE_MEMORY = 'reverse_memory',
  RAPID_AIM = 'rapid_aim',
}

export enum GameCategory {
  REACTION = 'reaction',
  PUZZLE = 'puzzle',
  ACTION = 'action',
  PRECISION = 'precision',
  PARTY = 'party',
}

export enum GameMode {
  SOLO = 'solo',
  PVP = 'pvp',
  TEAM = 'team',
}

export interface GameConfig {
  type: GameType;
  category: GameCategory;
  name: string;
  description: string;
  durationMs: number;
  scoreMetric: string;
  icon: string;
}

export const GAME_CONFIGS: Record<GameType, GameConfig> = {
  // ⚡ 반응/스피드
  [GameType.TIMING_HIT]: {
    type: GameType.TIMING_HIT, category: GameCategory.REACTION,
    name: '타이밍 히트', description: '정확한 타이밍에 터치!',
    durationMs: 3000, scoreMetric: 'accuracy_ms', icon: '⏱️',
  },
  [GameType.SPEED_TAP]: {
    type: GameType.SPEED_TAP, category: GameCategory.REACTION,
    name: '스피드 탭', description: '제한시간 내 미친 듯이 탭',
    durationMs: 5000, scoreMetric: 'tap_count', icon: '👆',
  },
  [GameType.LIGHTNING_REACTION]: {
    type: GameType.LIGHTNING_REACTION, category: GameCategory.REACTION,
    name: '번개 반응', description: '화면 변화 감지 후 번개처럼 반응',
    durationMs: 5000, scoreMetric: 'reaction_ms', icon: '⚡',
  },
  [GameType.BALLOON_POP]: {
    type: GameType.BALLOON_POP, category: GameCategory.REACTION,
    name: '풍선 터뜨리기', description: '나타나는 풍선만 골라서 빠르게 터치',
    durationMs: 5000, scoreMetric: 'correct_taps', icon: '🎈',
  },
  [GameType.WHACK_A_MOLE]: {
    type: GameType.WHACK_A_MOLE, category: GameCategory.REACTION,
    name: '두더지 잡기', description: '화면에 나타난 두더지를 빠르게 탭',
    durationMs: 5000, scoreMetric: 'moles_caught', icon: '🐹',
  },
  // 🧠 판단/퍼즐
  [GameType.MEMORY_FLASH]: {
    type: GameType.MEMORY_FLASH, category: GameCategory.PUZZLE,
    name: '기억력 플래시', description: '순간 보여주는 패턴을 기억해서 재현',
    durationMs: 5000, scoreMetric: 'pattern_accuracy', icon: '🧠',
  },
  [GameType.COLOR_MATCH]: {
    type: GameType.COLOR_MATCH, category: GameCategory.PUZZLE,
    name: '컬러 매치', description: '글자색과 텍스트가 일치하는지 판별',
    durationMs: 5000, scoreMetric: 'correct_answers', icon: '🎨',
  },
  [GameType.BIGGER_NUMBER]: {
    type: GameType.BIGGER_NUMBER, category: GameCategory.PUZZLE,
    name: '큰 수 찾기', description: '두 숫자 중 큰 쪽을 빠르게 터치',
    durationMs: 5000, scoreMetric: 'correct_speed', icon: '🔢',
  },
  [GameType.SAME_PICTURE]: {
    type: GameType.SAME_PICTURE, category: GameCategory.PUZZLE,
    name: '같은 그림 찾기', description: '여러 아이콘 중 같은 것 2개를 빠르게 선택',
    durationMs: 5000, scoreMetric: 'match_speed', icon: '🖼️',
  },
  [GameType.ODD_EVEN]: {
    type: GameType.ODD_EVEN, category: GameCategory.PUZZLE,
    name: '홀짝 판별', description: '빠르게 지나가는 숫자의 홀짝을 판별',
    durationMs: 3000, scoreMetric: 'correct_rate', icon: '🔀',
  },
  // 🎮 액션/모션
  [GameType.DIRECTION_SWIPE]: {
    type: GameType.DIRECTION_SWIPE, category: GameCategory.ACTION,
    name: '방향 스와이프', description: '화살표 방향대로 빠르게 스와이프',
    durationMs: 5000, scoreMetric: 'correct_swipes', icon: '👋',
  },
  [GameType.STOP_THE_BAR]: {
    type: GameType.STOP_THE_BAR, category: GameCategory.ACTION,
    name: '정확히 멈춰!', description: '움직이는 바를 정확한 위치에 멈추기',
    durationMs: 3000, scoreMetric: 'accuracy_px', icon: '🎰',
  },
  [GameType.RPS_SPEED]: {
    type: GameType.RPS_SPEED, category: GameCategory.ACTION,
    name: '가위바위보 스피드', description: 'AI 상대로 이기는 손을 빠르게 선택',
    durationMs: 5000, scoreMetric: 'win_streak', icon: '✊',
  },
  [GameType.SEQUENCE_TAP]: {
    type: GameType.SEQUENCE_TAP, category: GameCategory.ACTION,
    name: '순서대로 탭', description: '1~7 숫자를 순서대로 최대한 빠르게 탭',
    durationMs: 7000, scoreMetric: 'elapsed_ms', icon: '🔢',
  },
  [GameType.REVERSE_REACTION]: {
    type: GameType.REVERSE_REACTION, category: GameCategory.ACTION,
    name: '역방향 반응', description: '화살표 반대 방향을 빠르게 탭',
    durationMs: 5000, scoreMetric: 'speed_pts', icon: '🔄',
  },
  // 🎯 정밀/집중
  [GameType.LINE_TRACE]: {
    type: GameType.LINE_TRACE, category: GameCategory.PRECISION,
    name: '선 따라그리기', description: '화면에 표시된 선을 손가락으로 정확히 따라그리기',
    durationMs: 5000, scoreMetric: 'trace_accuracy', icon: '✏️',
  },
  [GameType.TARGET_SNIPER]: {
    type: GameType.TARGET_SNIPER, category: GameCategory.PRECISION,
    name: '과녁 저격수', description: '움직이는 과녁을 정확한 타이밍에 탭하여 저격',
    durationMs: 5000, scoreMetric: 'hits_timing', icon: '🎯',
  },
  [GameType.DARK_ROOM_TAP]: {
    type: GameType.DARK_ROOM_TAP, category: GameCategory.PRECISION,
    name: '어두운 방 터치', description: '어두운 화면에서 순간 나타나는 아이콘을 터치',
    durationMs: 5000, scoreMetric: 'correct_taps', icon: '🌑',
  },
  [GameType.SCREW_CENTER]: {
    type: GameType.SCREW_CENTER, category: GameCategory.PRECISION,
    name: '나사 심배', description: '멈추지 않고 회전하는 나사의 정중앙에 탭',
    durationMs: 3000, scoreMetric: 'center_accuracy', icon: '🔩',
  },
  [GameType.LINE_GROW]: {
    type: GameType.LINE_GROW, category: GameCategory.PRECISION,
    name: '줄세우기 대전', description: '터치로 줄을 늘려 상대보다 먼저 증식시키기',
    durationMs: 5000, scoreMetric: 'line_length', icon: '📏',
  },
  // 🌟 특수/파티
  [GameType.MATH_SPEED]: {
    type: GameType.MATH_SPEED, category: GameCategory.PARTY,
    name: '연산 스피드', description: '간단한 덧셈 문제를 빠르게 풀기',
    durationMs: 5000, scoreMetric: 'correct_answers', icon: '🧮',
  },
  [GameType.SHELL_GAME]: {
    type: GameType.SHELL_GAME, category: GameCategory.PARTY,
    name: '어디에 숨었게?', description: '컵 3개 중 공이 숨겨진 컵을 눈으로 추적해 맞히기',
    durationMs: 5000, scoreMetric: 'correct_picks', icon: '🥤',
  },
  [GameType.EMOJI_SORT]: {
    type: GameType.EMOJI_SORT, category: GameCategory.PARTY,
    name: '이모지 분류기', description: '나오는 이모지를 기쁨/슬픔 카테고리로 빠르게 분류',
    durationMs: 5000, scoreMetric: 'sort_accuracy', icon: '😊',
  },
  [GameType.COUNT_MORE]: {
    type: GameType.COUNT_MORE, category: GameCategory.PARTY,
    name: '누가 더 많지?', description: '두 그룹의 아이콘 수를 비교해서 많은 쪽 선택',
    durationMs: 3000, scoreMetric: 'correct_rate', icon: '👀',
  },
  [GameType.DUAL_PRECISION]: {
    type: GameType.DUAL_PRECISION, category: GameCategory.PRECISION,
    name: '이중 정밀 탭', description: '두 타겟을 순서대로 정중앙에 탭',
    durationMs: 5000, scoreMetric: 'center_accuracy', icon: '🎯',
  },
  [GameType.REVERSE_MEMORY]: {
    type: GameType.REVERSE_MEMORY, category: GameCategory.PUZZLE,
    name: '역순 기억', description: '보여준 숫자를 거꾸로 기억해서 탭',
    durationMs: 6000, scoreMetric: 'correct_count', icon: '🧠',
  },
  [GameType.RAPID_AIM]: {
    type: GameType.RAPID_AIM, category: GameCategory.PRECISION,
    name: '연속 조준', description: '연속으로 나타나는 타겟의 중앙을 최대한 정확하게 탭',
    durationMs: 8000, scoreMetric: 'aim_accuracy', icon: '🔵',
  },
};
