import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(private missionsService: MissionsService) {}

  /** 오늘의 미션 목록 */
  @Get('daily')
  async getDailyMissions(@CurrentUserId() userId: string) {
    return ok(await this.missionsService.getDailyMissions(userId));
  }

  /** 미션 보상 수령 */
  @Post(':missionId/claim')
  async claimReward(
    @CurrentUserId() userId: string,
    @Param('missionId') missionId: string,
  ) {
    return ok(await this.missionsService.claimReward(userId, missionId));
  }
}
