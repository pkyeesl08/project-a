import { GameType, GameMode } from './game';
import { AuthProvider } from './user';
import { RankingScope, RankingEntry, MyRanking } from './ranking';

// ── Auth ──
export interface LoginRequest {
  provider: AuthProvider;
  token: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    nickname: string;
    isNewUser: boolean;
  };
}

// ── Region Verification ──
export interface RegionVerifyRequest {
  latitude: number;
  longitude: number;
}

export interface RegionVerifyResponse {
  regionId: string;
  regionName: string;
  district: string;
  city: string;
  verified: boolean;
}

// ── School Verification ──
export interface SchoolVerifyRequest {
  email?: string;
  schoolId?: string;
}

// ── Game ──
export interface GameResultRequest {
  gameType: GameType;
  score: number;
  mode: GameMode;
  opponentId?: string;
  matchId?: string;
  metadata?: Record<string, unknown>;
}

export interface GameResultResponse {
  resultId: string;
  rankChange: number;
  newElo: number;
  regionRank: number;
  isNewHighScore: boolean;
}

// ── Ranking ──
export interface RankingRequest {
  scope: RankingScope;
  scopeId?: string;
  gameType: GameType;
  limit?: number;
  offset?: number;
}

export interface RankingResponse {
  entries: RankingEntry[];
  total: number;
  myRanking: MyRanking | null;
}

// ── Map ──
export interface MapUsersRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface MapUser {
  userId: string;
  nickname: string;
  profileImage: string | null;
  eloRating: number;
  bestGame: GameType | null;
  latitude: number;
  longitude: number;
}

// ── WebSocket Events ──
export enum SocketEvent {
  // Matching
  MATCH_REQUEST = 'match:request',
  MATCH_FOUND = 'match:found',
  MATCH_CANCEL = 'match:cancel',
  // Game
  GAME_READY = 'game:ready',
  GAME_START = 'game:start',
  GAME_ACTION = 'game:action',
  GAME_OPPONENT_ACTION = 'game:opponent_action',
  GAME_RESULT = 'game:result',
  // Map
  MAP_CHALLENGE = 'map:challenge',
  MAP_CHALLENGE_RECEIVED = 'map:challenge_received',
  MAP_CHALLENGE_RESPONSE = 'map:challenge_response',
  // Chat
  CHAT_MESSAGE = 'chat:message',
  CHAT_JOIN = 'chat:join',
  CHAT_LEAVE = 'chat:leave',
}

export interface MatchRequest {
  gameType: GameType;
  mode: 'region' | 'school' | 'national' | 'friend';
  friendId?: string;
}

export interface MatchFound {
  matchId: string;
  gameType: GameType;
  opponent: {
    id: string;
    nickname: string;
    profileImage: string | null;
    eloRating: number;
  };
}

export interface GameAction {
  matchId: string;
  action: string;
  value: number;
  timestamp: number;
}

// ── Common ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
