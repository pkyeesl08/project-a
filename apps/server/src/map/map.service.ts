import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { GameResultEntity } from '../games/game-result.entity';

@Injectable()
export class MapService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(GameResultEntity)
    private resultsRepo: Repository<GameResultEntity>,
  ) {}

  /** 구 단위 동네 현황 — 지도 타일용 */
  async getNeighborhoods() {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since1h  = new Date(Date.now() - 60 * 60 * 1000);

    const rows = await this.resultsRepo
      .createQueryBuilder('result')
      .innerJoin('result.region', 'region')
      .select([
        'region.district               AS district',
        'region.city                   AS city',
        'COUNT(DISTINCT result.userId) AS activeUsers',
        'COUNT(result.id)              AS gamePlays',
        'MAX(result.normalizedScore)   AS topScore',
      ])
      .where('result.playedAt >= :since24h', { since24h })
      .groupBy('region.district, region.city')
      .orderBy('"gamePlays"', 'DESC')
      .limit(100)
      .getRawMany();

    const recentRows = await this.resultsRepo
      .createQueryBuilder('result')
      .innerJoin('result.region', 'region')
      .select([
        'region.district               AS district',
        'COUNT(DISTINCT result.userId) AS onlineNow',
      ])
      .where('result.playedAt >= :since1h', { since1h })
      .groupBy('region.district')
      .getRawMany();

    const onlineMap = new Map<string, number>(
      recentRows.map(r => [r.district as string, parseInt(r.onlineNow, 10)]),
    );

    return rows.map(r => ({
      district:    r.district as string,
      city:        r.city as string,
      activeUsers: parseInt(r.activeUsers, 10),
      gamePlays:   parseInt(r.gamePlays, 10),
      topScore:    parseInt(r.topScore, 10) || 0,
      onlineNow:   onlineMap.get(r.district as string) ?? 0,
      intensity:   Math.min(1, parseInt(r.gamePlays, 10) / 100),
    }));
  }

  async getNearbyUsers(lat: number, lng: number, radiusKm = 3) {
    const users = await this.usersService.findPublicUsersNearby(lat, lng, radiusKm);
    return users
      .filter(u => u.primaryRegion) // 지역 미인증 유저 제외
      .map(u => ({
        userId: u.id,
        nickname: u.nickname,
        profileImage: u.profileImage,
        eloRating: u.eloRating,
        latitude: u.primaryRegion!.latitude,
        longitude: u.primaryRegion!.longitude,
      }));
  }

  /** 실제 게임 플레이 기록 기반 히트맵 (최근 24시간) */
  async getHeatmap(lat: number, lng: number) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await this.resultsRepo
      .createQueryBuilder('result')
      .innerJoin('result.region', 'region')
      .select([
        'region.latitude   AS latitude',
        'region.longitude  AS longitude',
        'COUNT(result.id)  AS count',
      ])
      .where('result.playedAt >= :since', { since })
      .groupBy('region.latitude, region.longitude')
      .orderBy('count', 'DESC')
      .limit(50)
      .getRawMany();

    return rows
      .map(r => ({
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        userCount: parseInt(r.count, 10),
        intensity: Math.min(1, parseInt(r.count, 10) / 50),
      }))
      .filter(r => this.haversineKm(lat, lng, r.latitude, r.longitude) < 50);
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
