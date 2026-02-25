import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

// DNA 트랙 메타데이터
const DNA_TRACKS = [
  {
    key: 'reaction' as const,
    emoji: '⚡',
    name: '반응',
    color: 'bg-yellow-400',
    colorLight: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    effects: [
      { pts: 1, text: 'XP +15%' },
      { pts: 2, text: '코인 +20%' },
      { pts: 3, text: '타임라인 그래프 열람' },
      { pts: 4, text: 'ELO 감소 -10%' },
      { pts: 5, text: '슬로우 토큰 (연습 모드)' },
      { pts: 7, text: 'ELO 쉴드 주 1회' },
    ],
  },
  {
    key: 'puzzle' as const,
    emoji: '🧠',
    name: '두뇌',
    color: 'bg-blue-400',
    colorLight: 'bg-blue-50',
    borderColor: 'border-blue-300',
    effects: [
      { pts: 1, text: 'XP +15%' },
      { pts: 2, text: '코인 +20%' },
      { pts: 3, text: '오답 분석 리포트' },
      { pts: 4, text: 'ELO 감소 -10%' },
      { pts: 5, text: '패턴 연장 +0.5초 (퍼즐)' },
      { pts: 7, text: '세컨드찬스 주 5회' },
    ],
  },
  {
    key: 'action' as const,
    emoji: '🎮',
    name: '액션',
    color: 'bg-red-400',
    colorLight: 'bg-red-50',
    borderColor: 'border-red-300',
    effects: [
      { pts: 1, text: 'XP +15%' },
      { pts: 2, text: '코인 +20%' },
      { pts: 3, text: '엔들리스 하트 +1' },
      { pts: 4, text: 'ELO 상승 +5%' },
      { pts: 5, text: '더블업 토큰 주 1회' },
      { pts: 7, text: '주간 챌린지 재도전 +1' },
    ],
  },
  {
    key: 'precision' as const,
    emoji: '🎯',
    name: '정밀',
    color: 'bg-green-400',
    colorLight: 'bg-green-50',
    borderColor: 'border-green-300',
    effects: [
      { pts: 1, text: 'XP +15%' },
      { pts: 2, text: '코인 +20%' },
      { pts: 3, text: '에임 어시스트 +10% (정밀)' },
      { pts: 4, text: '신기록 코인 2배 (정밀)' },
      { pts: 5, text: '베스트픽 주 3회' },
      { pts: 7, text: '뽑기 할인 5%' },
    ],
  },
  {
    key: 'party' as const,
    emoji: '🌟',
    name: '파티',
    color: 'bg-purple-400',
    colorLight: 'bg-purple-50',
    borderColor: 'border-purple-300',
    effects: [
      { pts: 1, text: 'XP +15%' },
      { pts: 2, text: '코인 +20%' },
      { pts: 3, text: '게시판 상단 핀 가능' },
      { pts: 4, text: '전체 XP +5% (시너지)' },
      { pts: 5, text: '출석 보상 1.5배' },
      { pts: 7, text: '친구 게임 XP +10%' },
    ],
  },
];

const DNA_MAX = 8;

type DnaStatusType = Awaited<ReturnType<typeof api.getDnaStatus>>;

