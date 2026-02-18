import { create } from 'zustand';
import { api } from '../lib/api';

export type ItemType =
  | 'hat'
  | 'glasses'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'accessory'
  | 'hair'
  | 'eyes'
  | 'nose'
  | 'lips'
  | 'title'
  | 'effect';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type SlotKey =
  | 'hat'
  | 'glasses'
  | 'top'
  | 'bottom'
  | 'shoes'
  | 'accessory'
  | 'hair'
  | 'eyes'
  | 'nose'
  | 'lips'
  | 'title'
  | 'effect';

export interface AvatarItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  assetKey: string;
  gemPrice: number | null;
  coinPrice: number | null;
  acquireCondition: string | null;
  isLimited: boolean;
  availableUntil: string | null;
  sortOrder: number;
}

export interface InventoryEntry {
  inventoryId: string;
  acquireMethod: string;
  acquiredAt: string;
  item: AvatarItem;
}

export interface EquippedAvatar {
  activeHatId: string | null;
  activeGlassesId: string | null;
  activeTopId: string | null;
  activeBottomId: string | null;
  activeShoesId: string | null;
  activeAccessoryId: string | null;
  activeHairId: string | null;
  activeEyesId: string | null;
  activeNoseId: string | null;
  activeLipsId: string | null;
  activeTitleId: string | null;
  activeEffectId: string | null;
  activeHat: AvatarItem | null;
  activeGlasses: AvatarItem | null;
  activeTop: AvatarItem | null;
  activeBottom: AvatarItem | null;
  activeShoes: AvatarItem | null;
  activeAccessory: AvatarItem | null;
  activeHair: AvatarItem | null;
  activeEyes: AvatarItem | null;
  activeNose: AvatarItem | null;
  activeLips: AvatarItem | null;
  activeTitle: AvatarItem | null;
  activeEffect: AvatarItem | null;
}

interface AvatarState {
  avatar: EquippedAvatar | null;
  inventory: InventoryEntry[];
  shopItems: AvatarItem[];
  coins: number;
  gems: number;
  loading: boolean;
  shopLoading: boolean;
  error: string | null;

  fetchAll: () => Promise<void>;
  fetchShop: (type?: string) => Promise<void>;
  equip: (itemId: string) => Promise<void>;
  unequip: (slot: SlotKey) => Promise<void>;
  buyWithGems: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  buyWithCoins: (itemId: string) => Promise<{ success: boolean; error?: string }>;
  setBalance: (coins: number, gems: number) => void;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  avatar: null,
  inventory: [],
  shopItems: [],
  coins: 0,
  gems: 0,
  loading: false,
  shopLoading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [avatarData, inventoryData] = await Promise.all([
        api.getMyAvatar(),
        api.getInventory(),
      ]);
      set({ avatar: avatarData, inventory: inventoryData });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchShop: async (type?: string) => {
    set({ shopLoading: true });
    try {
      const items = await api.getAvatarShop(type);
      set({ shopItems: items });
    } catch {
      // 상점 로딩 실패 시 빈 배열 유지
    } finally {
      set({ shopLoading: false });
    }
  },

  equip: async (itemId: string) => {
    const newAvatar = await api.equipItem(itemId);
    set({ avatar: newAvatar });
  },

  unequip: async (slot: SlotKey) => {
    const newAvatar = await api.unequipSlot(slot);
    set({ avatar: newAvatar });
  },

