import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ExternalService } from './external.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

/** 외부 게임 닉네임 길이 검증 */
function validateGameId(value: string | undefined, label: string, max = 50): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed.length < 1 || trimmed.length > max) {
    throw new BadRequestException(`${label}은 1~${max}자여야 합니다.`);
  }
  return trimmed;
}

/** limit 파라미터 안전 클램프 (1~100) */
function safeLimit(raw: string | number, def = 50): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(100, n)) : def;
}

/** UUID v4 형식 검증 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateScopeId(scopeId: string | undefined): string {
  if (!scopeId || !UUID_RE.test(scopeId)) {
    throw new BadRequestException('scopeId는 유효한 UUID 형식이어야 합니다.');
  }
  return scopeId;
}

@Controller('external')
export class ExternalController {
  constructor(private externalService: ExternalService) {}

  /* ── LoL ── */

  @Get('lol/lookup')
  async lookupLol(@Query('riotId') riotId: string) {
    return ok(await this.externalService.lookupLol(validateGameId(riotId, 'Riot ID')));
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
    return ok(await this.externalService.getLolRanking(scope, validateScopeId(scopeId), safeLimit(limit)));
  }

  /* ── 메이플스토리 ── */

  @Get('maple/lookup')
  async lookupMaple(@Query('characterName') characterName: string) {
    return ok(await this.externalService.lookupMaple(validateGameId(characterName, '캐릭터명')));
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
    return ok(await this.externalService.getMapleRanking(scope, validateScopeId(scopeId), safeLimit(limit)));
  }

  /* ── FC 온라인 ── */

  @Get('fc/lookup')
  async lookupFc(@Query('nickname') nickname: string) {
    return ok(await this.externalService.lookupFcOnline(validateGameId(nickname, '닉네임')));
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

  /* ── PUBG ── */

  @Get('pubg/lookup')
  async lookupPubg(
    @Query('playerName') playerName: string,
    @Query('shard') shard: 'kakao' | 'steam' = 'kakao',
  ) {
    return ok(await this.externalService.lookupPubg(validateGameId(playerName, '플레이어명'), shard));
  }

  @Post('pubg/connect')
  @UseGuards(JwtAuthGuard)
  async connectPubg(
    @CurrentUserId() userId: string,
    @Body() body: { playerName: string; shard?: 'kakao' | 'steam' },
  ) {
    return ok(await this.externalService.connectPubg(userId, body.playerName, body.shard ?? 'kakao'));
  }

  @Post('pubg/sync')
  @UseGuards(JwtAuthGuard)
  async syncPubg(@CurrentUserId() userId: string) {
    return ok(await this.externalService.syncPubg(userId));
  }

  @Get('pubg/ranking')
  async pubgRanking(
    @Query('scope') scope: 'region' | 'school',
    @Query('scopeId') scopeId: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.externalService.getPubgRanking(scope, validateScopeId(scopeId), safeLimit(limit)));
  }

  /* ── Steam ── */

  @Get('steam/lookup')
  async lookupSteam(@Query('input') input: string) {
    return ok(await this.externalService.lookupSteam(validateGameId(input, 'Steam ID/닉네임', 100)));
  }

  @Post('steam/connect')
  @UseGuards(JwtAuthGuard)
  async connectSteam(@CurrentUserId() userId: string, @Body() body: { input: string }) {
    return ok(await this.externalService.connectSteam(userId, body.input));
  }

  @Post('steam/sync')
  @UseGuards(JwtAuthGuard)
  async syncSteam(@CurrentUserId() userId: string) {
    return ok(await this.externalService.syncSteam(userId));
  }

  @Get('steam/ranking')
  async steamRanking(
    @Query('scope') scope: 'region' | 'school',
    @Query('scopeId') scopeId: string,
    @Query('limit') limit = '50',
  ) {
    return ok(await this.externalService.getSteamRanking(scope, validateScopeId(scopeId), safeLimit(limit)));
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
