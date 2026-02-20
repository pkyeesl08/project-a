import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationsModule {}
