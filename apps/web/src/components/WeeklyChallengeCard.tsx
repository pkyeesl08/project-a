import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAME_CONFIGS, GameType } from '@donggamerank/shared';
import { api } from '../lib/api';
import type { ChallengeTarget } from '../pages/GamePlayPage';

interface WeeklyData {
  challenge: {
    weekKey: string;
    gameType: string;
    startAt: string;
    endAt: string;
    remainingMs: number;
  };
  topN: { rank: number; userId: string; score: number; participantCount: number }[];
  myRank: { rank: number; score: number; total: number } | null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '마감';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `D-${days}`;
  return `${hours}시간 남음`;
}

export default function WeeklyChallengeCard() {
  const navigate = useNavigate();
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeeklyChallenge()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const { challenge, topN, myRank } = data;
  const config = GAME_CONFIGS[challenge.gameType as GameType];
  if (!config) return null;

  const top1 = topN[0];

  // 도전 버튼 — top1 유저가 있으면 그 유저의 scoreTimeline으로 도전
  const handleChallenge = async () => {
    try {
      const target = await api.getChallengeTarget(challenge.gameType, top1?.userId);
      if (target) {
        const challengeTarget: ChallengeTarget = {
          userId: target.userId,
          nickname: target.nickname,
          score: target.score,
          scoreTimeline: target.scoreTimeline,
        };
        navigate(`/play/${challenge.gameType}`, { state: { challengeTarget } });
      } else {
        navigate(`/play/${challenge.gameType}`);
      }
    } catch {
      navigate(`/play/${challenge.gameType}`);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-black">🏅 주간 동네 챌린지</h2>
        <span className="text-xs text-accent font-bold">
          {formatRemaining(challenge.remainingMs)}
        </span>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        {/* 이번 주 게임 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <p className="text-xs opacity-70">이번 주 챌린지 게임</p>
            <p className="text-lg font-black">{config.name}</p>
            <p className="text-xs opacity-60">{config.durationMs / 1000}초 · {config.scoreMetric}</p>
          </div>
        </div>

        {/* 내 순위 */}
        {myRank ? (
          <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-60">내 동네 순위</p>
              <p className="text-2xl font-black">#{myRank.rank}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-60">내 점수</p>
              <p className="text-xl font-bold">{myRank.score}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-60">참가자</p>
              <p className="text-xl font-bold">{myRank.total}명</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl p-3 mb-4 text-center">
            <p className="text-sm opacity-70">아직 참가하지 않았어요</p>
            <p className="text-xs opacity-50 mt-0.5">
              {topN[0]?.participantCount ?? 0}명이 참가 중
            </p>
          </div>
        )}

        {/* 미니 리더보드 (top3) */}
        {topN.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {topN.slice(0, 3).map((entry) => (
              <div key={entry.userId} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                <span className="text-sm w-5 text-center">
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                </span>
                <span className="flex-1 text-sm font-medium opacity-90 truncate">
                  {entry.userId.slice(0, 8)}...
                </span>
                <span className="text-sm font-bold">{entry.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* 도전하기 버튼 */}
        <button
          onClick={handleChallenge}
          className="w-full bg-white text-indigo-700 font-black py-3 rounded-xl
                     active:scale-95 transition-transform text-sm">
          {myRank ? '한 판 더 · 순위 올리기' : `${config.icon} 지금 참가하기`}
          {top1 && !myRank && ` (1위 ${top1.score}점)`}
        </button>
      </div>
    </section>
  );
}
