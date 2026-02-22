import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'notif_banner_dismissed';

export default function NotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 이미 권한 허용됐거나 배너 닫은 경우 숨김
    if (
      !('Notification' in window) ||
      Notification.permission === 'granted' ||
      Notification.permission === 'denied' ||
      localStorage.getItem(DISMISSED_KEY)
    ) return;
    // 3초 뒤 표시 (앱 진입 직후 바로 뜨지 않도록)
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const handleAllow = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // TODO: VAPID 기반 PushSubscription을 서버에 전송
        // const reg = await navigator.serviceWorker.ready;
        // const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY });
        // await api.registerPushSubscription(sub.toJSON());
        localStorage.setItem(DISMISSED_KEY, '1');
        setVisible(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-2xl border border-white/10
                      flex items-start gap-3">
        <span className="text-2xl shrink-0">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold mb-0.5">알림을 허용하면 더 빠르게!</p>
          <p className="text-xs text-white/60 leading-relaxed">
            친구 도전·랭킹 변동·미션 완료 알림을 놓치지 마세요.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAllow}
              disabled={loading}
              className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-xl
                         active:scale-95 transition-transform disabled:opacity-50"
            >
              {loading ? '...' : '허용하기'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/40 text-xs px-3 py-1.5"
            >
              나중에
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-white/30 text-lg shrink-0">✕</button>
      </div>
    </div>
  );
}
