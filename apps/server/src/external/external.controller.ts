import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ExternalService } from './external.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('external')
export class ExternalController {
  constructor(private externalService: ExternalService) {}

  /* ── LoL 전용 ── */

  /** LoL 계정 조회 (연동 전 미리보기) */
  @Get('lol/lookup')
  async lookupLol(@Query('riotId') riotId: string) {
    return ok(await this.externalService.lookupLol(riotId));
  }

  /** LoL 계정 연동 */
  @Post('lol/connect')
  @UseGuards(JwtAuthGuard)
  async connectLol(@CurrentUserId() userId: string, @Body() body: { riotId: string }) {
    return ok(await this.externalService.connectLol(userId, body.riotId));
  }

  /** LoL 데이터 최신화 */
  @Post('lol/sync')
  @UseGuards(JwtAuthGuard)
  async syncLol(@CurrentUserId() userId: string) {
    return ok(await this.externalService.syncLol(userId));
  }

  /** 동네/학교별 LoL 랭킹 */
  @Get('lol/ranking')
  async lolRanking(
    @Query('scope') scope: 'region' | 'school',
    @Query('scopeId') scopeId: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.externalService.getLolRanking(scope, scopeId, +limit));
  }

  /* ── 범용 ── */

  @Post('connect/:platform')
  @UseGuards(JwtAuthGuard)
  async connect(
    @CurrentUserId() userId: string,
    @Param('platform') platform: string,
    @Body() body: { token: string; game: string },
  ) {
    return ok(await this.externalService.connect(userId, platform, body));
  }

  @Delete('disconnect/:platform')
  @UseGuards(JwtAuthGuard)
  async disconnect(
    @CurrentUserId() userId: string,
    @Param('platform') platform: string,
    @Query('game') game: string,
  ) {
    return ok(await this.externalService.disconnect(userId, platform, game));
  }

  @Post('sync/:platform')
  @UseGuards(JwtAuthGuard)
  async sync(
    @CurrentUserId() userId: string,
    @Param('platform') platform: string,
    @Body() body: { game: string },
  ) {
    return ok(await this.externalService.sync(userId, platform, body.game));
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async getAccounts(@CurrentUserId() userId: string) {
    return ok(await this.externalService.getUserAccounts(userId));
  }
}
