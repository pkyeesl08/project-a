import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/** JWT 토큰에서 추출되는 페이로드 */
export interface JwtPayload {
  userId: string;
  email: string;
}

/** 인증된 요청 타입 */
export interface AuthRequest extends Request {
  user: JwtPayload;
}

/**
 * @CurrentUserId() — 컨트롤러에서 userId를 깔끔하게 추출
 *
 * Before: async getMe(@Req() req) { req.user.userId }
 * After:  async getMe(@CurrentUserId() userId: string) { userId }
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.user.userId;
  },
);
