import { Controller, Post, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto, RefreshDto, RegisterDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto.provider, dto.token));
  }

  /** 회원가입 완료 — 닉네임 확정 */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return ok(await this.authService.register(dto.registerToken, dto.nickname));
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return ok(await this.authService.refresh(dto.refreshToken));
  }

  /** 로그아웃 — 토큰을 블랙리스트에 등록하여 즉시 무효화 */
  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    const token = req.headers['authorization']?.replace('Bearer ', '') ?? '';
    await this.authService.logout(token);
    return ok(null);
  }
}
