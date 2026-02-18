// ───── 타입 정의 ─────

export interface DailyMission {
  id: string;
  missionType: string;
  title: string;
  description: string;
  icon: string;
  currentValue: number;
  targetValue: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  rewardElo: number;
}

export interface AchievementItem {
  type: string;
  title: string;
  description: string;
  icon: string;
  rewardElo: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface Friend {
  userId: string;
  nickname: string;
  profileImage: string | null;
  eloRating: number;
  since: string;
}

export interface FriendRequest {
  from: {
    userId: string;
    nickname: string;
    profileImage: string | null;
    eloRating: number;
  };
  createdAt: string;
}

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface RankEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  gamesPlayed: number;
}

interface ActiveEvent {
  id: string;
  title: string;
  description: string;
  gameType: string;
  startAt: string;
  endAt: string;
  rewardElo: number;
  regionId?: string;
}

export interface NeighborhoodBattle {
  id: string;
  regionAId: string;
  regionBId: string;
  regionAName?: string;
  regionBName?: string;
  regionAScore: number;
  regionBScore: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  winnerId?: string;
}

export interface BattleRankEntry {
  rank: number;
  userId: string;
  nickname: string;
  contribution: number;
  regionId: string;
}

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'API Error');
    }

    return data.data;
  }

  // Auth
  login(provider: string, token: string) {
    return this.request<{
      accessToken: string | null;
      refreshToken: string | null;
      registerToken?: string;
      user: { id: string; nickname: string; isNewUser: boolean } | null;
      isNewUser?: boolean;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ provider, token }),
    });
  }

  register(registerToken: string, nickname: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; nickname: string; isNewUser: boolean };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ registerToken, nickname }),
    });
  }

  // Users
  getMe() {
    return this.request('/users/me');
  }

  updateMe(data: { nickname?: string; isPublic?: boolean }) {
    return this.request('/users/me', { method: 'PATCH', body: JSON.stringify(data) });
  }

  checkNickname(nickname: string) {
    return this.request<{ available: boolean; reason: string | null }>(`/users/nickname/check?nickname=${encodeURIComponent(nickname)}`);
  }

  verifyRegion(latitude: number, longitude: number) {
    return this.request('/users/region/verify', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  // Games
  submitResult(data: { gameType: string; score: number; mode: string; opponentId?: string; matchId?: string; metadata?: Record<string, unknown> }) {
    return this.request('/games/result', { method: 'POST', body: JSON.stringify(data) });
  }

  getGameHistory(limit = 20, offset = 0) {
    return this.request(`/games/history?limit=${limit}&offset=${offset}`);
  }

  getGameTypes() {
    return this.request('/games/types');
  }

  // Rankings
  getRegionRanking(regionId: string, gameType: string, limit = 100) {
    return this.request(`/rankings/${regionId}/${gameType}?limit=${limit}`);
  }

  getSchoolRanking(schoolId: string, gameType: string, limit = 100) {
    return this.request(`/rankings/school/${schoolId}/${gameType}?limit=${limit}`);
  }

  getMyRankings() {
    return this.request('/rankings/me');
  }

  // Map
  getMapUsers(lat: number, lng: number, radius = 3) {
    return this.request(`/map/users?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  challengeUser(userId: string) {
    return this.request(`/map/challenge/${userId}`, { method: 'POST' });
  }

  // External
  connectExternal(platform: string, data: { token: string }) {
    return this.request(`/external/connect/${platform}`, { method: 'POST', body: JSON.stringify(data) });
  }

  getExternalAccounts() {
    return this.request('/external/accounts');
  }

  // LoL
  lookupLol(riotId: string) {
    return this.request<{
      puuid: string;
      gameName: string;
      tagLine: string;
      summonerLevel: number;
      profileIconId: number;
      soloRank: { tier: string; rank: string; lp: number; wins: number; losses: number; winRate: string } | null;
      flexRank: { tier: string; rank: string; lp: number; wins: number; losses: number; winRate: string } | null;
    }>(`/external/lol/lookup?riotId=${encodeURIComponent(riotId)}`);
  }

  connectLol(riotId: string) {
    return this.request('/external/lol/connect', { method: 'POST', body: JSON.stringify({ riotId }) });
  }

  syncLol() {
    return this.request('/external/lol/sync', { method: 'POST' });
  }

  getLolRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    return this.request<{
      rank: number; userId: string; nickname: string; gameName: string;
      tier: string; tierScore: number; soloRank: any; lastSynced: string;
    }[]>(`/external/lol/ranking?scope=${scope}&scopeId=${scopeId}&limit=${limit}`);
  }

  // MapleStory
  lookupMaple(characterName: string) {
    return this.request<{
      ocid: string; characterName: string; world: string; class: string;
      level: number; combatPower: number; guild: string | null; image: string;
    }>(`/external/maple/lookup?characterName=${encodeURIComponent(characterName)}`);
  }

  connectMaple(characterName: string) {
    return this.request('/external/maple/connect', { method: 'POST', body: JSON.stringify({ characterName }) });
  }

  syncMaple() {
    return this.request('/external/maple/sync', { method: 'POST' });
  }

  // FC Online
  lookupFcOnline(nickname: string) {
    return this.request<{
      ouid: string; nickname: string; level: number;
      maxDivision: { matchType: string; division: string; achievementDate: string }[];
    }>(`/external/fc/lookup?nickname=${encodeURIComponent(nickname)}`);
  }

  connectFcOnline(nickname: string) {
    return this.request('/external/fc/connect', { method: 'POST', body: JSON.stringify({ nickname }) });
  }

  // PUBG
  lookupPubg(playerName: string, shard: 'kakao' | 'steam' = 'kakao') {
    return this.request<{
      playerId: string; playerName: string; shard: string;
      squadFpp: { tier: string; subTier: string; rp: number; kills: number; deaths: number;
        wins: number; roundsPlayed: number; kda: number; winRate: string } | null;
      soloFpp: { tier: string; subTier: string; rp: number; kills: number; deaths: number;
        wins: number; roundsPlayed: number; kda: number; winRate: string } | null;
    }>(`/external/pubg/lookup?playerName=${encodeURIComponent(playerName)}&shard=${shard}`);
  }

  connectPubg(playerName: string, shard: 'kakao' | 'steam' = 'kakao') {
    return this.request('/external/pubg/connect', { method: 'POST', body: JSON.stringify({ playerName, shard }) });
  }

  syncPubg() {
    return this.request('/external/pubg/sync', { method: 'POST' });
  }

  getPubgRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    return this.request<any[]>(`/external/pubg/ranking?scope=${scope}&scopeId=${scopeId}&limit=${limit}`);
  }

  // Steam
  lookupSteam(input: string) {
    return this.request<{
      steamId: string; personaName: string; avatarUrl: string; profileUrl: string;
      totalHours: number; gameCount: number;
      notableGames: { appId: number; name: string; hours: number; title: string | null }[];
      bestTitle: string | null;
    }>(`/external/steam/lookup?input=${encodeURIComponent(input)}`);
  }

  connectSteam(input: string) {
    return this.request('/external/steam/connect', { method: 'POST', body: JSON.stringify({ input }) });
  }

  syncSteam() {
    return this.request('/external/steam/sync', { method: 'POST' });
  }

  getSteamRanking(scope: 'region' | 'school', scopeId: string, limit = 50) {
    return this.request<any[]>(`/external/steam/ranking?scope=${scope}&scopeId=${scopeId}&limit=${limit}`);
  }

  // ───── Avatar ─────

  getAvatarShop(type?: string) {
    const q = type ? `?type=${type}` : '';
    return this.request<any[]>(`/avatar/shop${q}`);
  }

  getAvatarCatalog(type?: string) {
    const q = type ? `?type=${type}` : '';
    return this.request<any[]>(`/avatar/catalog${q}`);
  }

  getMyAvatar() {
    return this.request<any>('/avatar/me');
  }

  getUserAvatar(userId: string) {
    return this.request<any>(`/avatar/${userId}`);
  }

  getInventory() {
    return this.request<any[]>('/avatar/inventory');
  }

  equipItem(itemId: string) {
    return this.request<any>(`/avatar/equip/${itemId}`, { method: 'POST' });
  }

  unequipSlot(slot: 'frame' | 'icon' | 'title' | 'effect') {
    return this.request<any>(`/avatar/unequip/${slot}`, { method: 'DELETE' });
  }

  buyWithGems(itemId: string) {
    return this.request<any>(`/avatar/shop/${itemId}/buy/gems`, { method: 'POST' });
  }

  buyWithCoins(itemId: string) {
    return this.request<any>(`/avatar/shop/${itemId}/buy/coins`, { method: 'POST' });
  }

  chargeGems(amount: number, receipt: string) {
    return this.request<{ gems: number }>('/avatar/gems/charge', {
      method: 'POST',
      body: JSON.stringify({ amount, receipt }),
    });
  }

  // ───── Missions ─────

  getMissions() {
    return this.request<DailyMission[]>('/missions/daily');
  }

  claimMission(missionId: string) {
    return this.request<{ eloAdded: number }>(`/missions/${missionId}/claim`, { method: 'POST' });
  }

  // ───── Achievements ─────

  getAchievements() {
    return this.request<AchievementItem[]>('/achievements');
  }

  // ───── Friends ─────

  getFriends() {
    return this.request<Friend[]>('/friends');
  }

  getFriendRequests() {
    return this.request<FriendRequest[]>('/friends/requests');
  }

  sendFriendRequest(targetId: string) {
    return this.request<void>(`/friends/request/${targetId}`, { method: 'POST' });
  }

  acceptFriendRequest(requesterId: string) {
    return this.request<void>(`/friends/accept/${requesterId}`, { method: 'POST' });
  }

  removeFriend(targetId: string) {
    return this.request<void>(`/friends/${targetId}`, { method: 'DELETE' });
  }

  // ───── Seasons ─────

  getCurrentSeason() {
    return this.request<Season>('/seasons/current');
  }

  getSeasonRankings(seasonId: string, gameType?: string, limit = 50) {
    const q = [gameType ? `gameType=${gameType}` : '', `limit=${limit}`].filter(Boolean).join('&');
    return this.request<RankEntry[]>(`/seasons/${seasonId}/rankings?${q}`);
  }

  getMySeasonRank(seasonId: string, gameType?: string) {
    const q = gameType ? `?gameType=${gameType}` : '';
    return this.request<{ rank: number; total: number; score: number }>(`/seasons/${seasonId}/my-rank${q}`);
  }

  // ───── Events ─────

  getActiveEvents(regionId?: string) {
    const q = regionId ? `?regionId=${regionId}` : '';
    return this.request<ActiveEvent[]>(`/events/active${q}`);
  }

  getEventRankings(eventId: string, limit = 50) {
    return this.request<RankEntry[]>(`/events/${eventId}/rankings?limit=${limit}`);
  }

  // ───── Neighborhood Battle ─────

  getCurrentBattle(regionId: string) {
    return this.request<NeighborhoodBattle>(`/neighborhood-battle/current?regionId=${regionId}`);
  }

  getBattleRankings(battleId: string) {
    return this.request<BattleRankEntry[]>(`/neighborhood-battle/${battleId}/rankings`);
  }
}

export const api = new ApiClient();