export default function DnaPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DnaStatusType | null>(null);
  const [draft, setDraft] = useState({ reaction: 0, puzzle: 0, action: 0, precision: 0, party: 0 });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState<'free' | 'gems' | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = () => {
    api.getDnaStatus().then(s => {
      setStatus(s);
      setDraft({
        reaction: s.pts.reaction,
        puzzle: s.pts.puzzle,
        action: s.pts.action,
        precision: s.pts.precision,
        party: s.pts.party,
      });
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const totalUsed = draft.reaction + draft.puzzle + draft.action + draft.precision + draft.party;
  const available = status?.totalAvailable ?? 0;
  const remaining = available - totalUsed;
  const isDirty = status && (
    draft.reaction !== status.pts.reaction ||
    draft.puzzle !== status.pts.puzzle ||
    draft.action !== status.pts.action ||
    draft.precision !== status.pts.precision ||
    draft.party !== status.pts.party
  );

  const handleSlider = (key: keyof typeof draft, value: number) => {
    const current = draft[key];
    const diff = value - current;
    if (diff > 0 && remaining < diff) return; // 포인트 부족
    if (value < 0 || value > DNA_MAX) return;
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await api.allocateDna(draft);
      await load();
      showToast('✅ DNA 배분 저장 완료!');
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetFree = async () => {
    if (!status?.canFreeReset || resetting) return;
    if (!confirm('이번 달 무료 리셋을 사용합니다. 계속하시겠습니까?')) return;
    setResetting('free');
    try {
      await api.resetDnaFree();
      await load();
      showToast('✅ DNA 초기화 완료 (무료)');
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setResetting(null);
    }
  };

  const handleResetGems = async () => {
    if (resetting) return;
    if (!confirm(`💎 ${status?.gemResetCost ?? 80}보석을 소모해 DNA를 초기화합니다. 계속하시겠습니까?`)) return;
    setResetting('gems');
    try {
      await api.resetDnaGems();
      await load();
      showToast(`✅ DNA 초기화 완료 (${status?.gemResetCost ?? 80}💎 소모)`);
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setResetting(null);
    }
  };

  const handleToken = async (type: 'elo-shield' | 'double-up' | 'best-pick') => {
    if (activating) return;
    setActivating(type);
    try {
      if (type === 'elo-shield') await api.activateEloShield();
      else if (type === 'double-up') await api.activateDoubleUp();
      else await api.activateBestPick();
      await load();
      const labels = { 'elo-shield': '🛡️ ELO 쉴드', 'double-up': '⚡ 더블업', 'best-pick': '🎯 베스트픽' };
      showToast(`✅ ${labels[type]} 활성화! (1시간 유효)`);
    } catch (e: any) {
      showToast(`❌ ${e.message}`);
    } finally {
      setActivating(null);
    }
  };

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-pulse">
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white text-xl">←</button>
          <div className="flex-1">
            <h1 className="text-xl font-black">🧬 게이머 DNA</h1>
            <p className="text-xs text-white/60">플레이 스타일에 맞게 성장 특성을 배분하세요</p>
          </div>
          <button onClick={() => setShowHelp(v => !v)} className="text-white/70 text-xl">❓</button>
        </div>

        {/* 포인트 요약 */}
        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">Lv.{status.level} 보유 포인트</span>
            <span className="text-sm font-black text-yellow-300">{totalUsed} / {available} pt</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${available > 0 ? (totalUsed / available) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-white/60 mt-1">남은 포인트: <span className="font-bold text-white">{remaining}pt</span> · 5레벨마다 1pt 획득</p>
        </div>

        {/* 도움말 */}
        {showHelp && (
          <div className="mt-3 bg-white/10 rounded-xl p-3 text-xs text-white/80 space-y-1">
            <p>• 각 트랙에 포인트를 배분해 특성을 강화합니다</p>
            <p>• 트랙당 최대 8pt까지 배분 가능합니다</p>
            <p>• 무료 리셋은 매달 1회 무료로 초기화할 수 있습니다</p>
            <p>• ELO 쉴드 · 더블업은 게임 전 미리 활성화하면 다음 게임에 자동 적용됩니다</p>
          </div>
        )}
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {/* 트랙 슬라이더 */}
        {DNA_TRACKS.map(track => {
          const pts = draft[track.key];
          const activeEffects = track.effects.filter(e => pts >= e.pts);
          const nextEffect = track.effects.find(e => pts < e.pts);
          return (
            <div key={track.key} className={`bg-white rounded-2xl p-4 shadow-sm border ${track.borderColor}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{track.emoji}</span>
                <div className="flex-1">
                  <p className="font-black text-sm">{track.name} DNA</p>
                  {nextEffect && <p className="text-xs text-gray-400">다음: {nextEffect.pts}pt → {nextEffect.text}</p>}
                </div>
                <span className="text-xl font-black text-gray-800">{pts}<span className="text-sm text-gray-400">pt</span></span>
              </div>

              {/* 포인트 조절 버튼 */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleSlider(track.key, pts - 1)}
                  disabled={pts <= 0}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg disabled:opacity-30 active:scale-90 transition-transform"
                >−</button>
                <div className="flex-1 flex gap-1">
                  {Array.from({ length: DNA_MAX }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => handleSlider(track.key, i + 1 === pts ? 0 : i + 1)}
                      className={`flex-1 h-4 rounded-full transition-all ${
                        i < pts ? track.color : 'bg-gray-100'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => handleSlider(track.key, pts + 1)}
                  disabled={pts >= DNA_MAX || remaining <= 0}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg disabled:opacity-30 active:scale-90 transition-transform"
                >+</button>
              </div>

              {/* 활성 효과 */}
              {activeEffects.length > 0 && (
                <div className={`${track.colorLight} rounded-xl p-2 flex flex-wrap gap-1`}>
                  {activeEffects.map(e => (
                    <span key={e.pts} className="text-[11px] font-bold text-gray-700 bg-white/60 rounded-full px-2 py-0.5">
                      ✓ {e.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 저장 버튼 */}
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-transform text-base disabled:opacity-60"
          >
            {saving ? '저장 중...' : '💾 DNA 배분 저장'}
          </button>
        )}

        {/* 토큰 섹션 */}
        <section>
          <h2 className="text-base font-black mb-2 mt-2">🎫 특수 토큰</h2>
          <div className="space-y-2">
            {/* ELO 쉴드 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <p className="font-black text-sm">ELO 쉴드</p>
                    <p className="text-xs text-gray-400">패배 시 ELO 감소 차단 · ⚡ 반응 7pt 필요</p>
                  </div>
                </div>
                <div className="text-right">
                  {status.tokens.eloShield.unlocked ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">주 {status.tokens.eloShield.remaining}/{status.tokens.eloShield.weeklyLimit}회 잔여</p>
                      {status.tokens.eloShield.pendingActive ? (
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">대기 중 ✓</span>
                      ) : (
                        <button
                          onClick={() => handleToken('elo-shield')}
                          disabled={status.tokens.eloShield.remaining <= 0 || activating === 'elo-shield'}
                          className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-40"
                        >
                          {activating === 'elo-shield' ? '...' : '활성화'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 font-bold">🔒 잠금</span>
                  )}
                </div>
              </div>
            </div>

            {/* 더블업 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-black text-sm">더블업</p>
                    <p className="text-xs text-gray-400">승리 시 ELO 2배 획득 · 🎮 액션 5pt 필요</p>
                  </div>
                </div>
                <div className="text-right">
                  {status.tokens.doubleUp.unlocked ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">주 {status.tokens.doubleUp.remaining}/{status.tokens.doubleUp.weeklyLimit}회 잔여</p>
                      {status.tokens.doubleUp.pendingActive ? (
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">대기 중 ✓</span>
                      ) : (
                        <button
                          onClick={() => handleToken('double-up')}
                          disabled={status.tokens.doubleUp.remaining <= 0 || activating === 'double-up'}
                          className="text-xs bg-red-500 text-white font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-40"
                        >
                          {activating === 'double-up' ? '...' : '활성화'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 font-bold">🔒 잠금</span>
                  )}
                </div>
              </div>
            </div>

            {/* 베스트픽 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="font-black text-sm">베스트픽</p>
                    <p className="text-xs text-gray-400">3회 중 최고 점수 제출 · 🎯 정밀 5pt 필요</p>
                  </div>
                </div>
                <div className="text-right">
                  {status.tokens.bestPick.unlocked ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">주 {status.tokens.bestPick.remaining}/{status.tokens.bestPick.weeklyLimit}회 잔여</p>
                      {status.tokens.bestPick.activeSession ? (
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">세션 진행 중</span>
                      ) : (
                        <button
                          onClick={() => handleToken('best-pick')}
                          disabled={status.tokens.bestPick.remaining <= 0 || activating === 'best-pick'}
                          className="text-xs bg-green-600 text-white font-bold px-3 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-40"
                        >
                          {activating === 'best-pick' ? '...' : '시작'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300 font-bold">🔒 잠금</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 리셋 섹션 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-black text-sm mb-3">🔄 DNA 초기화</h3>
          <div className="flex gap-2">
            <button
              onClick={handleResetFree}
              disabled={!status.canFreeReset || !!resetting}
              className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 border-gray-200 text-gray-600"
            >
              {resetting === 'free' ? '...' : status.canFreeReset ? '무료 리셋' : '이번 달 사용'}
            </button>
            <button
              onClick={handleResetGems}
              disabled={!!resetting}
              className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-40 border-purple-200 text-purple-600"
            >
              {resetting === 'gems' ? '...' : `💎 ${status.gemResetCost} 리셋`}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">무료 리셋은 매달 1일 초기화됩니다</p>
        </section>
      </div>
    </div>
  );
}
