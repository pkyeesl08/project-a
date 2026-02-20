import { Module } from '@nestjs/common';
import { WeeklyChallengeService } from './weekly-challenge.service';
import { WeeklyChallengeController } from './weekly-challenge.controller';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RedisModule, UsersModule],
  controllers: [WeeklyChallengeController],
  providers: [WeeklyChallengeService],
  exports: [WeeklyChallengeService],
})
export class WeeklyChallengeModule {}
