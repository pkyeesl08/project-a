import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AttendanceStatus {
  checkedInToday: boolean;
  streak: number;
  weekCalendar: Array<{
    date: string;
    dayLabel: string;
    checked: boolean;
    isToday: boolean;
    reward: { coins?: number; gems?: number; label: string };
  }>;
  nextReward: { coins?: number; gems?: number; label: string; cycleDay: number } | null;
  todayRewards: { coins?: number; gems?: number; label: string } | null;
}

interface Props {
  onClose: () => void;
}

export default function AttendanceModal({ onClose }: Props) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ rewards: { coins?: number; gems?: number; label: string } | null; streak: number } | null>(null);

  useEffect(() => {
    api.getAttendanceStatus().then(setStatus).catch(() => {});
  }, []);

  const handleCheckIn = async () => {
    if (checking || status?.checkedInToday) return;
    setChecking(true);
    try {
      const res = await api.checkIn();
      setResult({ rewards: res.rewards, streak: res.streak });
      // 상태 갱신
      const updated = await api.getAttendanceStatus();
      setStatus(updated);
    } catch { /* 무시 */ } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-slide-up">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black">📅 출석 체크</h2>
            {status && (
              <p className="text-sm text-gray-500 mt-0.5">
                🔥 {status.streak}일 연속 출석 중
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl font-light leading-none">✕</button>
        </div>

        {/* 보상 결과 */}
        {result && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 mb-4 text-white text-center">
            <p className="text-2xl font-black mb-1">🎉 출석 완료!</p>
            <p className="text-lg font-bold">{result.rewards?.label ?? '보상 지급 완료'}</p>
            <p className="text-sm opacity-80 mt-1">🔥 {result.streak}일 연속 출석</p>
          </div>
        )}

        {/* 이번 주 달력 */}
        {status && (
          <div className="grid grid-cols-7 gap-1.5 mb-5">
            {status.weekCalendar.map((day) => (
              <div key={day.date}
                className={`flex flex-col items-center rounded-xl p-2 ${
                  day.isToday ? 'ring-2 ring-primary' : ''
                } ${day.checked ? 'bg-primary/10' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-bold mb-1 ${day.isToday ? 'text-primary' : 'text-gray-400'}`}>
                  {day.dayLabel}
                </p>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${
                  day.checked ? 'bg-primary text-white' : 'bg-gray-200'
                }`}>
                  {day.checked ? '✓' : day.reward.gems ? '💎' : '🪙'}
                </div>
                <p className="text-[9px] text-gray-400 mt-1 text-center leading-tight">
                  {day.reward.gems ? `💎${day.reward.gems}` : day.reward.coins ? `🪙${day.reward.coins}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 다음 보상 미리보기 */}
        {status?.nextReward && !status.checkedInToday && (
          <div className="bg-indigo-50 rounded-xl p-3 mb-4 flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-xs text-gray-400">오늘 출석 시</p>
              <p className="text-sm font-bold text-indigo-700">{status.nextReward.label}</p>
            </div>
          </div>
        )}

        {/* 체크인 버튼 */}
        <button
          onClick={status?.checkedInToday ? onClose : handleCheckIn}
          disabled={checking}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 ${
            status?.checkedInToday
              ? 'bg-gray-100 text-gray-400'
              : 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
          }`}>
          {checking
            ? '체크인 중...'
            : status?.checkedInToday
              ? '✓ 오늘 이미 출석했어요'
              : '📅 오늘 출석하기'}
        </button>
      </div>
    </div>
  );
}
