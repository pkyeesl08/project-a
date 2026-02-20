import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

const tabs = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/games', label: '게임', icon: '🎮' },
  { path: '/rankings', label: '랭킹', icon: '🏆' },
  { path: '/map', label: '지도', icon: '🗺️' },
  { path: '/battle', label: '대전', icon: '⚔️' },
  { path: '/profile', label: '프로필', icon: '👤' },
];

/** 알림 목록 패널 */
function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markAllRead, clearAll } = useNotificationStore();

  const typeIcon = (type: string) => {
    if (type === 'weekly_champion') return '🏆';
    if (type === 'dethroned') return '😤';
    if (type === 'challenge_beaten') return '🎉';
    return '🔔';
  };

  return (
    <div className="absolute top-14 right-2 w-80 max-h-[70vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-bold text-sm text-gray-800">알림</span>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <>
              <button onClick={markAllRead} className="text-xs text-primary font-medium">모두 읽음</button>
              <button onClick={clearAll} className="text-xs text-gray-400">지우기</button>
            </>
          )}
          <button onClick={onClose} className="text-gray-400 text-sm ml-1">✕</button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-300">
            <p className="text-3xl mb-2">🔔</p>
            <p className="text-xs">새로운 알림이 없어요</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-gray-50 ${n.read ? 'opacity-50' : ''}`}
            >
              <div className="flex gap-2">
                <span className="text-lg shrink-0">{typeIcon(n.type)}</span>
                <div>
                  <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    {new Date(n.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Layout() {
  const user = useAuthStore(s => s.user);
  const regionLabel = user?.regionName ?? '동네 미인증';
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = () => setPanelOpen(v => !v);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md relative">
        <h1 className="text-xl font-bold tracking-tight">동겜랭크</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 rounded-full px-2 py-1">
            {regionLabel}
          </span>

          {/* 알림 벨 */}
          <button
            onClick={togglePanel}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-transform"
            aria-label="알림"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black
                              min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* 알림 패널 */}
        {panelOpen && <NotificationPanel onClose={() => setPanelOpen(false)} />}
      </header>

      {/* 패널 외부 클릭 시 닫기 오버레이 */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-1 z-40">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                isActive ? 'text-primary font-bold' : 'text-gray-400'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
