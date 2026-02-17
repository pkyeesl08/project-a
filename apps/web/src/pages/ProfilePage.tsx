import { useState } from 'react';
import { GAME_CONFIGS, GameType, GameCategory } from '@donggamerank/shared';

const MOCK_PROFILE = {
  nickname: '빠른호랑이1234',
  elo: 1247,
  region: '역삼동',
  school: '서울대학교',
  totalGames: 342,
  totalWins: 198,
  winRate: 57.9,
  currentStreak: 5,
  regionRank: 42,
  schoolRank: 15,
  badges: ['🏆', '🔥', '⚡', '🎯', '💎'],
  topGames: [
    { type: GameType.SPEED_TAP, rank: 3, score: 847 },
    { type: GameType.LIGHTNING_REACTION, rank: 12, score: 156 },
    { type: GameType.TIMING_HIT, rank: 28, score: 42 },
  ],
  externalAccounts: [
    { game: 'League of Legends', gameName: 'FastTiger#KR1', tier: '다이아몬드 2', icon: '🎮' },
    { game: 'VALORANT', gameName: 'FastTiger#8888', tier: '어센던트 1', icon: '🔫' },
  ],
};

type Tab = 'stats' | 'games' | 'external';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <section className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
            🐯
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black">{MOCK_PROFILE.nickname}</h1>
            <div className="flex gap-2 mt-1">
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🏠 {MOCK_PROFILE.region}</span>
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">🏫 {MOCK_PROFILE.school}</span>
            </div>
          </div>
          <button className="bg-white/20 p-2 rounded-lg text-lg">⚙️</button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'ELO', value: MOCK_PROFILE.elo.toLocaleString() },
            { label: '동네 랭킹', value: `#${MOCK_PROFILE.regionRank}` },
            { label: '승률', value: `${MOCK_PROFILE.winRate}%` },
            { label: '연승', value: `${MOCK_PROFILE.currentStreak}🔥` },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-black">{stat.value}</p>
              <p className="text-[10px] opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="flex gap-2 mt-3">
          {MOCK_PROFILE.badges.map((badge, i) => (
            <span key={i} className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
              {badge}
            </span>
          ))}
        </div>
      </section>

      {/* Tab Switch */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {([
          { key: 'stats', label: '📊 전적' },
          { key: 'games', label: '🎮 게임별' },
          { key: 'external', label: '🔗 외부 연동' },
        ] as { key: Tab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white shadow text-primary' : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'games' && <GamesTab />}
      {activeTab === 'external' && <ExternalTab />}
    </div>
  );
}

function StatsTab() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">📈 최근 전적</h3>
        <div className="flex gap-1">
          {['W', 'W', 'L', 'W', 'W', 'W', 'L', 'W', 'L', 'W'].map((r, i) => (
            <div
              key={i}
              className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-bold text-white ${
                r === 'W' ? 'bg-green-500' : 'bg-red-400'
              }`}
            >
              {r}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">🎮 총 전적</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-black">{MOCK_PROFILE.totalGames}</p>
            <p className="text-xs text-gray-400">총 게임</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-500">{MOCK_PROFILE.totalWins}</p>
            <p className="text-xs text-gray-400">승리</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-400">{MOCK_PROFILE.totalGames - MOCK_PROFILE.totalWins}</p>
            <p className="text-xs text-gray-400">패배</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-sm mb-3">🏆 시즌 기록</h3>
        {[
          { season: 'Season 1', rank: 42, tier: '골드', reward: '🥇' },
        ].map((s) => (
          <div key={s.season} className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">{s.season}</p>
              <p className="text-xs text-gray-400">{s.tier} · 최종 #{s.rank}</p>
            </div>
            <span className="text-xl">{s.reward}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GamesTab() {
  return (
    <div className="space-y-2">
      {MOCK_PROFILE.topGames.map((game) => {
        const config = GAME_CONFIGS[game.type];
        return (
          <div
            key={game.type}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
          >
            <span className="text-3xl">{config.icon}</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{config.name}</p>
              <p className="text-xs text-gray-400">최고 점수: {game.score}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-primary">#{game.rank}</p>
              <p className="text-[10px] text-gray-400">동네 랭킹</p>
            </div>
          </div>
        );
      })}
      <p className="text-center text-xs text-gray-400 pt-2">
        25종 게임 중 {MOCK_PROFILE.topGames.length}종 플레이
      </p>
    </div>
  );
}

function ExternalTab() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">외부 게임 계정을 연동하면 동네/학교 기준 랭킹을 확인할 수 있어요.</p>

      {MOCK_PROFILE.externalAccounts.map((acc) => (
        <div
          key={acc.game}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
        >
          <span className="text-2xl">{acc.icon}</span>
          <div className="flex-1">
            <p className="font-bold text-sm">{acc.game}</p>
            <p className="text-xs text-gray-400">{acc.gameName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{acc.tier}</p>
            <p className="text-[10px] text-gray-400">동네 #7</p>
          </div>
        </div>
      ))}

      <button className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm border-2 border-dashed border-gray-300">
        + 게임 계정 연동하기
      </button>

      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
        💡 현재 지원: League of Legends, VALORANT, Overwatch 2, FIFA Online
      </div>
    </div>
  );
}
