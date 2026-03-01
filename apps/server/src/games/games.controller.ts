import { Controller, Get, Post, Query, Param, Body, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { DailyGameService } from './daily-game.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { SubmitResultDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('games')
export class GamesController {
  constructor(
    private gamesService: GamesService,
    private dailyGameService: DailyGameService,
  ) {}

  @Post('result')
  @UseGuards(JwtAuthGuard)
  async submitResult(@CurrentUserId() userId: string, @Body() dto: SubmitResultDto) {
    return ok(await this.gamesService.submitResult(userId, dto));
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @CurrentUserId() userId: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return ok(await this.gamesService.getHistory(userId, +limit, +offset));
  }

  @Get('types')
  getGameTypes() {
    return ok(this.gamesService.getGameTypes());
  }

  // ── 오늘의 게임 ──

  @Get('daily')
  getDailyGame() {
    return ok(this.dailyGameService.getTodayGame());
  }

  @Get('daily/attempted')
  @UseGuards(JwtAuthGuard)
  async checkDailyAttempted(@CurrentUserId() userId: string) {
    return ok({ attempted: await this.dailyGameService.checkAttempted(userId) });
  }

  @Get('daily/leaderboard')
  async getDailyLeaderboard(
    @Query('regionId') regionId?: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.dailyGameService.getDailyLeaderboard(regionId, +limit));
  }

  @Get('daily/my-rank')
  @UseGuards(JwtAuthGuard)
  async getMyDailyRank(
    @CurrentUserId() userId: string,
    @Query('regionId') regionId?: string,
  ) {
    return ok(await this.dailyGameService.getMyDailyRank(userId, regionId));
  }

  /** 도전 타겟 조회 — userId 없으면 동네 1위 자동 반환 */
  @Get('challenge-target')
  @UseGuards(JwtAuthGuard)
  async getChallengeTarget(
    @CurrentUserId() userId: string,
    @Query('gameType') gameType: string,
    @Query('userId') targetUserId?: string,
  ) {
    return ok(await this.gamesService.getChallengeTarget(userId, gameType, targetUserId));
  }

  /** 챌린지 링크 생성 (스트리머 공유용) */
  @Post('challenge-link')
  @UseGuards(JwtAuthGuard)
  async createChallengeLink(
    @CurrentUserId() userId: string,
    @Body('gameType') gameType: string,
  ) {
    const token = await this.gamesService.createChallengeLink(userId, gameType);
    if (!token) return ok(null);
    return ok({ token, url: `/challenge/${token}` });
  }

  /** 챌린지 링크 토큰으로 도전 정보 조회 (공개) */
  @Get('challenge-link/:token')
  async getChallengeByToken(@Param('token') token: string) {
    return ok(await this.gamesService.getChallengeByToken(token));
  }
}
