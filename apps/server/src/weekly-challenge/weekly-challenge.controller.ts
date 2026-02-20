import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WeeklyChallengeService } from './weekly-challenge.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';
import { UsersService } from '../users/users.service';

@Controller('weekly-challenge')
export class WeeklyChallengeController {
  constructor(
    private weeklyService: WeeklyChallengeService,
    private usersService: UsersService,
  ) {}

  /** 현재 주간 챌린지 정보 + 내 동네 랭킹 */
  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrent(@CurrentUserId() userId: string) {
    const challenge = this.weeklyService.getCurrentChallenge();

    const user = await this.usersService.findById(userId);
    const regionId = user?.primaryRegionId;

    const [topNResult, myRank, champion] = await Promise.all([
      regionId ? this.weeklyService.getTopN(regionId, 10) : Promise.resolve({ entries: [], isFallback: false }),
      regionId ? this.weeklyService.getUserRank(regionId, userId) : Promise.resolve(null),
      regionId ? this.weeklyService.getChampion(regionId) : Promise.resolve(null),
    ]);

    return ok({
      challenge,
      topN: topNResult.entries,
      isFallback: topNResult.isFallback,
      myRank,
      champion,
    });
  }

  /** 내 챔피언 통계 — 트로피 케이스 */
  @Get('my-champion-stats')
  @UseGuards(JwtAuthGuard)
  async getMyChampionStats(@CurrentUserId() userId: string) {
    const stats = await this.weeklyService.getChampionStats(userId);
    return ok(stats);
  }

  /** 공개 — 특정 동네의 주간 랭킹 */
  @Get('rankings')
  async getRankings(
    @Query('regionId') regionId: string,
    @Query('limit') limit = '50',
  ) {
    const challenge = this.weeklyService.getCurrentChallenge();
    const { entries: topN, isFallback } = await this.weeklyService.getTopN(regionId, +limit);
    return ok({ challenge, topN, isFallback });
  }
}
