import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapController } from './map.controller';
import { MapService } from './map.service';
import { UsersModule } from '../users/users.module';
import { GameResultEntity } from '../games/game-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GameResultEntity]), UsersModule],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
