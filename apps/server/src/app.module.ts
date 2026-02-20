import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { RankingsModule } from './rankings/rankings.module';
import { RegionsModule } from './regions/regions.module';
import { SchoolsModule } from './schools/schools.module';
import { ExternalModule } from './external/external.module';
import { MapModule } from './map/map.module';
import { MatchModule } from './match/match.module';
import { RedisModule } from './redis/redis.module';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { SeasonsModule } from './seasons/seasons.module';
import { MissionsModule } from './missions/missions.module';
import { AchievementsModule } from './achievements/achievements.module';
import { FriendsModule } from './friends/friends.module';
import { EventsModule } from './events/events.module';
import { AvatarModule } from './avatar/avatar.module';
import { NeighborhoodBattleModule } from './neighborhood-battle/neighborhood-battle.module';
import { WeeklyChallengeModule } from './weekly-challenge/weekly-challenge.module';
import { NotificationsModule } from './notifications/notification.module';

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'donggamerank',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      extra: { max: 20 }, // 커넥션 풀 최대 20
    }),
    AuthModule,
    UsersModule,
    GamesModule,
    RankingsModule,
    RegionsModule,
    SchoolsModule,
    ExternalModule,
    MapModule,
    MatchModule,
    SeasonsModule,
    MissionsModule,
    AchievementsModule,
    FriendsModule,
    EventsModule,
    AvatarModule,
    NeighborhoodBattleModule,
    WeeklyChallengeModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 공개 엔드포인트 Rate Limiting (분당 60회)
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'users/check-nickname', method: RequestMethod.GET },
        { path: 'rankings/*', method: RequestMethod.GET },
      );
  }
}
