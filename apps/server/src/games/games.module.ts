import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameResultEntity } from './game-result.entity';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { UsersModule } from '../users/users.module';
import { RankingsModule } from '../rankings/rankings.module';

@Module({
  imports: [TypeOrmModule.forFeature([GameResultEntity]), UsersModule, RankingsModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
