import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface Neighborhood {
  district: string;
  city: string;
  activeUsers: number;
  gamePlays: number;
  topScore: number;
  onlineNow: number;
  intensity: number;
}

/* 구 단위 활성도 레벨 */
function intensityToColor(intensity: number): string {
  if (intensity >= 0.8) return 'from-red-500 to-orange-500';
  if (intensity >= 0.5) return 'from-orange-400 to-yellow-400';
  if (intensity >= 0.2) return 'from-yellow-300 to-green-400';
  return 'from-green-300 to-teal-400';
}

function intensityLabel(intensity: number): string {
  if (intensity >= 0.8) return '🔥 초활성';
  if (intensity >= 0.5) return '⚡ 활성';
  if (intensity >= 0.2) return '💬 보통';
  return '💤 조용';
}

/* 활성도에 따른 타일 크기 지표 */
function intensityBadgeColor(intensity: number): string {
  if (intensity >= 0.8) return 'bg-red-500';
  if (intensity >= 0.5) return 'bg-orange-400';
  if (intensity >= 0.2) return 'bg-yellow-400 text-gray-900';
  return 'bg-gray-500';
}

/* mock 데이터 — API 실패 시 폴백 */
const MOCK_NEIGHBORHOODS: Neighborhood[] = [
  { district: '강남구', city: '서울', activeUsers: 142, gamePlays: 389, topScore: 8420, onlineNow: 23, intensity: 0.85 },
  { district: '마포구', city: '서울', activeUsers: 98,  gamePlays: 201, topScore: 7810, onlineNow: 14, intensity: 0.55 },
  { district: '성동구', city: '서울', activeUsers: 74,  gamePlays: 155, topScore: 7220, onlineNow: 9,  intensity: 0.42 },
  { district: '서초구', city: '서울', activeUsers: 115, gamePlays: 280, topScore: 9100, onlineNow: 18, intensity: 0.72 },
  { district: '송파구', city: '서울', activeUsers: 131, gamePlays: 310, topScore: 8750, onlineNow: 20, intensity: 0.78 },
  { district: '용산구', city: '서울', activeUsers: 62,  gamePlays: 120, topScore: 6900, onlineNow: 7,  intensity: 0.30 },
  { district: '은평구', city: '서울', activeUsers: 44,  gamePlays: 87,  topScore: 6200, onlineNow: 5,  intensity: 0.18 },
  { district: '동작구', city: '서울', activeUsers: 55,  gamePlays: 102, topScore: 6500, onlineNow: 6,  intensity: 0.25 },
  { district: '광진구', city: '서울', activeUsers: 67,  gamePlays: 140, topScore: 7050, onlineNow: 8,  intensity: 0.35 },
  { district: '영등포구', city: '서울', activeUsers: 88, gamePlays: 175, topScore: 7300, onlineNow: 11, intensity: 0.48 },
  { district: '수원시', city: '경기', activeUsers: 103, gamePlays: 240, topScore: 7900, onlineNow: 16, intensity: 0.62 },
  { district: '성남시', city: '경기', activeUsers: 91,  gamePlays: 193, topScore: 7600, onlineNow: 12, intensity: 0.52 },
];

type SortKey = 'activity' | 'online' | 'score';

