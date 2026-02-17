import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../common/auth.types';
import { UpdateProfileDto } from '../common/dto';
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

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return ok(await this.usersService.getStats(id));
  }
}
