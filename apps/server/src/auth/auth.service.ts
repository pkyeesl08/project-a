import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async login(provider: string, token: string) {
    // TODO: 각 provider별 토큰 검증 (카카오, 구글, 애플)
    const socialUser = await this.verifySocialToken(provider, token);

    let user = await this.usersService.findByEmail(socialUser.email);
    let isNewUser = false;

    if (!user) {
      user = await this.usersService.create({
        email: socialUser.email,
        nickname: this.generateNickname(),
        authProvider: provider,
        profileImage: socialUser.profileImage,
      });
      isNewUser = true;
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, nickname: user.nickname, isNewUser },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException();

      const newPayload = { sub: user.id, email: user.email };
      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, { expiresIn: '30d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async verifySocialToken(provider: string, token: string) {
    // TODO: 실제 소셜 로그인 검증 구현
    // 개발 단계에서는 mock 데이터 반환
    return {
      email: `user_${Date.now()}@${provider}.com`,
      profileImage: null,
    };
  }

  private generateNickname(): string {
    const adjectives = ['빠른', '용감한', '멋진', '강한', '날렵한', '귀여운', '힙한', '쿨한'];
    const nouns = ['호랑이', '독수리', '상어', '용', '늑대', '판다', '펭귄', '고양이'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 9999);
    return `${adj}${noun}${num}`;
  }
}
