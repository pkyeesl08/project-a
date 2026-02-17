import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import GamePlayPage from './pages/GamePlayPage';
import RankingsPage from './pages/RankingsPage';
import MapPage from './pages/MapPage';
import BattlePage from './pages/BattlePage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/games" element={<GamesPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="/play/:gameType" element={<GamePlayPage />} />
    </Routes>
  );
}
