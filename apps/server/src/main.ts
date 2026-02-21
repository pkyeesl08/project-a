import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  // JWT_SECRET 미설정 시 경고(개발)/에러(프로덕션)
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[시작 오류] JWT_SECRET 환경 변수가 설정되지 않았습니다.');
    }
    console.warn('[경고] JWT_SECRET 미설정 — 개발용 임시값 사용. 프로덕션에서는 절대 사용 금지.');
  }

  // 프로덕션 필수 환경 변수 검증
  if (process.env.NODE_ENV === 'production') {
    const required = ['JWT_SECRET', 'DB_HOST', 'DB_PASSWORD', 'REDIS_HOST'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`[시작 오류] 필수 환경 변수 누락: ${missing.join(', ')}`);
    }
  }

  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug'],
  });

  app.setGlobalPrefix('api');

  // CORS: 허용 origin 화이트리스트 (쉼표 구분 다중 도메인 지원)
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS 정책 위반: 허용되지 않은 출처입니다.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 전역 예외 필터 — 프로덕션에서 스택트레이스 차단
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[DongGameRank] 서버 시작: http://localhost:${port}/api`);
  console.log(`[DongGameRank] 환경: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();
