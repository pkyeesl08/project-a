import { GameType } from './game';

export enum RankingScope {
  REGION = 'region',
  SCHOOL = 'school',
  DISTRICT = 'district',
  CITY = 'city',
  NATIONAL = 'national',
  EXTERNAL = 'external',
}

export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  profileImage: string | null;
  score: number;
  gameType: GameType;
}

export interface MyRanking {
  scope: RankingScope;
  scopeName: string;
  rank: number;
  totalPlayers: number;
  score: number;
  gameType: GameType;
}

export interface SeasonInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface GameResult {
  id: string;
  userId: string;
  gameType: GameType;
  score: number;
  mode: 'solo' | 'pvp' | 'team';
  opponentId: string | null;
  matchId: string | null;
  regionId: string;
  seasonId: string;
  playedAt: string;
}
