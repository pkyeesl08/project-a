import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type GameTab = 'lol' | 'maple' | 'fconline';

const GAMES: { key: GameTab; icon: string; name: string; color: string }[] = [
  { key: 'lol', icon: '🎮', name: 'LoL', color: 'from-blue-600 to-indigo-700' },
  { key: 'maple', icon: '🍁', name: '메이플', color: 'from-orange-500 to-amber-600' },
  { key: 'fconline', icon: '⚽', name: 'FC온라인', color: 'from-green-600 to-emerald-700' },
];

// Mock 지역 데이터 (서버 연동 시 실제 데이터로 대체)
const MOCK_REGIONS = [
  { id: 'r1', name: '역삼동', district: '강남구' },
  { id: 'r2', name: '서초동', district: '서초구' },
  { id: 'r3', name: '잠실동', district: '송파구' },
  { id: 'r4', name: '홍대입구', district: '마포구' },
];

// Mock 랭킹 데이터
const MOCK_LOL_RANKING = [
  { rank: 1, nickname: '역삼동호랑이', gameName: 'Tiger#KR1', tier: '챌린저', tierScore: 3800, soloRank: { tier: 'CHALLENGER', rank: 'I', lp: 1247, wins: 312, losses: 198, winRate: '61.2' } },
  { rank: 2, nickname: '강남독수리', gameName: 'Eagle#KR2', tier: '그랜드마스터', tierScore: 3600, soloRank: { tier: 'GRANDMASTER', rank: 'I', lp: 642, wins: 287, losses: 213, winRate: '57.4' } },
  { rank: 3, nickname: '코딩판다', gameName: 'Panda#KR3', tier: '마스터', tierScore: 3200, soloRank: { tier: 'MASTER', rank: 'I', lp: 312, wins: 198, losses: 162, winRate: '55.0' } },
  { rank: 4, nickname: '삼성늑대', gameName: 'Wolf#KR4', tier: '다이아몬드 I', tierScore: 2700, soloRank: { tier: 'DIAMOND', rank: 'I', lp: 87, wins: 156, losses: 134, winRate: '53.8' } },
  { rank: 5, nickname: '테헤란로상어', gameName: 'Shark#KR5', tier: '다이아몬드 II', tierScore: 2600, soloRank: { tier: 'DIAMOND', rank: 'II', lp: 43, wins: 142, losses: 128, winRate: '52.6' } },
  { rank: 6, nickname: '선릉고양이', gameName: 'Cat#KR6', tier: '에메랄드 I', tierScore: 2300, soloRank: { tier: 'EMERALD', rank: 'I', lp: 72, wins: 98, losses: 92, winRate: '51.6' } },
  { rank: 7, nickname: '역삼용', gameName: 'Dragon#KR7', tier: '플래티넘 II', tierScore: 1800, soloRank: { tier: 'PLATINUM', rank: 'II', lp: 56, wins: 87, losses: 83, winRate: '51.2' } },
  { rank: 8, nickname: '봉은사펭귄', gameName: 'Penguin#KR8', tier: '골드 I', tierScore: 1500, soloRank: { tier: 'GOLD', rank: 'I', lp: 91, wins: 76, losses: 74, winRate: '50.7' } },
];

const MOCK_MAPLE_RANKING = [
  { rank: 1, nickname: '역삼동호랑이', characterName: '별빛마법사', tier: 'Lv.285 아크메이지(불,독)', level: 285, stats: { world: '스카니아', combatPower: 98500000, class: '아크메이지(불,독)' } },
  { rank: 2, nickname: '강남독수리', characterName: '하늘전사', tier: 'Lv.278 히어로', level: 278, stats: { world: '루나', combatPower: 72300000, class: '히어로' } },
  { rank: 3, nickname: '코딩판다', characterName: '코딩판다', tier: 'Lv.271 아델', level: 271, stats: { world: '스카니아', combatPower: 56100000, class: '아델' } },
  { rank: 4, nickname: '삼성늑대', characterName: '은하궁사', tier: 'Lv.265 신궁', level: 265, stats: { world: '리부트', combatPower: 45800000, class: '신궁' } },
  { rank: 5, nickname: '테헤란로상어', characterName: '바다도적', tier: 'Lv.258 듀얼블레이드', level: 258, stats: { world: '리부트', combatPower: 32400000, class: '듀얼블레이드' } },
];

const MOCK_FC_RANKING = [
  { rank: 1, nickname: '역삼동호랑이', gameName: 'TigerFC', tier: '슈퍼챔피언스', stats: { level: 42 } },
  { rank: 2, nickname: '강남독수리', gameName: 'EagleFC', tier: '챔피언스', stats: { level: 38 } },
  { rank: 3, nickname: '코딩판다', gameName: 'PandaBall', tier: '슈퍼챌린지', stats: { level: 35 } },
  { rank: 4, nickname: '삼성늑대', gameName: 'WolfKick', tier: '챌린지 1부', stats: { level: 31 } },
  { rank: 5, nickname: '테헤란로상어', gameName: 'SharkGoal', tier: '챌린지 2부', stats: { level: 28 } },
];

