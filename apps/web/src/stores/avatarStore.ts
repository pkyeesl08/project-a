import { create } from 'zustand';
import { api } from '../lib/api';

export type ItemType = 'frame' | 'icon' | 'title' | 'effect';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SlotKey = 'frame' | 'icon' | 'title' | 'effect';

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
  activeFrameId: string | null;
  activeIconId: string | null;
  activeTitleId: string | null;
  activeEffectId: string | null;
  activeFrame: AvatarItem | null;
  activeIcon: AvatarItem | null;
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
      // 인벤토리 다시 로드
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

/* ─── 헬퍼: 희귀도별 스타일 ─── */

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

/** assetKey → 프레임 테두리 스타일 */
export const FRAME_RING: Record<string, string> = {
  frame_default:       'ring-2 ring-gray-300',
  frame_silver:        'ring-2 ring-offset-2 ring-gray-400',
  frame_gold:          'ring-4 ring-offset-2 ring-yellow-400',
  frame_crown:         'ring-4 ring-offset-2 ring-yellow-400 shadow-lg shadow-yellow-300',
  frame_fire:          'ring-4 ring-offset-2 ring-orange-500',
  frame_region_legend: 'ring-4 ring-offset-2 ring-purple-500 shadow-lg shadow-purple-400',
  frame_pvp_champ:     'ring-4 ring-offset-2 ring-blue-500 shadow-lg shadow-blue-400',
  frame_s1_champion:   'ring-4 ring-offset-2 ring-rose-500 shadow-lg shadow-rose-400',
};

/** assetKey → 칭호 텍스트 스타일 */
export const TITLE_STYLE: Record<string, string> = {
  title_newbie:        'bg-gray-100 text-gray-600',
  title_local_pro:     'bg-blue-100 text-blue-700',
  title_speed_monster: 'bg-orange-100 text-orange-700',
  title_legend_start:  'bg-amber-100 text-amber-700',
  title_goat:          'bg-gradient-to-r from-purple-500 to-amber-500 text-white',
};

/** assetKey → 이펙트 애니메이션 클래스 */
export const EFFECT_ANIM: Record<string, string> = {
  effect_default:    '',
  effect_fire_hit:   'animate-pulse',
  effect_starlight:  'animate-spin',
  effect_lightning:  'animate-bounce',
};

/** assetKey → 이모지 아이콘 */
export const ICON_EMOJI: Record<string, string> = {
  icon_default: '🐯',
};

/** 타입 한글 레이블 */
export const TYPE_LABEL: Record<ItemType, string> = {
  frame: '프레임',
  icon: '아이콘',
  title: '칭호',
  effect: '이펙트',
};

/** 타입 이모지 */
export const TYPE_EMOJI: Record<ItemType, string> = {
  frame: '🖼️',
  icon: '🎭',
  title: '🏷️',
  effect: '✨',
};
