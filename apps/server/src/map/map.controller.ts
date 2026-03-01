import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { MapService } from './map.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ok } from '../common/response';

@Controller('map')
@UseGuards(JwtAuthGuard)
export class MapController {
  constructor(private mapService: MapService) {}

  @Get('users')
  async getNearbyUsers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius = '3',
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const rad = parseFloat(radius);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('위도는 -90~90 범위여야 합니다.');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('경도는 -180~180 범위여야 합니다.');
    }
    if (!Number.isFinite(rad) || rad < 0.1 || rad > 50) {
      throw new BadRequestException('반경은 0.1~50km 범위여야 합니다.');
    }
    return ok(await this.mapService.getNearbyUsers(latitude, longitude, rad));
  }

  @Get('heatmap')
  async getHeatmap(@Query('lat') lat: string, @Query('lng') lng: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BadRequestException('위도는 -90~90 범위여야 합니다.');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BadRequestException('경도는 -180~180 범위여야 합니다.');
    }
    return ok(await this.mapService.getHeatmap(latitude, longitude));
  }

  @Get('neighborhoods')
  async getNeighborhoods() {
    return ok(await this.mapService.getNeighborhoods());
  }
}
