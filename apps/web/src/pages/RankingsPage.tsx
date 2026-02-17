import { useState } from 'react';

const SCOPES = ['동네', '학교', '구/군', '시/도', '전국'];

export default function RankingsPage() {
  const [activeScope, setActiveScope] = useState(0);

  const mockRankings = Array.from({ length: 20 }, (_, i) => ({
    rank: i + 1,
    nickname: `${['빠른', '용감한', '멋진', '강한'][i % 4]}${['호랑이', '독수리', '상어', '용'][i % 4]}${1000 + i}`,
    elo: 1500 - i * 15,
    bestGame: ['⏱️', '👆', '⚡', '🎈', '🐹'][i % 5],
  }));

  return (
    <div className="p-4">
      {/* Scope Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {SCOPES.map((scope, i) => (
          <button
            key={scope}
            onClick={() => setActiveScope(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeScope === i ? 'bg-primary text-white shadow' : 'text-gray-500'
            }`}
          >
            {scope}
          </button>
        ))}
      </div>

      {/* My Ranking */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-primary">#42</span>
          <div>
            <p className="font-bold text-sm">나</p>
            <p className="text-xs text-gray-400">ELO 1,247</p>
          </div>
        </div>
        <span className="text-xs bg-primary text-white rounded-full px-3 py-1">{SCOPES[activeScope]}</span>
      </div>

      {/* Top 3 */}
      <div className="flex justify-center gap-4 mb-6">
        {[1, 0, 2].map((idx) => {
          const entry = mockRankings[idx];
          const isFirst = idx === 0;
          return (
            <div key={idx} className={`text-center ${isFirst ? '-mt-4' : 'mt-2'}`}>
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                isFirst ? 'from-yellow-400 to-orange-500' : 'from-gray-300 to-gray-400'
              } flex items-center justify-center text-2xl shadow-lg mx-auto mb-2`}>
                {entry.bestGame}
              </div>
              <p className="text-xs font-bold">{entry.nickname.slice(0, 6)}</p>
              <p className="text-xs text-gray-400">{entry.elo}</p>
              <span className={`text-lg ${isFirst ? '🥇' : idx === 1 ? '🥈' : '🥉'}`}>
                {isFirst ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rankings List */}
      <div className="space-y-2">
        {mockRankings.slice(3).map((entry) => (
          <div
            key={entry.rank}
            className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-gray-100"
          >
            <span className="w-8 text-center font-bold text-gray-400">{entry.rank}</span>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg">
              {entry.bestGame}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{entry.nickname}</p>
            </div>
            <span className="text-sm font-bold text-primary">{entry.elo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
