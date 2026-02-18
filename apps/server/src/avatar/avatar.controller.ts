import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { AvatarService } from './avatar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';
import { ItemType } from './avatar-item.entity';

@Controller('avatar')
export class AvatarController {
  constructor(private avatarService: AvatarService) {}

  /* ─── 상점 ─── */

  /** 상점 아이템 목록 */
  @Get('shop')
  async getShopItems(@Query('type') type?: ItemType) {
    return ok(await this.avatarService.getShopItems(type));
  }

  /** 전체 아이템 카탈로그 */
  @Get('catalog')
  async getCatalog(@Query('type') type?: ItemType) {
    return ok(await this.avatarService.getCatalog(type));
  }

  /* ─── 구매 ─── */

  /** 보석으로 구매 */
  @Post('shop/:itemId/buy/gems')
  @UseGuards(JwtAuthGuard)
  async buyWithGems(
    @CurrentUserId() userId: string,
    @Param('itemId') itemId: string,
  ) {
    return ok(await this.avatarService.purchaseWithGems(userId, itemId));
  }

  /** 코인으로 구매 */
  @Post('shop/:itemId/buy/coins')
  @UseGuards(JwtAuthGuard)
  async buyWithCoins(
    @CurrentUserId() userId: string,
    @Param('itemId') itemId: string,
  ) {
    return ok(await this.avatarService.purchaseWithCoins(userId, itemId));
  }

  /* ─── 인벤토리 ─── */

  /** 내 인벤토리 */
  @Get('inventory')
  @UseGuards(JwtAuthGuard)
  async getInventory(@CurrentUserId() userId: string) {
    return ok(await this.avatarService.getInventory(userId));
  }

  /* ─── 아바타 장착 ─── */

  /** 현재 아바타 설정 조회 */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyAvatar(@CurrentUserId() userId: string) {
    return ok(await this.avatarService.getAvatar(userId));
  }

  /** 타 유저 아바타 조회 */
  @Get(':userId')
  async getUserAvatar(@Param('userId') userId: string) {
    return ok(await this.avatarService.getAvatar(userId));
  }

  /** 아이템 장착 */
  @Post('equip/:itemId')
  @UseGuards(JwtAuthGuard)
  async equip(
    @CurrentUserId() userId: string,
    @Param('itemId') itemId: string,
  ) {
    return ok(await this.avatarService.equipItem(userId, itemId));
  }

  /** 슬롯 해제 */
  @Delete('unequip/:slot')
  @UseGuards(JwtAuthGuard)
  async unequip(
    @CurrentUserId() userId: string,
    @Param('slot') slot: 'frame' | 'icon' | 'title' | 'effect',
  ) {
    return ok(await this.avatarService.unequipSlot(userId, slot));
  }

  /* ─── 재화 충전 ─── */

  /** 보석 충전 (결제 후 호출) */
  @Post('gems/charge')
  @UseGuards(JwtAuthGuard)
  async chargeGems(
    @CurrentUserId() userId: string,
    @Body() body: { amount: number; receipt: string },
  ) {
    return ok(await this.avatarService.chargeGems(userId, body.amount, body.receipt));
  }
}
