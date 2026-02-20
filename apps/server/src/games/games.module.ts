import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameResultEntity } from './game-result.entity';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { DailyGameService } from './daily-game.service';
import { UsersModule } from '../users/users.module';
import { RankingsModule } from '../rankings/rankings.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { MissionsModule } from '../missions/missions.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { AvatarModule } from '../avatar/avatar.module';
import { WeeklyChallengeModule } from '../weekly-challenge/weekly-challenge.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationsModule } from '../notifications/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameResultEntity]),
    UsersModule,
    RankingsModule,
    SeasonsModule,
    MissionsModule,
    AchievementsModule,
    AvatarModule,
    WeeklyChallengeModule,
    RedisModule,
    NotificationsModule,
  ],
  controllers: [GamesController],
  providers: [GamesService, DailyGameService],
  exports: [GamesService, DailyGameService],
})
export class GamesModule {}
