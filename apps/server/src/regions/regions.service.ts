import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionEntity } from './region.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(RegionEntity)
    private regionsRepo: Repository<RegionEntity>,
    private usersService: UsersService,
  ) {}

  async verifyRegion(userId: string, latitude: number, longitude: number) {
    // 위도/경도로 가장 가까운 동네 찾기
    const region = await this.regionsRepo
      .createQueryBuilder('region')
      .orderBy(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(region.latitude)) * cos(radians(region.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(region.latitude))))`,
      )
      .setParameters({ lat: latitude, lng: longitude })
      .getOne();

    if (!region) {
      throw new BadRequestException('해당 위치에서 동네를 찾을 수 없습니다.');
    }

    // 반경 내 체크
    const distance = this.haversine(latitude, longitude, region.latitude, region.longitude);
    if (distance > region.radiusKm) {
      throw new BadRequestException(`${region.name} 인증 가능 범위를 벗어났습니다. (${distance.toFixed(1)}km)`);
    }

    // 유저의 주 동네 업데이트
    await this.usersService.updateProfile(userId, { primaryRegionId: region.id });

    return {
      regionId: region.id,
      regionName: region.name,
      district: region.district,
      city: region.city,
      verified: true,
    };
  }

  async findAll() {
    return this.regionsRepo.find();
  }

  async findById(id: string) {
    return this.regionsRepo.findOne({ where: { id } });
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
