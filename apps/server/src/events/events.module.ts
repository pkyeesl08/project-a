import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NeighborhoodEventEntity } from './neighborhood-event.entity';
import { GameResultEntity } from '../games/game-result.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([NeighborhoodEventEntity, GameResultEntity]), UsersModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
