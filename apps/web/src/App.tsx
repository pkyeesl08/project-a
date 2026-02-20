import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/api';
import { socketService } from './lib/socket';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import GamePlayPage from './pages/GamePlayPage';
import RankingsPage from './pages/RankingsPage';
import MapPage from './pages/MapPage';
import BattlePage from './pages/BattlePage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import ExternalRankingPage from './pages/ExternalRankingPage';
import AvatarPage from './pages/AvatarPage';
import EndlessModePage from './pages/EndlessModePage';
import ChallengeLinkPage from './pages/ChallengeLinkPage';

/** 로그인이 필요한 라우트 — 미로그인 시 /register로 리다이렉트 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  return isLoggedIn ? <>{children}</> : <Navigate to="/register" replace />;
}

export default function App() {
  const accessToken = useAuthStore(s => s.accessToken);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);

  // accessToken이 바뀔 때마다 API 클라이언트에 동기화
  useEffect(() => { api.setToken(accessToken); }, [accessToken]);

  // 로그인 시 소켓 연결, 로그아웃 시 소켓 해제
  useEffect(() => {
    if (isLoggedIn && accessToken) {
      socketService.connect(accessToken);
    } else {
      socketService.disconnect();
    }
  }, [isLoggedIn, accessToken]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/rankings/external" element={<ExternalRankingPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/battle" element={
          <PrivateRoute><BattlePage /></PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute><ProfilePage /></PrivateRoute>
        } />
      </Route>
      {/* 풀스크린 (탭바 없음) */}
      <Route path="/avatar" element={
        <PrivateRoute><AvatarPage /></PrivateRoute>
      } />
      <Route path="/play/:gameType" element={<GamePlayPage />} />
      <Route path="/challenge/:token" element={<ChallengeLinkPage />} />
      <Route path="/endless" element={<EndlessModePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
    </Routes>
  );
}
