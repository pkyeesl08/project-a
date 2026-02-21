import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../redis/redis.module';

interface SocialUser {
  email: string;
  profileImage: string | null;
}

interface JWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** 소셜 로그인 — 신규 유저면 닉네임 설정 필요 */
  async login(provider: string, token: string) {
    const socialUser = await this.verifySocialToken(provider, token);
    const existing = await this.usersService.findByEmail(socialUser.email);

    if (existing) {
      const tokens = this.issueTokens(existing.id, existing.email);
      return {
        ...tokens,
        user: { id: existing.id, nickname: existing.nickname, isNewUser: false },
      };
    }

    // 신규 유저 → 임시 토큰 발급 (닉네임 설정 전)
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
    let payload: { email: string; provider: string; profileImage: string | null; type: string };
    try {
      payload = this.jwtService.verify(registerToken);
    } catch {
      throw new UnauthorizedException('만료되었거나 유효하지 않은 토큰입니다. 다시 로그인해주세요.');
    }

    if (payload.type !== 'register') {
      throw new BadRequestException('잘못된 토큰 유형입니다.');
    }

    const existingByEmail = await this.usersService.findByEmail(payload.email);
    if (existingByEmail) {
      throw new ConflictException('이미 가입된 계정입니다.');
    }

    const available = await this.usersService.isNicknameAvailable(nickname);
    if (!available) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

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
      const payload = this.jwtService.verify(refreshToken) as { sub: string; email: string; exp: number };
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException();

      // 사용된 refresh token을 블랙리스트에 등록 (Rotation — 재사용 방지)
      await this.logout(refreshToken);

      return this.issueTokens(user.id, user.email);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('리프레시 토큰이 유효하지 않습니다.');
    }
  }

  /** 로그아웃 — 토큰을 Redis 블랙리스트에 등록 */
  async logout(token: string): Promise<void> {
    if (!token) return;
    try {
      const decoded = this.jwtService.decode(token) as { exp?: number } | null;
      if (!decoded?.exp) return;

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl <= 0) return; // 이미 만료된 토큰은 무시

      const hash = createHash('sha256').update(token).digest('hex');
      await this.redis.set(`blacklist:${hash}`, '1', 'EX', ttl);
    } catch {
      // 무효한 토큰은 무시
    }
  }

  private issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }

  /** 소셜 토큰 실제 검증 (Kakao / Google / Apple) */
  private async verifySocialToken(provider: string, token: string): Promise<SocialUser> {
    if (provider === 'kakao') {
      return this.verifyKakaoToken(token);
    }
    if (provider === 'google') {
      return this.verifyGoogleToken(token);
    }
    if (provider === 'apple') {
      return this.verifyAppleToken(token);
    }
    throw new BadRequestException(`지원하지 않는 소셜 로그인 제공자입니다: ${provider}`);
  }

  /** 외부 API 요청 — 5초 타임아웃 적용 */
  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** 카카오 액세스 토큰 검증 */
  private async verifyKakaoToken(accessToken: string): Promise<SocialUser> {
    const res = await this.fetchWithTimeout('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new UnauthorizedException('카카오 토큰이 유효하지 않습니다.');
    }
    const data = await res.json() as {
      kakao_account?: {
        email?: string;
        profile?: { profile_image_url?: string };
      };
    };
    const email = data.kakao_account?.email;
    if (!email) {
      throw new UnauthorizedException('카카오 계정에 이메일이 없습니다. 이메일 제공 동의가 필요합니다.');
    }
    return {
      email,
      profileImage: data.kakao_account?.profile?.profile_image_url ?? null,
    };
  }

  /** 구글 ID 토큰 검증 */
  private async verifyGoogleToken(idToken: string): Promise<SocialUser> {
    const res = await this.fetchWithTimeout(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) {
      throw new UnauthorizedException('구글 토큰이 유효하지 않습니다.');
    }
    const data = await res.json() as {
      error?: string;
      email?: string;
      picture?: string;
      exp?: string;
    };
    if (data.error) {
      throw new UnauthorizedException('구글 토큰이 유효하지 않습니다.');
    }
    if (!data.email) {
      throw new UnauthorizedException('구글 계정에 이메일 정보가 없습니다.');
    }
    return { email: data.email, profileImage: data.picture ?? null };
  }

  /** Apple identity token 검증 (RS256 서명 검증 포함) */
  private async verifyAppleToken(identityToken: string): Promise<SocialUser> {
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('유효하지 않은 Apple 토큰 형식입니다.');
    }

    // Apple 공개키 목록 조회
    const jwksRes = await this.fetchWithTimeout('https://appleid.apple.com/auth/keys');
    if (!jwksRes.ok) {
      throw new UnauthorizedException('Apple 공개키를 가져올 수 없습니다.');
    }
    const { keys } = await jwksRes.json() as { keys: JWK[] };

    // JWT 헤더에서 kid 추출
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as { kid: string; alg: string };
    const jwk = keys.find(k => k.kid === header.kid);
    if (!jwk) {
      throw new UnauthorizedException('Apple 토큰의 서명 키를 찾을 수 없습니다.');
    }

    // Node.js crypto로 RS256 서명 검증
    const { createPublicKey, createVerify } = await import('crypto');
    const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = Buffer.from(parts[2], 'base64url');

    const verifier = createVerify('RSA-SHA256');
    verifier.update(signingInput);
    if (!verifier.verify(publicKey, signature)) {
      throw new UnauthorizedException('Apple 토큰 서명 검증에 실패했습니다.');
    }

    // 페이로드 파싱 및 유효성 검증
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
      sub: string;
      email?: string;
      exp: number;
      iss: string;
    };

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Apple 토큰이 만료되었습니다.');
    }
    if (payload.iss !== 'https://appleid.apple.com') {
      throw new UnauthorizedException('Apple 토큰 발급자가 유효하지 않습니다.');
    }
    if (!payload.email) {
      throw new UnauthorizedException('Apple 토큰에 이메일 정보가 없습니다.');
    }

    return { email: payload.email, profileImage: null };
  }
}