const TIER_COLORS: Record<string, string> = {
  IRON: '#6B7280', BRONZE: '#B45309', SILVER: '#9CA3AF', GOLD: '#EAB308',
  PLATINUM: '#22D3EE', EMERALD: '#34D399', DIAMOND: '#60A5FA',
  MASTER: '#A855F7', GRANDMASTER: '#EF4444', CHALLENGER: '#FBBF24',
};

export default function ExternalRankingPage() {
  const [activeGame, setActiveGame] = useState<GameTab>('lol');
  const [scope, setScope] = useState<'region' | 'school'>('region');
  const [selectedRegion, setSelectedRegion] = useState(MOCK_REGIONS[0].id);
  const navigate = useNavigate();

  const currentGame = GAMES.find(g => g.key === activeGame)!;

  const ranking = activeGame === 'lol' ? MOCK_LOL_RANKING
    : activeGame === 'maple' ? MOCK_MAPLE_RANKING
    : MOCK_FC_RANKING;

  const regionName = MOCK_REGIONS.find(r => r.id === selectedRegion)?.name || '역삼동';

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* 헤더 */}
      <div className={`bg-gradient-to-r ${currentGame.color} rounded-2xl p-5 text-white`}>
        <p className="text-xs text-white/60 mb-1">동네별 외부 게임 랭킹</p>
        <h1 className="text-2xl font-black flex items-center gap-2">
          {currentGame.icon} {regionName} {currentGame.name} 랭킹
        </h1>
        <p className="text-sm text-white/70 mt-1">
          우리 동네에서 {currentGame.name} 가장 잘하는 사람은?
        </p>
      </div>

      {/* 게임 탭 */}
      <div className="flex gap-2">
        {GAMES.map(g => (
          <button key={g.key} onClick={() => setActiveGame(g.key)}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              activeGame === g.key
                ? `bg-gradient-to-r ${g.color} text-white shadow-lg`
                : 'bg-gray-100 text-gray-500'
            }`}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {/* 범위/지역 선택 */}
      <div className="flex gap-2">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['region', 'school'] as const).map(s => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                scope === s ? 'bg-white shadow text-gray-900' : 'text-gray-400'
              }`}>
              {s === 'region' ? '🏠 동네' : '🏫 학교'}
            </button>
          ))}
        </div>
        <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
          className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium border-0 focus:outline-none">
          {MOCK_REGIONS.map(r => (
            <option key={r.id} value={r.id}>{r.district} {r.name}</option>
          ))}
        </select>
      </div>

      {/* 랭킹 리스트 */}
      <div className="space-y-2">
        {/* Top 3 Podium */}
        {ranking.length >= 3 && (
          <div className="flex items-end gap-2 mb-4">
            {[1, 0, 2].map(idx => {
              const item = ranking[idx];
              const isFirst = idx === 0;
              return (
                <div key={idx} className={`flex-1 text-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                  <div className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 ${isFirst ? 'pb-6 -mb-2' : ''}`}>
                    <p className="text-2xl mb-1">{['🥇', '🥈', '🥉'][idx]}</p>
                    <p className="font-black text-sm truncate">{item.nickname}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {activeGame === 'lol' ? (item as any).gameName
                        : activeGame === 'maple' ? (item as any).characterName
                        : (item as any).gameName}
                    </p>
                    <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                      isFirst ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.tier}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4위부터 리스트 */}
        {ranking.slice(3).map((item) => (
          <RankingRow key={item.rank} item={item} game={activeGame} />
        ))}

        {ranking.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-bold">아직 연동한 유저가 없어요</p>
            <p className="text-sm mt-1">프로필에서 게임 계정을 연동해보세요!</p>
            <button onClick={() => navigate('/profile')}
              className="mt-3 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform">
              연동하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RankingRow({ item, game }: { item: any; game: GameTab }) {
  const isTop10 = item.rank <= 10;

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
      {/* 순위 */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
        isTop10 ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'
      }`}>
        {item.rank}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{item.nickname}</p>
        <p className="text-xs text-gray-400 truncate">
          {game === 'lol' && item.gameName}
          {game === 'maple' && `${item.characterName} · ${(item.stats as any)?.world || ''}`}
          {game === 'fconline' && `${item.gameName} · Lv.${(item.stats as any)?.level || 0}`}
        </p>
      </div>

      {/* 티어/레벨 */}
      <div className="text-right">
        {game === 'lol' && item.soloRank && (
          <>
            <p className="font-black text-sm" style={{ color: TIER_COLORS[item.soloRank.tier] || '#6B7280' }}>
              {item.tier}
            </p>
            <p className="text-[10px] text-gray-400">{item.soloRank.lp} LP · {item.soloRank.winRate}%</p>
          </>
        )}
        {game === 'maple' && (
          <>
            <p className="font-black text-sm text-orange-500">Lv.{item.level}</p>
            <p className="text-[10px] text-gray-400">
              전투력 {fmtPower((item.stats as any)?.combatPower || 0)}
            </p>
          </>
        )}
        {game === 'fconline' && (
          <>
            <p className="font-black text-sm text-green-600">{item.tier}</p>
            <p className="text-[10px] text-gray-400">Lv.{(item.stats as any)?.level || 0}</p>
          </>
        )}
      </div>
    </div>
  );
}

function fmtPower(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만`;
  return n.toLocaleString();
}
