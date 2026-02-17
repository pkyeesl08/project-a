import { useState } from 'react';

interface MapUser {
  id: string;
  nickname: string;
  elo: number;
  bestGame: string;
  lat: number;
  lng: number;
}

const MOCK_USERS: MapUser[] = [
  { id: '1', nickname: '빠른호랑이', elo: 1580, bestGame: '⚡', lat: 37.501, lng: 127.040 },
  { id: '2', nickname: '강한독수리', elo: 1420, bestGame: '👆', lat: 37.499, lng: 127.038 },
  { id: '3', nickname: '멋진상어', elo: 1350, bestGame: '🧠', lat: 37.502, lng: 127.042 },
  { id: '4', nickname: '날렵한용', elo: 1610, bestGame: '🎯', lat: 37.498, lng: 127.041 },
  { id: '5', nickname: '귀여운판다', elo: 1280, bestGame: '🎮', lat: 37.503, lng: 127.037 },
];

export default function MapPage() {
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  return (
    <div className="relative h-[calc(100vh-120px)]">
      {/* Map Placeholder */}
      <div className="w-full h-full bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden">
        {/* Grid lines for map feel */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={`h${i}`} className="absolute w-full border-t border-gray-400" style={{ top: `${i * 5}%` }} />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={`v${i}`} className="absolute h-full border-l border-gray-400" style={{ left: `${i * 5}%` }} />
          ))}
        </div>

        {/* My Location */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl shadow-lg border-4 border-white">
            👤
          </div>
          <div className="w-24 h-24 bg-primary/10 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 animate-ping" />
        </div>

        {/* Other Users */}
        {MOCK_USERS.map((user, i) => {
          const positions = [
            { top: '25%', left: '30%' },
            { top: '35%', left: '65%' },
            { top: '60%', left: '25%' },
            { top: '70%', left: '70%' },
            { top: '20%', left: '55%' },
          ];
          const pos = positions[i % positions.length];
          return (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2 group"
              style={pos}
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-md border-2 border-accent group-hover:scale-110 transition-transform">
                {user.bestGame}
              </div>
              <p className="text-[10px] font-bold text-center mt-0.5 bg-white/80 rounded px-1">{user.nickname.slice(0, 4)}</p>
            </button>
          );
        })}
      </div>

      {/* Public Toggle */}
      <div className="absolute top-3 right-3 z-30 bg-white rounded-xl shadow-lg px-3 py-2 flex items-center gap-2">
        <span className="text-xs text-gray-500">내 위치 공개</span>
        <button
          onClick={() => setIsPublic(!isPublic)}
          className={`w-10 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-primary' : 'bg-gray-300'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${isPublic ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Heatmap Legend */}
      <div className="absolute top-3 left-3 z-30 bg-white rounded-xl shadow-lg px-3 py-2">
        <p className="text-xs font-bold text-gray-600 mb-1">🔥 활성 유저</p>
        <p className="text-xs text-gray-400">{MOCK_USERS.length}명 주변에 있음</p>
      </div>

      {/* Selected User Card */}
      {selectedUser && (
        <div className="absolute bottom-4 left-4 right-4 z-30 bg-white rounded-2xl shadow-xl p-4 animate-slide-up">
          <button
            onClick={() => setSelectedUser(null)}
            className="absolute top-2 right-3 text-gray-400 text-lg"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
              {selectedUser.bestGame}
            </div>
            <div className="flex-1">
              <p className="font-bold">{selectedUser.nickname}</p>
              <p className="text-sm text-gray-400">ELO {selectedUser.elo}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 bg-accent text-white py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              ⚔️ 대전 신청
            </button>
            <button className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform">
              👤 프로필 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
