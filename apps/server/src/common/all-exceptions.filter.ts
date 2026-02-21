import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 전역 예외 필터 — 프로덕션에서 스택트레이스 노출 방지
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    let status: number;
    let message: string;
    let code: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message ?? exception.message;
      code = (body as any).error ?? 'HTTP_EXCEPTION';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProd ? '서버 내부 오류가 발생했습니다.' : String(exception);
      code = 'INTERNAL_SERVER_ERROR';
      // 프로덕션에서는 스택트레이스를 서버 로그에만 기록
      this.logger.error(`Unhandled exception on ${req.method} ${req.url}`, exception instanceof Error ? exception.stack : String(exception));
    }

    // 500 에러는 프로덕션에서 항상 제네릭 메시지
    if (isProd && status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = '서버 내부 오류가 발생했습니다.';
    }

    res.status(status).json({
      success: false,
      error: {
        code,
        message: Array.isArray(message) ? message.join(', ') : message,
        ...(isProd ? {} : { statusCode: status, path: req.url }),
      },
    });
  }
}
