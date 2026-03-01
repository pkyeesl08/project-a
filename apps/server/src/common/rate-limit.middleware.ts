import { Injectable, NestMiddleware, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

/** 공개 엔드포인트 Rate Limit: 분당 60회 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 실제 TCP 연결 IP 사용 (X-Forwarded-For 조작 방지)
      // 인증된 유저인 경우 userId 기반 Rate Limit 적용
      const jwtUserId = (req as Request & { user?: { userId?: string } }).user?.userId;
      const realIp = req.socket?.remoteAddress ?? 'unknown';
      const identity = jwtUserId ? `uid:${jwtUserId}` : `ip:${realIp}`;

      const path = req.path.replace(/\/[0-9a-f-]{36}/gi, '/:id'); // UUID 정규화
      const key = `rate:${identity}:${path}`;
      const limit = 60;
      const windowSec = 60;

      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSec);
      }

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));

      if (count > limit) {
        throw new HttpException(
          '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // Redis 오류 시 요청 통과 (가용성 우선)
    }

    next();
  }
}
