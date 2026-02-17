import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('rankings')
export class RankingsController {
  constructor(private rankingsService: RankingsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyRankings(@CurrentUserId() userId: string) {
    return ok(await this.rankingsService.getMyRankings(userId));
  }

  @Get('national')
  async getNational(@Query('gameType') gameType: string, @Query('limit') limit = '100') {
    const entries = await this.rankingsService.getTopN('national', 'all', gameType, +limit);
    return ok({ entries, total: entries.length });
  }

  @Get('school/:schoolId/:gameType')
  async getSchool(
    @Param('schoolId') schoolId: string,
    @Param('gameType') gameType: string,
    @Query('limit') limit = '100',
  ) {
    const entries = await this.rankingsService.getTopN('school', schoolId, gameType, +limit);
    return ok({ entries, total: entries.length });
  }

  @Get(':regionId/:gameType')
  async getRegion(
    @Param('regionId') regionId: string,
    @Param('gameType') gameType: string,
    @Query('limit') limit = '100',
  ) {
    const entries = await this.rankingsService.getTopN('region', regionId, gameType, +limit);
    return ok({ entries, total: entries.length });
  }
}
