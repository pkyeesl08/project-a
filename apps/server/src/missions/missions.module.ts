import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyMissionEntity } from './mission.entity';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { UsersModule } from '../users/users.module';
import { AvatarModule } from '../avatar/avatar.module';

@Module({
  imports: [TypeOrmModule.forFeature([DailyMissionEntity]), UsersModule, AvatarModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
