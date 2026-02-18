import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuthStore } from './stores/authStore';
import { api } from './lib/api';
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

export default function App() {
  // accessToken이 바뀔 때마다 API 클라이언트에 동기화
  const accessToken = useAuthStore(s => s.accessToken);
  useEffect(() => { api.setToken(accessToken); }, [accessToken]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/rankings/external" element={<ExternalRankingPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      {/* 풀스크린 (탭바 없음) */}
      <Route path="/avatar" element={<AvatarPage />} />
      <Route path="/play/:gameType" element={<GamePlayPage />} />
      <Route path="/endless" element={<EndlessModePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
    </Routes>
  );
}
