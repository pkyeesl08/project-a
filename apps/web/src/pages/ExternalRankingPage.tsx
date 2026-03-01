import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

type GameTab = 'lol' | 'maple' | 'fconline' | 'pubg' | 'steam';

const GAMES: { key: GameTab; icon: string; name: string; color: string }[] = [
  { key: 'lol',      icon: '🎮', name: 'LoL',     color: 'from-blue-600 to-indigo-700' },
  { key: 'maple',    icon: '🍁', name: '메이플',   color: 'from-orange-500 to-amber-600' },
  { key: 'fconline', icon: '⚽', name: 'FC온라인', color: 'from-green-600 to-emerald-700' },
  { key: 'pubg',     icon: '🪖', name: 'PUBG',     color: 'from-yellow-600 to-orange-700' },
  { key: 'steam',    icon: '🎯', name: 'Steam',    color: 'from-slate-600 to-gray-800' },
];

const MOCK_REGIONS = [
  { id: 'r1', name: '역삼동', district: '강남구' },
  { id: 'r2', name: '서초동', district: '서초구' },
  { id: 'r3', name: '잠실동', district: '송파구' },
  { id: 'r4', name: '홍대입구', district: '마포구' },
];

/* ── Mock 데이터 ── */

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

const MOCK_PUBG_RANKING = [
  { rank: 1, nickname: '역삼동호랑이', playerName: 'KR_Tiger123', tier: '다이아몬드 1', tierScore: 560000, squadFpp: { tier: 'Diamond', subTier: '1', rp: 4820, kills: 1284, deaths: 623, wins: 87, roundsPlayed: 412, kda: 2.34, winRate: '21.1' } },
  { rank: 2, nickname: '강남독수리', playerName: 'Eagle_GN', tier: '플래티넘 1', tierScore: 460000, squadFpp: { tier: 'Platinum', subTier: '1', rp: 3614, kills: 876, deaths: 512, wins: 54, roundsPlayed: 318, kda: 1.97, winRate: '17.0' } },
  { rank: 3, nickname: '코딩판다', playerName: 'Panda_Coder', tier: '골드 2', tierScore: 360000, squadFpp: { tier: 'Gold', subTier: '2', rp: 2870, kills: 654, deaths: 487, wins: 38, roundsPlayed: 267, kda: 1.58, winRate: '14.2' } },
  { rank: 4, nickname: '삼성늑대', playerName: 'Wolf_Samsung', tier: '실버 1', tierScore: 260000, squadFpp: { tier: 'Silver', subTier: '1', rp: 1924, kills: 421, deaths: 398, wins: 21, roundsPlayed: 198, kda: 1.21, winRate: '10.6' } },
  { rank: 5, nickname: '테헤란로상어', playerName: 'Shark_TH', tier: '브론즈 2', tierScore: 160000, squadFpp: { tier: 'Bronze', subTier: '2', rp: 1102, kills: 287, deaths: 342, wins: 9, roundsPlayed: 143, kda: 0.92, winRate: '6.3' } },
];

const MOCK_STEAM_RANKING = [
  { rank: 1, nickname: '역삼동호랑이', personaName: 'KR_Tiger', tier: 'CS 마스터', totalHours: 3847, gameCount: 312, bestTitle: 'CS 마스터', notableGames: [{ appId: 730, name: 'CS2 / CS:GO', hours: 3847, title: 'CS 마스터' }, { appId: 578080, name: 'PUBG', hours: 234, title: null }] },
  { rank: 2, nickname: '강남독수리', personaName: 'Eagle_GN', tier: 'PUBG 프로', totalHours: 2614, gameCount: 245, bestTitle: 'PUBG 프로', notableGames: [{ appId: 578080, name: 'PUBG', hours: 1284, title: 'PUBG 프로' }, { appId: 730, name: 'CS2 / CS:GO', hours: 487, title: 'CS 베테랑' }] },
  { rank: 3, nickname: '코딩판다', personaName: 'Panda_Dev', tier: 'CS 베테랑', totalHours: 1932, gameCount: 187, bestTitle: 'CS 베테랑', notableGames: [{ appId: 730, name: 'CS2 / CS:GO', hours: 1124, title: 'CS 마스터' }] },
  { rank: 4, nickname: '삼성늑대', personaName: 'WolfSSG', tier: '1,247시간', totalHours: 1247, gameCount: 98, bestTitle: null, notableGames: [{ appId: 570, name: 'Dota 2', hours: 687, title: null }, { appId: 578080, name: 'PUBG', hours: 423, title: 'PUBG 베테랑' }] },
  { rank: 5, nickname: '테헤란로상어', personaName: 'SharkTH', tier: 'PUBG 베테랑', totalHours: 876, gameCount: 67, bestTitle: 'PUBG 베테랑', notableGames: [{ appId: 578080, name: 'PUBG', hours: 512, title: 'PUBG 프로' }] },
];