export default function MapPage() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Neighborhood | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('activity');
  const [isPublic, setIsPublic] = useState(false);
  const [myDistrict] = useState<string | null>(null); // 실제로는 authStore에서 가져옴

  const loadNeighborhoods = useCallback(async () => {
    try {
      const data = await api.getNeighborhoods();
      if (Array.isArray(data) && data.length > 0) {
        setNeighborhoods(data);
      } else {
        setNeighborhoods(MOCK_NEIGHBORHOODS);
      }
    } catch {
      setNeighborhoods(MOCK_NEIGHBORHOODS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNeighborhoods(); }, [loadNeighborhoods]);

  const sorted = [...neighborhoods].sort((a, b) => {
    if (sortKey === 'activity') return b.gamePlays - a.gamePlays;
    if (sortKey === 'online') return b.onlineNow - a.onlineNow;
    return b.topScore - a.topScore;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-950">

      {/* 헤더 */}
      <div className="bg-gray-900 px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-white font-black text-lg">동네 랭킹 지도</h2>
            <p className="text-white/40 text-xs">구 단위 게임 활성도</p>
          </div>
          {/* 내 위치 공개 토글 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">공개</span>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`w-10 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-accent' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* 정렬 탭 */}
        <div className="flex gap-2">
          {([['activity', '🔥 활성도'], ['online', '🟢 온라인', ], ['score', '🏆 최고점수']] as [SortKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                sortKey === key ? 'bg-accent text-white' : 'bg-white/10 text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 동네 타일 그리드 */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-white/30 text-sm animate-pulse">동네 정보 불러오는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {sorted.map((nb) => {
              const isMyDistrict = myDistrict === nb.district;
              return (
                <button
                  key={`${nb.city}-${nb.district}`}
                  onClick={() => setSelected(nb)}
                  className={`relative bg-gray-800 rounded-2xl overflow-hidden text-left transition-transform active:scale-95 ${
                    isMyDistrict ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  {/* 활성도 그라데이션 바 */}
                  <div className={`h-1 w-full bg-gradient-to-r ${intensityToColor(nb.intensity)}`} />
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-black text-sm leading-tight">{nb.district}</p>
                        <p className="text-white/40 text-[10px]">{nb.city}</p>
                      </div>
                      {/* 온라인 뱃지 */}
                      <span className={`${intensityBadgeColor(nb.intensity)} text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold`}>
                        {nb.onlineNow > 0 ? `🟢 ${nb.onlineNow}` : '💤'}
                      </span>
                    </div>

                    {/* 활성도 레이블 */}
                    <p className="text-[10px] text-white/50 mb-2">{intensityLabel(nb.intensity)}</p>

                    {/* 스탯 */}
                    <div className="flex gap-3">
                      <div>
                        <p className="text-[9px] text-white/30">24h 플레이</p>
                        <p className="text-xs font-bold text-white/80">{nb.gamePlays.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-white/30">최고점</p>
                        <p className="text-xs font-bold text-yellow-400">{nb.topScore.toLocaleString()}</p>
                      </div>
                    </div>

                    {isMyDistrict && (
                      <span className="absolute bottom-2 right-2 text-accent text-[10px] font-black">내 동네</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 동네 상세 바텀 시트 */}
      {selected && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-3xl shadow-2xl p-5 z-50 animate-slide-up">
          <div className={`h-1.5 w-16 bg-white/20 rounded-full mx-auto mb-4`} />
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 text-white/40 text-xl"
          >
            ✕
          </button>

          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${intensityToColor(selected.intensity)} flex items-center justify-center text-2xl`}>
              🏘️
            </div>
            <div>
              <p className="text-white font-black text-xl">{selected.district}</p>
              <p className="text-white/40 text-sm">{selected.city} · {intensityLabel(selected.intensity)}</p>
            </div>
          </div>

          {/* 스탯 카드 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: '온라인', value: selected.onlineNow, suffix: '명', color: 'text-green-400' },
              { label: '24h 유저', value: selected.activeUsers, suffix: '명', color: 'text-blue-400' },
              { label: '24h 게임', value: selected.gamePlays, suffix: '판', color: 'text-purple-400' },
              { label: '최고점수', value: selected.topScore.toLocaleString(), suffix: '', color: 'text-yellow-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-2 text-center">
                <p className={`${s.color} font-black text-sm`}>{s.value}<span className="text-[10px]">{s.suffix}</span></p>
                <p className="text-white/30 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button className="flex-1 bg-accent text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              ⚔️ 이 동네 도전
            </button>
            <button className="flex-1 bg-white/10 text-white/70 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              🏆 동네 랭킹 보기
            </button>
          </div>
        </div>
      )}

      {/* 선택된 동네 오버레이 배경 */}
      {selected && (
        <div
          className="absolute inset-0 bg-black/50 z-40"
          onClick={() => setSelected(null)}
        />
      )}
    </div>
  );
}
