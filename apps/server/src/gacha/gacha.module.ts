import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarItemEntity } from '../avatar/avatar-item.entity';
import { UserAvatarItemEntity } from '../avatar/user-avatar.entity';
import { UserEntity } from '../users/user.entity';
import { GachaController } from './gacha.controller';
import { GachaService } from './gacha.service';
import { AvatarModule } from '../avatar/avatar.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvatarItemEntity, UserAvatarItemEntity, UserEntity]),
    AvatarModule,
    RedisModule,
  ],
  controllers: [GachaController],
  providers: [GachaService],
})
export class GachaModule {}
