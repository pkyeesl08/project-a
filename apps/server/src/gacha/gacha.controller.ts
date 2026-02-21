import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { GachaService } from './gacha.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('gacha')
@UseGuards(JwtAuthGuard)
export class GachaController {
  constructor(private service: GachaService) {}

  /** 피티 현황 조회 */
  @Get('pity')
  async getPity(@CurrentUserId() userId: string) {
    return ok(await this.service.getPityInfo(userId));
  }

  /** 뽑기 실행 (count: 1 or 10) */
  @Post('pull')
  async pull(
    @CurrentUserId() userId: string,
    @Body('count') count: 1 | 10,
  ) {
    const validCount = count === 10 ? 10 : 1;
    return ok(await this.service.pull(userId, validCount));
  }
}
