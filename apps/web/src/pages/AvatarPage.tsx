import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAvatarStore,
  RARITY_CONFIG,
  SLOT_META,
  ITEM_EMOJI,
  EFFECT_ANIM,
  TITLE_STYLE,
  TYPE_LABEL,
  TYPE_EMOJI,
} from '../stores/avatarStore';
import type { AvatarItem, InventoryEntry, SlotKey, EquippedAvatar } from '../stores/avatarStore';
import { useAuthStore } from '../stores/authStore';

/** 슬롯별 미리보기 상태 (undefined = 미리보기 없음, AvatarItem = 해당 아이템으로 미리보기) */
type Previews = Partial<Record<SlotKey, AvatarItem>>;

/* ═══════════════════════════════════════════════════════
 * 캐릭터 미리보기 (페이퍼돌 스타일)
 * ═══════════════════════════════════════════════════════ */
function CharacterPreview({
  avatar,
  nickname,
  activeSlot,
  previews,
}: {
  avatar: EquippedAvatar | null;
  nickname: string;
  activeSlot: SlotKey;
  previews: Previews;
}) {
  /** 슬롯에 표시할 아이템: 미리보기 > 장착 순 */
  const getItem = (slot: SlotKey): AvatarItem | null => {
    if (previews[slot] !== undefined) return previews[slot]!;
    return (avatar?.[SLOT_META[slot].activeKey] as AvatarItem | null) ?? null;
  };

  const hair      = getItem('hair');
  const hat       = getItem('hat');
  const eyes      = getItem('eyes');
  const glasses   = getItem('glasses');
  const nose      = getItem('nose');
  const lips      = getItem('lips');
  const top       = getItem('top');
  const bottom    = getItem('bottom');
  const shoes     = getItem('shoes');
  const accessory = getItem('accessory');
  const title     = getItem('title');
  const effect    = getItem('effect');

  const effectCls   = effect ? (EFFECT_ANIM[effect.assetKey] ?? '') : '';
  const titleStyle  = title ? (TITLE_STYLE[title.assetKey] ?? 'bg-gray-700 text-gray-200') : null;
  const isLegendary = [hat, glasses, top, bottom, shoes, accessory, hair, eyes, lips].some(
    (i) => i?.rarity === 'legendary',
  );

  /** 슬롯 하이라이트: active 선택 → primary / 미리보기 중 → 파란 점선 */
  const hl = (slot: SlotKey) => {
    const isPreview = previews[slot] !== undefined;
    if (activeSlot === slot)
      return 'ring-2 ring-primary ring-offset-1 ring-offset-gray-900 scale-110 z-10 rounded-full';
    if (isPreview)
      return 'ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-900 rounded-full animate-pulse';
    return '';
  };

  return (
    <div className={`relative flex flex-col items-center py-3 gap-0.5 ${effectCls}`}>
      {isLegendary && (
        <div className="absolute inset-0 bg-amber-400/10 blur-2xl rounded-full pointer-events-none" />
      )}

      {/* 헤어 */}
      <div className={`text-3xl transition-all duration-200 cursor-default ${hl('hair')}`}>
        {hair ? ITEM_EMOJI[hair.assetKey] ?? '💈' : <span className="opacity-20">💈</span>}
      </div>

      {/* 모자 */}
      <div className={`text-3xl transition-all duration-200 cursor-default -mt-1 ${hl('hat')}`}>
        {hat ? ITEM_EMOJI[hat.assetKey] ?? '🧢' : <span className="opacity-20">🧢</span>}
      </div>

      {/* 얼굴 행 */}
      <div className="flex items-center gap-1 -mt-1">
        {/* 선글라스 */}
        <div className={`text-xl transition-all duration-200 cursor-default ${hl('glasses')}`}>
          {glasses ? ITEM_EMOJI[glasses.assetKey] ?? '🕶️' : <span className="opacity-20">🕶️</span>}
        </div>

        {/* 얼굴 — 눈/코/입술 */}
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-amber-300
          flex flex-col items-center justify-center shadow-lg select-none">
          <div className={`text-base leading-none transition-all ${hl('eyes')}`}>
            {eyes ? ITEM_EMOJI[eyes.assetKey] ?? '👁️' : '👀'}
          </div>
          <div className={`text-xs leading-none transition-all ${hl('nose')}`}>
            {nose ? ITEM_EMOJI[nose.assetKey] ?? '👃' : '▪'}
          </div>
          <div className={`text-base leading-none transition-all ${hl('lips')}`}>
            {lips ? ITEM_EMOJI[lips.assetKey] ?? '👄' : '😐'}
          </div>

          {effect?.assetKey === 'effect_starlight' && (
            <span className="absolute -top-1 -right-1 text-sm animate-spin">⭐</span>
          )}
          {effect?.assetKey === 'effect_fire_hit' && (
            <span className="absolute -top-1 -right-1 text-sm animate-bounce">🔥</span>
          )}
          {effect?.assetKey === 'effect_lightning' && (
            <span className="absolute -top-1 -right-1 text-sm animate-pulse">⚡</span>
          )}
        </div>

        {/* 악세서리 */}
        <div className={`text-xl transition-all duration-200 cursor-default ${hl('accessory')}`}>
          {accessory ? ITEM_EMOJI[accessory.assetKey] ?? '📿' : <span className="opacity-20">📿</span>}
        </div>
      </div>

      {/* 상의 */}
      <div className={`text-3xl transition-all duration-200 cursor-default -mt-0.5 ${hl('top')}`}>
        {top ? ITEM_EMOJI[top.assetKey] ?? '👕' : <span className="opacity-20">👕</span>}
      </div>

      {/* 하의 */}
      <div className={`text-2xl transition-all duration-200 cursor-default ${hl('bottom')}`}>
        {bottom ? ITEM_EMOJI[bottom.assetKey] ?? '👖' : <span className="opacity-20">👖</span>}
      </div>

      {/* 신발 */}
      <div className={`text-xl transition-all duration-200 cursor-default ${hl('shoes')}`}>
        {shoes ? ITEM_EMOJI[shoes.assetKey] ?? '👟' : <span className="opacity-20">👟</span>}
      </div>

      {/* 칭호 */}
      <div className={`mt-1 text-[11px] font-bold px-3 py-1 rounded-full transition-all duration-200 ${hl('title')}
        ${title ? titleStyle : 'bg-gray-800/50 text-gray-600'}`}>
        {title ? title.name : '칭호 없음'}
      </div>

      {/* 이펙트 */}
      <div className={`text-[10px] text-gray-500 transition-all duration-200 ${hl('effect')}`}>
        {effect ? `✨ ${effect.name}` : '이펙트 없음'}
      </div>

      <p className="text-white font-bold text-sm mt-0.5">{nickname}</p>

      {/* 미리보기 중 안내 */}
      {Object.keys(previews).length > 0 && (
        <span className="text-[10px] text-blue-400 font-semibold animate-pulse">
          👁️ 미리보기 중
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * 슬롯 선택 바
 * ═══════════════════════════════════════════════════════ */
function SlotSelector({
  activeSlot,
  avatar,
  previews,
  onChange,
}: {
  activeSlot: SlotKey;
  avatar: EquippedAvatar | null;
  previews: Previews;
  onChange: (slot: SlotKey) => void;
}) {
  const slots: SlotKey[] = [
    'hair', 'hat', 'eyes', 'glasses', 'nose', 'lips',
    'top', 'bottom', 'shoes', 'accessory', 'title', 'effect',
  ];

  return (
    <div className="flex overflow-x-auto gap-2 px-4 pb-1 scrollbar-hide">
      {slots.map((slot) => {
        const meta         = SLOT_META[slot];
        const equippedItem = avatar?.[meta.activeKey] as AvatarItem | null;
        const isPreviewing = previews[slot] !== undefined;
        const isActive     = activeSlot === slot;

        return (
          <button
            key={slot}
            onClick={() => onChange(slot)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl
              transition-all duration-200 border
              ${isActive
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                : isPreviewing
                  ? 'bg-blue-900/40 border-blue-500 text-blue-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400'}`}
          >
            <span className="text-xl">{meta.emoji}</span>
            <span className="text-[9px] font-semibold">{meta.label}</span>
            {/* 상태 점 */}
            {isPreviewing ? (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            ) : equippedItem ? (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * 아이템 카드
 * ═══════════════════════════════════════════════════════ */
function ItemCard({
  item,
  equipped,
  owned,
  isPreviewing,
  onAction,
  actionLabel,
  actionDisabled,
  onTryOn,
  onCancelPreview,
}: {
  item: AvatarItem;
  equipped: boolean;
  owned: boolean;
  isPreviewing?: boolean;
  onAction?: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  onTryOn?: () => void;
  onCancelPreview?: () => void;
}) {
  const r     = RARITY_CONFIG[item.rarity];
  const emoji = ITEM_EMOJI[item.assetKey] ?? TYPE_EMOJI[item.type];

  const borderCls = isPreviewing
    ? 'border-blue-400 shadow-blue-500/30 shadow-md'
    : equipped
      ? 'border-green-400 shadow-green-500/20 shadow-md'
      : 'border-gray-700';

  return (
    <div className={`bg-gray-800 rounded-2xl p-3 flex flex-col gap-2 border transition-all ${borderCls}`}>
      {/* 아이콘 영역 */}
      <div className={`h-16 rounded-xl flex items-center justify-center text-4xl relative
        ${isPreviewing ? 'bg-blue-900/30' : equipped ? 'bg-green-900/30' : 'bg-gray-700/60'}`}>
        {emoji || <span className="text-gray-600 text-2xl">?</span>}

        {/* 상태 뱃지 */}
        {equipped && !isPreviewing && (
          <span className="absolute top-1 right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
            장착중
          </span>
        )}
        {isPreviewing && (
          <span className="absolute top-1 right-1 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
            미리보기
          </span>
        )}
        {item.isLimited && (
          <span className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
            한정
          </span>
        )}

        {/* 껴보기 / 미리보기 취소 버튼 */}
        {!isPreviewing && onTryOn && !equipped && (
          <button
            onClick={(e) => { e.stopPropagation(); onTryOn(); }}
            className="absolute bottom-1 right-1 w-6 h-6 bg-blue-600/90 text-white
              text-[10px] rounded-full flex items-center justify-center
              hover:bg-blue-500 active:scale-90 transition-all"
            title="껴보기"
          >
            👁️
          </button>
        )}
        {isPreviewing && onCancelPreview && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancelPreview(); }}
            className="absolute bottom-1 right-1 w-6 h-6 bg-gray-600/90 text-white
              text-xs rounded-full flex items-center justify-center
              hover:bg-gray-500 active:scale-90 transition-all"
            title="미리보기 취소"
          >
            ✕
          </button>
        )}
      </div>

      {/* 희귀도 뱃지 */}
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start ${r.badgeCls}`}>
        {r.label}
      </span>

      {/* 이름 */}
      <p className="text-white text-xs font-bold leading-tight">{item.name}</p>

      {/* 가격/상태 */}
      {!owned && (
        <p className="text-gray-400 text-[10px]">
          {item.gemPrice !== null
            ? `💎 ${item.gemPrice.toLocaleString()}`
            : item.coinPrice !== null
              ? `🪙 ${item.coinPrice.toLocaleString()}`
              : '획득 전용'}
        </p>
      )}
      {owned && !equipped && !isPreviewing && (
        <p className="text-green-500 text-[10px] font-semibold">✓ 보유중</p>
      )}

      {/* 메인 액션 버튼 */}
      <button
        onClick={onAction}
        disabled={actionDisabled}
        className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95
          ${actionDisabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : isPreviewing
              ? owned
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : equipped
                ? 'bg-gray-600 text-gray-300'
                : owned
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
          }`}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * 미리보기 액션 바 (하단 고정)
 * ═══════════════════════════════════════════════════════ */
function PreviewBar({
  item,
  slot,
  isOwned,
  onEquip,
  onBuy,
  onCancel,
}: {
  item: AvatarItem;
  slot: SlotKey;
  isOwned: boolean;
  onEquip: () => void;
  onBuy: () => void;
  onCancel: () => void;
}) {
  const emoji = ITEM_EMOJI[item.assetKey] ?? TYPE_EMOJI[item.type];
  const r     = RARITY_CONFIG[item.rarity];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-md
      border-t border-blue-500/40 px-4 py-3 flex items-center gap-3">
      {/* 미리보기 중 아이템 정보 */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p className="text-white text-xs font-bold truncate">{item.name}</p>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${r.badgeCls}`}>
              {r.label}
            </span>
            <span className="text-[9px] text-gray-500">{TYPE_LABEL[slot]}</span>
          </div>
        </div>
      </div>

      {/* 취소 */}
      <button
        onClick={onCancel}
        className="flex-shrink-0 px-3 py-1.5 bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
      >
        취소
      </button>

      {/* 장착 or 구매 */}
      {isOwned ? (
        <button
          onClick={onEquip}
          className="flex-shrink-0 px-4 py-1.5 bg-green-500 text-white text-xs font-bold rounded-xl
            shadow-md shadow-green-500/30 active:scale-95 transition-all"
        >
          장착하기
        </button>
      ) : (
        <button
          onClick={onBuy}
          className="flex-shrink-0 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-xl
            shadow-md shadow-amber-500/30 active:scale-95 transition-all"
        >
          구매하기
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * 슬롯별 아이템 패널
 * ═══════════════════════════════════════════════════════ */
function SlotItemPanel({
  slot,
  avatar,
  inventory,
  shopItems,
  coins,
  gems,
  previews,
  onEquip,
  onUnequip,
  onBuyRequest,
  onTryOn,
  onCancelPreview,
}: {
  slot: SlotKey;
  avatar: EquippedAvatar | null;
  inventory: InventoryEntry[];
  shopItems: AvatarItem[];
  coins: number;
  gems: number;
  previews: Previews;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: SlotKey) => void;
  onBuyRequest: (item: AvatarItem) => void;
  onTryOn: (slot: SlotKey, item: AvatarItem) => void;
  onCancelPreview: (slot: SlotKey) => void;
}) {
  const [panel, setPanel] = useState<'inventory' | 'shop'>('inventory');

  const meta         = SLOT_META[slot];
  const equippedItem = avatar?.[meta.activeKey] as AvatarItem | null;
  const ownedIds     = new Set(inventory.map((e) => e.item.id));
  const previewItem  = previews[slot];

  const myItems       = inventory.filter((e) => e.item.type === slot);
  const shopSlotItems = shopItems.filter((i) => i.type === slot);

  return (
    <div className="flex flex-col gap-3">
      {/* 패널 탭 */}
      <div className="flex mx-4 bg-gray-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setPanel('inventory')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all
            ${panel === 'inventory' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
        >
          📦 보유 ({myItems.length})
        </button>
        <button
          onClick={() => setPanel('shop')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all
            ${panel === 'shop' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
        >
          🛒 상점 ({shopSlotItems.length})
        </button>
      </div>

      {/* 현재 장착 정보 */}
      {equippedItem && !previewItem && (
        <div className="mx-4 flex items-center justify-between bg-green-900/30 border border-green-700/50 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{ITEM_EMOJI[equippedItem.assetKey] ?? meta.emoji}</span>
            <div>
              <p className="text-green-300 text-xs font-bold">{equippedItem.name}</p>
              <p className="text-green-600 text-[10px]">현재 장착중</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onTryOn(slot, equippedItem)}
              className="bg-blue-700/50 text-blue-300 text-xs px-2 py-1 rounded-lg font-semibold"
            >
              👁️
            </button>
            <button
              onClick={() => onUnequip(slot)}
              className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-lg font-semibold"
            >
              해제
            </button>
          </div>
        </div>
      )}

      {/* 미리보기 중 아이템 안내 */}
      {previewItem && (
        <div className="mx-4 flex items-center justify-between bg-blue-900/30 border border-blue-600/50 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xl">{ITEM_EMOJI[previewItem.assetKey] ?? meta.emoji}</span>
            <div>
              <p className="text-blue-300 text-xs font-bold">{previewItem.name}</p>
              <p className="text-blue-600 text-[10px]">미리보기 중 — 캐릭터에서 확인하세요</p>
            </div>
          </div>
          <button
            onClick={() => onCancelPreview(slot)}
            className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-lg font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 아이템 그리드 */}
      <div className="px-4 pb-24">
        {panel === 'inventory' ? (
          myItems.length === 0 ? (
            <EmptyState
              emoji="📦"
              title={`보유한 ${TYPE_LABEL[slot]} 없음`}
              sub="상점에서 구매하거나 업적을 달성해보세요!"
              onShopClick={() => setPanel('shop')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myItems.map(({ item, inventoryId }) => {
                const isEquipped   = equippedItem?.id === item.id;
                const isPreviewing = previewItem?.id === item.id;
                return (
                  <ItemCard
                    key={inventoryId}
                    item={item}
                    equipped={isEquipped}
                    owned
                    isPreviewing={isPreviewing}
                    onTryOn={!isEquipped ? () => onTryOn(slot, item) : undefined}
                    onCancelPreview={isPreviewing ? () => onCancelPreview(slot) : undefined}
                    onAction={() => {
                      if (isPreviewing) {
                        onEquip(item.id);
                        onCancelPreview(slot);
                      } else if (isEquipped) {
                        onUnequip(slot);
                      } else {
                        onEquip(item.id);
                      }
                    }}
                    actionLabel={isPreviewing ? '바로 장착' : isEquipped ? '해제' : '장착'}
                  />
                );
              })}
            </div>
          )
        ) : (
          shopSlotItems.length === 0 ? (
            <EmptyState emoji="🏪" title="판매 중인 아이템 없음" sub="" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {shopSlotItems.map((item) => {
                const isOwned    = ownedIds.has(item.id);
                const isEquipped = equippedItem?.id === item.id;
                const isPreviewing = previewItem?.id === item.id;
                const canAfford  =
                  (item.gemPrice !== null && gems >= item.gemPrice) ||
                  (item.coinPrice !== null && coins >= item.coinPrice);

                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    equipped={isEquipped}
                    owned={isOwned}
                    isPreviewing={isPreviewing}
                    onTryOn={!isEquipped ? () => onTryOn(slot, item) : undefined}
                    onCancelPreview={isPreviewing ? () => onCancelPreview(slot) : undefined}
                    onAction={() => {
                      if (isPreviewing) {
                        if (isOwned) { onEquip(item.id); onCancelPreview(slot); }
                        else onBuyRequest(item);
                      } else if (isOwned) {
                        isEquipped ? onUnequip(slot) : onEquip(item.id);
                      } else {
                        onBuyRequest(item);
                      }
                    }}
                    actionLabel={
                      isPreviewing
                        ? isOwned ? '바로 장착' : '구매하기'
                        : isOwned
                          ? isEquipped ? '해제' : '장착'
                          : canAfford ? '구매' : '부족'
                    }
                    actionDisabled={!isOwned && !isPreviewing && !canAfford}
                  />
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ─── 빈 상태 ────────────────────────────────────────── */
function EmptyState({
  emoji, title, sub, onShopClick,
}: { emoji: string; title: string; sub: string; onShopClick?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <span className="text-5xl opacity-30">{emoji}</span>
      <p className="text-gray-500 text-sm font-semibold">{title}</p>
      {sub && <p className="text-gray-600 text-xs">{sub}</p>}
      {onShopClick && (
        <button
          onClick={onShopClick}
          className="mt-1 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
        >
          상점 보기 →
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * 구매 확인 모달
 * ═══════════════════════════════════════════════════════ */
function BuyModal({
  item,
  coins,
  gems,
  loading,
  onConfirm,
  onCancel,
}: {
  item: AvatarItem;
  coins: number;
  gems: number;
  loading: boolean;
  onConfirm: (currency: 'gem' | 'coin') => void;
  onCancel: () => void;
}) {
  const r       = RARITY_CONFIG[item.rarity];
  const canGem  = item.gemPrice  !== null && gems  >= item.gemPrice;
  const canCoin = item.coinPrice !== null && coins >= item.coinPrice;
  const emoji   = ITEM_EMOJI[item.assetKey] ?? TYPE_EMOJI[item.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-gray-800 rounded-t-3xl p-6 w-full max-w-md space-y-4 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gray-700 rounded-2xl flex items-center justify-center text-3xl">
            {emoji}
          </div>
          <div>
            <p className="text-white font-bold">{item.name}</p>
            <div className="flex gap-2 mt-0.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.badgeCls}`}>
                {r.label}
              </span>
              <span className="text-[10px] text-gray-500">{TYPE_LABEL[item.type]}</span>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm">{item.description}</p>

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

        <button onClick={onCancel} className="w-full py-2 text-gray-500 text-sm">
          취소
        </button>
      </div>
    </div>
  );
}

/* ─── 토스트 ────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50
      bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg animate-bounce">
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * 메인 페이지
 * ═══════════════════════════════════════════════════════ */
export default function AvatarPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    avatar, inventory, shopItems, coins, gems, loading, shopLoading,
    fetchAll, fetchShop, equip, unequip, buyWithGems, buyWithCoins,
  } = useAvatarStore();

  const [activeSlot, setActiveSlot] = useState<SlotKey>('hair');
  const [previews, setPreviews]     = useState<Previews>({});
  const [buyTarget, setBuyTarget]   = useState<AvatarItem | null>(null);
  const [buying, setBuying]         = useState(false);
  const [toast, setToast]           = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    fetchShop();
  }, [fetchAll, fetchShop]);

  /* 껴보기 */
  const handleTryOn = useCallback((slot: SlotKey, item: AvatarItem) => {
    setPreviews((prev) => ({ ...prev, [slot]: item }));
  }, []);

  /* 미리보기 취소 */
  const handleCancelPreview = useCallback((slot: SlotKey) => {
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }, []);

  /* 장착 */
  const handleEquip = useCallback(async (itemId: string) => {
    try {
      await equip(itemId);
      setToast('장착 완료! ✅');
    } catch {
      setToast('장착 실패');
    }
  }, [equip]);

  /* 해제 */
  const handleUnequip = useCallback(async (slot: SlotKey) => {
    try {
      await unequip(slot);
      handleCancelPreview(slot);
      setToast('해제 완료');
    } catch {}
  }, [unequip, handleCancelPreview]);

  /* 미리보기 → 장착 */
  const handleEquipFromPreview = useCallback(async () => {
    const item = previews[activeSlot];
    if (!item) return;
    await handleEquip(item.id);
    handleCancelPreview(activeSlot);
  }, [previews, activeSlot, handleEquip, handleCancelPreview]);

  /* 구매 확인 */
  const handleBuyConfirm = async (currency: 'gem' | 'coin') => {
    if (!buyTarget) return;
    setBuying(true);
    const fn     = currency === 'gem' ? buyWithGems : buyWithCoins;
    const result = await fn(buyTarget.id);
    setBuying(false);
    // 구매 후 해당 아이템 미리보기 유지 (슬롯별 취소)
    setBuyTarget(null);
    if (result.success) setToast('구매 완료! 장착해보세요 🎉');
    else setToast(`구매 실패: ${result.error}`);
  };

  /* 현재 슬롯 미리보기 아이템 & 보유 여부 */
  const currentPreviewItem = previews[activeSlot];
  const ownedIds           = new Set(inventory.map((e) => e.item.id));
  const previewIsOwned     = currentPreviewItem ? ownedIds.has(currentPreviewItem.id) : false;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* ── 헤더 ── */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-gray-700 rounded-xl flex items-center justify-center text-white"
        >
          ←
        </button>
        <h1 className="text-white font-black text-lg">캐릭터 꾸미기</h1>
        <div className="flex gap-1.5 text-xs font-bold">
          <span className="bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">
            💎 {gems.toLocaleString()}
          </span>
          <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg">
            🪙 {coins.toLocaleString()}
          </span>
        </div>
      </header>

      {/* ── 캐릭터 미리보기 ── */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 mx-4 rounded-3xl min-h-[220px]
        flex items-center justify-center">
        {loading ? (
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <CharacterPreview
            avatar={avatar}
            nickname={user?.nickname ?? '플레이어'}
            activeSlot={activeSlot}
            previews={previews}
          />
        )}
      </div>

      {/* ── 슬롯 선택 바 ── */}
      <div className="mt-3">
        <SlotSelector
          activeSlot={activeSlot}
          avatar={avatar}
          previews={previews}
          onChange={setActiveSlot}
        />
      </div>

      {/* ── 슬롯별 아이템 패널 ── */}
      <div className="flex-1 overflow-y-auto mt-3">
        {shopLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <SlotItemPanel
            key={activeSlot}
            slot={activeSlot}
            avatar={avatar}
            inventory={inventory}
            shopItems={shopItems}
            coins={coins}
            gems={gems}
            previews={previews}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onBuyRequest={setBuyTarget}
            onTryOn={handleTryOn}
            onCancelPreview={handleCancelPreview}
          />
        )}
      </div>

      {/* ── 미리보기 액션 바 ── */}
      {currentPreviewItem && (
        <PreviewBar
          item={currentPreviewItem}
          slot={activeSlot}
          isOwned={previewIsOwned}
          onEquip={handleEquipFromPreview}
          onBuy={() => setBuyTarget(currentPreviewItem)}
          onCancel={() => handleCancelPreview(activeSlot)}
        />
      )}

      {/* ── 구매 모달 ── */}
      {buyTarget && (
        <BuyModal
          item={buyTarget}
          coins={coins}
          gems={gems}
          loading={buying}
          onConfirm={handleBuyConfirm}
          onCancel={() => setBuyTarget(null)}
        />
      )}

      {/* ── 토스트 ── */}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
