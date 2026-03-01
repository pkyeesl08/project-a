import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvatarItemEntity } from './avatar-item.entity';
import { UserAvatarItemEntity, UserAvatarEntity } from './user-avatar.entity';
import { AvatarController } from './avatar.controller';
import { AvatarService } from './avatar.service';
import { UserEntity } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AvatarItemEntity,
      UserAvatarItemEntity,
      UserAvatarEntity,
      UserEntity,
    ]),
  ],
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule implements OnApplicationBootstrap {
  constructor(private avatarService: AvatarService) {}

  /** 서버 기동 시 기본 아이템 시드 삽입 */
  async onApplicationBootstrap() {
    await this.avatarService.seedDefaultItems();
  }
}
