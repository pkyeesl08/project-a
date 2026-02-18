import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameResultEntity } from './game-result.entity';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { UsersModule } from '../users/users.module';
import { RankingsModule } from '../rankings/rankings.module';
import { SeasonsModule } from '../seasons/seasons.module';
import { MissionsModule } from '../missions/missions.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { AvatarModule } from '../avatar/avatar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameResultEntity]),
    UsersModule,
    RankingsModule,
    SeasonsModule,
    MissionsModule,
    AchievementsModule,
    AvatarModule,
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
