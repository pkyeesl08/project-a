import { Outlet, NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const tabs = [
  { path: '/', label: '홈', icon: '🏠' },
  { path: '/games', label: '게임', icon: '🎮' },
  { path: '/rankings', label: '랭킹', icon: '🏆' },
  { path: '/map', label: '지도', icon: '🗺️' },
  { path: '/battle', label: '대전', icon: '⚔️' },
  { path: '/profile', label: '프로필', icon: '👤' },
];

export default function Layout() {
  const user = useAuthStore(s => s.user);
  const regionLabel = user?.regionName ?? '동네 미인증';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
        <h1 className="text-xl font-bold tracking-tight">동겜랭크</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 rounded-full px-2 py-1">
            {regionLabel}
          </span>
          <span className="text-sm">🔔</span>
        </div>
      </header>

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
