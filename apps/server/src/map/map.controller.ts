import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
    return ok(await this.mapService.getNearbyUsers(+lat, +lng, +radius));
  }

  @Get('heatmap')
  async getHeatmap(@Query('lat') lat: string, @Query('lng') lng: string) {
    return ok(await this.mapService.getHeatmap(+lat, +lng));
  }

  @Get('neighborhoods')
  async getNeighborhoods() {
    return ok(await this.mapService.getNeighborhoods());
  }
}
