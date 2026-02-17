import { Controller, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto, RefreshDto } from '../common/dto';
import { ok } from '../common/response';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return ok(await this.authService.login(dto.provider, dto.token));
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
