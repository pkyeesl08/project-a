import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // 프로덕션 환경 필수 환경 변수 검증
  if (process.env.NODE_ENV === 'production') {
    const required = ['JWT_SECRET', 'DB_HOST', 'DB_PASSWORD', 'REDIS_HOST'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`[시작 오류] 필수 환경 변수가 설정되지 않았습니다: ${missing.join(', ')}`);
    }
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });
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
