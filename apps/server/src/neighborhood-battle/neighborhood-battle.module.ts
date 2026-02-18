import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NeighborhoodBattleEntity } from './neighborhood-battle.entity';
import { NeighborhoodBattleService } from './neighborhood-battle.service';
import { NeighborhoodBattleController } from './neighborhood-battle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NeighborhoodBattleEntity])],
  providers: [NeighborhoodBattleService],
  controllers: [NeighborhoodBattleController],
  exports: [NeighborhoodBattleService],
})
export class NeighborhoodBattleModule {}
