import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          lazyConnect: true,
          retryStrategy: (times) => Math.min(times * 500, 5000),
        });
        client.on('error', (err) => {
          console.error('[Redis 연결 오류]', err.message);
        });
        client.on('connect', () => {
          console.log('[Redis] 연결 성공');
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
