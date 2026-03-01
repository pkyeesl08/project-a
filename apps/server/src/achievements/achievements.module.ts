import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementEntity } from './achievement.entity';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { UsersModule } from '../users/users.module';
import { AvatarModule } from '../avatar/avatar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AchievementEntity]),
    UsersModule,
    forwardRef(() => AvatarModule),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
