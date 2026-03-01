import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 개발 환경 fallback — 프로덕션에서는 main.ts 기동 시 에러 처리됨
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret-DO-NOT-USE-IN-PROD',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: { sub: string; email: string }) {
    // 블랙리스트(로그아웃) 체크
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
      try {
        const hash = createHash('sha256').update(token).digest('hex');
        const isBlacklisted = await this.redis.get(`blacklist:${hash}`);
        if (isBlacklisted) {
          throw new UnauthorizedException('로그아웃된 토큰입니다. 다시 로그인해주세요.');
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        // Redis 오류 시 검사 생략 (가용성 우선)
      }
    }

    // 유저 존재 여부 확인 (탈퇴/삭제된 유저 차단)
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
