import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceEntity } from './attendance.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AvatarModule } from '../avatar/avatar.module';
import { UsersModule } from '../users/users.module';
import { DnaModule } from '../dna/dna.module';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceEntity]), AvatarModule, UsersModule, DnaModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
