import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeasonPassEntity } from './season-pass.entity';
import { SeasonPassController } from './season-pass.controller';
import { SeasonPassService } from './season-pass.service';
import { AvatarModule } from '../avatar/avatar.module';
import { SeasonsModule } from '../seasons/seasons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSeasonPassEntity]),
    AvatarModule,
    SeasonsModule,
  ],
  controllers: [SeasonPassController],
  providers: [SeasonPassService],
  exports: [SeasonPassService],
})
export class SeasonPassModule {}
