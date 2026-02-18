import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatarStore, RARITY_CONFIG, FRAME_RING, TITLE_STYLE, EFFECT_ANIM, TYPE_LABEL, TYPE_EMOJI } from '../stores/avatarStore';
import type { AvatarItem, InventoryEntry, ItemType, SlotKey } from '../stores/avatarStore';
import { useAuthStore } from '../stores/authStore';

type MainTab = 'equipped' | 'inventory' | 'shop';
type FilterType = 'all' | ItemType;

/* ─── 아바타 미리보기 ─────────────────────────────────── */
function AvatarPreview({ avatar, emoji = '🐯', nickname = '플레이어' }: {
  avatar: any;
  emoji?: string;
  nickname?: string;
}) {
  const frame = avatar?.activeFrame;
  const title = avatar?.activeTitle;
  const effect = avatar?.activeEffect;

  const ringCls = frame ? (FRAME_RING[frame.assetKey] ?? 'ring-2 ring-primary') : 'ring-2 ring-gray-200';
  const effectCls = effect ? (EFFECT_ANIM[effect.assetKey] ?? '') : '';
  const titleCls = title ? (TITLE_STYLE[title.assetKey] ?? 'bg-gray-100 text-gray-600') : null;
  const isLegendaryFrame = frame?.rarity === 'legendary';

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {/* 아바타 원형 */}
      <div className="relative">
        {/* 전설 프레임 배경 글로우 */}
        {isLegendaryFrame && (
          <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl scale-125" />
        )}
        <div
          className={`relative w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/10
            flex items-center justify-center text-5xl ring-offset-4 ring-offset-gray-900
            transition-all duration-300 ${ringCls} ${effectCls}`}
        >
          {emoji}
          {/* 이펙트 오버레이 파티클 */}
          {effect && effect.assetKey === 'effect_starlight' && (
            <span className="absolute -top-1 -right-1 text-xl animate-spin">⭐</span>
          )}
          {effect && effect.assetKey === 'effect_fire_hit' && (
            <span className="absolute -top-1 -right-1 text-xl animate-bounce">🔥</span>
          )}
          {effect && effect.assetKey === 'effect_lightning' && (
            <span className="absolute -top-1 -right-1 text-xl animate-pulse">⚡</span>
          )}
        </div>
      </div>

      {/* 닉네임 */}
      <p className="text-white font-bold text-lg">{nickname}</p>

      {/* 칭호 */}
      {title && (
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${titleCls}`}>
          {title.name}
        </span>
      )}

      {/* 장착 없을 때 안내 */}
      {!frame && !title && !effect && (
        <p className="text-gray-500 text-xs">아직 장착한 아이템이 없어요</p>
      )}
    </div>
  );
}

/* ─── 아이템 카드 (공통) ──────────────────────────────── */
function ItemCard({
  item,
  owned = false,
  equipped = false,
  onAction,
  actionLabel,
  actionDisabled = false,
  subLabel,
}: {
  item: AvatarItem;
  owned?: boolean;
  equipped?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  subLabel?: string;
}) {
  const r = RARITY_CONFIG[item.rarity];
  return (
    <div
      className={`bg-gray-800 rounded-2xl p-3 flex flex-col gap-2 border transition-all
        ${equipped ? 'border-green-400 shadow-green-500/30 shadow-md' : 'border-gray-700'}`}
    >
      {/* 아이템 아이콘 영역 */}
      <div className={`h-20 rounded-xl bg-gray-700/60 flex items-center justify-center text-4xl
        relative overflow-hidden ${equipped ? 'bg-green-900/30' : ''}`}>
        {TYPE_EMOJI[item.type]}
        {equipped && (
          <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
            장착중
          </span>
        )}
        {item.isLimited && (
          <span className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
            한정
          </span>
        )}
      </div>

      {/* 희귀도 뱃지 + 타입 */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.badgeCls}`}>
          {r.label}
        </span>
        <span className="text-[10px] text-gray-500">{TYPE_LABEL[item.type]}</span>
      </div>

      {/* 이름 */}
      <p className="text-white text-xs font-bold leading-tight">{item.name}</p>

      {/* 가격/조건 */}
      {subLabel && (
        <p className="text-gray-400 text-[10px] leading-tight">{subLabel}</p>
      )}

      {/* 액션 버튼 */}
      {actionLabel && (
        <button
          onClick={onAction}
          disabled={actionDisabled}
          className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95
            ${actionDisabled
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : equipped
                ? 'bg-gray-600 text-gray-300'
                : 'bg-primary text-white shadow-sm shadow-primary/30'
            }`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ─── 장착중 탭 ───────────────────────────────────────── */
function EquippedTab({ avatar, onUnequip }: {
  avatar: any;
  onUnequip: (slot: SlotKey) => void;
}) {
  const slots: { key: SlotKey; label: string; emoji: string; item: AvatarItem | null }[] = [
    { key: 'frame',  label: '프레임',  emoji: '🖼️', item: avatar?.activeFrame  ?? null },
    { key: 'title',  label: '칭호',    emoji: '🏷️', item: avatar?.activeTitle  ?? null },
    { key: 'effect', label: '이펙트',  emoji: '✨', item: avatar?.activeEffect ?? null },
    { key: 'icon',   label: '아이콘',  emoji: '🎭', item: avatar?.activeIcon   ?? null },
  ];

  return (
    <div className="p-4 space-y-3">
      <p className="text-gray-400 text-xs">슬롯을 눌러 해제하거나 인벤토리에서 교체하세요.</p>
      <div className="grid grid-cols-2 gap-3">
        {slots.map((slot) =>
          slot.item ? (
            <ItemCard
              key={slot.key}
              item={slot.item}
              equipped
              onAction={() => onUnequip(slot.key)}
              actionLabel="해제"
            />
          ) : (
            <div key={slot.key}
              className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-2xl p-3
                flex flex-col items-center justify-center gap-2 h-36">
              <span className="text-3xl opacity-30">{slot.emoji}</span>
              <p className="text-gray-600 text-xs">{slot.label} 없음</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ─── 인벤토리 탭 ─────────────────────────────────────── */
function InventoryTab({ inventory, avatar, onEquip }: {
  inventory: InventoryEntry[];
  avatar: any;
  onEquip: (itemId: string) => void;
}) {
  const [filter, setFilter] = useState<FilterType>('all');

  const equippedIds = new Set([
    avatar?.activeFrameId,
    avatar?.activeIconId,
    avatar?.activeTitleId,
    avatar?.activeEffectId,
  ].filter(Boolean));

  const filtered = filter === 'all'
    ? inventory
    : inventory.filter((e) => e.item.type === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all',    label: '전체' },
    { key: 'frame',  label: '프레임' },
    { key: 'title',  label: '칭호' },
    { key: 'effect', label: '이펙트' },
    { key: 'icon',   label: '아이콘' },
  ];

  return (
    <div className="p-4 space-y-3">
      {/* 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors
              ${filter === f.key ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-5xl opacity-30">📦</span>
          <p className="text-gray-500 text-sm">보유한 아이템이 없어요</p>
          <p className="text-gray-600 text-xs">상점에서 아이템을 구매하거나 업적을 달성해보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((entry) => {
            const isEquipped = equippedIds.has(entry.item.id);
            const methodLabel: Record<string, string> = {
              purchase_gem:  '💎 구매',
              purchase_coin: '🪙 구매',
              achievement:   '🏆 업적',
              mission:       '📋 미션',
              season:        '🗓️ 시즌',
              event:         '🎉 이벤트',
              default:       '🎁 기본',
            };
            return (
              <ItemCard
                key={entry.inventoryId}
                item={entry.item}
                equipped={isEquipped}
                onAction={isEquipped ? undefined : () => onEquip(entry.item.id)}
                actionLabel={isEquipped ? '장착중' : '장착'}
                actionDisabled={isEquipped}
                subLabel={methodLabel[entry.acquireMethod] ?? ''}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── 구매 확인 모달 ──────────────────────────────────── */
function BuyModal({ item, coins, gems, onConfirm, onCancel, loading }: {
  item: AvatarItem;
  coins: number;
  gems: number;
  onConfirm: (currency: 'gem' | 'coin') => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const r = RARITY_CONFIG[item.rarity];
  const canGem  = item.gemPrice !== null && gems  >= item.gemPrice;
  const canCoin = item.coinPrice !== null && coins >= item.coinPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}>
      <div className="bg-gray-800 rounded-t-3xl p-6 w-full max-w-md space-y-4 pb-safe"
        onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-700 rounded-2xl flex items-center justify-center text-3xl">
            {TYPE_EMOJI[item.type]}
          </div>
          <div>
            <p className="text-white font-bold">{item.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.badgeCls}`}>
              {r.label}
            </span>
          </div>
        </div>

        <p className="text-gray-400 text-sm">{item.description}</p>

        {/* 잔액 */}
        <div className="flex gap-3 bg-gray-700/50 rounded-xl p-3">
          <div className="flex-1 text-center">
            <p className="text-xl font-black text-amber-400">💎 {gems.toLocaleString()}</p>
            <p className="text-gray-500 text-xs">보유 보석</p>
          </div>
          <div className="w-px bg-gray-600" />
          <div className="flex-1 text-center">
            <p className="text-xl font-black text-yellow-300">🪙 {coins.toLocaleString()}</p>
            <p className="text-gray-500 text-xs">보유 코인</p>
          </div>
        </div>

        {/* 구매 버튼 */}
        <div className="space-y-2">
          {item.gemPrice !== null && (
            <button
              disabled={!canGem || loading}
              onClick={() => onConfirm('gem')}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                ${canGem && !loading
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              <span>💎</span>
              <span>보석 {item.gemPrice.toLocaleString()}개로 구매</span>
              {!canGem && <span className="text-xs">(부족)</span>}
            </button>
          )}
          {item.coinPrice !== null && (
            <button
              disabled={!canCoin || loading}
              onClick={() => onConfirm('coin')}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95
                ${canCoin && !loading
                  ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/30'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              <span>🪙</span>
              <span>코인 {item.coinPrice.toLocaleString()}개로 구매</span>
              {!canCoin && <span className="text-xs">(부족)</span>}
            </button>
          )}
        </div>

        <button onClick={onCancel} className="w-full py-2 text-gray-500 text-sm">취소</button>
      </div>
    </div>
  );
}

/* ─── 상점 탭 ─────────────────────────────────────────── */
function ShopTab({ shopItems, shopLoading, inventory, coins, gems, onBuy }: {
  shopItems: AvatarItem[];
  shopLoading: boolean;
  inventory: InventoryEntry[];
  coins: number;
  gems: number;
  onBuy: (item: AvatarItem) => void;
}) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [currFilter, setCurrFilter] = useState<'all' | 'gem' | 'coin'>('all');

  const ownedIds = new Set(inventory.map((e) => e.item.id));

  const filtered = shopItems
    .filter((i) => filter === 'all' || i.type === filter)
    .filter((i) => {
      if (currFilter === 'gem')  return i.gemPrice !== null;
      if (currFilter === 'coin') return i.coinPrice !== null;
      return true;
    });

  const typeFilters: { key: FilterType; label: string }[] = [
    { key: 'all',    label: '전체' },
    { key: 'frame',  label: '프레임' },
    { key: 'title',  label: '칭호' },
    { key: 'effect', label: '이펙트' },
    { key: 'icon',   label: '아이콘' },
  ];

  return (
    <div className="p-4 space-y-3">
      {/* 타입 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {typeFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors
              ${filter === f.key ? 'bg-primary text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 재화 필터 */}
      <div className="flex gap-2">
        {([['all','전체'],['gem','💎 보석'],['coin','🪙 코인']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCurrFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors
              ${currFilter === key ? 'bg-gray-500 text-white' : 'bg-gray-800 text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {shopLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-5xl opacity-30">🏪</span>
          <p className="text-gray-500 text-sm">해당 아이템이 없어요</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => {
            const owned = ownedIds.has(item.id);
            const priceLabel = item.gemPrice !== null
              ? `💎 ${item.gemPrice.toLocaleString()}`
              : item.coinPrice !== null
                ? `🪙 ${item.coinPrice.toLocaleString()}`
                : '획득 전용';
            return (
              <ItemCard
                key={item.id}
                item={item}
                onAction={owned ? undefined : () => onBuy(item)}
                actionLabel={owned ? '✓ 보유중' : '구매'}
                actionDisabled={owned}
                subLabel={priceLabel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── 성공 토스트 ─────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white
      text-sm font-bold px-5 py-2.5 rounded-full shadow-lg animate-bounce">
      {msg}
    </div>
  );
}

/* ─── 메인 페이지 ─────────────────────────────────────── */
export default function AvatarPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    avatar, inventory, shopItems, coins, gems, loading, shopLoading,
    fetchAll, fetchShop, equip, unequip, buyWithGems, buyWithCoins,
  } = useAvatarStore();

  const [activeTab, setActiveTab] = useState<MainTab>('equipped');
  const [buyTarget, setBuyTarget] = useState<AvatarItem | null>(null);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    fetchShop();
  }, [fetchAll, fetchShop]);

  const handleEquip = async (itemId: string) => {
    try {
      await equip(itemId);
      setToast('장착 완료!');
    } catch {
      setToast('장착 실패');
    }
  };

  const handleUnequip = async (slot: SlotKey) => {
    try {
      await unequip(slot);
      setToast('해제 완료');
    } catch {}
  };

  const handleBuyConfirm = async (currency: 'gem' | 'coin') => {
    if (!buyTarget) return;
    setBuying(true);
    const fn = currency === 'gem' ? buyWithGems : buyWithCoins;
    const result = await fn(buyTarget.id);
    setBuying(false);
    setBuyTarget(null);
    if (result.success) setToast('구매 완료! 인벤토리를 확인하세요 🎉');
    else setToast(`구매 실패: ${result.error}`);
  };

  const tabs: { key: MainTab; label: string; emoji: string }[] = [
    { key: 'equipped',   label: '장착중',   emoji: '👤' },
    { key: 'inventory',  label: '인벤토리', emoji: '📦' },
    { key: 'shop',       label: '상점',     emoji: '🛒' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-gray-700 rounded-xl flex items-center justify-center text-white"
        >
          ←
        </button>
        <h1 className="text-white font-black text-lg">아바타 꾸미기</h1>
        {/* 재화 잔액 */}
        <div className="flex gap-2 text-xs font-bold">
          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">
            💎 {gems.toLocaleString()}
          </span>
          <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg">
            🪙 {coins.toLocaleString()}
          </span>
        </div>
      </header>

      {/* 아바타 미리보기 */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 mx-4 rounded-3xl">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AvatarPreview
            avatar={avatar}
            emoji="🐯"
            nickname={user?.nickname ?? '플레이어'}
          />
        )}
      </div>

      {/* 탭 */}
      <div className="flex mx-4 mt-4 bg-gray-800 rounded-2xl p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key);
              if (t.key === 'shop') fetchShop();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1
              ${activeTab === t.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-400'}`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'equipped' && (
          <EquippedTab avatar={avatar} onUnequip={handleUnequip} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab
            inventory={inventory}
            avatar={avatar}
            onEquip={handleEquip}
          />
        )}
        {activeTab === 'shop' && (
          <ShopTab
            shopItems={shopItems}
            shopLoading={shopLoading}
            inventory={inventory}
            coins={coins}
            gems={gems}
            onBuy={(item) => setBuyTarget(item)}
          />
        )}
      </div>

      {/* 구매 확인 모달 */}
      {buyTarget && (
        <BuyModal
          item={buyTarget}
          coins={coins}
          gems={gems}
          onConfirm={handleBuyConfirm}
          onCancel={() => setBuyTarget(null)}
          loading={buying}
        />
      )}

      {/* 토스트 */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
