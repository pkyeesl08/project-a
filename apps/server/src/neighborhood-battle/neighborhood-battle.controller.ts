import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NeighborhoodBattleService } from './neighborhood-battle.service';

@Controller('neighborhood-battle')
@UseGuards(JwtAuthGuard)
export class NeighborhoodBattleController {
  constructor(private readonly service: NeighborhoodBattleService) {}

  /** GET /neighborhood-battle/current?regionId=xxx */
  @Get('current')
  async getCurrent(@Query('regionId') regionId: string, @Request() req: any) {
    const rid = regionId || req.user?.primaryRegionId || 'default';
    return this.service.getCurrentBattle(rid);
  }

  /** GET /neighborhood-battle/:battleId/rankings?regionId=xxx */
  @Get(':battleId/rankings')
  async getRankings(
    @Param('battleId') battleId: string,
    @Query('regionId') regionId?: string,
  ) {
    return this.service.getBattleRankings(battleId, regionId);
  }

  /** POST /neighborhood-battle/contribute */
  @Post('contribute')
  async contribute(
    @Body() body: { battleId: string; score: number },
    @Request() req: any,
  ) {
    const user = req.user;
    await this.service.contribute(
      body.battleId,
      user.id,
      user.nickname,
      user.primaryRegionId,
      body.score,
    );
    return { success: true };
  }
}
