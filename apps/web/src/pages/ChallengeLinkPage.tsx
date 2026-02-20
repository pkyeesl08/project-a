import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { api } from '../lib/api';
import type { ChallengeTarget } from './GamePlayPage';

export default function ChallengeLinkPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<{
    userId: string; nickname: string; gameType: string;
    score: number; normalizedScore: number;
    scoreTimeline: [number, number][];
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    api.getChallengeByToken(token)
      .then(data => {
        if (data) setChallenge(data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-5xl mb-4 animate-bounce">🎮</p>
          <p className="text-white/60">챌린지 정보 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (notFound || !challenge) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center px-8">
          <p className="text-5xl mb-4">❌</p>
          <p className="text-xl font-bold mb-2">만료된 챌린지 링크예요</p>
          <p className="text-white/40 text-sm mb-8">챌린지 링크는 7일 후 만료됩니다.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-bold active:scale-95 transition-transform">
            홈으로 가기
          </button>
        </div>
      </div>
    );
  }

  const config = GAME_CONFIGS[challenge.gameType as GameType];
  if (!config) return null;

  const challengeTarget: ChallengeTarget = {
    userId: challenge.userId,
    nickname: challenge.nickname,
    score: challenge.score,
    scoreTimeline: challenge.scoreTimeline,
  };

  const createdDate = new Date(challenge.createdAt).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-white">
      {/* 앱 로고 */}
      <p className="text-white/40 text-sm font-bold mb-8">🎮 동겜랭크</p>

      {/* 챌린지 카드 */}
      <div className="w-full max-w-sm bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-7 shadow-2xl mb-6">
        <p className="text-xs opacity-70 mb-1">도전장</p>
        <p className="text-2xl font-black mb-1">
          {challenge.nickname}
        </p>
        <p className="opacity-60 text-sm mb-5">가 당신에게 도전장을 내밀었어요!</p>

        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 mb-5">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <p className="font-bold">{config.name}</p>
            <p className="text-xs opacity-60">{config.durationMs / 1000}초</p>
          </div>
        </div>

        {/* 목표 점수 */}
        <div className="text-center mb-2">
          <p className="text-xs opacity-60">넘어야 할 기록</p>
          <p className="text-6xl font-black my-2">{challenge.score}</p>
          <p className="text-xs opacity-50">{config.scoreMetric}</p>
        </div>

        {/* 타임라인 힌트 */}
        {challenge.scoreTimeline.length > 0 && (
          <p className="text-center text-xs opacity-40 mt-3">
            플레이 중 실시간 비교가 표시됩니다
          </p>
        )}
      </div>

      {/* 도전하기 CTA */}
      <button
        onClick={() => navigate(`/play/${challenge.gameType}`, {
          state: { challengeTarget },
        })}
        className="w-full max-w-sm bg-yellow-400 text-gray-900 font-black py-4 rounded-2xl
                   text-lg active:scale-95 transition-transform shadow-lg mb-3">
        ⚔️ 도전하기
      </button>

      <button
        onClick={() => navigate('/')}
        className="text-white/30 text-sm py-2">
        앱 구경하기
      </button>

      <p className="text-white/20 text-xs mt-6">{createdDate} 생성된 챌린지</p>
    </div>
  );
}
