import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
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

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return ok(null);
  }
}
