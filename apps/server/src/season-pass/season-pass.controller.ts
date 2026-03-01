import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SeasonPassService } from './season-pass.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('season-pass')
@UseGuards(JwtAuthGuard)
export class SeasonPassController {
  constructor(private service: SeasonPassService) {}

  /** 내 시즌 패스 진행 상황 */
  @Get('my-progress')
  async getMyProgress(@CurrentUserId() userId: string) {
    return ok(await this.service.getMyProgress(userId));
  }

  /** 티어 보상 수령 */
  @Post('claim/:tier/:track')
  async claimTier(
    @CurrentUserId() userId: string,
    @Param('tier') tier: string,
    @Param('track') track: 'free' | 'gold',
  ) {
    return ok(await this.service.claimTierReward(userId, parseInt(tier), track));
  }

  /** 골드 패스 구매 (보석 소모) */
  @Post('purchase-gold')
  async purchaseGold(@CurrentUserId() userId: string) {
    return ok(await this.service.purchaseGoldPass(userId));
  }
}
