import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  /** 소셜 로그인 — 신규 유저면 닉네임 설정 필요 */
  async login(provider: string, token: string) {
    const socialUser = await this.verifySocialToken(provider, token);
    const existing = await this.usersService.findByEmail(socialUser.email);

    if (existing) {
      // 기존 유저 → 바로 로그인
      const tokens = this.issueTokens(existing.id, existing.email);
      return {
        ...tokens,
        user: { id: existing.id, nickname: existing.nickname, isNewUser: false },
      };
    }

    // 신규 유저 → 임시 토큰 발급 (닉네임 설정 전)
    // 아직 DB에 저장하지 않음! 닉네임 확정 후 register에서 생성
    const tempToken = this.jwtService.sign(
      { email: socialUser.email, provider, profileImage: socialUser.profileImage, type: 'register' },
      { expiresIn: '30m' },
    );

    return {
      accessToken: null,
      refreshToken: null,
      registerToken: tempToken,
      user: null,
      isNewUser: true,
    };
  }

  /** 회원가입 완료 — 닉네임 중복검사 통과 후 호출 */
  async register(registerToken: string, nickname: string) {
    // 토큰 검증
    let payload: { email: string; provider: string; profileImage: string | null; type: string };
    try {
      payload = this.jwtService.verify(registerToken);
    } catch {
      throw new UnauthorizedException('만료되었거나 유효하지 않은 토큰입니다. 다시 로그인해주세요.');
    }

    if (payload.type !== 'register') {
      throw new BadRequestException('잘못된 토큰 유형입니다.');
    }

    // 이미 가입된 이메일 체크
    const existingByEmail = await this.usersService.findByEmail(payload.email);
    if (existingByEmail) {
      throw new ConflictException('이미 가입된 계정입니다.');
    }

    // 닉네임 중복 체크
    const available = await this.usersService.isNicknameAvailable(nickname);
    if (!available) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    // 유저 생성
    const user = await this.usersService.create({
      email: payload.email,
      nickname,
      authProvider: payload.provider,
      profileImage: payload.profileImage,
    });

    const tokens = this.issueTokens(user.id, user.email);
    return {
      ...tokens,
      user: { id: user.id, nickname: user.nickname, isNewUser: true },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException();
      return this.issueTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }

  private async verifySocialToken(provider: string, token: string) {
    // TODO: 실제 소셜 로그인 검증 구현 (카카오/구글/애플)
    return {
      email: `user_${Date.now()}@${provider}.com`,
      profileImage: null,
    };
  }
}
