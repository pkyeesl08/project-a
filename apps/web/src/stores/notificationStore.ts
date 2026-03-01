import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'weekly_champion' | 'dethroned' | 'challenge_beaten' | string;
  message: string;
  createdAt: number;
  read: boolean;
  payload?: Record<string, unknown>;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (data: { type: string; message: string; payload?: Record<string, unknown> }) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (data) =>
    set((s) => {
      const notification: AppNotification = {
        id: `${Date.now()}-${Math.random()}`,
        type: data.type,
        message: data.message,
        createdAt: Date.now(),
        read: false,
        payload: data.payload,
      };
      // 최대 50개 보관, 최신순
      const updated = [notification, ...s.notifications].slice(0, 50);
      return { notifications: updated, unreadCount: s.unreadCount + 1 };
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
