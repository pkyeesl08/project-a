import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { SubmitResultDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('games')
export class GamesController {
  constructor(private gamesService: GamesService) {}

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
}
