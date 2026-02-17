import { create } from 'zustand';

interface User {
  id: string;
  nickname: string;
  email: string;
  profileImage: string | null;
  eloRating: number;
  regionName: string;
  schoolName: string | null;
  isPublic: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoggedIn: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoggedIn: false,
  login: (user, accessToken) => set({ user, accessToken, isLoggedIn: true }),
  logout: () => set({ user: null, accessToken: null, isLoggedIn: false }),
  updateUser: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    })),
}));
