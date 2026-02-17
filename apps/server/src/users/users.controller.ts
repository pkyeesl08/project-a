import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { UpdateProfileDto, CheckNicknameDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUserId() userId: string) {
    return ok(await this.usersService.findById(userId));
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    return ok(await this.usersService.updateProfile(userId, dto));
  }

  /** 닉네임 중복 체크 — GET /api/users/nickname/check?nickname=xxx */
  @Get('nickname/check')
  async checkNickname(@Query('nickname') nickname: string) {
    if (!nickname || nickname.length < 2 || nickname.length > 12) {
      return ok({ available: false, reason: '닉네임은 2~12자여야 합니다.' });
    }
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
      return ok({ available: false, reason: '한글, 영문, 숫자, 밑줄(_)만 사용 가능합니다.' });
    }
    const available = await this.usersService.isNicknameAvailable(nickname);
    return ok({
      available,
      reason: available ? null : '이미 사용 중인 닉네임입니다.',
    });
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return ok(await this.usersService.getStats(id));
  }
}
