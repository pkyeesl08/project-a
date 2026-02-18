import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { ok } from '../common/response';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  /** 친구 목록 */
  @Get()
  async getFriends(@CurrentUserId() userId: string) {
    return ok(await this.friendsService.getFriends(userId));
  }

  /** 받은 친구 요청 목록 */
  @Get('requests')
  async getPendingRequests(@CurrentUserId() userId: string) {
    return ok(await this.friendsService.getPendingRequests(userId));
  }

  /** 친구 간 랭킹 */
  @Get('rankings')
  async getFriendRankings(
    @CurrentUserId() userId: string,
    @Query('gameType') gameType = 'all',
  ) {
    return ok(await this.friendsService.getFriendRankings(userId, gameType));
  }

  /** 친구 요청 전송 */
  @Post('request/:targetId')
  async sendRequest(
    @CurrentUserId() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return ok(await this.friendsService.sendRequest(userId, targetId));
  }

  /** 친구 요청 수락 */
  @Post('accept/:requesterId')
  async acceptRequest(
    @CurrentUserId() userId: string,
    @Param('requesterId') requesterId: string,
  ) {
    return ok(await this.friendsService.acceptRequest(userId, requesterId));
  }

  /** 친구 삭제 / 요청 거절 */
  @Delete(':targetId')
  async removeRelation(
    @CurrentUserId() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return ok(await this.friendsService.removeRelation(userId, targetId));
  }

  /** 차단 */
  @Post('block/:targetId')
  async block(
    @CurrentUserId() userId: string,
    @Param('targetId') targetId: string,
  ) {
    return ok(await this.friendsService.block(userId, targetId));
  }
}
