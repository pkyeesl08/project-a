import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class MapService {
  constructor(private usersService: UsersService) {}

  async getNearbyUsers(lat: number, lng: number, radiusKm = 3) {
    const users = await this.usersService.findPublicUsersNearby(lat, lng, radiusKm);
    return users.map(u => ({
      userId: u.id,
      nickname: u.nickname,
      profileImage: u.profileImage,
      eloRating: u.eloRating,
      latitude: u.primaryRegion?.latitude || lat + (Math.random() - 0.5) * 0.01,
      longitude: u.primaryRegion?.longitude || lng + (Math.random() - 0.5) * 0.01,
    }));
  }

  async getHeatmap(lat: number, lng: number) {
    // TODO: Redis에서 활성 유저 데이터로 히트맵 생성
    // Mock: 주변에 핫스팟 생성
    const hotspots = Array.from({ length: 5 }, () => ({
      latitude: lat + (Math.random() - 0.5) * 0.02,
      longitude: lng + (Math.random() - 0.5) * 0.02,
      intensity: Math.random(),
      userCount: Math.floor(Math.random() * 20) + 1,
    }));
    return hotspots;
  }
}