/* ── 티어 색상 ── */

const LOL_TIER_COLORS: Record<string, string> = {
  IRON: '#6B7280', BRONZE: '#B45309', SILVER: '#9CA3AF', GOLD: '#EAB308',
  PLATINUM: '#22D3EE', EMERALD: '#34D399', DIAMOND: '#60A5FA',
  MASTER: '#A855F7', GRANDMASTER: '#EF4444', CHALLENGER: '#FBBF24',
};

const PUBG_TIER_COLORS: Record<string, string> = {
  Bronze: '#B45309', Silver: '#9CA3AF', Gold: '#EAB308',
  Platinum: '#22D3EE', Diamond: '#60A5FA', Master: '#A855F7',
};

/* ═══════════════════════════════════════
 * 메인 페이지
 * ═══════════════════════════════════════ */
function getMockRanking(game: GameTab): any[] {
  if (game === 'lol') return MOCK_LOL_RANKING;
  if (game === 'maple') return MOCK_MAPLE_RANKING;
  if (game === 'pubg') return MOCK_PUBG_RANKING;
  if (game === 'steam') return MOCK_STEAM_RANKING;
  return MOCK_FC_RANKING;
}

export default function ExternalRankingPage() {
  const [activeGame, setActiveGame] = useState<GameTab>('lol');
  const [scope, setScope] = useState<'region' | 'school'>('region');
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = useAuthStore(s => s.user);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    api.getMe().then(setUserProfile).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const scopeId: string | undefined =
      scope === 'region' ? userProfile?.primaryRegionId : userProfile?.schoolId;

    if (!scopeId) {
      setRanking(getMockRanking(activeGame));
      setLoading(false);
      return;
    }

    let apiCall: Promise<any[]>;
    if (activeGame === 'lol') apiCall = api.getLolRanking(scope, scopeId);
    else if (activeGame === 'pubg') apiCall = api.getPubgRanking(scope, scopeId);
    else if (activeGame === 'steam') apiCall = api.getSteamRanking(scope, scopeId);
    else {
      setRanking(getMockRanking(activeGame));
      setLoading(false);
      return;
    }

    apiCall
      .then(data => setRanking(data.length > 0 ? data : getMockRanking(activeGame)))
      .catch(() => setRanking(getMockRanking(activeGame)))
      .finally(() => setLoading(false));
  }, [activeGame, scope, userProfile]);

  const currentGame = GAMES.find(g => g.key === activeGame)!;
  const regionName = user?.regionName ?? userProfile?.regionName ?? '내 동네';

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* 헤더 */}
      <div className={`bg-gradient-to-r ${currentGame.color} rounded-2xl p-5 text-white`}>
        <p className="text-xs text-white/60 mb-1">동네별 외부 게임 랭킹</p>
        <h1 className="text-2xl font-black flex items-center gap-2">
          {currentGame.icon} {scope === 'region' ? regionName : '우리 학교'} {currentGame.name} 랭킹
        </h1>
        <p className="text-sm text-white/70 mt-1">
          {activeGame === 'pubg'
            ? '우리 동네 배틀그라운드 TOP 랭커는?'
            : activeGame === 'steam'
              ? '우리 동네 스팀 게임 총 플레이타임 순위'
              : `우리 동네에서 ${currentGame.name} 가장 잘하는 사람은?`}
        </p>
      </div>

      {/* 게임 탭 — 스크롤 가능 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {GAMES.map(g => (
          <button
            key={g.key}
            onClick={() => setActiveGame(g.key)}
            className={`flex-shrink-0 px-3 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              activeGame === g.key
                ? `bg-gradient-to-r ${g.color} text-white shadow-lg`
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {/* 범위/지역 선택 */}
      <div className="flex gap-2">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['region', 'school'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                scope === s ? 'bg-white shadow text-gray-900' : 'text-gray-400'
              }`}
            >
              {s === 'region' ? '🏠 동네' : '🏫 학교'}
            </button>
          ))}
        </div>
        {scope === 'region' && (
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center">
            🏠 {regionName}
          </div>
        )}
      </div>

      {/* PUBG 서버 뱃지 */}
      {activeGame === 'pubg' && (
        <div className="flex gap-2">
          <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1.5 rounded-xl">
            🇰🇷 카카오 배그 + 🌐 스팀 통합 랭킹
          </span>
        </div>
      )}

      {/* Steam 안내 */}
      {activeGame === 'steam' && (
        <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
          <span className="text-base flex-shrink-0">ℹ️</span>
          <span>총 플레이타임 기준 순위 · 특정 게임 N시간 이상 시 칭호 획득</span>
        </div>
      )}

      {/* 랭킹 리스트 */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">랭킹 불러오는 중...</div>
      ) : (
      <div className="space-y-2">
        {/* Top 3 Podium */}
        {ranking.length >= 3 && (
          <div className="flex items-end gap-2 mb-4">
            {[1, 0, 2].map(idx => {
              const item    = ranking[idx];
              const isFirst = idx === 0;
              return (
                <div
                  key={idx}
                  className={`flex-1 text-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}
                >
                  <div className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 ${isFirst ? 'pb-6 -mb-2' : ''}`}>
                    <p className="text-2xl mb-1">{['🥇', '🥈', '🥉'][idx]}</p>
                    <p className="font-black text-sm truncate">{item.nickname}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {activeGame === 'lol'      && item.gameName}
                      {activeGame === 'maple'    && item.characterName}
                      {activeGame === 'fconline' && item.gameName}
                      {activeGame === 'pubg'     && item.playerName}
                      {activeGame === 'steam'    && item.personaName}
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
        {ranking.slice(3).map((item: any) => (
          <RankingRow key={item.rank} item={item} game={activeGame} />
        ))}

        {ranking.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-bold">아직 연동한 유저가 없어요</p>
            <p className="text-sm mt-1">프로필에서 게임 계정을 연동해보세요!</p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-3 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
            >
              연동하러 가기
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
 * 랭킹 행
 * ═══════════════════════════════════════ */
function RankingRow({ item, game }: { item: any; game: GameTab }) {
  const isTop10 = item.rank <= 10;

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
      {/* 순위 */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 ${
        isTop10 ? 'bg-primary/10 text-primary' : 'bg-gray-50 text-gray-400'
      }`}>
        {item.rank}
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{item.nickname}</p>
        <p className="text-xs text-gray-400 truncate">
          {game === 'lol'      && item.gameName}
          {game === 'maple'    && `${item.characterName} · ${item.stats?.world || ''}`}
          {game === 'fconline' && `${item.gameName} · Lv.${item.stats?.level || 0}`}
          {game === 'pubg'     && item.playerName}
          {game === 'steam'    && item.personaName}
        </p>
        {/* Steam 주요 게임 태그 */}
        {game === 'steam' && item.notableGames?.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {item.notableGames.slice(0, 2).map((g: any) => (
              <span key={g.appId} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {g.name} {g.hours}h
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 티어/스탯 */}
      <div className="text-right flex-shrink-0">
        {game === 'lol' && item.soloRank && (
          <>
            <p className="font-black text-sm" style={{ color: LOL_TIER_COLORS[item.soloRank.tier] || '#6B7280' }}>
              {item.tier}
            </p>
            <p className="text-[10px] text-gray-400">{item.soloRank.lp} LP · {item.soloRank.winRate}%</p>
          </>
        )}
        {game === 'maple' && (
          <>
            <p className="font-black text-sm text-orange-500">Lv.{item.level}</p>
            <p className="text-[10px] text-gray-400">전투력 {fmtPower(item.stats?.combatPower || 0)}</p>
          </>
        )}
        {game === 'fconline' && (
          <>
            <p className="font-black text-sm text-green-600">{item.tier}</p>
            <p className="text-[10px] text-gray-400">Lv.{item.stats?.level || 0}</p>
          </>
        )}
        {game === 'pubg' && item.squadFpp && (
          <>
            <p className="font-black text-sm" style={{ color: PUBG_TIER_COLORS[item.squadFpp.tier] || '#6B7280' }}>
              {item.tier}
            </p>
            <p className="text-[10px] text-gray-400">
              {item.squadFpp.rp} RP · KDA {item.squadFpp.kda}
            </p>
          </>
        )}
        {game === 'steam' && (
          <>
            <p className="font-black text-sm text-slate-700">
              {fmtHours(item.totalHours)}
            </p>
            {item.bestTitle && (
              <p className="text-[10px] text-purple-500 font-semibold">{item.bestTitle}</p>
            )}
            {!item.bestTitle && (
              <p className="text-[10px] text-gray-400">{item.gameCount}개 게임</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── 유틸 ── */

function fmtPower(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만`;
  return n.toLocaleString();
}

function fmtHours(h: number): string {
  if (h >= 10000) return `${(h / 10000).toFixed(1)}만h`;
  if (h >= 1000) return `${(h / 1000).toFixed(1)}kh`;
  return `${h.toLocaleString()}h`;
}
