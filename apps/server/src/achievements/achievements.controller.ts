import { Controller, Get, UseGuards } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private achievementsService: AchievementsService) {}

  /** 내 업적 목록 */
  @Get()
  async getMyAchievements(@CurrentUserId() userId: string) {
    return ok(await this.achievementsService.getUserAchievements(userId));
  }
}
