import { Controller, Get, Post, Param, Query, UseGuards, Body } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('seasons')
export class SeasonsController {
  constructor(private seasonsService: SeasonsService) {}

  /** 현재 활성 시즌 정보 */
  @Get('current')
  async getCurrent() {
    return ok(await this.seasonsService.getCurrentSeason());
  }

  /** 시즌 목록 */
  @Get()
  async getAll() {
    return ok(await this.seasonsService.getSeasons());
  }

  /** 시즌별 랭킹 */
  @Get(':seasonId/rankings')
  async getSeasonRankings(
    @Param('seasonId') seasonId: string,
    @Query('gameType') gameType = 'all',
    @Query('limit') limit = '50',
  ) {
    return ok(await this.seasonsService.getSeasonRankings(seasonId, gameType, +limit));
  }

  /** 내 시즌 순위 */
  @Get(':seasonId/my-rank')
  @UseGuards(JwtAuthGuard)
  async getMyRank(
    @Param('seasonId') seasonId: string,
    @CurrentUserId() userId: string,
    @Query('gameType') gameType = 'all',
  ) {
    return ok(await this.seasonsService.getMySeasonRank(seasonId, userId, gameType));
  }

  /** 새 시즌 시작 (관리자용) */
  @Post('start')
  async startSeason(@Body() body: { name: string; durationDays?: number }) {
    return ok(await this.seasonsService.startSeason(body.name, body.durationDays));
  }

  /** 시즌 종료 */
  @Post(':seasonId/end')
  async endSeason(@Param('seasonId') seasonId: string) {
    return ok(await this.seasonsService.endSeason(seasonId));
  }
}
