import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { VerifyRegionDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('users/region')
export class RegionsController {
  constructor(private regionsService: RegionsService) {}

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@CurrentUserId() userId: string, @Body() dto: VerifyRegionDto) {
    return ok(await this.regionsService.verifyRegion(userId, dto.latitude, dto.longitude));
  }
}