  buyWithGems: async (itemId: string) => {
    try {
      const result = await api.buyWithGems(itemId);
      const [inventory, avatar] = await Promise.all([
        api.getInventory(),
        api.getMyAvatar(),
      ]);
      set({
        inventory,
        avatar,
        gems: result.remainingGems ?? get().gems,
        coins: result.remainingCoins ?? get().coins,
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  buyWithCoins: async (itemId: string) => {
    try {
      const result = await api.buyWithCoins(itemId);
      const [inventory, avatar] = await Promise.all([
        api.getInventory(),
        api.getMyAvatar(),
      ]);
      set({
        inventory,
        avatar,
        gems: result.remainingGems ?? get().gems,
        coins: result.remainingCoins ?? get().coins,
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  setBalance: (coins, gems) => set({ coins, gems }),
}));

/* ─── 희귀도 스타일 ─── */
export const RARITY_CONFIG: Record<ItemRarity, {
  label: string;
  badgeCls: string;
  ringCls: string;
  glowCls: string;
  textCls: string;
}> = {
  common: {
    label: '일반',
    badgeCls: 'bg-gray-200 text-gray-600',
    ringCls: 'ring-2 ring-gray-300',
    glowCls: '',
    textCls: 'text-gray-500',
  },
  rare: {
    label: '레어',
    badgeCls: 'bg-blue-100 text-blue-700',
    ringCls: 'ring-2 ring-blue-400',
    glowCls: 'shadow-blue-300',
    textCls: 'text-blue-600',
  },
  epic: {
    label: '에픽',
    badgeCls: 'bg-purple-100 text-purple-700',
    ringCls: 'ring-2 ring-purple-500',
    glowCls: 'shadow-purple-400',
    textCls: 'text-purple-600',
  },
  legendary: {
    label: '전설',
    badgeCls: 'bg-amber-100 text-amber-700',
    ringCls: 'ring-4 ring-amber-400',
    glowCls: 'shadow-amber-400',
    textCls: 'text-amber-600',
  },
};

/* ─── 슬롯 메타 정보 ─── */
export const SLOT_META: Record<SlotKey, { label: string; emoji: string; activeKey: keyof EquippedAvatar }> = {
  hair:      { label: '헤어',      emoji: '💈', activeKey: 'activeHair' },
  hat:       { label: '모자',      emoji: '🧢', activeKey: 'activeHat' },
  eyes:      { label: '눈',        emoji: '👁️', activeKey: 'activeEyes' },
  glasses:   { label: '선글라스', emoji: '🕶️', activeKey: 'activeGlasses' },
  nose:      { label: '코',        emoji: '👃', activeKey: 'activeNose' },
  lips:      { label: '입술',      emoji: '👄', activeKey: 'activeLips' },
  top:       { label: '상의',      emoji: '👕', activeKey: 'activeTop' },
  bottom:    { label: '하의',      emoji: '👖', activeKey: 'activeBottom' },
  shoes:     { label: '신발',      emoji: '👟', activeKey: 'activeShoes' },
  accessory: { label: '악세서리', emoji: '📿', activeKey: 'activeAccessory' },
  title:     { label: '칭호',      emoji: '🏷️', activeKey: 'activeTitle' },
  effect:    { label: '이펙트',   emoji: '✨', activeKey: 'activeEffect' },
};

/* ─── assetKey → 이모지 매핑 ─── */
export const ITEM_EMOJI: Record<string, string> = {
  // 헤어
  hair_black_natural: '🖤',
  hair_brown_wavy:    '🤎',
  hair_blonde_spike:  '💛',
  hair_rainbow:       '🌈',
  // 모자
  hat_cap_basic:     '🧢',
  hat_cap_blue:      '🧢',
  hat_snapback:      '🧢',
  hat_crown_gold:    '👑',
  hat_s1_crown:      '🏆',
  // 눈
  eyes_default:        '👁️',
  eyes_sparkle:        '✨',
  eyes_determined:     '🔥',
  eyes_legendary_glow: '⭐',
  // 선글라스
  glasses_round:      '🕶️',
  glasses_aviator:    '🥽',
  glasses_rainbow:    '🌈',
  glasses_pvp_goggle: '🥽',
  // 코
  nose_default:  '👃',
  nose_cute:     '🐽',
  nose_elegant:  '👃',
  // 입술
  lips_default:       '😐',
  lips_smile_big:     '😄',
  lips_cool_smirk:    '😏',
  lips_legendary_red: '💋',
  // 상의
  top_tee_white:      '👕',
  top_hoodie_gray:    '👕',
  top_jacket_blue:    '🧥',
  top_legendary_robe: '🥻',
  top_region_legend:  '🦺',
  // 하의
  bottom_jeans:     '👖',
  bottom_cargo:     '👖',
  bottom_training:  '🩲',
  bottom_legendary: '👔',
  // 신발
  shoes_sneakers_basic:  '👟',
  shoes_sneakers_color:  '👟',
  shoes_boots_chelsea:   '🥾',
  shoes_legendary:       '👠',
  // 악세서리
  acc_necklace_silver: '📿',
  acc_watch_gold:      '⌚',
  acc_pvp_badge:       '🏅',
  acc_legend_crystal:  '💎',
  // 칭호 (텍스트로 렌더)
  title_newbie:        '🌱',
  title_local_pro:     '🌟',
  title_speed_monster: '⚡',
  title_legend_start:  '🔱',
  title_goat:          '🐐',
  // 이펙트
  effect_default:   '',
  effect_fire_hit:  '🔥',
  effect_starlight: '⭐',
  effect_lightning: '⚡',
};

/* ─── 이펙트 애니메이션 클래스 ─── */
export const EFFECT_ANIM: Record<string, string> = {
  effect_default:   '',
  effect_fire_hit:  'animate-pulse',
  effect_starlight: 'animate-spin',
  effect_lightning: 'animate-bounce',
};

/* ─── 칭호 텍스트 스타일 ─── */
export const TITLE_STYLE: Record<string, string> = {
  title_newbie:        'bg-gray-100 text-gray-600',
  title_local_pro:     'bg-blue-100 text-blue-700',
  title_speed_monster: 'bg-orange-100 text-orange-700',
  title_legend_start:  'bg-amber-100 text-amber-700',
  title_goat:          'bg-gradient-to-r from-purple-500 to-amber-500 text-white',
};

/* ─── 타입 한글 레이블 ─── */
export const TYPE_LABEL: Record<ItemType, string> = {
  hair:      '헤어',
  hat:       '모자',
  eyes:      '눈',
  glasses:   '선글라스',
  nose:      '코',
  lips:      '입술',
  top:       '상의',
  bottom:    '하의',
  shoes:     '신발',
  accessory: '악세서리',
  title:     '칭호',
  effect:    '이펙트',
};

/* ─── 타입 이모지 ─── */
export const TYPE_EMOJI: Record<ItemType, string> = {
  hair:      '💈',
  hat:       '🧢',
  eyes:      '👁️',
  glasses:   '🕶️',
  nose:      '👃',
  lips:      '👄',
  top:       '👕',
  bottom:    '👖',
  shoes:     '👟',
  accessory: '📿',
  title:     '🏷️',
  effect:    '✨',
};
