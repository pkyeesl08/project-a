export enum AuthProvider {
  KAKAO = 'kakao',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum SchoolType {
  MIDDLE = 'middle',
  HIGH = 'high',
  UNIVERSITY = 'university',
}

export interface User {
  id: string;
  nickname: string;
  email: string;
  authProvider: AuthProvider;
  profileImage: string | null;
  primaryRegionId: string;
  secondaryRegionId: string | null;
  schoolId: string | null;
  isPublic: boolean;
  eloRating: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface UserProfile extends User {
  region: Region;
  school: School | null;
  stats: UserStats;
  externalAccounts: ExternalAccount[];
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  winRate: number;
  bestGame: string | null;
  currentStreak: number;
  regionRank: number | null;
  schoolRank: number | null;
}

export interface Region {
  id: string;
  name: string;
  district: string;
  city: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface School {
  id: string;
  name: string;
  type: SchoolType;
  regionId: string;
  verifiedDomain: string | null;
  latitude: number;
  longitude: number;
}

export enum ExternalPlatform {
  RIOT = 'riot',
  BATTLENET = 'battlenet',
  NEXON = 'nexon',
}

export enum ExternalGame {
  LOL = 'lol',
  VALORANT = 'valorant',
  OVERWATCH2 = 'ow2',
  FIFA_ONLINE = 'fifaonline',
}

export interface ExternalAccount {
  id: string;
  userId: string;
  platform: ExternalPlatform;
  game: ExternalGame;
  externalId: string;
  gameName: string;
  tier: string | null;
  lastSyncedAt: string;
}
