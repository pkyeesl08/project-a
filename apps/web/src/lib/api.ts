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
  rewardCoins: number;
  rewardXp: number;
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
  submitResult(data: {
    gameType: string;
    score: number;
    mode: string;
    opponentId?: string;
    matchId?: string;
    metadata?: Record<string, unknown>;
    /** 플레이 중 기록된 [경과ms, 점수] 타임라인 — 도전 기능에서 ghost 재생에 사용 */
    scoreTimeline?: [number, number][];
  }) {
    const { scoreTimeline, ...rest } = data;
    const payload = {
      ...rest,
      metadata: { ...(rest.metadata ?? {}), ...(scoreTimeline ? { scoreTimeline } : {}) },
    };
    return this.request('/games/result', { method: 'POST', body: JSON.stringify(payload) });
  }

  /**
   * 도전 타겟 조회
   * - targetUserId 없으면 내 동네 1위 자동 선택
   */
  getChallengeTarget(gameType: string, targetUserId?: string) {
    const q = targetUserId ? `&userId=${targetUserId}` : '';
    return this.request<{
      userId: string;
      nickname: string;
      score: number;
      normalizedScore: number;
      scoreTimeline: [number, number][];
    } | null>(`/games/challenge-target?gameType=${encodeURIComponent(gameType)}${q}`);
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
    return this.request<{ regionRank?: number; nationalRank?: number; totalPlayers?: number }>('/rankings/me');
  }

  getNationalRanking(limit = 100) {
    return this.request<Array<{ rank: number; userId: string; nickname: string; eloRating: number; regionName: string }>>(`/rankings/national?limit=${limit}`);
  }

  // Map
  getMapUsers(lat: number, lng: number, radius = 3) {
    return this.request(`/map/users?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  getNeighborhoods() {
    return this.request<Array<{
      district: string; city: string;
      activeUsers: number; gamePlays: number;
      topScore: number; onlineNow: number; intensity: number;
    }>>('/map/neighborhoods');
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

  getCurrentBattle(regionId = '') {
    const q = regionId ? `?regionId=${regionId}` : '';
    return this.request<NeighborhoodBattle>(`/neighborhood-battle/current${q}`);
  }

  getBattleRankings(battleId: string) {
    return this.request<BattleRankEntry[]>(`/neighborhood-battle/${battleId}/rankings`);
  }

  contributeToCurrentBattle(battleId: string, score: number) {
    return this.request('/neighborhood-battle/contribute', {
      method: 'POST',
      body: JSON.stringify({ battleId, score }),
    });
  }

  // ───── 오늘의 게임 ─────

  getDailyGame() {
    return this.request<{ gameType: string; config: any; date: string; endAt: string }>('/games/daily');
  }

  checkDailyAttempted() {
    return this.request<{ attempted: boolean }>('/games/daily/attempted');
  }

  getDailyLeaderboard(regionId?: string, limit = 50) {
    const q = [regionId ? `regionId=${regionId}` : '', `limit=${limit}`].filter(Boolean).join('&');
    return this.request<{ rank: number; userId: string; nickname: string; score: number }[]>(
      `/games/daily/leaderboard?${q}`,
    );
  }

  getMyDailyRank(regionId?: string) {
    const q = regionId ? `?regionId=${regionId}` : '';
    return this.request<{ rank: number; total: number; score: number } | null>(
      `/games/daily/my-rank${q}`,
    );
  }

  // ───── 주간 동네 챌린지 ─────

  getWeeklyChallenge() {
    return this.request<{
      challenge: { weekKey: string; gameType: string; startAt: string; endAt: string; remainingMs: number };
      topN: { rank: number; userId: string; nickname: string; score: number; participantCount: number }[];
      isFallback: boolean;
      myRank: { rank: number; score: number; total: number } | null;
      champion: { userId: string; nickname: string } | null;
    }>('/weekly-challenge/current');
  }

  getMyChampionStats() {
    return this.request<{
      streak: number;
      totalCount: number;
      history: string[];
      nextReward: string | null;
    }>('/weekly-challenge/my-champion-stats');
  }

  // ───── 챌린지 링크 (스트리머 공유용) ─────

  createChallengeLink(gameType: string) {
    return this.request<{ token: string; url: string } | null>('/games/challenge-link', {
      method: 'POST',
      body: JSON.stringify({ gameType }),
    });
  }

  getChallengeByToken(token: string) {
    return this.request<{
      userId: string; nickname: string; gameType: string;
      score: number; normalizedScore: number;
      scoreTimeline: [number, number][];
      createdAt: string;
    } | null>(`/games/challenge-link/${token}`);
  }

  // ───── 출석 체크 ─────

  checkIn() {
    return this.request<{
      alreadyChecked: boolean;
      streak: number;
      cycleDay: number;
      rewards: { coins?: number; gems?: number; label: string } | null;
    }>('/attendance/check-in', { method: 'POST' });
  }

  getAttendanceStatus() {
    return this.request<{
      checkedInToday: boolean;
      streak: number;
      weekCalendar: Array<{
        date: string;
        dayLabel: string;
        checked: boolean;
        isToday: boolean;
        reward: { coins?: number; gems?: number; label: string };
      }>;
      nextReward: { coins?: number; gems?: number; label: string; cycleDay: number } | null;
      todayRewards: { coins?: number; gems?: number; label: string } | null;
    }>('/attendance/status');
  }

  // ───── 시즌 패스 ─────

  getSeasonPassProgress() {
    return this.request<{
      seasonId?: string;
      seasonXp: number;
      hasGoldPass: boolean;
      currentTier: number;
      nextTierXp: number | null;
      xpToNext: number | null;
      claimedFreeTiers: number[];
      claimedGoldTiers: number[];
      goldPassPrice: number;
      tiers: Array<{
        tier: number;
        requiredXp: number;
        unlocked: boolean;
        freeClaimable: boolean;
        goldClaimable: boolean;
        free: { coins?: number; gems?: number; assetKey?: string; label: string };
        gold: { coins?: number; gems?: number; assetKey?: string; label: string };
      }>;
    }>('/season-pass/my-progress');
  }

  claimSeasonPassTier(tier: number, track: 'free' | 'gold') {
    return this.request<{ claimed: boolean; tier: number }>(`/season-pass/claim/${tier}/${track}`, { method: 'POST' });
  }

  purchaseGoldPass() {
    return this.request<{ purchased: boolean; gemsSpent: number }>('/season-pass/purchase-gold', { method: 'POST' });
  }

  // ───── 뽑기 ─────

  getGachaPity() {
    return this.request<{
      epicPity: number;
      legendaryPity: number;
      epicAt: number;
      legendaryAt: number;
      singleCost: number;
      tenCost: number;
    }>('/gacha/pity');
  }

  pullGacha(count: 1 | 10) {
    return this.request<{
      results: Array<{
        rarity: string;
        item: { id: string; name: string; assetKey: string; rarity: string; type: string } | null;
        isDuplicate: boolean;
        dupeCoins: number;
      }>;
      remaining: number;
    }>('/gacha/pull', { method: 'POST', body: JSON.stringify({ count }) });
  }

  // ── 동네 게임 게시판 ──────────────────────────────────────

  getBoardPosts(params: { category?: string; regionId?: string; page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.category) q.set('category', params.category);
    if (params.regionId) q.set('regionId', params.regionId);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return this.request<{
      posts: BoardPost[];
      total: number;
      page: number;
      limit: number;
    }>(`/boards?${q}`);
  }

  getBoardPost(postId: string) {
    return this.request<BoardPost>(`/boards/${postId}`);
  }

  createBoardPost(data: {
    category: 'general' | 'party';
    regionId?: string;
    title: string;
    content: string;
    gameType?: string;
    maxPlayers?: number;
  }) {
    return this.request<BoardPost>('/boards', { method: 'POST', body: JSON.stringify(data) });
  }

  deleteBoardPost(postId: string) {
    return this.request<{ deleted: boolean }>(`/boards/${postId}`, { method: 'DELETE' });
  }

  joinParty(postId: string) {
    return this.request<{ joined: boolean; currentPlayers: string[]; isFull: boolean }>(
      `/boards/${postId}/join`, { method: 'POST' },
    );
  }

  leaveParty(postId: string) {
    return this.request<{ left: boolean; currentPlayers: string[] }>(
      `/boards/${postId}/leave`, { method: 'POST' },
    );
  }

  getBoardComments(postId: string) {
    return this.request<BoardComment[]>(`/boards/${postId}/comments`);
  }

  createBoardComment(postId: string, content: string) {
    return this.request<BoardComment>(
      `/boards/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) },
    );
  }

  deleteBoardComment(commentId: string) {
    return this.request<{ deleted: boolean }>(`/boards/comments/${commentId}`, { method: 'DELETE' });
  }
}

export interface BoardPost {
  id: string;
  userId: string;
  regionId: string | null;
  category: 'general' | 'party';
  title: string;
  content?: string;
  gameType: string | null;
  maxPlayers: number | null;
  currentPlayers: string[];
  partyStatus: 'open' | 'closed' | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; nickname: string; profileImage: string | null };
}

export interface BoardComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;
  user: { id: string; nickname: string; profileImage: string | null };
}

export const api = new ApiClient();
