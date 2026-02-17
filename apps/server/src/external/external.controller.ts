import { Controller, Get, Post, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ExternalService } from './external.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ConnectExternalDto, SyncExternalDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('external')
@UseGuards(JwtAuthGuard)
export class ExternalController {
  constructor(private externalService: ExternalService) {}

  @Post('connect/:platform')
  async connect(
    @CurrentUserId() userId: string,
    @Param('platform') platform: string,
    @Body() dto: ConnectExternalDto,
  ) {
    return ok(await this.externalService.connect(userId, platform, dto));
  }

  @Delete('disconnect/:platform')
  async disconnect(
    @CurrentUserId() userId: string,
    @Param('platform') platform: string,
    @Query('game') game: string,
  ) {
    return ok(await this.externalService.disconnect(userId, platform, game));
  }

  @Post('sync/:platform')
  async sync(
    @CurrentUserId() userId: string,
    @Param('platform') platform: string,
    @Body() dto: SyncExternalDto,
  ) {
    return ok(await this.externalService.sync(userId, platform, dto.game));
  }

  @Get('accounts')
  async getAccounts(@CurrentUserId() userId: string) {
    return ok(await this.externalService.getUserAccounts(userId));
  }
}
