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
}

export const api = new ApiClient();
