import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamerDnaEntity } from './gamer-dna.entity';
import { DnaController } from './dna.controller';
import { DnaService } from './dna.service';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([GamerDnaEntity]), UsersModule, RedisModule],
  controllers: [DnaController],
  providers: [DnaService],
  exports: [DnaService],
})
export class DnaModule {}
