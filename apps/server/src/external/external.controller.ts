import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ExternalService } from './external.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('external')
export class ExternalController {
  constructor(private externalService: ExternalService) {}

  /* ── LoL ── */

  @Get('lol/lookup')
  async lookupLol(@Query('riotId') riotId: string) {
    return ok(await this.externalService.lookupLol(riotId));
  }

  @Post('lol/connect')
  @UseGuards(JwtAuthGuard)
  async connectLol(@CurrentUserId() userId: string, @Body() body: { riotId: string }) {
    return ok(await this.externalService.connectLol(userId, body.riotId));
  }

  @Post('lol/sync')
  @UseGuards(JwtAuthGuard)
  async syncLol(@CurrentUserId() userId: string) {
    return ok(await this.externalService.syncLol(userId));
  }

  @Get('lol/ranking')
  async lolRanking(
    @Query('scope') scope: 'region' | 'school',
    @Query('scopeId') scopeId: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.externalService.getLolRanking(scope, scopeId, +limit));
  }

  /* ── 메이플스토리 ── */

  @Get('maple/lookup')
  async lookupMaple(@Query('characterName') characterName: string) {
    return ok(await this.externalService.lookupMaple(characterName));
  }

  @Post('maple/connect')
  @UseGuards(JwtAuthGuard)
  async connectMaple(@CurrentUserId() userId: string, @Body() body: { characterName: string }) {
    return ok(await this.externalService.connectMaple(userId, body.characterName));
  }

  @Post('maple/sync')
  @UseGuards(JwtAuthGuard)
  async syncMaple(@CurrentUserId() userId: string) {
    return ok(await this.externalService.syncMaple(userId));
  }

  @Get('maple/ranking')
  async mapleRanking(
    @Query('scope') scope: 'region' | 'school',
    @Query('scopeId') scopeId: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.externalService.getMapleRanking(scope, scopeId, +limit));
  }

  /* ── FC 온라인 ── */

  @Get('fc/lookup')
  async lookupFc(@Query('nickname') nickname: string) {
    return ok(await this.externalService.lookupFcOnline(nickname));
  }

  @Post('fc/connect')
  @UseGuards(JwtAuthGuard)
  async connectFc(@CurrentUserId() userId: string, @Body() body: { nickname: string }) {
    return ok(await this.externalService.connectFcOnline(userId, body.nickname));
  }

  @Post('fc/sync')
  @UseGuards(JwtAuthGuard)
  async syncFc(@CurrentUserId() userId: string) {
    return ok(await this.externalService.syncFcOnline(userId));
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
