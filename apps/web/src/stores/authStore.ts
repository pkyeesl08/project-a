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
  xp: number;
  level: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  registerToken: string | null;
  isLoggedIn: boolean;
  needsRegister: boolean;

  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;

  /** 소셜 로그인 후 신규 유저 — 닉네임 설정 필요 */
  setNeedsRegister: (registerToken: string) => void;
  /** 회원가입 완료 */
  completeRegister: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  registerToken: null,
  isLoggedIn: false,
  needsRegister: false,

  login: (user, accessToken) =>
    set({ user, accessToken, isLoggedIn: true, needsRegister: false, registerToken: null }),

  logout: () =>
    set({ user: null, accessToken: null, isLoggedIn: false, needsRegister: false, registerToken: null }),

  updateUser: (data) =>
    set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

  setNeedsRegister: (registerToken) =>
    set({ registerToken, needsRegister: true, isLoggedIn: false }),

  completeRegister: (user, accessToken) =>
    set({ user, accessToken, isLoggedIn: true, needsRegister: false, registerToken: null }),
}));
